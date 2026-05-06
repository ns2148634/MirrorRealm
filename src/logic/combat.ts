/**
 * 7.3 三步結算法 — 單次戰鬥傷害核心結算
 *
 * Step 1: 理論最終攻擊力
 * Step 2: 命中率（線性折損，即傷害有效百分比）
 * Step 3: 雙層防禦結算（外層護盾 + 內層煉體護身）
 */

export type Element = 'fire' | 'water' | 'wood' | 'metal' | 'earth';

/** 五行相剋鏈（key 剋制 value） */
const ELEMENT_CHAIN: Record<Element, Element> = {
  metal: 'wood',
  wood:  'earth',
  earth: 'water',
  water: 'fire',
  fire:  'metal',
};

/** 煉體護身調校常數（設計師可依需求調整） */
const BODY_SOFT_CAP           = 500;  // 煉體值 500 時減傷率約 50%
const BODY_MITIGATION_MAX     = 0.60; // 減傷率硬頂（60%）
const ABSOLUTE_REDUCTION_COEF = 0.07; // 絕對免傷係數（文件建議 0.05~0.1）

// ─── 輸入型別 ──────────────────────────────────────────────────────────────

export interface AttackerStats {
  body: number;             // 煉體值（同時作為基礎攻擊來源）
  weaponBaseAtk: number;    // 法器 / 御靈基礎攻擊
  element: Element | null;
  si: number;               // 神識

  /** 加法池：1 + generalBuffSum + conditionBuffSum + stanceBuffSum */
  generalBuffSum: number;   // 通用 Buff 加成（e.g. +10% → 0.1）
  conditionBuffSum: number; // 條件 Buff 加成
  stanceBuffSum: number;    // 姿態：殺伐+0.15 / 固守-0.20 / 隨機0

  /** 燃血搏命：獨立乘區，不進加法池 */
  bloodBurnActive: boolean;
  bloodBurnSpecial: boolean; // 浴火重天等特殊法寶 → ×4；否則 ×3
}

export interface DefenderStats {
  body: number;
  element: Element | null;
  si: number;
  shieldDef: number;           // 外層護盾固定防禦值（由法寶裝備決定）
  isDefensiveStance: boolean;  // 固守本心姿態 → 護盾額外 ×1.2
}

export interface CombatResult {
  theoreticalAtk: number;  // Step 1 輸出
  hitRate: number;          // Step 2 輸出（0.10 ~ 1.00）
  penetrateDmg: number;     // Step 3 突破外層後剩餘傷害
  actualDamage: number;     // Step 3 最終單次實際傷害（最低 1）
}

// ─── Step 1 ────────────────────────────────────────────────────────────────

function calcTheoreticalAtk(atk: AttackerStats, def: DefenderStats): number {
  const baseAtk = atk.body + atk.weaponBaseAtk;

  // 加法池係數
  const multFactor = 1 + atk.generalBuffSum + atk.conditionBuffSum + atk.stanceBuffSum;

  // 屬性剋制
  let elementMult = 1.0;
  if (atk.element && def.element) {
    if      (ELEMENT_CHAIN[atk.element] === def.element) elementMult = 1.2; // 剋制
    else if (ELEMENT_CHAIN[def.element] === atk.element) elementMult = 0.8; // 被剋
  }

  // 燃血搏命：獨立乘區，不進加法池
  const bloodBurnMult = atk.bloodBurnActive
    ? (atk.bloodBurnSpecial ? 4 : 3)
    : 1;

  return baseAtk * multFactor * elementMult * bloodBurnMult;
}

// ─── Step 2 ────────────────────────────────────────────────────────────────

/**
 * 命中率 = max(10%, 75% + (己方si − 敵方si) / (己方si + 敵方si) × 65%)
 *
 * 命中率即傷害有效百分比（線性折損，非二元命中/閃避）。
 * 雙方 si 均為 0 時預設 75%。
 */
function calcHitRate(atkSi: number, defSi: number): number {
  const total = atkSi + defSi;
  if (total === 0) return 0.75;
  const raw = 0.75 + ((atkSi - defSi) / total) * 0.65;
  return Math.min(1.0, Math.max(0.10, raw));
}

// ─── Step 3 ────────────────────────────────────────────────────────────────

function calcActualDamage(
  theoreticalAtk: number,
  hitRate: number,
  def: DefenderStats,
): { penetrateDmg: number; actualDamage: number } {
  // 外層：護盾 / 法寶
  const effectiveShield = def.isDefensiveStance
    ? def.shieldDef * 1.2
    : def.shieldDef;

  const penetrateDmg = theoreticalAtk * hitRate - effectiveShield;
  if (penetrateDmg <= 0) return { penetrateDmg: 0, actualDamage: 0 };

  // 內層：煉體護身
  const bodyMitigationRate = Math.min(
    BODY_MITIGATION_MAX,
    def.body / (def.body + BODY_SOFT_CAP),
  );
  const absoluteReduction = def.body * ABSOLUTE_REDUCTION_COEF;
  const raw = penetrateDmg * (1 - bodyMitigationRate) - absoluteReduction;

  return {
    penetrateDmg,
    actualDamage: Math.floor(Math.max(1, raw)),
  };
}

// ─── 核心入口 ───────────────────────────────────────────────────────────────

export function resolveCombatDamage(
  attacker: AttackerStats,
  defender: DefenderStats,
): CombatResult {
  const theoreticalAtk              = calcTheoreticalAtk(attacker, defender);
  const hitRate                     = calcHitRate(attacker.si, defender.si);
  const { penetrateDmg, actualDamage } = calcActualDamage(theoreticalAtk, hitRate, defender);
  return { theoreticalAtk, hitRate, penetrateDmg, actualDamage };
}

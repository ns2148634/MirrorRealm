/**
 * 5.1 根基檢定 + 5.2 突破成功率計算
 *
 * 根基檢定為大境界突破（major）的硬性門檻，四項數值須達 80%。
 * 成功率公式：裸成功率 − 根基扣減 + 丹藥加成 + LBS加成 + 機緣加持，上限 bonus_cap。
 */

// ─── 境界突破參數表（第 14 節，indexed by 當前境界 lv）─────────────────────

const REALM_DATA: Record<number, { nakedRate: number; bonusCap: number }> = {
  2:  { nakedRate: 100, bonusCap: 100 }, // 氣旋一層（偽·無懲罰）
  3:  { nakedRate: 100, bonusCap: 100 },
  4:  { nakedRate: 100, bonusCap: 100 },
  5:  { nakedRate: 100, bonusCap: 100 },
  6:  { nakedRate:  85, bonusCap:  85 }, // 氣旋五層（minor 開始）
  7:  { nakedRate:  85, bonusCap:  85 },
  8:  { nakedRate:  85, bonusCap:  85 },
  9:  { nakedRate:  85, bonusCap:  85 },
  10: { nakedRate:  70, bonusCap:  70 }, // 氣旋九層
  11: { nakedRate:  50, bonusCap:  90 }, // 氣旋大圓滿 → 築基（major）
  12: { nakedRate:  65, bonusCap:  80 }, // 築基初期
  13: { nakedRate:  65, bonusCap:  80 },
  14: { nakedRate:  55, bonusCap:  70 }, // 築基後期
  15: { nakedRate:  40, bonusCap:  65 }, // 築基大圓滿 → 結丹（major）
  16: { nakedRate:  40, bonusCap:  65 },
  17: { nakedRate:  50, bonusCap:  65 },
  18: { nakedRate:  45, bonusCap:  60 },
  19: { nakedRate:  30, bonusCap:  55 }, // 結丹大圓滿 → 元嬰（major）
  20: { nakedRate:  35, bonusCap:  55 },
  21: { nakedRate:  45, bonusCap:  60 },
  22: { nakedRate:  35, bonusCap:  50 },
  23: { nakedRate:  20, bonusCap:  45 }, // 元嬰大圓滿 → 化神（major）
  24: { nakedRate:  30, bonusCap:  45 },
  25: { nakedRate:  40, bonusCap:  55 },
  26: { nakedRate:  30, bonusCap:  45 }, // 化神後期
};

// ─── 型別定義 ───────────────────────────────────────────────────────────────

export interface PlayerStatsSnapshot {
  hp: number;   hpCap: number;
  mp: number;   mpCap: number;
  body: number; bodyCap: number;
  si: number;   siCap: number;
}

export interface BreakthroughBonuses {
  pillBonus: number;    // 丹藥加成（百分點，如 +10 = +10%）
  lbsBonus: number;     // LBS 場景加成（百分點）
  fortuneBonus: number; // 機緣加持（百分點）
}

export type RootCheckResult =
  | { pass: true }
  | { pass: false; failedStats: string[] };

// ─── 5.1 根基檢定 ──────────────────────────────────────────────────────────

/** 僅大境界突破（major）須呼叫，小境界突破無門檻限制。 */
export function checkRootThreshold(stats: PlayerStatsSnapshot): RootCheckResult {
  const checks = [
    { label: '氣血', cur: stats.hp,   cap: stats.hpCap   },
    { label: '靈力', cur: stats.mp,   cap: stats.mpCap   },
    { label: '煉體', cur: stats.body, cap: stats.bodyCap },
    { label: '神識', cur: stats.si,   cap: stats.siCap   },
  ];

  const failed = checks
    .filter(c => c.cap > 0 && c.cur / c.cap < 0.8)
    .map(c => `${c.label}（${Math.floor((c.cur / c.cap) * 100)}% / 需達 80%）`);

  return failed.length === 0
    ? { pass: true }
    : { pass: false, failedStats: failed };
}

// ─── 5.2 突破成功率計算 ────────────────────────────────────────────────────

export interface BreakthroughRateResult {
  nakedRate: number;       // 裸突破成功率（%）
  rootDeduction: number;   // 根基扣減量（%）
  finalRate: number;       // 最終成功率（%，已受 bonus_cap 截斷）
  bonusCap: number;        // 加成上限（%）
  breakdown: {
    裸成功率: number;
    根基扣減: number;
    丹藥加成: number;
    LBS加成:  number;
    機緣加持: number;
  };
}

/**
 * @param currentLv   - 玩家當前境界 lv（嘗試突破的起點）
 * @param stats       - 四項數值快照（當前值 + 本境界上限）
 * @param bonuses     - 丹藥 / LBS / 機緣加持（百分點）
 */
export function calcBreakthroughRate(
  currentLv: number,
  stats: PlayerStatsSnapshot,
  bonuses: BreakthroughBonuses,
): BreakthroughRateResult {
  const data = REALM_DATA[currentLv];
  if (!data) throw new Error(`無突破參數：lv=${currentLv}`);

  const { nakedRate, bonusCap } = data;

  // 根基扣減：每項未達滿值，按比例扣減，每項最多 -10 百分點
  const statFields = [
    { cur: stats.hp,   cap: stats.hpCap   },
    { cur: stats.mp,   cap: stats.mpCap   },
    { cur: stats.body, cap: stats.bodyCap },
    { cur: stats.si,   cap: stats.siCap   },
  ];
  const rootDeduction = statFields.reduce((sum, s) => {
    if (s.cap <= 0) return sum;
    return sum + (1 - Math.min(1, s.cur / s.cap)) * 10;
  }, 0);

  const rawFinal = nakedRate - rootDeduction
    + bonuses.pillBonus + bonuses.lbsBonus + bonuses.fortuneBonus;

  const finalRate = Math.min(bonusCap, Math.max(0, rawFinal));

  return {
    nakedRate,
    rootDeduction: parseFloat(rootDeduction.toFixed(2)),
    finalRate:     parseFloat(finalRate.toFixed(2)),
    bonusCap,
    breakdown: {
      裸成功率: nakedRate,
      根基扣減: -parseFloat(rootDeduction.toFixed(2)),
      丹藥加成: bonuses.pillBonus,
      LBS加成:  bonuses.lbsBonus,
      機緣加持: bonuses.fortuneBonus,
    },
  };
}

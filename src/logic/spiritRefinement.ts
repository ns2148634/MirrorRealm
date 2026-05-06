/**
 * 2.3 靈根累積機制 + 4.2 靈力壓縮邏輯
 *
 * 靈根由兩個因子決定：
 *   機緣屬性 → 決定「哪類靈根比較容易累積」
 *   方位選擇 → 決定「累積多少」（最佳方位：大量；其他：少量）
 *
 * 靈根等級（化身後一次性結算）：
 *   天根：主屬性佔比 ≥ 70%
 *   地根：主屬性佔比 40~69%
 *   凡靈根：無單一屬性 ≥ 40%
 */

// ─── 靈根累積 ───────────────────────────────────────────────────────────────

export type SpiritElement = 'fire' | 'water' | 'wood' | 'metal' | 'earth';

/** 機緣屬性 → 最佳方位行動代碼 */
const OPTIMAL_ACTION: Record<SpiritElement, string> = {
  fire:  'advance',     // 深入探查（前進）
  water: 'observe',     // 迂迴觀察（靜觀）
  wood:  'conceal',     // 迂迴觀察（隱匿）
  metal: 'stone_test',  // 礦石試探（謹慎）
  earth: 'steady',      // 深入探查（穩步）
};

const GAIN_OPTIMAL = 10; // 最佳方位：大量
const GAIN_OTHER   = 2;  // 其他方位：少量

export interface SpiritRootState {
  affinities: Record<SpiritElement, number>;
}

/** 建立空靈根狀態（初始全部為 0） */
export function createEmptySpiritRootState(): SpiritRootState {
  return { affinities: { fire: 0, water: 0, wood: 0, metal: 0, earth: 0 } };
}

/**
 * 依方位選擇累積靈根（純函數，不修改原狀態）。
 * @param state              當前靈根累積狀態
 * @param opportunityElement 本次機緣的屬性
 * @param actionChosen       玩家選擇的行動代碼
 */
export function accumulateSpiritRoot(
  state: SpiritRootState,
  opportunityElement: SpiritElement,
  actionChosen: string,
): SpiritRootState {
  const gain = actionChosen === OPTIMAL_ACTION[opportunityElement]
    ? GAIN_OPTIMAL
    : GAIN_OTHER;

  return {
    affinities: {
      ...state.affinities,
      [opportunityElement]: (state.affinities[opportunityElement] ?? 0) + gain,
    },
  };
}

// ─── 靈根結算 ───────────────────────────────────────────────────────────────

export type SpiritRootGrade = 'celestial' | 'earth' | 'mortal';

export interface SpiritRootResult {
  mainElement: SpiritElement;
  ratio: number;           // 主屬性佔比（0~1）
  grade: SpiritRootGrade;
  gradeLabel: '天根' | '地根' | '凡靈根';
}

/** 化身後一次性結算靈根等級（僅呼叫一次）。 */
export function classifySpiritRoot(state: SpiritRootState): SpiritRootResult {
  const total = Object.values(state.affinities).reduce((s, v) => s + v, 0);
  if (total === 0) throw new Error('尚無靈根累積，無法結算');

  let mainElement: SpiritElement = 'fire';
  let maxVal = 0;
  for (const [el, val] of Object.entries(state.affinities) as [SpiritElement, number][]) {
    if (val > maxVal) { maxVal = val; mainElement = el; }
  }

  const ratio = maxVal / total;
  const grade: SpiritRootGrade =
    ratio >= 0.7 ? 'celestial' :
    ratio >= 0.4 ? 'earth'     : 'mortal';
  const gradeLabel =
    grade === 'celestial' ? '天根' :
    grade === 'earth'     ? '地根' : '凡靈根';

  return { mainElement, ratio, grade, gradeLabel };
}

// ─── 靈力壓縮邏輯（4.2 節）────────────────────────────────────────────────

export interface RealmConfig {
  coefficient: number;    // 境界係數（見第 4.2 節表格）
  discountFactor: number; // 靈石折扣係數
  mpCap: number;          // 靈力天花板（mp_cap）
}

export class SpiritRefinement {
  /**
   * 每點靈力增加所需基礎靈氣消耗。
   * 公式：境界係數 × (1 + (當前靈力值 / mp_cap)²)
   * 靈力越接近天花板，消耗越高（飽和懲罰）。
   */
  static calculateBaseQiCost(currentMp: number, config: RealmConfig): number {
    const saturation = currentMp / config.mpCap;
    return config.coefficient * (1 + Math.pow(saturation, 2));
  }

  /**
   * 投入靈石後實際靈氣消耗（最低 5 折）。
   * 公式：基礎消耗 × max(0.5, 1 − 投入靈石 / 靈石折扣係數)
   */
  static calculateFinalQiCost(
    baseQiCost: number,
    spiritStones: number,
    config: RealmConfig,
  ): number {
    const discount = Math.max(0.5, 1 - spiritStones / config.discountFactor);
    return Math.floor(baseQiCost * discount);
  }
}

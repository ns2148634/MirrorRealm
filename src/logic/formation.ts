/**
 * 8.2 神識增量 + 8.4 陣法熟練度
 *
 * 五行破陣局規則：
 * - 首通或突破歷史最深關數 → 補發該關段神識
 * - 已全通再挑戰 → 不給神識，僅給熟練度
 * - 每關通過 +1 熟練度計數；累積達門檻後解鎖效果
 */

// ─── 各難度每關神識獎勵表（1~5星 × 1~5關）────────────────────────────────

const SI_TABLE: Record<1 | 2 | 3 | 4 | 5, readonly number[]> = {
  1: [1,  1,  2,  2,  3 ],
  2: [2,  2,  3,  4,  5 ],
  3: [3,  4,  5,  7,  9 ],
  4: [5,  7,  9,  12, 16],
  5: [8,  11, 15, 20, 26],
};

// ─── 熟練度等級 ─────────────────────────────────────────────────────────────

export type Difficulty       = 1 | 2 | 3 | 4 | 5;
export type ProficiencyLevel = 'novice' | 'familiar' | 'proficient' | 'master';

export interface ProficiencyState {
  level: ProficiencyLevel;
  totalStageClears: number;  // 累積通過關數（熟練度計數器）
  stepBonus: number;         // 步數上限額外增加（0/+1/+2/+3）
  staminaMult: number;       // 精力消耗倍率（1.0 = 正常，0.5 = 減半）
  showChainHint: boolean;    // 是否顯示第一個連鎖提示
}

function buildProficiency(totalStageClears: number): ProficiencyState {
  let level: ProficiencyLevel;
  if      (totalStageClears >= 30) level = 'master';
  else if (totalStageClears >= 10) level = 'proficient';
  else if (totalStageClears >= 3)  level = 'familiar';
  else                              level = 'novice';

  return {
    level,
    totalStageClears,
    stepBonus:     level === 'master' ? 3 : level === 'proficient' ? 2 : level === 'familiar' ? 1 : 0,
    staminaMult:   level === 'master' ? 0.5 : 1.0,
    showChainHint: level === 'proficient' || level === 'master',
  };
}

// ─── 型別定義 ───────────────────────────────────────────────────────────────

export interface FormationInput {
  difficulty: Difficulty;
  clearedToStage: number;       // 本次最終破到第幾關（1~5）
  prevMaxStage: number;         // 歷史最深通過關數（0 = 未曾挑戰）
  isFullyClear: boolean;        // 此陣法是否已全通（5 關）
  prevTotalStageClears: number; // 累積歷史通過關數（熟練度計數器起始值）
}

export interface FormationResult {
  siGained: number;             // 本次獲得神識
  newMaxStage: number;          // 更新後的最深通過關數
  proficiency: ProficiencyState;
}

// ─── 核心函數 ───────────────────────────────────────────────────────────────

/**
 * 結算一次五行破陣局挑戰的神識獎勵與陣法熟練度。
 *
 * 神識發放邏輯：
 *   - 已全通（isFullyClear）：不給神識
 *   - 破到更深關數：補發 (prevMaxStage+1) ~ clearedToStage 的神識
 *   - 未超過歷史最深：不給神識
 *
 * 熟練度：每關通過 +1 計數，與神識是否發放無關。
 */
export function resolveFormation(input: FormationInput): FormationResult {
  const table = SI_TABLE[input.difficulty];
  if (!table) throw new Error(`未知陣法難度：${input.difficulty}`);

  const { clearedToStage, prevMaxStage, isFullyClear, prevTotalStageClears } = input;

  // 神識計算
  let siGained = 0;
  if (!isFullyClear && clearedToStage > prevMaxStage) {
    for (let stage = prevMaxStage + 1; stage <= clearedToStage; stage++) {
      siGained += table[stage - 1];
    }
  }

  // 熟練度：每關通過 +1
  const newTotalStageClears = prevTotalStageClears + clearedToStage;
  const newMaxStage         = Math.max(prevMaxStage, clearedToStage);

  return {
    siGained,
    newMaxStage,
    proficiency: buildProficiency(newTotalStageClears),
  };
}

/** 查詢某難度特定關卡的神識獎勵（用於 UI 預覽） */
export function getStageReward(difficulty: Difficulty, stage: number): number {
  const table = SI_TABLE[difficulty];
  if (!table || stage < 1 || stage > 5) return 0;
  return table[stage - 1];
}

/** 查詢某難度全通的神識總量 */
export function getFullClearTotalSI(difficulty: Difficulty): number {
  return (SI_TABLE[difficulty] ?? []).reduce((s, v) => s + v, 0);
}

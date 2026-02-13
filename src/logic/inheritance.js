import { MORTAL_LAWS } from '../constants';

/**
 * 遺產與轉世洗髓計算邏輯
 * @param {number} currentCash - 當世剩餘總現金
 * @param {Array} currentHeirlooms - 當世持有的珍寶清單
 * @param {Object} investment - 玩家計畫投入的洗髓金額 { physique: number, qi: number }
 * @returns {Object} 下一世的起始狀態
 */
export const calculateInheritance = (currentCash, currentHeirlooms, investment) => {
  const { AWAKENING, INHERITANCE } = MORTAL_LAWS;

  // 1. 驗證投資金額是否超過持有現金
  const totalInvestment = investment.physique + investment.qi;
  if (totalInvestment > currentCash) {
    throw new Error("投資金額不可超過持有現金。");
  }

  // 2. 計算洗髓獲得的屬性點 (高代價：3000換1)
  // 套用公式：Points = Investment / 3000，且不得超過上限 50
  const calculateBonus = (amount) => {
    const rawPoints = Math.floor(amount / AWAKENING.CASH_TO_STAT_COST);
    return Math.min(rawPoints, AWAKENING.STARTING_STAT_CAP);
  };

  const nextPhysiqueBonus = calculateBonus(investment.physique);
  const nextQiBonus = calculateBonus(investment.qi);

  // 3. 計算遺產稅 (50% 稅率)
  // 公式：(總現金 - 投資金額) * 50%
  const remainingCash = currentCash - totalInvestment;
  const inheritedCash = Math.floor(remainingCash * (1 - INHERITANCE.CASH_TAX));

  // 4. 珍寶傳承 (100% 繼承)
  const inheritedHeirlooms = [...currentHeirlooms];

  return {
    nextGeneration: {
      startingCash: inheritedCash,
      startingStats: {
        physique: nextPhysiqueBonus,
        qi: nextQiBonus
      },
      heirlooms: inheritedHeirlooms
    },
    report: {
      taxPaid: Math.ceil(remainingCash * INHERITANCE.CASH_TAX),
      investmentTotal: totalInvestment,
      efficiency: "高代價傳承已生效"
    }
  };
};
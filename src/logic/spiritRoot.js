import { MORTAL_LAWS } from '../constants';

/**
 * 靈根覺醒與洗髓結算邏輯
 * @param {Object} affinities - 五行親和度數值 { GOLD: number, WOOD: number, ... }
 * @returns {Object} 靈根結算結果
 */
export const calculateSpiritRoot = (affinities) => {
  const { SPIRIT_ROOT } = MORTAL_LAWS;
  
  // 1. 計算總親和度
  const totalAffinity = Object.values(affinities).reduce((sum, val) => sum + val, 0);

  // 2. 若完全沒有任何親和度 (防呆)
  if (totalAffinity === 0) {
    return {
      mainElement: 'NONE',
      purity: 0,
      grade: SPIRIT_ROOT.GRADES.G1,
      label: "凡根 (無屬性)"
    };
  }

  // 3. 找出佔比最高的屬性 (主屬性)
  let mainElementKey = 'GOLD';
  let maxVal = -1;

  for (const [element, value] of Object.entries(affinities)) {
    if (value > maxVal) {
      maxVal = value;
      mainElementKey = element;
    }
  }

  // 4. 計算純度 (Purity Percentage)
  const purity = (maxVal / totalAffinity) * 100;

  // 5. 判定靈根等級 (從最高等級往回找)
  const gradeKeys = Object.keys(SPIRIT_ROOT.GRADES).sort().reverse(); // G5, G4, G3...
  let finalGrade = SPIRIT_ROOT.GRADES.G1;

  for (const key of gradeKeys) {
    if (purity >= SPIRIT_ROOT.GRADES[key].req) {
      finalGrade = SPIRIT_ROOT.GRADES[key];
      break;
    }
  }

  return {
    element: SPIRIT_ROOT.ELEMENTS[mainElementKey],
    purity: purity.toFixed(2), // 格式化為兩位小數
    grade: finalGrade,
    description: `${SPIRIT_ROOT.ELEMENTS[mainElementKey].name}系 - ${finalGrade.name}`,
    bonus: finalGrade.bonus
  };
};
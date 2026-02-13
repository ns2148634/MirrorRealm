/**
 * 鏡界 (Mirror World) - 凡人天條完整版 (Constants)
 */

// 1. 時之法則：1天增加2歲
export const TIME_CONFIG = {
  START_AGE: 16,
  TOTAL_DAYS: 30,
  YEARS_PER_DAY: 2, 
  MAX_AGE: 76,
  FINAL_AGE: 76 
};

// 2. 身之法則：老化恢復率
export const STAMINA_CONFIG = {
  BASE_MAX: 100,
  RECOVERY_BASES: [
    { maxAge: 40, rate: 1.0 }, // 壯年
    { maxAge: 60, rate: 0.8 }, // 中年
    { maxAge: 76, rate: 0.5 }, // 晚年
  ]
};

// 3. 命之法則：修仙門檻與洗髓
export const AWAKENING_CONFIG = {
  STAT_THRESHOLD: 100,      // 體魄、真氣皆需達 100 才能感應靈根
  CASH_TO_STAT_COST: 3000,  // 每 3000 銀兩換 1 點初始屬性
  STARTING_STAT_CAP: 50,    // 初始投資上限
};

// 4. 財之法則：遺產繼承
export const INHERITANCE_CONFIG = {
  CASH_TAX: 0.5,            // 50% 遺產稅
  TREASURE_TAX: 0.0,        // 珍寶 100% 繼承
};

export const MORTAL_LAWS = {
  TIME: TIME_CONFIG,
  STAMINA: STAMINA_CONFIG,
  AWAKENING: AWAKENING_CONFIG,
  INHERITANCE: INHERITANCE_CONFIG,

  // 5. 靈之法則
  SPIRIT_ROOT: {
    ELEMENTS: {
      GOLD:  { name: '金', color: '#FFD700' },
      WOOD:  { name: '木', color: '#228B22' },
      WATER: { name: '水', color: '#1E90FF' },
      FIRE:  { name: '火', color: '#FF4500' },
      EARTH: { name: '土', color: '#8B4513' },
    },
    GRADES: {
      G1: { name: '雜靈根', req: 0,  bonus: 1.1 },
      G2: { name: '真靈根', req: 40, bonus: 1.3 },
      G3: { name: '地靈根', req: 60, bonus: 1.6 },
      G4: { name: '天靈根', req: 85, bonus: 2.0 },
      G5: { name: '仙靈根', req: 95, bonus: 3.0 },
    }
  },

  IDENTITY: {
    GENDER: {
      MALE:   { name: '男', physiqueBonus: 0, qiBonus: 0 },
      FEMALE: { name: '女', physiqueBonus: 0, qiBonus: 0 }
    }
  }
};
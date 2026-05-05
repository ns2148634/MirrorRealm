/**
 * 鏡界 (Mirror Realm) - 凡人天條完整版 (Constants)
 */

// 1. 時之法則：每日遊戲內增加 1 歲（現實 1 天 = 遊戲 1 歲）
export const TIME_CONFIG = {
  START_AGE:   16,
  TOTAL_DAYS:  64,   // 凡人期最多可玩 64 天（80-16）
  YEARS_PER_DAY: 1,
  MAX_AGE:     80,   // 凡人期壽元上限 80 歲
  FINAL_AGE:   80
};

// 2. 身之法則：老化恢復率
export const STAMINA_CONFIG = {
  BASE_MAX: 100,
  RECOVERY_BASES: [
    { maxAge:  40, rate: 1.0 }, // 壯年
    { maxAge:  60, rate: 0.8 }, // 中年
    { maxAge:  80, rate: 0.5 }, // 晚年
  ]
};

// 3. 命之法則：修仙門檻與洗髓
export const AWAKENING_CONFIG = {
  STAT_THRESHOLD:    100,   // 體魄、真氣皆需達 100 才能感應靈根
  CASH_TO_STAT_COST: 3000,  // 每 3000 銀兩換 1 點初始屬性
  STARTING_STAT_CAP: 50,    // 初始投資上限
};

// 4. 財之法則：遺產繼承（天道輪迴稅）
export const INHERITANCE_CONFIG = {
  CASH_TAX:    0.2,  // 20% 天道輪迴稅（銀兩與靈石）
  TREASURE_TAX: 0.0, // 儲物袋內物品 100% 繼承
};

// 5. 境界壽元對照表（依 realm_stage）
export const REALM_LIFESPAN = {
  '凡人':   80,
  '煉氣期': 120,
  '築基期': 250,
  '金丹期': 500,
  '元嬰期': 1000,
  '化神期': 2000,
};

export const MORTAL_LAWS = {
  TIME:        TIME_CONFIG,
  STAMINA:     STAMINA_CONFIG,
  AWAKENING:   AWAKENING_CONFIG,
  INHERITANCE: INHERITANCE_CONFIG,
  REALM_LIFESPAN,

  // 6. 靈之法則：靈根系統（三階制）
  SPIRIT_ROOT: {
    ELEMENTS: {
      GOLD:  { name: '金', color: '#FFD700' },
      WOOD:  { name: '木', color: '#228B22' },
      WATER: { name: '水', color: '#1E90FF' },
      FIRE:  { name: '火', color: '#FF4500' },
      EARTH: { name: '土', color: '#8B4513' },
    },
    // 以最高五行佔比判定靈根品階（最高屬性 / 五行總和 * 100）
    GRADES: {
      MIXED: {
        name:           '雜根',
        maxPercent:     49,    // 最高屬性佔比 < 50%
        cultivateBonus: -0.05, // 主功法修煉效率 -5%
        artsBonus:       0.20, // 百藝成長 +20%，萬用型
        note:           '逆天型主角模板，百藝流、商人流',
      },
      TRUE: {
        name:           '真根',
        maxPercent:     79,    // 最高屬性佔比 50%~79%
        cultivateBonus:  0.10, // 主屬性功法修煉效率 +10%
        artifactBonus:   0.10, // 對應屬性法寶效果 ×1.10
        note:           '穩定主流修士',
      },
      EARTH: {
        name:           '地根',
        maxPercent:     100,   // 最高屬性佔比 ≥ 80%
        cultivateBonus:  0.20, // 主屬性功法修煉效率 +20%
        artifactBonus:   0.15, // 對應屬性法寶效果 ×1.15
        offAttrPenalty: -0.10, // 非主屬性功法效率 -10%
        note:           '極端專精型',
      },
    },
    // 靈根影響上限：效率差距不超過 25%，不影響境界上限與飛升可能性
    MAX_EFFICIENCY_GAP: 0.25,
  },

  IDENTITY: {
    GENDER: {
      MALE:   { name: '男', physiqueBonus: 0, qiBonus: 0 },
      FEMALE: { name: '女', physiqueBonus: 0, qiBonus: 0 }
    }
  }
};

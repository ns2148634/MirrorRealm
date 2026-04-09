// server/services/craftingService.js
//
// 天地熔爐煉製邏輯
//
// 公式：
//   success_rate = min(0.95, base(0.40) + prof_general×0.003 + spec_prof×0.007)
//   quality_roll = random() × (1 + spec_prof×0.01)
//   品質對應: <0.5白 | <0.7綠 | <0.85藍 | <0.95紫 | ≥0.95金

import * as db from '../config/db.js';

// 主素材 → 煉製類別
function detectCategory(itemName) {
  if (/妖丹|靈丹|丹核|天材|地寶/.test(itemName))     return 'pill';
  if (/胚|素胚|毛坯|胚體|劍胚|刀胚|盾胚|甲胚|杖胚/.test(itemName)) return 'artifact';
  if (/符紙|靈符紙|符箓|符料/.test(itemName))         return 'talisman';
  if (/骨架|木偶|機關|素體|軀殼|傀儡素材/.test(itemName)) return 'puppet';
  return null;
}

// 類別 → DB 物品名稱（依品質）
const RESULT_BY_RARITY = {
  pill:     { white: '下品聚靈丹', green: '中品聚靈丹', blue: '上品聚靈丹', purple: '極品聚靈丹', gold: '傳說靈丹'  },
  artifact: { white: '下品靈器',   green: '中品靈器',   blue: '上品靈器',   purple: '極品靈器',   gold: '傳說靈器'  },
  talisman: { white: '下品符籙',   green: '中品符籙',   blue: '上品符籙',   purple: '極品符籙',   gold: '傳說符籙'  },
  puppet:   { white: '下品傀儡',   green: '中品傀儡',   blue: '上品傀儡',   purple: '極品傀儡',   gold: '傳說傀儡'  },
};

// 類別 → 專精欄位名稱
const SPEC_COL = {
  pill:     'prof_pill',
  artifact: 'prof_artifact',
  talisman: 'prof_talisman',
  puppet:   'prof_puppet',
};

// 品質判定（quality_roll 值 → rarity）
function rollToRarity(roll) {
  if (roll >= 0.95) return 'gold';
  if (roll >= 0.85) return 'purple';
  if (roll >= 0.70) return 'blue';
  if (roll >= 0.50) return 'green';
  return 'white';
}

const RARITY_LABEL = { white: '普通', green: '精良', blue: '稀有', purple: '珍稀', gold: '傳說' };

export async function craftItem(playerId, mainItemId, sub1ItemId, sub2ItemId) {
  if (!mainItemId) throw new Error('必須提供主素材');

  // ── 取玩家資料（包含熟練度）────────────────────────────────────
  const pResult = await db.query(
    `SELECT hp, max_hp, sp, max_sp, ep, max_ep,
            prof_general, prof_pill, prof_artifact, prof_talisman, prof_puppet
     FROM players WHERE id = $1`,
    [playerId]
  );
  if (pResult.rows.length === 0) throw new Error('找不到道友的命格');
  const player = pResult.rows[0];

  // ── 取素材物品資訊 ─────────────────────────────────────────────
  const itemIds = [mainItemId, sub1ItemId, sub2ItemId].filter(Boolean);
  const itemsResult = await db.query(
    `SELECT i.id, i.name, i.item_type, pi.quantity
     FROM player_inventory pi
     JOIN items i ON i.id = pi.item_id
     WHERE pi.player_id = $1 AND pi.item_id = ANY($2::uuid[])`,
    [playerId, itemIds]
  );
  const itemMap = Object.fromEntries(itemsResult.rows.map(r => [r.id, r]));

  const mainItem = itemMap[mainItemId];
  if (!mainItem) throw new Error('主素材不在背包中');
  if (mainItem.quantity < 1) throw new Error('主素材數量不足');

  // ── 判斷煉製類別 ───────────────────────────────────────────────
  const category = detectCategory(mainItem.name);
  if (!category) throw new Error(`【${mainItem.name}】不是有效的主素材（需要妖丹/胚體/符紙/素體類）`);

  // ── 計算成功率 ─────────────────────────────────────────────────
  const genProf  = player.prof_general ?? 0;
  const specProf = player[SPEC_COL[category]] ?? 0;
  const subCount = [sub1ItemId, sub2ItemId].filter(id => id && itemMap[id]).length;

  // 有副素材增加基礎成功率 (+5% each)
  const baseSR     = 0.40 + subCount * 0.05;
  const successRate = Math.min(0.95, baseSR + genProf * 0.003 + specProf * 0.007);

  // ── 擲骰 ──────────────────────────────────────────────────────
  const isSuccess = Math.random() < successRate;

  if (!isSuccess) {
    // 失敗：消耗主素材，通用熟練度 +1
    await deductItem(playerId, mainItemId, 1);
    if (sub1ItemId && itemMap[sub1ItemId]) await deductItem(playerId, sub1ItemId, 1);
    if (sub2ItemId && itemMap[sub2ItemId]) await deductItem(playerId, sub2ItemId, 1);
    await db.query(
      `UPDATE players SET prof_general = prof_general + 1 WHERE id = $1`,
      [playerId]
    );
    return {
      success:          false,
      message:          '天道不佑，此次煉製失敗，素材已損耗。',
      prof_general:     genProf + 1,
      spec_prof:        specProf,
      success_rate_pct: Math.round(successRate * 100),
    };
  }

  // ── 品質判定 ─────────────────────────────────────────────────
  // 副素材各提高品質上限 +0.1
  const qualityBonus = subCount * 0.1;
  const qualityRoll  = Math.random() * (1 + specProf * 0.01 + qualityBonus);
  const rarity       = rollToRarity(qualityRoll);
  const resultName   = RESULT_BY_RARITY[category][rarity];

  // ── 取得或建立結果物品 ────────────────────────────────────────
  const existingItem = await db.query(
    `SELECT id FROM items WHERE name = $1 LIMIT 1`,
    [resultName]
  );
  if (existingItem.rows.length === 0) throw new Error(`系統找不到【${resultName}】，請確認種子資料已匯入`);
  const resultItemId = existingItem.rows[0].id;

  // ── 消耗素材 ─────────────────────────────────────────────────
  await deductItem(playerId, mainItemId, 1);
  if (sub1ItemId && itemMap[sub1ItemId]) await deductItem(playerId, sub1ItemId, 1);
  if (sub2ItemId && itemMap[sub2ItemId]) await deductItem(playerId, sub2ItemId, 1);

  // ── 加入背包 ─────────────────────────────────────────────────
  await db.query(
    `INSERT INTO player_inventory (player_id, item_id, quantity)
     VALUES ($1, $2, 1)
     ON CONFLICT (player_id, item_id) DO UPDATE SET quantity = player_inventory.quantity + 1`,
    [playerId, resultItemId]
  );

  // ── 更新熟練度（成功 +2 通用 +3 專精）───────────────────────
  const specCol = SPEC_COL[category];
  await db.query(
    `UPDATE players
     SET prof_general = prof_general + 2,
         ${specCol}   = ${specCol} + 3
     WHERE id = $1`,
    [playerId]
  );

  return {
    success:          true,
    result_name:      resultName,
    result_rarity:    rarity,
    result_label:     RARITY_LABEL[rarity],
    category,
    message:          `煉製成功！獲得【${RARITY_LABEL[rarity]}】${resultName}`,
    prof_general:     genProf + 2,
    spec_prof:        specProf + 3,
    success_rate_pct: Math.round(successRate * 100),
    quality_roll:     Math.round(qualityRoll * 100) / 100,
  };
}

// 扣除背包物品（數量到 0 自動刪除）
async function deductItem(playerId, itemId, qty) {
  await db.query(
    `UPDATE player_inventory SET quantity = quantity - $1
     WHERE player_id = $2 AND item_id = $3`,
    [qty, playerId, itemId]
  );
  await db.query(
    `DELETE FROM player_inventory WHERE player_id = $1 AND item_id = $2 AND quantity <= 0`,
    [playerId, itemId]
  );
}

// 取玩家熟練度（供前端顯示）
export async function getProficiency(playerId) {
  const result = await db.query(
    `SELECT prof_general, prof_pill, prof_artifact, prof_talisman, prof_puppet
     FROM players WHERE id = $1`,
    [playerId]
  );
  if (result.rows.length === 0) throw new Error('找不到道友的命格');
  return result.rows[0];
}

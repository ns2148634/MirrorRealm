// server/services/lbsService.js
import * as db from '../config/db.js';
import { getGridId, getDistance, getOffsetCoord } from '../utils/geoUtils.js';
import { calculateOfflineDelta } from '../lib/recovery.js';
import crypto from 'crypto';
import { runCombat } from './combatService.js';

/**
 * 掃描冷卻說明：
 *   為防止玩家短時間內重複掃描反覆扣 EP，加入 60 秒玩家級冷卻。
 *   冷卻狀態存在 players.last_scan_time 欄位。
 *
 *   若尚未執行以下 migration，請先在 Supabase SQL Editor 執行：
 *     ALTER TABLE players ADD COLUMN IF NOT EXISTS last_scan_time TIMESTAMPTZ;
 *
 *   如果欄位不存在，查詢回傳 undefined，程式會直接跳過冷卻判定（優雅降級）。
 */
const SCAN_COOLDOWN_SEC = 60;

export async function performScan(playerId, lat, lng) {
  const playerResult = await db.query(
    `SELECT ep, max_ep, hp, max_hp, sp, max_sp, aura, realm_level,
            last_sync_time, last_scan_time
     FROM players WHERE id = $1`,
    [playerId]
  );
  if (playerResult.rows.length === 0) throw new Error('找不到道友的命格');

  const player = playerResult.rows[0];
  const now = new Date();

  if (player.last_scan_time) {
    const elapsed = (now - new Date(player.last_scan_time)) / 1000;
    if (elapsed < SCAN_COOLDOWN_SEC) {
      const remaining = Math.ceil(SCAN_COOLDOWN_SEC - elapsed);
      throw new Error(`靈覺尚未恢復，請稍後再次探索（剩餘 ${remaining} 秒）`);
    }
  }

  const afterDelta = calculateOfflineDelta(player, now);
  if (afterDelta.ep < 10) {
    await db.query(
      `UPDATE players SET hp=$1, sp=$2, ep=$3, last_sync_time=$4 WHERE id=$5`,
      [afterDelta.hp, afterDelta.sp, afterDelta.ep, now, playerId]
    );
    throw new Error('精力不足');
  }

  const gridId = getGridId(lat, lng);

  // 查詢活躍世界事件
  const eventResult = await db.query(
    `SELECT * FROM world_events WHERE is_active = true AND expires_at > now()`
  );

  // 找最近的事件
  let nearestEvent = null;
  let nearestDistance = Infinity;
  for (const event of eventResult.rows) {
    const dist = getDistance(lat, lng, event.lat, event.lng);
    if (dist < event.danger_radius && dist < nearestDistance) {
      nearestEvent = event;
      nearestDistance = dist;
    }
  }

  // 根據距離決定危險等級
  let zoneTier = 'safe';
  if (nearestEvent) {
    const ratio = nearestDistance / nearestEvent.danger_radius;
    if (ratio < 0.3)      zoneTier = 'extreme';
    else if (ratio < 0.6) zoneTier = 'danger';
    else                  zoneTier = 'mid';
  }

  // 時間疊加
  const hour = now.getHours();
  if (hour >= 23 || hour < 5) {
    if (zoneTier === 'safe')        zoneTier = 'mid';
    else if (zoneTier === 'mid')    zoneTier = 'danger';
    else if (zoneTier === 'danger') zoneTier = 'extreme';
  }

  // 危險等級對應突襲機率
  const ambushRate = { safe: 0, mid: 0.15, danger: 0.4, extreme: 0.7 };

  // 依境界決定可見節點相位
  const isMortal = (player.realm_level ?? 1) <= 1;
  const phaseFilter = isMortal ? `phase IN ('mortal', 'both')` : `phase IN ('immortal', 'both')`;

  // 生成節點（依相位篩選）
  const nodeCount = Math.floor(Math.random() * 5) + 3;
  const templates = await db.query(
    `SELECT * FROM lbs_node_templates WHERE ${phaseFilter} ORDER BY RANDOM() LIMIT $1`,
    [nodeCount]
  );

  // 節點平均分散在 360° 圓周上，加隨機 ±20° 擾動，距離 60–260m
  const totalNodes = templates.rows.length;
  const generatedNodes = templates.rows.map((tmpl, idx) => {
    const isAmbush = tmpl.node_type === '戰鬥' && Math.random() < ambushRate[zoneTier];
    const baseAngle = (idx / totalNodes) * 360;
    const angle     = (baseAngle + Math.random() * 40 - 20 + 360) % 360;
    const distM     = 60 + Math.random() * 200;
    const { lat: nodeLat, lng: nodeLng } = getOffsetCoord(lat, lng, distM, angle);
    return {
      instance_id:        crypto.randomUUID(),
      type:               tmpl.node_type,
      name:               isAmbush ? `【突襲】${tmpl.node_name}` : tmpl.node_name,
      description:        isAmbush
                            ? '煞氣驟然凝聚，妖獸已感應到你的神識！'
                            : tmpl.mud_texts[Math.floor(Math.random() * tmpl.mud_texts.length)],
      cost_sp:            tmpl.sp_cost,
      cost_hp:            tmpl.hp_cost,
      is_ambush:          isAmbush,
      expires_in_seconds: 600,
      node_lat:           nodeLat,
      node_lng:           nodeLng,
    };
  });

  // flush + 扣 EP
  const newEp = afterDelta.ep - 10;
  await db.query(
    `UPDATE players
     SET hp=$1, sp=$2, ep=$3, last_sync_time=$4, last_scan_time=$4
     WHERE id=$5`,
    [afterDelta.hp, afterDelta.sp, newEp, now, playerId]
  );

  return {
    ep_remaining:  newEp,
    aura_current:  player.aura,
    grid_id:       gridId,
    zone_tier:     zoneTier,
    nearest_event: nearestEvent ? {
      name:     nearestEvent.name,
      type:     nearestEvent.event_type,
      distance: Math.round(nearestDistance),
    } : null,
    yield_multiplier: 1.0,
    nodes:         generatedNodes,
  };
}

export async function performExecution(playerId, nodeType, nodeName, stance = 'balanced') {
    // 取得玩家當前狀態（含 last_sync_time，用於 delta flush）
    const playerResult = await db.query(
        `SELECT hp, max_hp, sp, max_sp, ep, max_ep, aura, last_sync_time
         FROM players WHERE id = $1`,
        [playerId]
    );
    if (playerResult.rows.length === 0) throw new Error('找不到道友的命格');

    const player     = playerResult.rows[0];
    const now        = new Date();
    const afterDelta = calculateOfflineDelta(player, now);

    let costSp        = 0;
    let costHp        = 0;
    let rewardMessage = '';
    let itemName      = null;
    let spiritRootElement = null;
    let spiritRootGain    = 0;

    if (nodeType === '拾荒' || nodeType === '勞動') {
        costSp = 10;
        if (afterDelta.sp < costSp) throw new Error('體力不足，無法進行拾荒勞動');

        if (Math.random() < 0.7) {
            itemName      = '破銅爛鐵';
            rewardMessage = `你在【${nodeName}】翻找了一番，消耗 10 點體力，獲得了 [${itemName}]。`;
        } else {
            itemName      = '下品靈石';
            rewardMessage = `機緣巧合！你在【${nodeName}】深處感受到微弱靈氣，消耗 10 點體力，獲得了 [${itemName}]！`;
        }

    } else if (nodeType === '勞作') {
        // 凡人期勞作：消耗體力，積累土系靈根
        costSp = 8;
        if (afterDelta.sp < costSp) throw new Error('體力不足，無法勞作');
        spiritRootElement = '土';
        spiritRootGain    = Math.floor(Math.random() * 3) + 2; // 2–4
        if (Math.random() < 0.6) {
            itemName      = '破銅爛鐵';
            rewardMessage = `你在【${nodeName}】埋頭勞作，汗水浸透衣衫，收獲了些許廢料。靈根悄然積聚。`;
        } else {
            rewardMessage = `你在【${nodeName}】辛苦一番，雖無所獲，卻感到筋骨愈發紮實。`;
        }

    } else if (nodeType === '見聞') {
        // 凡人期見聞：無消耗，積累對應靈根
        const ELEMENT_BY_PLACE = { '廟宇': '金', '公園': '木', '河邊': '水', '市場': '土', 'default': '木' };
        const matchedElement = Object.keys(ELEMENT_BY_PLACE).find(k => nodeName.includes(k)) ?? 'default';
        spiritRootElement = ELEMENT_BY_PLACE[matchedElement];
        spiritRootGain    = Math.floor(Math.random() * 2) + 1; // 1–2
        rewardMessage = `你在【${nodeName}】駐足觀察，心有所感。某種無形的力量在體內緩緩流動。`;

    } else if (nodeType === '衝突') {
        // 凡人期衝突：與地痞流氓等交涉或對抗，積累金系靈根
        costSp = 5;
        if (afterDelta.sp < costSp) throw new Error('體力不足，無力應對衝突');
        spiritRootElement = '金';
        spiritRootGain    = Math.floor(Math.random() * 4) + 3; // 3–6（衝突磨礪更快）
        const outcomes = [
            `你在【${nodeName}】遭遇地痞挑釁，以三言兩語化解，對方悻悻離去。`,
            `你在【${nodeName}】被人堵路，鬥智鬥勇後全身而退，膽氣愈發充盈。`,
            `你在【${nodeName}】見義勇為，替人解圍，對方感激離去。`,
        ];
        rewardMessage = outcomes[Math.floor(Math.random() * outcomes.length)];

    } else if (nodeType === '妖獸') {
        // 修仙期妖獸：委派 ATB 戰鬥引擎
        return await runCombat(playerId, stance);

    } else if (nodeType === '機緣') {
        // 修仙期機緣：靈氣或物品獎勵
        const chanceRoll = Math.random();
        if (chanceRoll < 0.4) {
            itemName      = '下品靈石';
            rewardMessage = `天機流轉，你在【${nodeName}】感應到一絲靈機，得了一枚靈石。`;
        } else if (chanceRoll < 0.7) {
            itemName      = '聚氣丹';
            rewardMessage = `緣法所至，你在【${nodeName}】拾得一枚聚氣丹，靈氣充盈。`;
        } else {
            rewardMessage = `你在【${nodeName}】感悟天地，雖無物質所得，道心卻更為堅定。`;
        }

    } else if (nodeType === '戰鬥') {
        // 相容舊節點類型
        return await runCombat(playerId, stance);

    } else {
        rewardMessage = `你在【${nodeName}】靜坐片刻，心境似乎有所提升。`;
    }

    // flush delta + 扣除資源（一次 UPDATE，同時更新 last_sync_time）
    const newHp = Math.max(0, afterDelta.hp - costHp);
    const newSp = Math.max(0, afterDelta.sp - costSp);

    await db.query(
        `UPDATE players SET hp = $1, sp = $2, ep = $3, last_sync_time = $4 WHERE id = $5`,
        [newHp, newSp, afterDelta.ep, now, playerId]
    );

    // 寫入背包（物品名稱查 id，ON CONFLICT +1）
    if (itemName) {
        await db.query(
            `INSERT INTO player_inventory (player_id, item_id, quantity)
             SELECT $1, id, 1 FROM items WHERE name = $2
             ON CONFLICT (player_id, item_id)
             DO UPDATE SET quantity = player_inventory.quantity + 1`,
            [playerId, itemName]
        );
    }

    // 凡人期靈根積累（僅在有元素時寫入）
    const ELEMENT_COL = { '木': 'sr_wood', '火': 'sr_fire', '水': 'sr_water', '金': 'sr_metal', '土': 'sr_earth' };
    if (spiritRootElement && spiritRootGain > 0 && ELEMENT_COL[spiritRootElement]) {
        const col = ELEMENT_COL[spiritRootElement];
        await db.query(
            `UPDATE players SET ${col} = COALESCE(${col}, 0) + $1 WHERE id = $2`,
            [spiritRootGain, playerId]
        );
    }

    return {
        cost_hp:           costHp,
        cost_sp:           costSp,
        hp:                newHp,
        sp:                newSp,
        ep:                afterDelta.ep,
        message:           rewardMessage,
        item_dropped:      itemName,
        battleLog:         null,
        spirit_root_gain:  spiritRootElement ? { element: spiritRootElement, value: spiritRootGain } : null,
    };
}

// server/services/lbsService.js
import * as db from '../config/db.js';
import { getGridId, getDistance, getOffsetCoord, getBearing } from '../utils/geoUtils.js';
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

// 聲望等級對照
const PRESTIGE_LEVELS = [
  { level: 0, min: 0,    title: '無名之輩' },
  { level: 1, min: 100,  title: '初出茅廬' },
  { level: 2, min: 500,  title: '小有名氣' },
  { level: 3, min: 2000, title: '聲名遠播' },
  { level: 4, min: 5000, title: '名震一方' },
];
function getPrestigeLevel(prestige) {
  let result = PRESTIGE_LEVELS[0];
  for (const tier of PRESTIGE_LEVELS) {
    if (prestige >= tier.min) result = tier;
  }
  return result;
}

export async function performScan(playerId, lat, lng) {
  const playerResult = await db.query(
    `SELECT ep, max_ep, hp, max_hp, sp, max_sp, aura, realm_level, mind,
            prestige, springs_claimed_today, springs_reset_date,
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

  // ── 格子重複探索懲罰 ─────────────────────────────────────────────
  // 0–10 分鐘：10%；10–30 分鐘：40%；>30 分鐘：100%
  let yieldMultiplier = 1.0;
  let repeatMessage   = null;
  const gridScanResult = await db.query(
    `SELECT scanned_at FROM player_grid_scans WHERE player_id = $1 AND grid_id = $2`,
    [playerId, gridId]
  );
  if (gridScanResult.rows.length > 0) {
    const elapsedMin = (now - new Date(gridScanResult.rows[0].scanned_at)) / 60000;
    if (elapsedMin < 10) {
      yieldMultiplier = 0.1;
      repeatMessage   = `此地靈氣尚未恢復（${Math.ceil(10 - elapsedMin)} 分後恢復四成）`;
    } else if (elapsedMin < 30) {
      yieldMultiplier = 0.4;
      repeatMessage   = `此地靈氣部分恢復（${Math.ceil(30 - elapsedMin)} 分後完全重置）`;
    }
  }

  // 查詢活躍世界事件
  const eventResult = await db.query(
    `SELECT * FROM world_events WHERE is_active = true AND expires_at > now()`
  );

  // 找最近的事件（在危險半徑內）
  let nearestEvent = null;
  let nearestDistance = Infinity;
  for (const event of eventResult.rows) {
    const dist = getDistance(lat, lng, event.lat, event.lng);
    if (dist < event.danger_radius && dist < nearestDistance) {
      nearestEvent = event;
      nearestDistance = dist;
    }
  }

  // ── 麵包屑：掃描範圍外的世界事件，30% 機率出現方向提示 ──────────
  const BREADCRUMB_CHANCE = 0.30;

  const breadcrumbs = [];
  for (const event of eventResult.rows) {
    const dist = getDistance(lat, lng, event.lat, event.lng);
    // 只對掃描範圍外的事件產生麵包屑
    if (dist < event.danger_radius) continue;
    if (Math.random() > BREADCRUMB_CHANCE) continue;

    const angle = getBearing(lat, lng, event.lat, event.lng);
    const distDesc = dist < 500 ? '近處' : dist < 2000 ? '不遠' : dist < 5000 ? '遠方' : '極遠處';

    breadcrumbs.push({
      angle:     Math.round(angle),
      dist_desc: distDesc,
      type:      event.event_type ?? '異象',
    });
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

  // 突襲機率：純粹由危險等級決定，觸發即強制戰鬥
  const AMBUSH_RATE = { safe: 0, mid: 0.15, danger: 0.40, extreme: 0.70 };
  const finalAmbushRate = AMBUSH_RATE[zoneTier] ?? 0;

  // 依境界決定可見節點相位
  const isMortal = (player.realm_level ?? 1) <= 1;
  const phaseFilter = isMortal ? `phase IN ('mortal', 'both')` : `phase IN ('immortal', 'both')`;

  // 生成節點（依相位篩選 + 重複懲罰）
  const baseNodeCount = Math.floor(Math.random() * 5) + 3;
  const nodeCount = Math.max(1, Math.round(baseNodeCount * yieldMultiplier));
  const templates = await db.query(
    `SELECT * FROM lbs_node_templates WHERE ${phaseFilter} ORDER BY RANDOM() LIMIT $1`,
    [nodeCount]
  );

  // 探索距離 = 100m（基礎）+ mind/50 × 100m，上限 500m
  const mind        = player.mind ?? 0;
  const minDistM    = 40;
  const maxDistM    = Math.min(500, 100 + (mind / 50) * 100);

  // 節點平均分散在 360° 圓周上，加隨機 ±20° 擾動
  const totalNodes = templates.rows.length;
  const generatedNodes = templates.rows.map((tmpl, idx) => {
    const isAmbush = tmpl.node_type === '妖獸' && Math.random() < finalAmbushRate;
    const baseAngle = (idx / totalNodes) * 360;
    const angle     = (baseAngle + Math.random() * 40 - 20 + 360) % 360;
    const distM     = minDistM + Math.random() * (maxDistM - minDistM);
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

  // ── 靈泉生成（個人化，每日上限 3 + realm_level）────────────────────
  const springRate   = { safe: 0.10, mid: 0.15, danger: 0.20, extreme: 0.30 };
  const maxSprings   = 3 + (player.realm_level ?? 1);
  const todayDate    = now.toISOString().slice(0, 10);
  const springsToday = (player.springs_reset_date?.toISOString?.()?.slice(0, 10) === todayDate)
    ? (player.springs_claimed_today ?? 0) : 0;

  if (springsToday < maxSprings && Math.random() < (springRate[zoneTier] ?? 0.1)) {
    const auraAmount = Math.floor(Math.random() * 131) + 20; // 20–150
    const springNames = ['清靈泉', '玄靈泉', '碧靈泉', '金靈泉', '幽靈泉'];
    const angle  = Math.random() * 360;
    const distM  = minDistM + Math.random() * (maxDistM - minDistM);
    const { lat: sLat, lng: sLng } = getOffsetCoord(lat, lng, distM, angle);
    generatedNodes.push({
      instance_id:        crypto.randomUUID(),
      type:               '靈泉',
      name:               springNames[Math.floor(Math.random() * springNames.length)],
      description:        `泉水潺潺，靈氣充盈，可吸收 ${auraAmount} 點靈氣。`,
      aura_amount:        auraAmount,
      cost_sp:            0,
      cost_hp:            0,
      is_ambush:          false,
      expires_in_seconds: 600,
      node_lat:           sLat,
      node_lng:           sLng,
    });
  }

  // ── 道友生成（全服隨機，15% 機率）──────────────────────────────────
  if (Math.random() < 0.15) {
    const targetResult = await db.query(
      `SELECT id, name, realm_level, prestige,
              COALESCE(rt.name, '凡人') AS realm_name
       FROM players p
       LEFT JOIN realm_templates rt ON rt.level = p.realm_level
       WHERE p.id != $1
       ORDER BY RANDOM() LIMIT 1`,
      [playerId]
    );
    if (targetResult.rows.length > 0) {
      const target     = targetResult.rows[0];
      const presLvl    = getPrestigeLevel(target.prestige);
      const angle  = Math.random() * 360;
      const distM  = minDistM + Math.random() * (maxDistM - minDistM);
      const { lat: dLat, lng: dLng } = getOffsetCoord(lat, lng, distM, angle);
      generatedNodes.push({
        instance_id:        crypto.randomUUID(),
        type:               '道友',
        name:               target.name,
        description:        `${target.realm_name} · ${presLvl.title}`,
        target_player_id:   target.id,
        target_prestige:    target.prestige,
        target_prestige_level: presLvl.level,
        target_realm_level: target.realm_level ?? 1,
        cost_sp:            0,
        cost_hp:            0,
        is_ambush:          false,
        expires_in_seconds: 600,
        node_lat:           dLat,
        node_lng:           dLng,
      });
    }
  }

  // flush + 扣 EP
  const newEp = afterDelta.ep - 10;
  await db.query(
    `UPDATE players
     SET hp=$1, sp=$2, ep=$3, last_sync_time=$4, last_scan_time=$4
     WHERE id=$5`,
    [afterDelta.hp, afterDelta.sp, newEp, now, playerId]
  );

  // 更新格子掃描記錄
  await db.query(
    `INSERT INTO player_grid_scans (player_id, grid_id, scanned_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (player_id, grid_id) DO UPDATE SET scanned_at = $3`,
    [playerId, gridId, now]
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
    yield_multiplier: yieldMultiplier,
    repeat_message:  repeatMessage,
    scan_range_m:    Math.round(maxDistM),
    breadcrumbs:     breadcrumbs,
    nodes:           generatedNodes,
  };
}

export async function performExecution(playerId, nodeType, nodeName, stance = 'balanced', options = {}) {
    // 取得玩家當前狀態（含 last_sync_time，用於 delta flush）
    const playerResult = await db.query(
        `SELECT hp, max_hp, sp, max_sp, ep, max_ep, aura, realm_level,
                prestige, sha_qi, springs_claimed_today, springs_reset_date,
                last_sync_time
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

    } else if (nodeType === '靈泉') {
        // 每日上限檢查
        const todayDate    = now.toISOString().slice(0, 10);
        const resetDate    = player.springs_reset_date?.toISOString?.()?.slice(0, 10);
        const claimedToday = resetDate === todayDate ? (player.springs_claimed_today ?? 0) : 0;
        const maxSprings   = 3 + (player.realm_level ?? 1);
        if (claimedToday >= maxSprings) throw new Error(`今日靈泉已採盡（上限 ${maxSprings} 處）`);

        const auraGain = options.aura_amount ?? 50;
        const newAura  = Math.min(player.aura + auraGain, player.max_aura ?? 9999);

        await db.query(
            `UPDATE players SET aura = $1,
                springs_claimed_today = $2,
                springs_reset_date    = $3,
                last_sync_time        = $4
             WHERE id = $5`,
            [newAura, claimedToday + 1, todayDate, now, playerId]
        );

        return {
            cost_hp: 0, cost_sp: 0,
            hp: afterDelta.hp, sp: afterDelta.sp, ep: afterDelta.ep,
            aura: newAura,
            message:      `你沉浸於靈泉之中，吸收了 ${auraGain} 點靈氣（今日已採 ${claimedToday + 1}/${maxSprings}）。`,
            item_dropped: null,
            battleLog:    null,
            spirit_root_gain: null,
        };

    } else if (nodeType === '道友') {
        const { target_player_id, pvp_type = 'spar' } = options;
        if (!target_player_id) throw new Error('目標道友資訊遺失');

        // 取得目標玩家戰鬥屬性
        const targetResult = await db.query(
            `SELECT id, name, attack, defense, hp, max_hp, realm_level, prestige
             FROM players WHERE id = $1`,
            [target_player_id]
        );
        if (targetResult.rows.length === 0) throw new Error('目標道友已離去');
        const target = targetResult.rows[0];

        // 用 ATB 引擎模擬戰鬥（以目標玩家數值為敵方）
        const combatResult = await runCombat(playerId, stance, {
            name:          target.name,
            hp:            target.hp,
            max_hp:        target.max_hp,
            attack:        target.attack,
            defense:       target.defense,
            realm_level:   target.realm_level ?? 1,
            mind:          0,
            element:       null,
            skills:        [],
            exp_reward:    0,
            drop_item_name: null,
            drop_rate:     0,
        });

        const win = combatResult.outcome === 'win';
        const myPrestigeLevel  = getPrestigeLevel(player.prestige ?? 0).level;
        const tgtPrestigeLevel = getPrestigeLevel(target.prestige ?? 0).level;

        let prestigeDelta = 0;
        let shaqiDelta    = 0;
        let itemLost      = null;

        if (pvp_type === 'spar') {
            // 切磋：贏且對方聲望 >= 自己才加聲望
            if (win && tgtPrestigeLevel >= myPrestigeLevel) {
                prestigeDelta = (tgtPrestigeLevel - myPrestigeLevel + 1) * 20;
            }
        } else if (pvp_type === 'plunder') {
            if (win) {
                shaqiDelta = 30;
                // 隨機奪取目標一件素材
                const itemResult = await db.query(
                    `SELECT pi.item_id, i.name FROM player_inventory pi
                     JOIN items i ON i.id = pi.item_id
                     WHERE pi.player_id = $1 AND pi.quantity > 0
                     ORDER BY RANDOM() LIMIT 1`,
                    [target.id]
                );
                if (itemResult.rows.length > 0) {
                    itemLost = itemResult.rows[0].name;
                    // 從目標背包扣除
                    await db.query(
                        `UPDATE player_inventory SET quantity = quantity - 1
                         WHERE player_id = $1 AND item_id = $2`,
                        [target.id, itemResult.rows[0].item_id]
                    );
                    // 加入自己背包
                    await db.query(
                        `INSERT INTO player_inventory (player_id, item_id, quantity)
                         VALUES ($1, $2, 1)
                         ON CONFLICT (player_id, item_id)
                         DO UPDATE SET quantity = player_inventory.quantity + 1`,
                        [playerId, itemResult.rows[0].item_id]
                    );
                }
            } else {
                shaqiDelta = -10;
                // 自己隨機掉一件素材
                const itemResult = await db.query(
                    `SELECT pi.item_id, i.name FROM player_inventory pi
                     JOIN items i ON i.id = pi.item_id
                     WHERE pi.player_id = $1 AND pi.quantity > 0
                     ORDER BY RANDOM() LIMIT 1`,
                    [playerId]
                );
                if (itemResult.rows.length > 0) {
                    itemLost = itemResult.rows[0].name;
                    await db.query(
                        `UPDATE player_inventory SET quantity = quantity - 1
                         WHERE player_id = $1 AND item_id = $2`,
                        [playerId, itemResult.rows[0].item_id]
                    );
                }
            }
        }

        // 寫入 pvp_logs + 更新聲望/煞氣
        await db.query(
            `INSERT INTO pvp_logs (attacker_id, defender_id, pvp_type, outcome, prestige_delta, sha_qi_delta, item_lost)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [playerId, target.id, pvp_type, win ? 'win' : 'lose', prestigeDelta, shaqiDelta, itemLost]
        );
        if (prestigeDelta !== 0 || shaqiDelta !== 0) {
            await db.query(
                `UPDATE players SET prestige = GREATEST(0, prestige + $1),
                                    sha_qi   = GREATEST(0, sha_qi   + $2)
                 WHERE id = $3`,
                [prestigeDelta, shaqiDelta, playerId]
            );
        }

        return {
            ...combatResult,
            pvp_type,
            prestige_delta: prestigeDelta,
            sha_qi_delta:   shaqiDelta,
            item_lost:      itemLost,
            target_name:    target.name,
        };

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

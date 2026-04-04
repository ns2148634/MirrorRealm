// server/services/lbsService.js
import * as db from '../config/db.js';
import { getGridId } from '../utils/geoUtils.js';
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
    // Step 1: 讀取玩家資源 + 冷卻時間戳
    const playerResult = await db.query(
        `SELECT ep, max_ep, hp, max_hp, sp, max_sp, aura, last_sync_time, last_scan_time
         FROM players WHERE id = $1`,
        [playerId]
    );
    if (playerResult.rows.length === 0) throw new Error('找不到道友的命格');

    const player = playerResult.rows[0];
    const now    = new Date();

    // Step 2: 冷卻判定（last_scan_time 欄位存在時才檢查）
    if (player.last_scan_time) {
        const elapsed = (now - new Date(player.last_scan_time)) / 1000;
        if (elapsed < SCAN_COOLDOWN_SEC) {
            const remaining = Math.ceil(SCAN_COOLDOWN_SEC - elapsed);
            throw new Error(`靈覺尚未恢復，請稍後再次探索（剩餘 ${remaining} 秒）`);
        }
    }

    // Step 3: flush 離線 delta，以真實 EP 判斷是否足夠
    const afterDelta = calculateOfflineDelta(player, now);

    if (afterDelta.ep < 10) {
        // 先把 delta flush 寫回（避免下次又重算），再拋錯
        await db.query(
            `UPDATE players SET hp = $1, sp = $2, ep = $3, last_sync_time = $4 WHERE id = $5`,
            [afterDelta.hp, afterDelta.sp, afterDelta.ep, now, playerId]
        );
        throw new Error('精力不足');
    }

    // Step 4: 網格轉換
    const gridId = getGridId(lat, lng);

    // Step 5: 隨機生成 3~7 個節點
    const nodeCount   = Math.floor(Math.random() * 5) + 3;
    const templates   = await db.query(
        `SELECT * FROM lbs_node_templates ORDER BY RANDOM() LIMIT $1`,
        [nodeCount]
    );

    const generatedNodes = templates.rows.map((tmpl) => ({
        instance_id:        crypto.randomUUID(),
        type:               tmpl.node_type,
        name:               tmpl.node_name,
        description:        tmpl.mud_texts[Math.floor(Math.random() * tmpl.mud_texts.length)],
        cost_sp:            tmpl.sp_cost,
        cost_hp:            tmpl.hp_cost,
        expires_in_seconds: 600,
    }));

    // Step 6: flush delta + 扣 EP + 更新 last_scan_time（一次 UPDATE）
    const newEp = afterDelta.ep - 10;
    await db.query(
        `UPDATE players
         SET hp = $1, sp = $2, ep = $3, last_sync_time = $4, last_scan_time = $4
         WHERE id = $5`,
        [afterDelta.hp, afterDelta.sp, newEp, now, playerId]
    );

    return {
        ep_remaining:     newEp,
        aura_current:     player.aura,
        grid_id:          gridId,
        yield_multiplier: 1.0,
        nodes:            generatedNodes,
    };
}

export async function performExecution(playerId, nodeType, nodeName) {
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
    } else if (nodeType === '戰鬥') {
        // 戰鬥節點委派給完整的回合制戰鬥引擎
        return await runCombat(playerId);
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
            `INSERT INTO player_items (player_id, item_id, quantity)
             SELECT $1, id, 1 FROM items WHERE name = $2
             ON CONFLICT (player_id, item_id)
             DO UPDATE SET quantity = player_items.quantity + 1`,
            [playerId, itemName]
        );
    }

    return {
        cost_hp:      costHp,
        cost_sp:      costSp,
        hp:           newHp,
        sp:           newSp,
        ep:           afterDelta.ep,
        message:      rewardMessage,
        item_dropped: itemName,
        battleLog:    null,
    };
}

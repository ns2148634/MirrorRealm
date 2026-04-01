import * as db from '../config/db.js';
import { getGridId } from '../utils/geoUtils.js';
import crypto from 'crypto';
import { runCombat } from './combatService.js';

export async function performScan(playerId, lat, lng) {
    // --- Step 1: 資源驗證 ---
    const playerResult = await db.query("SELECT ep, mind FROM players WHERE id = $1", [playerId]);

    // 如果資料庫找不到這個人
    if (playerResult.rows.length === 0) {
        throw new Error("找不到道友的命格");
    }

    const player = playerResult.rows[0];

    if (player.ep < 10) {
        throw new Error("精力不足");
    }

    // --- Step 2: 網格轉換與冷卻判定 ---
    const gridId = getGridId(lat, lng);

    // 這裡我先註解掉歷史紀錄的查詢，因為我們還沒建 player_grid_history 這張表
    // 等跑通了我們再來加上冷卻機制！
    let yieldMultiplier = 1.0;

    // --- Step 3: 隨機生成 3~7 個節點 ---
    const nodeCount = Math.floor(Math.random() * 5) + 3;
    const generatedNodes = [];

    const templates = await db.query(`SELECT * FROM lbs_node_templates ORDER BY RANDOM() LIMIT $1`, [nodeCount]);

    for (let tmpl of templates.rows) { // 注意：pg 套件回傳的資料在 .rows 裡面
        const instanceId = crypto.randomUUID();

        generatedNodes.push({
            instance_id: instanceId,
            type: tmpl.node_type,
            name: tmpl.node_name,
            description: tmpl.mud_texts[Math.floor(Math.random() * tmpl.mud_texts.length)],
            cost_sp: tmpl.sp_cost,
            cost_hp: tmpl.hp_cost,
            expires_in_seconds: 600
        });
    }

    // --- Step 4: 扣除資源、增加神識 ---
    await db.query("UPDATE players SET ep = ep - 10, mind = mind + 1 WHERE id = $1", [playerId]);

    // --- Step 5: 回傳結果給前端 ---
    return {
        ep_remaining: player.ep - 10,
        mind_current: player.mind + 1,
        grid_id: gridId,
        yield_multiplier: yieldMultiplier,
        nodes: generatedNodes
    };
}

export async function performExecution(playerId, nodeType, nodeName) {
    // 1. 取得玩家當前狀態
    const playerResult = await db.query("SELECT hp, sp FROM players WHERE id = $1", [playerId]);
    if (playerResult.rows.length === 0) throw new Error("找不到道友的命格");
    const player = playerResult.rows[0];

    // 2. 根據節點類型設定消耗與掉落邏輯
    let costSp = 0;
    let costHp = 0;
    let rewardMessage = "";
    let itemName = null;

    if (nodeType === '拾荒' || nodeType === '勞動') {
        costSp = 10;
        if (player.sp < costSp) throw new Error("體力不足，無法進行拾荒勞動");

        // 70% 機率拿到破銅爛鐵，30% 機率拿到下品靈石
        if (Math.random() < 0.7) {
            itemName = "破銅爛鐵";
            rewardMessage = `你在【${nodeName}】翻找了一番，消耗 10 點體力，獲得了 [${itemName}]。`;
        } else {
            itemName = "下品靈石";
            rewardMessage = `機緣巧合！你在【${nodeName}】深處感受到微弱靈氣，消耗 10 點體力，獲得了 [${itemName}]！`;
        }
    }
    else if (nodeType === '戰鬥') {
        // 戰鬥節點：委派給完整的回合制戰鬥引擎
        // combatService 內部自行讀取玩家屬性、挑選敵人、迴圈模擬並寫回資料庫
        return await runCombat(playerId);
    }
    else {
        // 機緣或其他類型
        rewardMessage = `你在【${nodeName}】靜坐片刻，心境似乎有所提升。`;
    }

    // 3. 扣除玩家資源 (非戰鬥節點)
    await db.query(
        "UPDATE players SET hp = hp - $1, sp = sp - $2 WHERE id = $3",
        [costHp, costSp, playerId]
    );

    // 4. 真實寫入背包 (透過物品名稱查 id，ON CONFLICT 直接 +1)
    if (itemName) {
        await db.query(
            `INSERT INTO player_items (player_id, item_id, quantity)
             SELECT $1, id, 1 FROM items WHERE name = $2
             ON CONFLICT (player_id, item_id)
             DO UPDATE SET quantity = player_items.quantity + 1`,
            [playerId, itemName]
        );
    }

    // 5. 回傳結算結果 (非戰鬥節點)
    return {
        cost_hp: costHp,
        cost_sp: costSp,
        message: rewardMessage,
        item_dropped: itemName,
        battleLog: null,
    };
}

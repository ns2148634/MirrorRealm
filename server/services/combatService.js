// server/services/combatService.js
import * as db from '../config/db.js';

const MAX_ROUNDS = 50; // 安全上限，防止無限迴圈

/**
 * 根據攻防計算單次傷害，最低造成 1 點
 */
function calcDamage(attackerAtk, defenderDef) {
    return Math.max(1, attackerAtk - defenderDef);
}

/**
 * 依日誌文字內容回傳前端用的 type 標籤，
 * 前端據此決定顯示顏色。
 * 'player-atk' | 'enemy-atk' | 'outcome-win' | 'outcome-lose'
 * | 'reward' | 'header' | 'info'
 */
function classifyLine(line) {
    if (line.startsWith('━━━ 勝利'))   return 'outcome-win';
    if (line.startsWith('━━━ 重傷'))   return 'outcome-lose';
    if (line.includes('▸ 你'))         return 'player-atk';
    if (line.includes('▸ 【'))         return 'enemy-atk';
    if (line.startsWith('獲得') || line.startsWith('掉落')) return 'reward';
    if (line.startsWith('【') || line.startsWith('你做好')) return 'header';
    return 'info';
}

/**
 * 核心戰鬥函式。從資料庫讀取玩家與隨機敵人，
 * 跑完整回合迴圈，結算後寫回資料庫，最終回傳完整戰鬥結果。
 */
export async function runCombat(playerId) {
    // ── Step 1：讀取玩家戰鬥屬性 ───────────────────────────────
    const playerResult = await db.query(
        `SELECT hp, sp, attack, defense, mind FROM players WHERE id = $1`,
        [playerId]
    );
    if (playerResult.rows.length === 0) throw new Error('找不到道友的命格');

    const playerRow = playerResult.rows[0];
    if (playerRow.hp <= 5)  throw new Error('氣血耗盡，已無力再戰');
    if (playerRow.sp < 10)  throw new Error('體力不足，強行戰鬥恐有性命之憂');

    // ── Step 2：隨機抽取一隻妖獸 ─────────────────────────────
    const enemyResult = await db.query(
        `SELECT e.*, i.name AS drop_item_name
         FROM enemies e
         LEFT JOIN items i ON e.drop_item_id = i.id
         ORDER BY RANDOM()
         LIMIT 1`
    );
    if (enemyResult.rows.length === 0) throw new Error('此地空無一物');

    const enemy = enemyResult.rows[0];

    // ── Step 3：初始化戰鬥狀態 ───────────────────────────────
    let playerHp = playerRow.hp;
    let enemyHp  = enemy.hp;
    let round    = 0;

    const battleLog = [];

    battleLog.push(
        `【${enemy.name}】出現了！（HP: ${enemyHp}　攻: ${enemy.attack}　防: ${enemy.defense}）`
    );
    battleLog.push(
        `你做好迎戰準備。（HP: ${playerHp}　攻: ${playerRow.attack}　防: ${playerRow.defense}）`
    );

    // ── Step 4：回合迴圈 ─────────────────────────────────────
    while (playerHp > 0 && enemyHp > 0 && round < MAX_ROUNDS) {
        round++;

        // 玩家先手攻擊
        const playerDmg = calcDamage(playerRow.attack, enemy.defense);
        enemyHp -= playerDmg;
        battleLog.push(
            `第 ${round} 回合 ▸ 你出手，對【${enemy.name}】造成 ${playerDmg} 點傷害！` +
            `（妖獸剩餘氣血: ${Math.max(0, enemyHp)}）`
        );
        if (enemyHp <= 0) break; // 玩家這回合擊殺，直接結束

        // 敵人反擊
        const enemyDmg = calcDamage(enemy.attack, playerRow.defense);
        playerHp -= enemyDmg;
        battleLog.push(
            `第 ${round} 回合 ▸ 【${enemy.name}】反撲！你受到 ${enemyDmg} 點傷害。` +
            `（你的剩餘氣血: ${Math.max(0, playerHp)}）`
        );
    }

    // ── Step 5：結算 ─────────────────────────────────────────
    const playerWon   = enemyHp <= 0;
    let   expGained   = 0;
    let   itemDropped = null;
    const spCost      = 10;

    if (playerWon) {
        expGained = enemy.exp_reward;

        // 60% 機率掉落物品
        if (enemy.drop_item_name && Math.random() < 0.6) {
            itemDropped = enemy.drop_item_name;
        }

        battleLog.push('━━━ 勝利 ━━━');
        battleLog.push(`激戰 ${round} 回合，你擊殺了【${enemy.name}】！獲得修為 +${expGained}。`);
        if (itemDropped) {
            battleLog.push(`掉落物：【${itemDropped}】已納入囊中。`);
        }
    } else {
        playerHp = 1; // 重傷但不死
        battleLog.push('━━━ 重傷 ━━━');
        battleLog.push(`你被【${enemy.name}】打倒，氣血幾近耗盡，勉強保住一口氣逃脫...`);
    }

    // ── Step 6：寫回資料庫 ───────────────────────────────────
    const finalHp = Math.max(1, playerHp);

    if (playerWon) {
        await db.query(
            `UPDATE players
             SET hp    = $1,
                 sp    = sp - $2,
                 mind  = mind + $3
             WHERE id = $4`,
            [finalHp, spCost, expGained, playerId]
        );

        if (itemDropped) {
            await db.query(
                `INSERT INTO player_items (player_id, item_id, quantity)
                 SELECT $1, id, 1 FROM items WHERE name = $2
                 ON CONFLICT (player_id, item_id)
                 DO UPDATE SET quantity = player_items.quantity + 1`,
                [playerId, itemDropped]
            );
        }
    } else {
        await db.query(
            `UPDATE players
             SET hp = $1,
                 sp = sp - $2
             WHERE id = $3`,
            [finalHp, spCost, playerId]
        );
    }

    // ── Step 7：回傳完整結果 ─────────────────────────────────
    return {
        // 前端逐行上色用
        battleLog: battleLog.map((line) => ({
            text: line,
            type: classifyLine(line),
        })),
        outcome:      playerWon ? 'win' : 'lose',
        rounds: round,
        enemy_name:   enemy.name,
        hp_remaining: finalHp,
        sp_cost:      spCost,
        exp_gained:   expGained,
        item_dropped: itemDropped,
        // 向下相容：維持 message 欄位
        message: playerWon
            ? `你在 ${round} 回合後擊敗了【${enemy.name}】，斬妖有功，修為 +${expGained}。`
            : `你被【${enemy.name}】重傷，氣血僅餘一線，倉皇逃脫...`,
    };
}

// server/services/playerService.js
import * as db from '../config/db.js';
import { calculateOfflineDelta } from '../lib/recovery.js';

export async function getBackpack(playerId) {
    const result = await db.query(
        `SELECT
             pi.item_id,
             i.name,
             i.item_type,
             i.rarity,
             i.description,
             i.effect_type,
             i.effect_value,
             pi.quantity
         FROM player_items pi
         JOIN items i ON pi.item_id = i.id
         WHERE pi.player_id = $1
         ORDER BY i.item_type, i.name`,
        [playerId]
    );
    return result.rows;
}

// ── 取得玩家狀態（純讀，不寫 DB）─────────────────────────────────
// 為什麼改成純讀：
//   原本的 GET 會觸發 UPDATE（計算離線回復後寫回 DB），這違反 REST 語義。
//   在 serverless 環境下，每次讀取都產生一次 DB WRITE，浪費 connection quota。
//   正確做法：只 SELECT，把 last_sync_time 與 server_time 一起回傳，
//   讓 client 自己算「顯示用」的動畫起點。
//   真正的 DB flush 只發生在玩家「做了事」（調息、突破、探索）的 POST API 裡。
export async function getPlayerStatus(playerId) {
    const result = await db.query(
        `SELECT p.*, rt.name AS realm_name
         FROM players p
         LEFT JOIN realm_templates rt ON rt.level = p.realm_level
         WHERE p.id = $1`,
        [playerId]
    );
    if (result.rows.length === 0) throw new Error('找不到道友的命格');
    const player = result.rows[0];

    // 計算離線 delta（不寫 DB，只用來回傳給 client 做動畫起點）
    const delta = calculateOfflineDelta(player);

    return {
        ...player,
        hp:          delta.hp,
        sp:          delta.sp,
        ep:          delta.ep,
        // aura 不離線回復，維持 DB 裡的值
        server_time: new Date().toISOString(),
    };
}

// ── 調息回復 ─────────────────────────────────────────────────────
// 為什麼在這裡 flush delta：
//   玩家按下「調息」時，我們趁機把離線累積的 HP/SP/EP 一起寫回 DB，
//   同時更新 last_sync_time。這樣 DB 的數值永遠是「上次做事時的狀態」，
//   而不是「上次定時同步時的狀態」。避免 GET 產生寫入。
export async function meditate(playerId) {
    const result = await db.query(
        `SELECT hp, max_hp, sp, max_sp, ep, max_ep, aura, last_meditate_time, last_sync_time
         FROM players WHERE id = $1`,
        [playerId]
    );
    if (result.rows.length === 0) throw new Error('找不到道友的命格');

    const player = result.rows[0];
    const now    = new Date();

    // 冷卻判定 (60 秒)
    if (player.last_meditate_time) {
        const elapsed = (now - new Date(player.last_meditate_time)) / 1000;
        if (elapsed < 60) {
            const remaining = Math.ceil(60 - elapsed);
            throw new Error(`氣息尚未平穩，請稍後再調息（剩餘 ${remaining} 秒）`);
        }
    }

    // 先 flush 離線 delta，再疊加調息效果
    const afterDelta = calculateOfflineDelta(player, now);
    const newHp = Math.min(player.max_hp ?? 100, afterDelta.hp + 10);
    const newSp = Math.min(player.max_sp ?? 100, afterDelta.sp + 20);

    await db.query(
        `UPDATE players
         SET hp = $1, sp = $2, ep = $3,
             last_meditate_time = $4,
             last_sync_time     = $4
         WHERE id = $5`,
        [newHp, newSp, afterDelta.ep, now, playerId]
    );

    return {
        hp:          newHp,
        sp:          newSp,
        ep:          afterDelta.ep,
        hp_restored: newHp - afterDelta.hp,
        sp_restored: newSp - afterDelta.sp,
    };
}

// ── 使用物品 ─────────────────────────────────────────────────────
export async function useItem(playerId, itemId) {
    // 1. 背包 + 玩家狀態一次查完（避免 N+1 查詢）
    const [invResult, playerResult] = await Promise.all([
        db.query(
            `SELECT pi.quantity, i.name, i.effect_type, i.effect_value
             FROM player_items pi
             JOIN items i ON pi.item_id = i.id
             WHERE pi.player_id = $1 AND pi.item_id = $2`,
            [playerId, itemId]
        ),
        db.query(
            `SELECT hp, max_hp, sp, max_sp, ep, max_ep, aura, mind, last_sync_time
             FROM players WHERE id = $1`,
            [playerId]
        ),
    ]);

    if (invResult.rows.length === 0)  throw new Error('背包中沒有此物品');
    if (playerResult.rows.length === 0) throw new Error('找不到道友的命格');

    const inv    = invResult.rows[0];
    const player = playerResult.rows[0];

    if (inv.quantity <= 0) throw new Error('此物品數量不足');
    if (!inv.effect_type)  throw new Error('此物品無法直接使用');

    // 2. flush 離線 delta，以正確基準套用物品效果
    const now        = new Date();
    const afterDelta = calculateOfflineDelta(player, now);

    let newHp   = afterDelta.hp;
    let newSp   = afterDelta.sp;
    let newMind = player.mind ?? 0;
    let message = '';

    if (inv.effect_type === 'heal_hp') {
        newHp   = Math.min(player.max_hp ?? 100, afterDelta.hp + (inv.effect_value ?? 0));
        message = `你服用了【${inv.name}】，恢復了 ${newHp - afterDelta.hp} 點氣血。`;

    } else if (inv.effect_type === 'heal_sp') {
        newSp   = Math.min(player.max_sp ?? 100, afterDelta.sp + (inv.effect_value ?? 0));
        message = `你服用了【${inv.name}】，恢復了 ${newSp - afterDelta.sp} 點體力。`;

    } else if (inv.effect_type === 'add_exp') {
        newMind = (player.mind ?? 0) + (inv.effect_value ?? 0);
        message = `你煉化了【${inv.name}】，修為增加了 ${inv.effect_value} 點。`;

    } else {
        throw new Error('未知的物品效果類型');
    }

    // 3. flush delta + 套用效果 + 更新 last_sync_time（一次 UPDATE）
    await db.query(
        `UPDATE players
         SET hp = $1, sp = $2, ep = $3, mind = $4, last_sync_time = $5
         WHERE id = $6`,
        [newHp, newSp, afterDelta.ep, newMind, now, playerId]
    );

    // 4. 消耗物品
    if (inv.quantity === 1) {
        await db.query(
            `DELETE FROM player_items WHERE player_id = $1 AND item_id = $2`,
            [playerId, itemId]
        );
    } else {
        await db.query(
            `UPDATE player_items SET quantity = quantity - 1
             WHERE player_id = $1 AND item_id = $2`,
            [playerId, itemId]
        );
    }

    return { message, hp: newHp, sp: newSp, ep: afterDelta.ep, mind: newMind };
}

// ── 境界突破 ─────────────────────────────────────────────────────
export async function breakthrough(playerId) {
    const playerResult = await db.query(
        `SELECT realm_level, aura, max_aura, hp, max_hp, sp, max_sp,
                ep, max_ep, attack, defense, last_sync_time
         FROM players WHERE id = $1`,
        [playerId]
    );
    if (playerResult.rows.length === 0) throw new Error('找不到道友的命格');
    const player = playerResult.rows[0];

    const nextLevel = player.realm_level + 1;
    const templateResult = await db.query(
        `SELECT * FROM realm_templates WHERE level = $1`,
        [nextLevel]
    );
    if (templateResult.rows.length === 0) {
        throw new Error('已達此界巔峰，天道極限難以逾越');
    }
    const nextRealm = templateResult.rows[0];

    if (player.aura < (player.max_aura ?? 120)) {
        const gap = (player.max_aura ?? 120) - player.aura;
        throw new Error(`周天靈氣尚未圓滿，強行突破恐會走火入魔（還差 ${gap} 點）`);
    }

    // flush 離線 delta
    const now        = new Date();
    const afterDelta = calculateOfflineDelta(player, now);

    const newMaxHp   = (player.max_hp   ?? 100) + (nextRealm.bonus_max_hp  ?? 0);
    const newMaxSp   = (player.max_sp   ?? 100) + (nextRealm.bonus_max_sp  ?? 0);
    const newAttack  = (player.attack   ?? 10)  + (nextRealm.bonus_attack  ?? 0);
    const newDefense = (player.defense  ?? 5)   + (nextRealm.bonus_defense ?? 0);

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        await client.query(
            `UPDATE players
             SET realm_level    = $1,
                 max_hp         = $2,
                 max_sp         = $3,
                 hp             = $2,
                 sp             = $3,
                 ep             = $4,
                 attack         = $5,
                 defense        = $6,
                 aura           = 0,
                 last_sync_time = $7
             WHERE id = $8`,
            [nextLevel, newMaxHp, newMaxSp, afterDelta.ep, newAttack, newDefense, now, playerId]
        );

        await client.query('COMMIT');

        return {
            message:     `轟隆！天地靈氣灌注全身，你成功突破至【${nextRealm.name}】！`,
            realm_level: nextLevel,
            max_hp:      newMaxHp,
            max_sp:      newMaxSp,
            hp:          newMaxHp,
            sp:          newMaxSp,
            ep:          afterDelta.ep,
            attack:      newAttack,
            defense:     newDefense,
            aura:        0,
        };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

// ── 取得裝備清單 ──────────────────────────────────────────────────
export async function getEquipment(playerId) {
    const result = await db.query(
        `SELECT pe.slot, pe.item_id, i.name, i.rarity, i.stat_bonus
         FROM player_equipment pe
         JOIN items i ON pe.item_id = i.id
         WHERE pe.player_id = $1`,
        [playerId]
    );
    return result.rows;
}

// ── 裝備道具 ─────────────────────────────────────────────────────
export async function equipItem(playerId, itemId) {
    const invResult = await db.query(
        `SELECT pi.quantity, i.name, i.equip_slot, i.stat_bonus
         FROM player_items pi
         JOIN items i ON pi.item_id = i.id
         WHERE pi.player_id = $1 AND pi.item_id = $2`,
        [playerId, itemId]
    );
    if (invResult.rows.length === 0) throw new Error('背包中沒有此道具');
    const item = invResult.rows[0];
    if (!item.equip_slot) throw new Error('此道具無法裝備');

    const slotResult = await db.query(
        `SELECT i.stat_bonus
         FROM player_equipment pe
         JOIN items i ON pe.item_id = i.id
         WHERE pe.player_id = $1 AND pe.slot = $2`,
        [playerId, item.equip_slot]
    );
    const oldBonus = slotResult.rows[0]?.stat_bonus ?? {};
    const newBonus = item.stat_bonus ?? {};

    const attackDelta  = (newBonus.attack  ?? 0) - (oldBonus.attack  ?? 0);
    const defenseDelta = (newBonus.defense ?? 0) - (oldBonus.defense ?? 0);

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        await client.query(
            `INSERT INTO player_equipment (player_id, slot, item_id)
             VALUES ($1, $2, $3)
             ON CONFLICT (player_id, slot) DO UPDATE SET item_id = EXCLUDED.item_id`,
            [playerId, item.equip_slot, itemId]
        );

        const updResult = await client.query(
            `UPDATE players
             SET attack  = attack  + $1,
                 defense = defense + $2
             WHERE id = $3
             RETURNING attack, defense`,
            [attackDelta, defenseDelta, playerId]
        );

        await client.query('COMMIT');

        const slotLabels = { weapon: '武器', armor: '防具', trinket: '飾品' };
        return {
            message:  `【${item.name}】已裝備至${slotLabels[item.equip_slot] ?? item.equip_slot}槽`,
            slot:     item.equip_slot,
            item_id:  itemId,
            attack:   updResult.rows[0].attack,
            defense:  updResult.rows[0].defense,
        };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

// ── 卸除裝備 ─────────────────────────────────────────────────────
export async function unequipItem(playerId, slot) {
    const slotResult = await db.query(
        `SELECT pe.item_id, i.name, i.stat_bonus
         FROM player_equipment pe
         JOIN items i ON pe.item_id = i.id
         WHERE pe.player_id = $1 AND pe.slot = $2`,
        [playerId, slot]
    );
    if (slotResult.rows.length === 0) throw new Error('此槽位尚未裝備任何道具');
    const equipped = slotResult.rows[0];
    const bonus    = equipped.stat_bonus ?? {};

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        await client.query(
            `DELETE FROM player_equipment WHERE player_id = $1 AND slot = $2`,
            [playerId, slot]
        );

        const updResult = await client.query(
            `UPDATE players
             SET attack  = GREATEST(0, attack  - $1),
                 defense = GREATEST(0, defense - $2)
             WHERE id = $3
             RETURNING attack, defense`,
            [bonus.attack ?? 0, bonus.defense ?? 0, playerId]
        );

        await client.query('COMMIT');

        return {
            message: `【${equipped.name}】已卸除`,
            slot,
            attack:  updResult.rows[0].attack,
            defense: updResult.rows[0].defense,
        };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}


// ── 道友列表 ────────────────────────────────────────────────────────
export async function getFriends(playerId) {
    try {
        const result = await db.query(
            `SELECT
                 p.id,
                 p.name,
                 p.realm_name,
                 p.realm_level,
                 f.created_at AS friends_since
             FROM friendships f
             JOIN players p ON p.id = CASE
                 WHEN f.player_a_id = $1 THEN f.player_b_id
                 ELSE f.player_a_id
             END
             WHERE (f.player_a_id = $1 OR f.player_b_id = $1)
               AND f.status = 'accepted'
             ORDER BY p.realm_level DESC, p.name`,
            [playerId]
        );
        return result.rows;
    } catch {
        // friendships 表尚未建立時，回傳空陣列而不 crash
        return [];
    }
}

// ── 宗門資訊 ────────────────────────────────────────────────────────
export async function getSect(playerId) {
    try {
        const result = await db.query(
            `SELECT
                 s.id,
                 s.name         AS sect_name,
                 s.description,
                 s.member_count,
                 sm.role,
                 sm.joined_at
             FROM sect_members sm
             JOIN sects s ON s.id = sm.sect_id
             WHERE sm.player_id = $1
             LIMIT 1`,
            [playerId]
        );
        if (result.rows.length === 0) return null;
        const row = result.rows[0];

        // 取宗門成員列表
        const members = await db.query(
            `SELECT p.id, p.name, p.realm_name, p.realm_level, sm.role
             FROM sect_members sm
             JOIN players p ON p.id = sm.player_id
             WHERE sm.sect_id = $1
             ORDER BY sm.role DESC, p.realm_level DESC`,
            [row.id]
        );
        return { ...row, members: members.rows };
    } catch {
        // sects / sect_members 表尚未建立時，回傳 null 而不 crash
        return null;
    }
}

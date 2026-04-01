// server/services/playerService.js
import * as db from '../config/db.js';

export async function getBackpack(playerId) {
    const result = await db.query(
        `SELECT
             pi.item_id,
             i.name,
             i.item_type,
             i.rarity,
             i.description,
             i.effect_type,
             pi.quantity
         FROM player_items pi
         JOIN items i ON pi.item_id = i.id
         WHERE pi.player_id = $1
         ORDER BY i.item_type, i.name`,
        [playerId]
    );
    return result.rows;
}

// ── 調息回復 ─────────────────────────────────────────────────
export async function meditate(playerId) {
    const result = await db.query(
        `SELECT hp, sp, last_meditate_time FROM players WHERE id = $1`,
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

    const newHp = Math.min(100, player.hp + 10);
    const newSp = Math.min(100, player.sp + 20);

    await db.query(
        `UPDATE players SET hp = $1, sp = $2, last_meditate_time = $3 WHERE id = $4`,
        [newHp, newSp, now, playerId]
    );

    return {
        hp:          newHp,
        sp:          newSp,
        hp_restored: newHp - player.hp,
        sp_restored: newSp - player.sp,
    };
}

// ── 使用物品 ─────────────────────────────────────────────────
export async function useItem(playerId, itemId) {
    // 1. 查背包
    const invResult = await db.query(
        `SELECT pi.quantity, i.name, i.effect_type, i.effect_value
         FROM player_items pi
         JOIN items i ON pi.item_id = i.id
         WHERE pi.player_id = $1 AND pi.item_id = $2`,
        [playerId, itemId]
    );
    if (invResult.rows.length === 0) throw new Error('背包中沒有此物品');

    const inv = invResult.rows[0];
    if (inv.quantity <= 0)    throw new Error('此物品數量不足');
    if (!inv.effect_type)     throw new Error('此物品無法直接使用');

    // 2. 查玩家當前數值
    const playerResult = await db.query(
        `SELECT hp, sp, mind FROM players WHERE id = $1`,
        [playerId]
    );
    if (playerResult.rows.length === 0) throw new Error('找不到道友的命格');
    const player = playerResult.rows[0];

    // 3. 套用效果
    let message = '';

    if (inv.effect_type === 'heal_hp') {
        const newHp      = Math.min(100, player.hp + inv.effect_value);
        const restored   = newHp - player.hp;
        await db.query(`UPDATE players SET hp = $1 WHERE id = $2`, [newHp, playerId]);
        message = `你服用了【${inv.name}】，恢復了 ${restored} 點氣血。`;

    } else if (inv.effect_type === 'heal_sp') {
        const newSp      = Math.min(100, player.sp + inv.effect_value);
        const restored   = newSp - player.sp;
        await db.query(`UPDATE players SET sp = $1 WHERE id = $2`, [newSp, playerId]);
        message = `你服用了【${inv.name}】，恢復了 ${restored} 點體力。`;

    } else if (inv.effect_type === 'add_exp') {
        const newMind    = player.mind + inv.effect_value;
        await db.query(`UPDATE players SET mind = $1 WHERE id = $2`, [newMind, playerId]);
        message = `你煉化了【${inv.name}】，修為增加了 ${inv.effect_value} 點。`;

    } else {
        throw new Error('未知的物品效果類型');
    }

    // 4. 消耗物品 (quantity - 1，歸零則 DELETE)
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

    return { message };
}

// ── 取得玩家狀態（含離線回復計算）─────────────────────────────
export async function getPlayerStatus(playerId) {
    const result = await db.query(
        `SELECT * FROM players WHERE id = $1`,
        [playerId]
    );
    if (result.rows.length === 0) throw new Error('找不到道友的命格');
    const player = result.rows[0];

    const now        = new Date();
    const lastSync   = player.last_sync_time ? new Date(player.last_sync_time) : now;
    const elapsedMin = Math.max(0, Math.floor((now - lastSync) / 60000));

    // 離線回復：SP +1/min、EP +1/min、HP +1/3min
    const newSp = Math.min(player.max_sp ?? 100, (player.sp ?? 0) + elapsedMin);
    const newEp = Math.min(player.max_ep ?? 100, (player.ep ?? 0) + elapsedMin);
    const newHp = Math.min(player.max_hp ?? 100, (player.hp ?? 0) + Math.floor(elapsedMin / 3));

    await db.query(
        `UPDATE players SET sp = $1, ep = $2, hp = $3, last_sync_time = $4 WHERE id = $5`,
        [newSp, newEp, newHp, now, playerId]
    );

    return { ...player, sp: newSp, ep: newEp, hp: newHp, last_sync_time: now };
}

// ── 境界突破 ─────────────────────────────────────────────────
export async function breakthrough(playerId) {
    // 1. 讀取玩家當前屬性
    const playerResult = await db.query(
        `SELECT realm_level, mind, max_hp, max_sp, attack, defense
         FROM players WHERE id = $1`,
        [playerId]
    );
    if (playerResult.rows.length === 0) throw new Error('找不到道友的命格');
    const player = playerResult.rows[0];

    // 2. 查詢下一個境界模板
    const nextLevel = player.realm_level + 1;
    const templateResult = await db.query(
        `SELECT * FROM realm_templates WHERE level = $1`,
        [nextLevel]
    );
    if (templateResult.rows.length === 0) {
        throw new Error('已達此界巔峰，天道極限難以逾越');
    }
    const nextRealm = templateResult.rows[0];

    // 3. 修為門檻檢查（累計制，不扣除修為）
    if (player.mind < nextRealm.required_exp) {
        const gap = nextRealm.required_exp - player.mind;
        throw new Error(`修為不足，強行突破恐會走火入魔（還差 ${gap} 點修為）`);
    }

    // 4. Transaction：提升境界、更新屬性、補滿 HP / SP
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const newMaxHp   = player.max_hp   + nextRealm.bonus_max_hp;
        const newMaxSp   = player.max_sp   + nextRealm.bonus_max_sp;
        const newAttack  = player.attack   + nextRealm.bonus_attack;
        const newDefense = player.defense  + nextRealm.bonus_defense;

        await client.query(
            `UPDATE players
             SET realm_level = $1,
                 max_hp      = $2,
                 max_sp      = $3,
                 hp          = $2,
                 sp          = $3,
                 attack      = $4,
                 defense     = $5
             WHERE id = $6`,
            [nextLevel, newMaxHp, newMaxSp, newAttack, newDefense, playerId]
        );

        await client.query('COMMIT');

        return {
            message:     `轟隆！天地靈氣灌注全身，你成功突破至【${nextRealm.name}】！`,
            realm_level: nextLevel,
            max_hp:      newMaxHp,
            max_sp:      newMaxSp,
            hp:          newMaxHp,
            sp:          newMaxSp,
            attack:      newAttack,
            defense:     newDefense,
        };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

// ── 取得裝備清單 ──────────────────────────────────────────────
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

// ── 裝備道具 ─────────────────────────────────────────────────
export async function equipItem(playerId, itemId) {
    // 1. 確認道具在背包中且具有裝備槽
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

    // 2. 查詢同槽位舊裝備（計算 delta 用）
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

    // 3. Transaction：UPSERT 裝備槽 + 更新玩家屬性
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

// ── 卸除裝備 ─────────────────────────────────────────────────
export async function unequipItem(playerId, slot) {
    // 1. 查詢目前槽位的裝備
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

    // 2. Transaction：刪除裝備槽 + 還原玩家屬性（GREATEST 防負值）
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

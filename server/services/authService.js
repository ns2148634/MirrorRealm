// server/services/authService.js
import { query } from '../config/db.js';

/**
 * 同步 Supabase Auth 使用者與 players 表。
 *
 * @param {string}      authId - Supabase auth.users.id
 * @param {string|null} name   - 道號（創角時才傳）
 * @param {string|null} gender - 性別（創角時才傳）
 * @returns {{ isNew: boolean, player?: object }}
 */
export async function syncAuth(authId, name = null, gender = null) {
    // 查詢是否已有角色（id 與 auth_id 皆指向同一個 Supabase UUID）
    const existing = await query(
        'SELECT * FROM players WHERE id = $1::uuid',
        [authId]
    );

    if (existing.rows.length > 0) {
        return { isNew: false, player: existing.rows[0] };
    }

    // 尚無角色且未傳創角資料 → 要求前端顯示創角畫面
    if (!name) {
        return { isNew: true };
    }

    // 建立新角色（凡人初始數值）
    // players.id 是 FK → auth.users.id，必須等於 Supabase auth UUID
    const result = await query(
        `INSERT INTO players
            (id, auth_id, name, gender,
             hp, max_hp, sp, max_sp, ep, max_ep,
             attack, defense, realm_level, mind,
             silver, spirit_stones, last_sync_time)
         VALUES ($1::uuid, $1, $2, $3,
                 100, 100, 100, 100, 100, 100,
                 10, 5, 1, 0,
                 50, 0, NOW())
         RETURNING *`,
        [authId, name, gender ?? '保密']
    );

    return { isNew: false, player: result.rows[0] };
}

/**
 * 刪除玩家帳號（清除 players 資料列）。
 * Supabase Auth 層的 user 刪除需 service-role key，此處僅清除遊戲資料。
 */
export async function deleteAccount(playerId) {
    await query('DELETE FROM players WHERE id = $1::uuid', [playerId]);
}

/**
 * 重生：刪除角色資料，讓下次 sync 時回到創角流程。
 */
export async function rebornPlayer(playerId) {
    await query('DELETE FROM players WHERE id = $1::uuid', [playerId]);
}

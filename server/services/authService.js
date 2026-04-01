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
    // 查詢是否已有角色
    const existing = await query(
        'SELECT * FROM players WHERE auth_id = $1',
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
    const result = await query(
        `INSERT INTO players
            (auth_id, name, gender,
             hp, max_hp, sp, max_sp, ep, max_ep,
             attack, defense, realm_level, mind,
             silver, spirit_stones, last_sync_time)
         VALUES ($1, $2, $3,
                 100, 100, 100, 100, 100, 100,
                 10, 5, 1, 0,
                 50, 0, NOW())
         RETURNING *`,
        [authId, name, gender ?? '保密']
    );

    return { isNew: false, player: result.rows[0] };
}

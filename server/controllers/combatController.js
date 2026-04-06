// server/controllers/combatController.js
import { runCombat } from '../services/combatService.js';

/**
 * POST /api/combat/execute
 *
 * Body:
 *   playerId      {string}  - 玩家 UUID
 *   stance        {string}  - 'aggressive' | 'balanced' | 'defensive'（預設 balanced）
 *   enemyOverride {object?} - 若提供，跳過 DB 隨機抽取，直接用此敵人數據（演武練功用）
 *
 * 回傳格式與 lbs/execute 的戰鬥分支相同，便於前端 CombatModal 統一處理。
 */
export async function executeCombat(req, res) {
    try {
        const { playerId, stance = 'balanced', enemyOverride = null } = req.body;

        if (!playerId) {
            return res.status(400).json({ status: 'error', message: '缺少玩家 ID' });
        }

        const result = await runCombat(playerId, stance, enemyOverride);
        return res.status(200).json({ status: 'success', data: result });

    } catch (error) {
        const is400 = ['氣血耗盡', '體力不足', '空無一物'].some(s => error.message.includes(s));
        return res.status(is400 ? 400 : 500).json({ status: 'error', message: error.message });
    }
}

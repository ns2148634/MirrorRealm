// server/routes/configRoutes.js
import express from 'express';
import * as db  from '../config/db.js';

const router = express.Router();

/**
 * Module-level cache（為什麼這樣做）：
 *   realm_templates 是靜態設定資料，幾乎永遠不會變。
 *   原本每次玩家登入、打開 StatusView 都會打一次 DB，完全不必要。
 *   改成：同一個 warm process 只查一次，之後直接回傳記憶體裡的結果。
 *   在 Vercel serverless 環境：每個 warm instance 都有自己的 cache，
 *   cold start 後第一次會查 DB，之後的請求（在同一個 instance 內）直接命中 cache。
 *   這比「每次都查 DB」好得多，且無需引入 Redis 等外部快取。
 */
let cachedRealms = null;

/**
 * GET /api/config/realms
 * 回傳所有境界模板，供前端動態顯示境界名稱與突破門檻。
 */
router.get('/realms', async (req, res) => {
    try {
        if (!cachedRealms) {
            const result = await db.query(
                `SELECT level, realm_stage, realm_name,
                        aura_required,
                        bonus_max_hp, bonus_max_sp, bonus_max_mp, bonus_god_sense,
                        mp_cap, god_sense_cap,
                        success_rate, success_rate_cap,
                        fail_aura_loss_pct, fail_drop_to_level,
                        pseudo_risk_pct,
                        required_item_type, required_item_qty
                 FROM realm_templates
                 ORDER BY level ASC`
            );
            cachedRealms = result.rows;
        }
        res.json({ data: cachedRealms });
    } catch (err) {
        console.error('[config/realms] 查詢失敗:', err.message);
        res.status(500).json({ message: '無法讀取境界設定' });
    }
});

export default router;

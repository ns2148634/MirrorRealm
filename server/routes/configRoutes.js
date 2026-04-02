// server/routes/configRoutes.js
import express from 'express';
import * as db  from '../config/db.js';

const router = express.Router();

/**
 * GET /api/config/realms
 * 回傳所有境界模板，供前端動態顯示境界名稱與突破門檻。
 * 表結構 realm_templates(level INT, name TEXT, required_aura INT)
 */
router.get('/realms', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT level, name, required_aura
             FROM realm_templates
             ORDER BY level ASC`
        );
        res.json({ data: result.rows });
    } catch (err) {
        console.error('[config/realms] 查詢失敗:', err.message);
        res.status(500).json({ message: '無法讀取境界設定' });
    }
});

export default router;

// server/controllers/authController.js
import { syncAuth } from '../services/authService.js';

export async function syncAuthHandler(req, res) {
    const { auth_id, name, gender } = req.body;

    if (!auth_id) {
        return res.status(400).json({ message: 'auth_id 為必填' });
    }

    try {
        const result = await syncAuth(auth_id, name ?? null, gender ?? null);
        return res.json(result);
    } catch (err) {
        // 道號撞名（UNIQUE constraint violated）
        if (err.code === '23505') {
            return res.status(400).json({ message: '此道號已被他人佔用，請另取道號' });
        }
        console.error('[authController] syncAuth 失敗:', err.message);
        return res.status(500).json({ message: '伺服器錯誤，請稍後再試' });
    }
}

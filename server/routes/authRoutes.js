// server/routes/authRoutes.js
import express from 'express';
import { syncAuthHandler, deleteAccountHandler, rebornHandler } from '../controllers/authController.js';

const router = express.Router();

// POST /api/auth/sync   — 登入後與 players 表同步
router.post('/sync',   syncAuthHandler);
// POST /api/auth/delete — 刪除帳號（清除遊戲資料）
router.post('/delete', deleteAccountHandler);
// POST /api/auth/reborn — 輪迴重生（重置角色）
router.post('/reborn', rebornHandler);

export default router;

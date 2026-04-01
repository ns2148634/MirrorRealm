// server/routes/authRoutes.js
import express from 'express';
import { syncAuthHandler } from '../controllers/authController.js';

const router = express.Router();

// POST /api/auth/sync — 登入後與 players 表同步
router.post('/sync', syncAuthHandler);

export default router;

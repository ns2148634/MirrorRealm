// server/routes/combatRoutes.js
import express from 'express';
import { executeCombat } from '../controllers/combatController.js';

const router = express.Router();

// POST /api/combat/execute
// 通用戰鬥入口：探索遭遇 or 演武練功皆走這裡
router.post('/execute', executeCombat);

export default router;

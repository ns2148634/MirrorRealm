// server/routes/lbsRoutes.js
import express from 'express';
import { scanLbsNodes, executeLbsNode } from '../controllers/lbsController.js';

const router = express.Router();

// 處理探靈掃描
router.post('/scan', scanLbsNodes);

// 處理點擊節點互動
router.post('/execute', executeLbsNode);

export default router;

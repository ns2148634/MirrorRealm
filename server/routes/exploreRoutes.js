// server/routes/exploreRoutes.js
import { Router } from 'express';
import { scan, action, resolve, jade } from '../controllers/exploreController.js';

const router = Router();

router.post('/scan',    scan);
router.post('/action',  action);
router.post('/resolve', resolve);
router.post('/jade',    jade);

export default router;

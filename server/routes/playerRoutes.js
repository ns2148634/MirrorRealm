// server/routes/playerRoutes.js
import express from 'express';
import {
    getPlayerStatusHandler,
    getPlayerBackpack,
    getPlayerEquipment,
    mediatePlayer,
    usePlayerItem,
    breakthroughPlayer,
    equipPlayerItem,
    unequipPlayerItem,
} from '../controllers/playerController.js';

const router = express.Router();

// GET 具名路由必須放在 /:playerId 萬用路由之前，否則會被攔截
router.get('/backpack/:playerId',   getPlayerBackpack);
router.get('/equipment/:playerId',  getPlayerEquipment);
router.get('/:playerId',            getPlayerStatusHandler);

router.post('/meditate',    mediatePlayer);
router.post('/use-item',    usePlayerItem);
router.post('/breakthrough', breakthroughPlayer);
router.post('/equip',        equipPlayerItem);
router.post('/unequip',      unequipPlayerItem);

export default router;

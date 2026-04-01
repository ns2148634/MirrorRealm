// server/controllers/playerController.js
import { getBackpack, getPlayerStatus, meditate, useItem, breakthrough, getEquipment, equipItem, unequipItem } from '../services/playerService.js';

export async function getPlayerStatusHandler(req, res) {
    try {
        const { playerId } = req.params;
        if (!playerId) return res.status(400).json({ status: 'error', message: '缺少玩家 ID' });

        const data = await getPlayerStatus(playerId);
        return res.status(200).json({ status: 'success', data });
    } catch (error) {
        console.error('讀取玩家狀態失敗:', error);
        return res.status(500).json({ status: 'error', message: error.message });
    }
}

export async function getPlayerBackpack(req, res) {
    try {
        const { playerId } = req.params;
        if (!playerId) return res.status(400).json({ status: 'error', message: '缺少玩家 ID' });

        const items = await getBackpack(playerId);
        return res.status(200).json({ status: 'success', data: items });
    } catch (error) {
        console.error('背包查詢失敗:', error);
        return res.status(500).json({ status: 'error', message: '伺服器異常，請稍後再試。' });
    }
}

export async function mediatePlayer(req, res) {
    try {
        const { playerId } = req.body;
        if (!playerId) return res.status(400).json({ status: 'error', message: '缺少玩家 ID' });

        const result = await meditate(playerId);
        return res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        // 冷卻中屬於業務邏輯錯誤，回傳 400 而非 500
        const statusCode = error.message.includes('尚未平穩') ? 400 : 500;
        return res.status(statusCode).json({ status: 'error', message: error.message });
    }
}

export async function usePlayerItem(req, res) {
    try {
        const { playerId, itemId } = req.body;
        if (!playerId || !itemId) {
            return res.status(400).json({ status: 'error', message: '缺少玩家 ID 或物品 ID' });
        }

        const result = await useItem(playerId, itemId);
        return res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        const statusCode = ['背包中沒有', '數量不足', '無法直接使用'].some(s => error.message.includes(s)) ? 400 : 500;
        return res.status(statusCode).json({ status: 'error', message: error.message });
    }
}

export async function breakthroughPlayer(req, res) {
    try {
        const { playerId } = req.body;
        if (!playerId) return res.status(400).json({ status: 'error', message: '缺少玩家 ID' });

        const result = await breakthrough(playerId);
        return res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        const is400 = ['已達此界', '修為不足'].some(s => error.message.includes(s));
        return res.status(is400 ? 400 : 500).json({ status: 'error', message: error.message });
    }
}

export async function getPlayerEquipment(req, res) {
    try {
        const { playerId } = req.params;
        if (!playerId) return res.status(400).json({ status: 'error', message: '缺少玩家 ID' });

        const data = await getEquipment(playerId);
        return res.status(200).json({ status: 'success', data });
    } catch (error) {
        console.error('裝備查詢失敗:', error);
        return res.status(500).json({ status: 'error', message: error.message });
    }
}

export async function equipPlayerItem(req, res) {
    try {
        const { playerId, itemId } = req.body;
        if (!playerId || !itemId) return res.status(400).json({ status: 'error', message: '缺少玩家 ID 或道具 ID' });

        const result = await equipItem(playerId, itemId);
        return res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        const is400 = ['背包中沒有', '無法裝備'].some(s => error.message.includes(s));
        return res.status(is400 ? 400 : 500).json({ status: 'error', message: error.message });
    }
}

export async function unequipPlayerItem(req, res) {
    try {
        const { playerId, slot } = req.body;
        if (!playerId || !slot) return res.status(400).json({ status: 'error', message: '缺少玩家 ID 或槽位' });

        const result = await unequipItem(playerId, slot);
        return res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        const is400 = error.message.includes('尚未裝備');
        return res.status(is400 ? 400 : 500).json({ status: 'error', message: error.message });
    }
}

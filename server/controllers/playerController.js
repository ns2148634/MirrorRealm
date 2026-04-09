// server/controllers/playerController.js
import { getBackpack, getPlayerStatus, meditate, useItem, breakthrough, getEquipment, equipItem, unequipItem, getFriends, getSect } from '../services/playerService.js';
import { craftItem, getProficiency } from '../services/craftingService.js';

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

export async function getPlayerFriends(req, res) {
    try {
        const { playerId } = req.query;
        if (!playerId) return res.status(400).json({ status: 'error', message: '缺少玩家 ID' });

        const friends = await getFriends(playerId);
        return res.status(200).json({ status: 'success', friends });
    } catch (error) {
        console.error('道友查詢失敗:', error);
        return res.status(500).json({ status: 'error', message: error.message });
    }
}

export async function getPlayerSect(req, res) {
    try {
        const { playerId } = req.query;
        if (!playerId) return res.status(400).json({ status: 'error', message: '缺少玩家 ID' });

        const sect = await getSect(playerId);
        return res.status(200).json({ status: 'success', sect });
    } catch (error) {
        console.error('宗門查詢失敗:', error);
        return res.status(500).json({ status: 'error', message: error.message });
    }
}

export async function craftPlayerItem(req, res) {
    try {
        const { playerId, mainItemId, sub1ItemId, sub2ItemId } = req.body;
        if (!playerId || !mainItemId) return res.status(400).json({ status: 'error', message: '缺少煉製素材' });
        const result = await craftItem(playerId, mainItemId, sub1ItemId ?? null, sub2ItemId ?? null);
        return res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        console.error('煉製失敗:', error);
        return res.status(400).json({ status: 'error', message: error.message });
    }
}

export async function getPlayerProficiency(req, res) {
    try {
        const { playerId } = req.params;
        if (!playerId) return res.status(400).json({ status: 'error', message: '缺少玩家 ID' });
        const data = await getProficiency(playerId);
        return res.status(200).json({ status: 'success', data });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
}

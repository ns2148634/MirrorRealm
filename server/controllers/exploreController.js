// server/controllers/exploreController.js
import { scanForEvent, takeAction, resolveEvent, jadeEvent } from '../services/exploreService.js';

export async function scan(req, res) {
  try {
    const { player_id, poi_type, weather } = req.body;
    if (!player_id) return res.status(400).json({ status: 'error', message: '缺少 player_id' });
    const data = await scanForEvent(player_id, poi_type ?? 'unknown', weather ?? 'cloudy');
    return res.status(200).json({ status: 'success', data });
  } catch (err) {
    console.error('探索掃描失敗:', err);
    const known = ['精力不足', '事件池尚無資料，請稍後再試'];
    return res.status(known.includes(err.message) ? 400 : 500).json({ status: 'error', message: err.message });
  }
}

export async function action(req, res) {
  try {
    const { player_event_id, player_id, action: act } = req.body;
    if (!player_event_id || !player_id || !act) {
      return res.status(400).json({ status: 'error', message: '缺少必要欄位' });
    }
    const data = await takeAction(player_event_id, player_id, act);
    return res.status(200).json({ status: 'success', data });
  } catch (err) {
    console.error('探索動作失敗:', err);
    return res.status(400).json({ status: 'error', message: err.message });
  }
}

export async function resolve(req, res) {
  try {
    const { player_event_id, player_id } = req.body;
    if (!player_event_id || !player_id) {
      return res.status(400).json({ status: 'error', message: '缺少必要欄位' });
    }
    const data = await resolveEvent(player_event_id, player_id);
    return res.status(200).json({ status: 'success', data });
  } catch (err) {
    console.error('探索結算失敗:', err);
    return res.status(400).json({ status: 'error', message: err.message });
  }
}

export async function jade(req, res) {
  try {
    const { player_event_id, player_id, player_note } = req.body;
    if (!player_event_id || !player_id) {
      return res.status(400).json({ status: 'error', message: '缺少必要欄位' });
    }
    const data = await jadeEvent(player_event_id, player_id, player_note);
    return res.status(200).json({ status: 'success', data });
  } catch (err) {
    console.error('玉簡刻入失敗:', err);
    return res.status(400).json({ status: 'error', message: err.message });
  }
}

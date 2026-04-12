// server/routes/tutorialRoutes.js
import express from 'express';
import { query } from '../config/db.js';

const router = express.Router();

// ── 確保教學道具存在於 items 表，回傳其 id ────────────────────────
async function ensureTutorialItems() {
  await query(`
    INSERT INTO items (name, item_type, rarity, description, equip_slot, stat_bonus)
    VALUES
      ('破銅爛鐵', '材料', 'white', '廢棄的金屬碎片，散發微弱靈氣，可用於鑄煉法器。', NULL, '{}'),
      ('劍胚',     '材料', 'white', '未完成的劍形素坯，需要鑄煉方能成器。',         NULL, '{}'),
      ('鐵劍',     '法器', 'white', '以破銅爛鐵鑄成的簡陋鐵劍，攻擊 +5。',          'weapon', '{"attack": 5}')
    ON CONFLICT (name) DO NOTHING
  `);

  const { rows } = await query(`
    SELECT id, name FROM items WHERE name IN ('破銅爛鐵', '劍胚', '鐵劍')
  `);
  const map = {};
  for (const r of rows) map[r.name] = r.id;
  return map;
}

// ─────────────────────────────────────────────────────────────────
// POST /api/tutorial/setup
//   掃描完成後呼叫：確保道具存在，將「破銅爛鐵」加入背包
// ─────────────────────────────────────────────────────────────────
router.post('/setup', async (req, res) => {
  const { playerId } = req.body;
  if (!playerId) return res.status(400).json({ message: 'playerId 必填' });

  try {
    const items = await ensureTutorialItems();
    const itemId = items['破銅爛鐵'];
    if (!itemId) throw new Error('無法取得破銅爛鐵 id');

    await query(`
      INSERT INTO player_inventory (player_id, item_id, quantity)
      VALUES ($1, $2, 1)
      ON CONFLICT (player_id, item_id)
      DO UPDATE SET quantity = player_inventory.quantity + 1
    `, [playerId, itemId]);

    res.json({ success: true });
  } catch (err) {
    console.error('[tutorial/setup]', err);
    res.status(500).json({ message: '教學初始化失敗' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/tutorial/buy-sword
//   扣除 50 銀兩，將「劍胚」加入背包
// ─────────────────────────────────────────────────────────────────
router.post('/buy-sword', async (req, res) => {
  const { playerId } = req.body;
  if (!playerId) return res.status(400).json({ message: 'playerId 必填' });

  const PRICE = 50;

  try {
    // 檢查銀兩
    const { rows: [p] } = await query(
      'SELECT silver FROM players WHERE id = $1', [playerId]
    );
    if (!p) return res.status(404).json({ message: '玩家不存在' });
    if (p.silver < PRICE) return res.status(400).json({ message: '銀兩不足' });

    const items = await ensureTutorialItems();
    const itemId = items['劍胚'];
    if (!itemId) throw new Error('無法取得劍胚 id');

    // 扣銀兩 + 加物品
    await query(
      'UPDATE players SET silver = silver - $1 WHERE id = $2', [PRICE, playerId]
    );
    await query(`
      INSERT INTO player_inventory (player_id, item_id, quantity)
      VALUES ($1, $2, 1)
      ON CONFLICT (player_id, item_id)
      DO UPDATE SET quantity = player_inventory.quantity + 1
    `, [playerId, itemId]);

    res.json({ success: true });
  } catch (err) {
    console.error('[tutorial/buy-sword]', err);
    res.status(500).json({ message: '購買失敗' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/tutorial/craft-sword
//   移除「破銅爛鐵」+「劍胚」，將「鐵劍」加入背包（必定成功）
// ─────────────────────────────────────────────────────────────────
router.post('/craft-sword', async (req, res) => {
  const { playerId } = req.body;
  if (!playerId) return res.status(400).json({ message: 'playerId 必填' });

  try {
    const items = await ensureTutorialItems();

    // 移除材料（各減 1，降到 0 時刪除列）
    for (const name of ['破銅爛鐵', '劍胚']) {
      const itemId = items[name];
      if (!itemId) continue;
      await query(`
        UPDATE player_inventory
        SET quantity = quantity - 1
        WHERE player_id = $1 AND item_id = $2 AND quantity > 0
      `, [playerId, itemId]);
      await query(`
        DELETE FROM player_inventory
        WHERE player_id = $1 AND item_id = $2 AND quantity <= 0
      `, [playerId, itemId]);
    }

    // 加入鐵劍
    const swordId = items['鐵劍'];
    if (!swordId) throw new Error('無法取得鐵劍 id');
    await query(`
      INSERT INTO player_inventory (player_id, item_id, quantity)
      VALUES ($1, $2, 1)
      ON CONFLICT (player_id, item_id)
      DO UPDATE SET quantity = player_inventory.quantity + 1
    `, [playerId, swordId]);

    res.json({ success: true, itemName: '鐵劍' });
  } catch (err) {
    console.error('[tutorial/craft-sword]', err);
    res.status(500).json({ message: '鑄煉失敗' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/tutorial/complete
//   body: { playerId }
//   將 players.tutorial_completed 設為 true
// ─────────────────────────────────────────────────────────────────
router.post('/complete', async (req, res) => {
  const { playerId } = req.body;
  if (!playerId) return res.status(400).json({ message: 'playerId 必填' });

  try {
    await query(`
      UPDATE players SET tutorial_completed = true WHERE id = $1
    `, [playerId]);
    res.json({ success: true });
  } catch (err) {
    console.error('[tutorial/complete]', err);
    res.status(500).json({ message: '更新教學狀態失敗' });
  }
});

export default router;

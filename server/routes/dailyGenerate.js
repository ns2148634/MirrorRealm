import express from 'express';
import * as db from '../config/db.js';

const router = express.Router();

router.post('/api/daily/generate', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const existing = await db.query(
      `SELECT id FROM daily_hint_pool WHERE generated_date = $1 LIMIT 1`,
      [today]
    );
    if (existing.rows.length > 0) {
      return res.json({ message: '今日已生成' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `你是一個修仙遊戲的文字生成器。
請生成 100 條麵包屑提示文字，格式為 JSON 陣列。
每條格式：{ "hint_text": "...", "zone_type": "..." }
zone_type 只能是：danger / mid / secret_realm / spirit_vein
各 25 條。
文字要有修仙氛圍，不能直接說座標或方向，要用感應、氣息等描述。
只回傳 JSON 陣列，不要其他文字。`
        }]
      })
    });

    const data = await response.json();
    const raw = data.content[0].text.replace(/```json|```/g, '').trim();
    const hints = JSON.parse(raw);

    for (const h of hints) {
      await db.query(
        `INSERT INTO daily_hint_pool (hint_text, zone_type, generated_date) VALUES ($1, $2, $3)`,
        [h.hint_text, h.zone_type, today]
      );
    }

    res.json({ success: true, count: hints.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '生成失敗' });
  }
});

export default router;

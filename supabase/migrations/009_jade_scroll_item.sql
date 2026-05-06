-- ============================================================
-- 009_jade_scroll_item.sql
-- 補充「空白玉簡」道具（探索事件 jade 動作消耗材料）
-- ============================================================

INSERT INTO items (name, item_type, rarity, description, equip_slot, stat_bonus)
VALUES (
  '空白玉簡',
  '材料',
  'green',
  '純淨的空白玉片，可用神識刻入探索情報，轉為可交易的玉簡商品。',
  NULL,
  '{}'
)
ON CONFLICT (name) DO NOTHING;

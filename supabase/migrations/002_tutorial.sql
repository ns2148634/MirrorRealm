-- ============================================================
-- 鏡界 Mirror Realm — 新手教學 schema 補充
-- 在 Supabase SQL Editor 執行，或透過 migration 系統套用
-- ============================================================

-- players 表加入 tutorial_completed 欄位
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS tutorial_completed BOOLEAN NOT NULL DEFAULT false;

-- 現有玩家視為已完成教學（避免觸發教學流程）
-- 如需讓現有玩家也體驗教學，可將此行改為 DEFAULT false 並跳過 UPDATE
UPDATE players SET tutorial_completed = true WHERE tutorial_completed = false;

-- ============================================================
-- 確保教學道具存在（教學後端會 upsert，但也可在此預建）
-- ============================================================

INSERT INTO items (name, item_type, rarity, description, equip_slot, stat_bonus)
VALUES
  ('破銅爛鐵', '材料', 'white', '廢棄的金屬碎片，散發微弱靈氣，可用於鑄煉法器。', NULL, '{}'),
  ('劍胚',     '材料', 'white', '未完成的劍形素坯，需要鑄煉方能成器。',         NULL, '{}'),
  ('鐵劍',     '法器', 'white', '以破銅爛鐵鑄成的簡陋鐵劍，攻擊 +5。',          'weapon', '{"attack": 5}')
ON CONFLICT (name) DO NOTHING;

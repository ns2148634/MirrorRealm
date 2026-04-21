-- ============================================================
-- 004_realm_templates_v2.sql
-- realm_templates 全面改版：27 層次境界 + 突破機率系統
-- ============================================================


-- ── 1. 欄位重命名（舊 → 新）────────────────────────────────────────
-- name → realm_name（避免與 SQL 保留字混淆，語意更清楚）
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'realm_templates' AND column_name = 'name'
  ) THEN
    ALTER TABLE realm_templates RENAME COLUMN name TO realm_name;
  END IF;
END $$;

-- required_aura → aura_required（統一命名風格）
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'realm_templates' AND column_name = 'required_aura'
  ) THEN
    ALTER TABLE realm_templates RENAME COLUMN required_aura TO aura_required;
  END IF;
END $$;


-- ── 2. 新增欄位──────────────────────────────────────────────────
ALTER TABLE realm_templates
  ADD COLUMN IF NOT EXISTS realm_stage        TEXT,
  ADD COLUMN IF NOT EXISTS bonus_max_mp       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_god_sense    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mp_cap             INTEGER,
  ADD COLUMN IF NOT EXISTS god_sense_cap      INTEGER,
  ADD COLUMN IF NOT EXISTS success_rate       INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS success_rate_cap   INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS fail_aura_loss_pct INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fail_drop_to_level INTEGER,
  ADD COLUMN IF NOT EXISTS pseudo_risk_pct    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS required_item_type TEXT,
  ADD COLUMN IF NOT EXISTS required_item_qty  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lore_success       TEXT,
  ADD COLUMN IF NOT EXISTS lore_fail_aura     TEXT,
  ADD COLUMN IF NOT EXISTS lore_fail_drop     TEXT;

-- aura_required 若尚未存在（完全新建的資料庫）
ALTER TABLE realm_templates
  ADD COLUMN IF NOT EXISTS aura_required INTEGER NOT NULL DEFAULT 0;


-- ── 3. 清除舊的種子資料，插入完整 27 層──────────────────────────
TRUNCATE realm_templates;

-- ── 重新插入前須先移除 realm_name NOT NULL 限制（舊表可能是 name NOT NULL）
-- （RENAME 後限制跟著移動，但名稱已改，此處確保允許暫時為 NULL）
ALTER TABLE realm_templates ALTER COLUMN realm_name DROP NOT NULL;


-- ============================================================
-- realm_templates INSERT
-- 所有 lore 欄位留 NULL，後續再填
-- fail_drop_to_level：失敗掉回的 level，NULL = 不掉階只扣靈氣
-- pseudo_risk_pct：偽風險事件觸發機率，0 = 不觸發
-- ============================================================

INSERT INTO realm_templates (
  level, realm_stage, realm_name,
  aura_required,
  bonus_max_hp, bonus_max_sp, bonus_max_mp, bonus_god_sense,
  mp_cap, god_sense_cap,
  success_rate, success_rate_cap,
  fail_aura_loss_pct, fail_drop_to_level,
  pseudo_risk_pct,
  required_item_type, required_item_qty,
  lore_success, lore_fail_aura, lore_fail_drop
) VALUES

-- ── 凡人 ──────────────────────────────────────────────
(1, '凡人', '凡人',
  0,
  0, 0, 0, 0,
  NULL, NULL,
  100, 100,
  0, NULL,
  0,
  NULL, 0,
  NULL, NULL, NULL),

-- ── 煉氣期 ───────────────────────────────────────────
(2, '煉氣期', '煉氣一層',
  120,
  20, 15, 30, 10,
  30, 100,
  100, 100,
  0, NULL,
  10,
  NULL, 0,
  NULL, NULL, NULL),

(3, '煉氣期', '煉氣二層',
  200,
  20, 15, 5, 10,
  35, 100,
  100, 100,
  0, NULL,
  10,
  NULL, 0,
  NULL, NULL, NULL),

(4, '煉氣期', '煉氣三層',
  300,
  22, 18, 5, 10,
  40, 100,
  100, 100,
  0, NULL,
  10,
  NULL, 0,
  NULL, NULL, NULL),

(5, '煉氣期', '煉氣四層',
  430,
  22, 18, 5, 10,
  45, 100,
  100, 100,
  0, NULL,
  10,
  NULL, 0,
  NULL, NULL, NULL),

(6, '煉氣期', '煉氣五層',
  580,
  24, 20, 5, 10,
  50, 100,
  85, 85,
  30, NULL,
  0,
  NULL, 0,
  NULL, NULL, NULL),

(7, '煉氣期', '煉氣六層',
  750,
  24, 20, 5, 10,
  55, 100,
  85, 85,
  30, NULL,
  0,
  NULL, 0,
  NULL, NULL, NULL),

(8, '煉氣期', '煉氣七層',
  950,
  26, 22, 5, 10,
  60, 100,
  85, 85,
  30, NULL,
  0,
  NULL, 0,
  NULL, NULL, NULL),

(9, '煉氣期', '煉氣八層',
  1200,
  26, 22, 5, 10,
  65, 100,
  85, 85,
  30, NULL,
  0,
  NULL, 0,
  NULL, NULL, NULL),

(10, '煉氣期', '煉氣九層',
  1800,
  28, 24, 5, 10,
  70, 100,
  70, 70,
  30, NULL,
  0,
  NULL, 0,
  NULL, NULL, NULL),

-- 大境界節點：煉氣十層，失敗掉回煉氣八層（level 9）
(11, '煉氣期', '煉氣十層',
  3500,
  28, 24, 10, 10,
  80, 100,
  50, 90,
  0, 9,
  0,
  '聚氣丹', 3,
  NULL, NULL, NULL),

-- ── 築基期 ───────────────────────────────────────────
-- 大境界節點：築基初期，失敗掉回煉氣八層（level 9）
(12, '築基期', '築基初期',
  3200,
  150, 100, 100, 20,
  180, 200,
  50, 90,
  0, 9,
  0,
  '築基丹', 1,
  NULL, NULL, NULL),

(13, '築基期', '築基中期',
  5500,
  200, 140, 20, 25,
  200, 200,
  65, 80,
  40, NULL,
  0,
  '築基丹', 1,
  NULL, NULL, NULL),

(14, '築基期', '築基後期',
  9000,
  280, 180, 25, 30,
  225, 200,
  55, 70,
  40, NULL,
  0,
  '築基丹', 1,
  NULL, NULL, NULL),

-- 大境界節點：築基大圓滿，失敗掉回築基中期（level 13）
(15, '築基期', '築基大圓滿',
  18000,
  400, 250, 25, 30,
  250, 200,
  40, 65,
  0, 13,
  0,
  '上品築基丹', 1,
  NULL, NULL, NULL),

-- ── 金丹期 ───────────────────────────────────────────
-- 大境界節點：金丹初期，失敗掉回築基初期（level 12）
(16, '金丹期', '金丹初期',
  22000,
  500, 350, 200, 50,
  450, 400,
  40, 65,
  0, 12,
  0,
  '金丹材料', 1,
  NULL, NULL, NULL),

(17, '金丹期', '金丹中期',
  38000,
  800, 550, 50, 60,
  500, 400,
  50, 65,
  40, NULL,
  0,
  '金丹材料', 1,
  NULL, NULL, NULL),

(18, '金丹期', '金丹後期',
  60000,
  1200, 800, 60, 70,
  560, 400,
  45, 60,
  40, NULL,
  0,
  '金丹材料', 1,
  NULL, NULL, NULL),

-- 大境界節點：金丹大圓滿，失敗掉回金丹中期（level 17）
(19, '金丹期', '金丹大圓滿',
  120000,
  2000, 1200, 70, 80,
  630, 400,
  30, 55,
  0, 17,
  0,
  '金丹材料', 1,
  NULL, NULL, NULL),

-- ── 元嬰期 ───────────────────────────────────────────
-- 大境界節點：元嬰初期，失敗掉回金丹初期（level 16）
(20, '元嬰期', '元嬰初期',
  150000,
  2500, 1500, 500, 100,
  1130, 800,
  35, 55,
  0, 16,
  0,
  NULL, 0,
  NULL, NULL, NULL),

(21, '元嬰期', '元嬰中期',
  250000,
  4000, 2500, 100, 120,
  1230, 800,
  45, 60,
  50, NULL,
  0,
  NULL, 0,
  NULL, NULL, NULL),

(22, '元嬰期', '元嬰後期',
  400000,
  6000, 4000, 120, 140,
  1350, 800,
  35, 50,
  50, NULL,
  0,
  NULL, 0,
  NULL, NULL, NULL),

-- 大境界節點：元嬰大圓滿，失敗掉回元嬰中期（level 21）
(23, '元嬰期', '元嬰大圓滿',
  750000,
  10000, 6000, 150, 160,
  1500, 800,
  20, 45,
  0, 21,
  0,
  NULL, 0,
  NULL, NULL, NULL),

-- ── 化神期 ───────────────────────────────────────────
-- 大境界節點：化神初期，失敗掉回元嬰初期（level 20）
(24, '化神期', '化神初期',
  900000,
  8000, 5000, 700, 200,
  2200, 1600,
  30, 45,
  0, 20,
  0,
  NULL, 0,
  NULL, NULL, NULL),

(25, '化神期', '化神中期',
  1500000,
  14000, 9000, 200, 250,
  2400, 1600,
  40, 55,
  60, NULL,
  0,
  NULL, 0,
  NULL, NULL, NULL),

(26, '化神期', '化神後期',
  2500000,
  25000, 16000, 250, 300,
  2650, 1600,
  30, 45,
  60, NULL,
  0,
  NULL, 0,
  NULL, NULL, NULL),

-- 終點，無需突破
(27, '化神期', '化神大圓滿',
  0,
  50000, 30000, 350, 350,
  3000, 1600,
  0, 0,
  0, NULL,
  0,
  NULL, 0,
  NULL, NULL, NULL);


-- ── 4. 補充突破所需丹藥種子資料──────────────────────────────────
INSERT INTO items (name, item_type, rarity, description) VALUES
  ('築基丹',     '丹藥', 'green',  '鑄就修行基石之靈丹，服用後有一定機率開啟築基之門。'),
  ('上品築基丹', '丹藥', 'blue',   '品質超凡的築基丹，大幅提升突破築基大圓滿的成功率。'),
  ('金丹材料',   '素材', 'blue',   '凝練金丹所需的稀有材料，缺之則無法嘗試金丹期突破。')
ON CONFLICT (name) DO NOTHING;

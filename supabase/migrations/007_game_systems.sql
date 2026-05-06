-- ============================================================
-- 007_game_systems.sql
-- 對照 鏡界2_2_完整遊戲架構_for_code.md 補齊缺失欄位與資料
-- ============================================================


-- ============================================================
-- 1. realm_templates 新增欄位
--    fail_type   : none | pseudo | minor | major（第5.3節）
--    fail_penalty: 失敗懲罰文字
--    hp_cap      : 本境界氣血絕對上限（非增量，方便直接設定玩家 max_hp）
-- ============================================================

ALTER TABLE realm_templates
  ADD COLUMN IF NOT EXISTS fail_type    TEXT    NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS fail_penalty TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS hp_cap       INTEGER NOT NULL DEFAULT 0;


-- ============================================================
-- 2. 更新 realm_templates 資料以符合設計文件第14/15節
--    同時修正舊版數值：bonus_max_hp（hp_add）、god_sense_cap（si_cap）
-- ============================================================

-- Lv 1 凡人
UPDATE realm_templates SET
  realm_name='凡人', hp_cap=100, bonus_max_hp=0,
  mp_cap=0, bonus_max_mp=0,
  god_sense_cap=0, bonus_god_sense=0,
  success_rate=100, success_rate_cap=100,
  fail_type='none', fail_penalty='—'
WHERE level=1;

-- Lv 2 煉氣一層
UPDATE realm_templates SET
  realm_name='煉氣一層', hp_cap=130, bonus_max_hp=30,
  mp_cap=30, bonus_max_mp=30,
  god_sense_cap=40, bonus_god_sense=10,
  success_rate=100, success_rate_cap=100,
  fail_type='pseudo', fail_penalty='偽風險事件 10%，不影響突破'
WHERE level=2;

-- Lv 3 煉氣二層
UPDATE realm_templates SET
  realm_name='煉氣二層', hp_cap=160, bonus_max_hp=30,
  mp_cap=35, bonus_max_mp=5,
  god_sense_cap=50, bonus_god_sense=10,
  success_rate=100, success_rate_cap=100,
  fail_type='pseudo', fail_penalty='偽風險事件 10%，不影響突破'
WHERE level=3;

-- Lv 4 煉氣三層
UPDATE realm_templates SET
  realm_name='煉氣三層', hp_cap=200, bonus_max_hp=40,
  mp_cap=40, bonus_max_mp=5,
  god_sense_cap=60, bonus_god_sense=10,
  success_rate=100, success_rate_cap=100,
  fail_type='pseudo', fail_penalty='偽風險事件 10%，不影響突破'
WHERE level=4;

-- Lv 5 煉氣四層
UPDATE realm_templates SET
  realm_name='煉氣四層', hp_cap=240, bonus_max_hp=40,
  mp_cap=45, bonus_max_mp=5,
  god_sense_cap=70, bonus_god_sense=10,
  success_rate=100, success_rate_cap=100,
  fail_type='pseudo', fail_penalty='偽風險事件 10%，不影響突破'
WHERE level=5;

-- Lv 6 煉氣五層
UPDATE realm_templates SET
  realm_name='煉氣五層', hp_cap=280, bonus_max_hp=40,
  mp_cap=50, bonus_max_mp=5,
  god_sense_cap=80, bonus_god_sense=10,
  success_rate=85, success_rate_cap=85,
  fail_type='minor', fail_penalty='扣 30% 靈氣'
WHERE level=6;

-- Lv 7 煉氣六層
UPDATE realm_templates SET
  realm_name='煉氣六層', hp_cap=320, bonus_max_hp=40,
  mp_cap=55, bonus_max_mp=5,
  god_sense_cap=90, bonus_god_sense=10,
  success_rate=85, success_rate_cap=85,
  fail_type='minor', fail_penalty='扣 30% 靈氣'
WHERE level=7;

-- Lv 8 煉氣七層
UPDATE realm_templates SET
  realm_name='煉氣七層', hp_cap=360, bonus_max_hp=40,
  mp_cap=60, bonus_max_mp=5,
  god_sense_cap=95, bonus_god_sense=5,
  success_rate=85, success_rate_cap=85,
  fail_type='minor', fail_penalty='扣 30% 靈氣'
WHERE level=8;

-- Lv 9 煉氣八層
UPDATE realm_templates SET
  realm_name='煉氣八層', hp_cap=400, bonus_max_hp=40,
  mp_cap=65, bonus_max_mp=5,
  god_sense_cap=100, bonus_god_sense=5,
  success_rate=85, success_rate_cap=85,
  fail_type='minor', fail_penalty='扣 30% 靈氣'
WHERE level=9;

-- Lv 10 煉氣九層
UPDATE realm_templates SET
  realm_name='煉氣九層', hp_cap=450, bonus_max_hp=50,
  mp_cap=70, bonus_max_mp=5,
  god_sense_cap=100, bonus_god_sense=0,
  success_rate=70, success_rate_cap=70,
  fail_type='minor', fail_penalty='扣 30% 靈氣'
WHERE level=10;

-- Lv 11 煉氣大圓滿（舊名 煉氣十層，對齊設計文件）
UPDATE realm_templates SET
  realm_name='煉氣大圓滿', hp_cap=500, bonus_max_hp=50,
  mp_cap=80, bonus_max_mp=10,
  god_sense_cap=100, bonus_god_sense=0,
  success_rate=50, success_rate_cap=90,
  fail_type='major', fail_penalty='退回煉氣大圓滿，靈氣歸零'
WHERE level=11;

-- Lv 12 築基初期
UPDATE realm_templates SET
  hp_cap=650, bonus_max_hp=150,
  mp_cap=180, bonus_max_mp=100,
  god_sense_cap=120, bonus_god_sense=20,
  success_rate=65, success_rate_cap=80,
  fail_type='minor', fail_penalty='扣 40% 靈氣'
WHERE level=12;

-- Lv 13 築基中期
UPDATE realm_templates SET
  hp_cap=840, bonus_max_hp=190,
  mp_cap=200, bonus_max_mp=20,
  god_sense_cap=150, bonus_god_sense=30,
  success_rate=65, success_rate_cap=80,
  fail_type='minor', fail_penalty='扣 40% 靈氣'
WHERE level=13;

-- Lv 14 築基後期
UPDATE realm_templates SET
  hp_cap=1110, bonus_max_hp=270,
  mp_cap=225, bonus_max_mp=25,
  god_sense_cap=175, bonus_god_sense=25,
  success_rate=55, success_rate_cap=70,
  fail_type='minor', fail_penalty='扣 40% 靈氣'
WHERE level=14;

-- Lv 15 築基大圓滿
UPDATE realm_templates SET
  hp_cap=1500, bonus_max_hp=390,
  mp_cap=250, bonus_max_mp=25,
  god_sense_cap=200, bonus_god_sense=25,
  success_rate=40, success_rate_cap=65,
  fail_type='major', fail_penalty='退回築基大圓滿，靈氣歸零'
WHERE level=15;

-- Lv 16 金丹初期
UPDATE realm_templates SET
  hp_cap=1890, bonus_max_hp=390,
  mp_cap=450, bonus_max_mp=200,
  god_sense_cap=250, bonus_god_sense=50,
  success_rate=40, success_rate_cap=65,
  fail_type='minor', fail_penalty='扣 40% 靈氣'
WHERE level=16;

-- Lv 17 金丹中期
UPDATE realm_templates SET
  hp_cap=2510, bonus_max_hp=620,
  mp_cap=500, bonus_max_mp=50,
  god_sense_cap=310, bonus_god_sense=60,
  success_rate=50, success_rate_cap=65,
  fail_type='minor', fail_penalty='扣 40% 靈氣'
WHERE level=17;

-- Lv 18 金丹後期
UPDATE realm_templates SET
  hp_cap=3440, bonus_max_hp=930,
  mp_cap=560, bonus_max_mp=60,
  god_sense_cap=370, bonus_god_sense=60,
  success_rate=45, success_rate_cap=60,
  fail_type='minor', fail_penalty='扣 40% 靈氣'
WHERE level=18;

-- Lv 19 金丹大圓滿
UPDATE realm_templates SET
  hp_cap=5000, bonus_max_hp=1560,
  mp_cap=630, bonus_max_mp=70,
  god_sense_cap=400, bonus_god_sense=30,
  success_rate=30, success_rate_cap=55,
  fail_type='major', fail_penalty='退回金丹大圓滿，靈氣歸零'
WHERE level=19;

-- Lv 20 元嬰初期
UPDATE realm_templates SET
  hp_cap=6110, bonus_max_hp=1110,
  mp_cap=1130, bonus_max_mp=500,
  god_sense_cap=500, bonus_god_sense=100,
  success_rate=35, success_rate_cap=55,
  fail_type='minor', fail_penalty='扣 50% 靈氣'
WHERE level=20;

-- Lv 21 元嬰中期
UPDATE realm_templates SET
  hp_cap=7890, bonus_max_hp=1780,
  mp_cap=1230, bonus_max_mp=100,
  god_sense_cap=600, bonus_god_sense=100,
  success_rate=45, success_rate_cap=60,
  fail_type='minor', fail_penalty='扣 50% 靈氣'
WHERE level=21;

-- Lv 22 元嬰後期
UPDATE realm_templates SET
  hp_cap=10560, bonus_max_hp=2670,
  mp_cap=1350, bonus_max_mp=120,
  god_sense_cap=720, bonus_god_sense=120,
  success_rate=35, success_rate_cap=50,
  fail_type='minor', fail_penalty='扣 50% 靈氣'
WHERE level=22;

-- Lv 23 元嬰大圓滿
UPDATE realm_templates SET
  hp_cap=15000, bonus_max_hp=4440,
  mp_cap=1500, bonus_max_mp=150,
  god_sense_cap=800, bonus_god_sense=80,
  success_rate=20, success_rate_cap=45,
  fail_type='major', fail_penalty='退回元嬰大圓滿，靈氣歸零'
WHERE level=23;

-- Lv 24 化神初期
UPDATE realm_templates SET
  hp_cap=17890, bonus_max_hp=2890,
  mp_cap=2200, bonus_max_mp=700,
  god_sense_cap=1000, bonus_god_sense=200,
  success_rate=30, success_rate_cap=45,
  fail_type='minor', fail_penalty='扣 60% 靈氣'
WHERE level=24;

-- Lv 25 化神中期
UPDATE realm_templates SET
  hp_cap=22940, bonus_max_hp=5050,
  mp_cap=2400, bonus_max_mp=200,
  god_sense_cap=1250, bonus_god_sense=250,
  success_rate=40, success_rate_cap=55,
  fail_type='minor', fail_penalty='扣 60% 靈氣'
WHERE level=25;

-- Lv 26 化神後期
UPDATE realm_templates SET
  hp_cap=31960, bonus_max_hp=9020,
  mp_cap=2650, bonus_max_mp=250,
  god_sense_cap=1550, bonus_god_sense=300,
  success_rate=30, success_rate_cap=45,
  fail_type='minor', fail_penalty='扣 60% 靈氣'
WHERE level=26;

-- Lv 27 化神大圓滿（終點）
UPDATE realm_templates SET
  hp_cap=50000, bonus_max_hp=18040,
  mp_cap=3000, bonus_max_mp=350,
  god_sense_cap=1600, bonus_god_sense=50,
  success_rate=0, success_rate_cap=0,
  fail_type='none', fail_penalty='終點'
WHERE level=27;


-- ============================================================
-- 3. 探索事件池表（第12.8節）
--    AI 批次生成的事件資料，供探索系統隨機取用
-- ============================================================

CREATE TABLE IF NOT EXISTS events (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  base_type        TEXT        NOT NULL CHECK (base_type IN ('monster','resource','npc','array','inheritance','opportunity','unknown')),
  tier             INTEGER     NOT NULL CHECK (tier BETWEEN 1 AND 5),
  attribute        TEXT        NOT NULL CHECK (attribute IN ('fire','water','wood','metal','earth')),
  hidden_level     INTEGER     NOT NULL DEFAULT 0,
  total_layers     INTEGER     NOT NULL DEFAULT 1,
  progression      JSONB       NOT NULL DEFAULT '{}', -- {L1:{text,best_action}, L2:...}
  outcome_weights  JSONB       NOT NULL DEFAULT '{}', -- {good,normal,nothing,failure,worst_result}
  action_modifiers JSONB       NOT NULL DEFAULT '{}', -- {good:{search,wait,stone}, failure:{...}}
  base_rare_rate   DECIMAL(4,2) NOT NULL DEFAULT 0.01,
  entity_data      JSONB       NOT NULL DEFAULT '{}', -- 怪物屬性、環境修正等
  batch_hash       TEXT,                              -- 防止重複批次入庫
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_tier      ON events(tier);
CREATE INDEX IF NOT EXISTS idx_events_attribute ON events(attribute);
CREATE INDEX IF NOT EXISTS idx_events_base_type ON events(base_type);
CREATE INDEX IF NOT EXISTS idx_events_batch     ON events(batch_hash);


-- ============================================================
-- 4. 天地異象表（第26節）
--    探索途中 5% 機率觸發的隨機異象事件模板
-- ============================================================

CREATE TABLE IF NOT EXISTS anomalies (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  anomaly_type  TEXT        NOT NULL CHECK (anomaly_type IN ('perception','interaction','awakening')),
  text          TEXT        NOT NULL,
  options       JSONB       NOT NULL DEFAULT '[]', -- [{label, outcomes:[{weight,result,text?}]}]
  trigger_rate  DECIMAL(4,2) NOT NULL DEFAULT 0.05,
  daily_cap     INTEGER     NOT NULL DEFAULT 2,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anomalies_type   ON anomalies(anomaly_type);
CREATE INDEX IF NOT EXISTS idx_anomalies_active ON anomalies(is_active);


-- ============================================================
-- 5. 玩家每日異象計數表
--    追蹤每位玩家當日已觸發異象次數（daily_cap 限制用）
-- ============================================================

CREATE TABLE IF NOT EXISTS player_anomaly_log (
  player_id     UUID    NOT NULL,
  log_date      DATE    NOT NULL DEFAULT CURRENT_DATE,
  anomaly_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (player_id, log_date)
);


-- ============================================================
-- 6. 補充缺失道具種子資料
--    來源：第19.3（保存道具）、第25.2/25.3（特殊道具）、第27.2（坊市）
-- ============================================================

INSERT INTO items (name, item_type, rarity, description, effect_type, effect_value, lingli_cost) VALUES

  -- ── 第 25.2 護身符（T5 死亡保險）──────────────────────────────
  ('護身符',     '符籙', 'purple',
   'T5 事件新增時自動消耗一張，防止裝備物品掉落（2件）。使用後當場失效。',
   NULL, 0, 0),

  -- ── 第 25.3 知識符（探索深度提升）─────────────────────────────
  ('知識符',     '符籙', 'green',
   '下次探索事件的知識檢定結果提升一層（如原本進 L2，改進 L3）。一次性。',
   NULL, 0, 0),

  -- ── 第 27.2 坊市消耗品 ─────────────────────────────────────────
  ('逃跑符',     '符籙', 'white',
   '戰鬥中靈力歸零時自動消耗，嘗試逃脫（成功率 70%，T5 事件額外 −20%）。',
   NULL, 0, 0),

  ('空白符籙',   '符籙', 'white',
   '去乙探索事件，將當前事件從行程中移除，不消耗任何道具亦不觸發互動。',
   NULL, 0, 0),

  ('定神香',     '丹藥', 'green',
   '點燃後調息冥想回復效果 ×2，持續 1 小時。',
   NULL, 0, 0),

  -- ── 第 19.3 輪迴保存道具 ──────────────────────────────────────
  ('輪迴盒（小）', '消耗品', 'green',
   '轉世重生時保存背包中最多 10 格道具及靈石。',
   NULL, 0, 0),

  ('輪迴盒（中）', '消耗品', 'blue',
   '轉世重生時保存背包中最多 25 格道具及靈石。',
   NULL, 0, 0),

  ('乾坤袋',     '消耗品', 'purple',
   '轉世重生時保存背包中最多 40 格道具及靈石，並保留所有功法熟練度。',
   NULL, 0, 0),

  ('鎮魂符',     '符籙', 'blue',
   '轉世重生時保存當前裝備的所有本體法器（不含靈石）。',
   NULL, 0, 0),

  ('傳承符咒',   '符籙', 'blue',
   '轉世重生時保存指定一個功法（含熟練度）。',
   NULL, 0, 0),

  -- ── 第 4.3 煉體素材 ──────────────────────────────────────────
  ('靈骨',       '素材', 'white',
   '含有微弱靈性的獸骨，是初階煉體修行的基礎素材。',
   NULL, 0, 0),

  ('筋骨',       '素材', 'green',
   '韌性極強的靈獸筋骨，適合中階煉體修行使用。',
   NULL, 0, 0),

  ('玄鐵碎塊',   '素材', 'blue',
   '含有金屬靈性的稀有礦石碎片，用於高階煉體或煉器。',
   NULL, 0, 0)

ON CONFLICT (name) DO NOTHING;


-- ============================================================
-- 7. 確保 items.lingli_cost 欄位對新增道具正確設定
--    （006 已加此欄位，此處無需重複 ALTER）
-- ============================================================

-- 保存道具、消耗品不需靈力
UPDATE items SET lingli_cost = 0
WHERE item_type IN ('消耗品')
  AND lingli_cost IS NULL;


-- ============================================================
-- 完成
-- ============================================================

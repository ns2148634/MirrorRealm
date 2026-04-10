-- ============================================================
-- 鏡界 Mirror Realm — 基礎資料庫建置腳本（從零建立）
-- 在 Supabase SQL Editor 全部貼入執行
-- 執行順序：先 000_base_schema.sql，再 001_full_schema.sql
-- ============================================================

-- 啟用 UUID 擴充功能
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- 1. players 表
-- ============================================================

CREATE TABLE IF NOT EXISTS players (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id               TEXT        UNIQUE,              -- Supabase auth.users.id (相同值)
  name                  VARCHAR(50) NOT NULL DEFAULT '道友',
  gender                TEXT        NOT NULL DEFAULT '保密',

  -- 壽元
  age                   INTEGER     NOT NULL DEFAULT 16,
  max_age               INTEGER     NOT NULL DEFAULT 120,

  -- 生命 / 體力 / 精力
  hp                    INTEGER     NOT NULL DEFAULT 100,
  max_hp                INTEGER     NOT NULL DEFAULT 100,
  sp                    INTEGER     NOT NULL DEFAULT 100,
  max_sp                INTEGER     NOT NULL DEFAULT 100,
  ep                    INTEGER     NOT NULL DEFAULT 100,
  max_ep                INTEGER     NOT NULL DEFAULT 100,

  -- 靈力（顯示用，後期功法解鎖）
  mp                    INTEGER     NOT NULL DEFAULT 0,
  max_mp                INTEGER     NOT NULL DEFAULT 0,

  -- 周天靈氣（突破用）
  aura                  INTEGER     NOT NULL DEFAULT 0,
  max_aura              INTEGER     NOT NULL DEFAULT 120,

  -- 戰鬥屬性
  attack                INTEGER     NOT NULL DEFAULT 10,
  defense               INTEGER     NOT NULL DEFAULT 5,
  element               TEXT,                            -- 五行：metal/wood/water/fire/earth

  -- 境界
  realm_level           INTEGER     NOT NULL DEFAULT 1,

  -- 神識（戰鬥命中 + 掃描距離）
  mind                  INTEGER     NOT NULL DEFAULT 0,
  god_sense             INTEGER     NOT NULL DEFAULT 0,
  max_god_sense         INTEGER     NOT NULL DEFAULT 100,

  -- 貨幣
  silver                BIGINT      NOT NULL DEFAULT 50,
  spirit_stones         BIGINT      NOT NULL DEFAULT 0,

  -- 因果（聲望 / 煞氣）
  karma_good            INTEGER     NOT NULL DEFAULT 0,
  karma_evil            INTEGER     NOT NULL DEFAULT 0,
  prestige              INTEGER     NOT NULL DEFAULT 0,
  sha_qi                INTEGER     NOT NULL DEFAULT 0,

  -- 靈泉每日計數
  springs_claimed_today INTEGER     NOT NULL DEFAULT 0,
  springs_reset_date    DATE,

  -- 靈根五行（凡人期探索累積）
  sr_wood               INTEGER     NOT NULL DEFAULT 0,
  sr_fire               INTEGER     NOT NULL DEFAULT 0,
  sr_water              INTEGER     NOT NULL DEFAULT 0,
  sr_metal              INTEGER     NOT NULL DEFAULT 0,
  sr_earth              INTEGER     NOT NULL DEFAULT 0,

  -- 天地熔爐熟練度
  prof_general          INTEGER     NOT NULL DEFAULT 0,
  prof_pill             INTEGER     NOT NULL DEFAULT 0,
  prof_artifact         INTEGER     NOT NULL DEFAULT 0,
  prof_talisman         INTEGER     NOT NULL DEFAULT 0,
  prof_puppet           INTEGER     NOT NULL DEFAULT 0,

  -- 時間戳
  last_sync_time        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_meditate_time    TIMESTAMPTZ,
  last_scan_time        TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_players_auth_id     ON players(auth_id);
CREATE INDEX IF NOT EXISTS idx_players_realm_level ON players(realm_level);

-- 補充欄位（若 players 表已存在但缺少新欄位）
ALTER TABLE players ADD COLUMN IF NOT EXISTS auth_id               TEXT        UNIQUE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS gender                TEXT        NOT NULL DEFAULT '保密';
ALTER TABLE players ADD COLUMN IF NOT EXISTS hp                    INTEGER     NOT NULL DEFAULT 100;
ALTER TABLE players ADD COLUMN IF NOT EXISTS max_hp                INTEGER     NOT NULL DEFAULT 100;
ALTER TABLE players ADD COLUMN IF NOT EXISTS sp                    INTEGER     NOT NULL DEFAULT 100;
ALTER TABLE players ADD COLUMN IF NOT EXISTS max_sp                INTEGER     NOT NULL DEFAULT 100;
ALTER TABLE players ADD COLUMN IF NOT EXISTS ep                    INTEGER     NOT NULL DEFAULT 100;
ALTER TABLE players ADD COLUMN IF NOT EXISTS max_ep                INTEGER     NOT NULL DEFAULT 100;
ALTER TABLE players ADD COLUMN IF NOT EXISTS mp                    INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS max_mp                INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS aura                  INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS max_aura              INTEGER     NOT NULL DEFAULT 120;
ALTER TABLE players ADD COLUMN IF NOT EXISTS attack                INTEGER     NOT NULL DEFAULT 10;
ALTER TABLE players ADD COLUMN IF NOT EXISTS defense               INTEGER     NOT NULL DEFAULT 5;
ALTER TABLE players ADD COLUMN IF NOT EXISTS element               TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS realm_level           INTEGER     NOT NULL DEFAULT 1;
ALTER TABLE players ADD COLUMN IF NOT EXISTS mind                  INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS god_sense             INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS max_god_sense         INTEGER     NOT NULL DEFAULT 100;
ALTER TABLE players ADD COLUMN IF NOT EXISTS silver                BIGINT      NOT NULL DEFAULT 50;
ALTER TABLE players ADD COLUMN IF NOT EXISTS spirit_stones         BIGINT      NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS karma_good            INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS karma_evil            INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS prestige              INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS sha_qi                INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS springs_claimed_today INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS springs_reset_date    DATE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS sr_wood               INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS sr_fire               INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS sr_water              INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS sr_metal              INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS sr_earth              INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS prof_general          INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS prof_pill             INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS prof_artifact         INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS prof_talisman         INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS prof_puppet           INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_sync_time        TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_meditate_time    TIMESTAMPTZ;
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_scan_time        TIMESTAMPTZ;


-- ============================================================
-- 2. realm_templates 表
--    定義各境界名稱與突破後的屬性加成
-- ============================================================

CREATE TABLE IF NOT EXISTS realm_templates (
  id            UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  level         INTEGER NOT NULL UNIQUE,
  name          TEXT    NOT NULL,
  bonus_max_hp  INTEGER NOT NULL DEFAULT 0,
  bonus_max_sp  INTEGER NOT NULL DEFAULT 0,
  bonus_max_ep  INTEGER NOT NULL DEFAULT 0,
  bonus_attack  INTEGER NOT NULL DEFAULT 0,
  bonus_defense INTEGER NOT NULL DEFAULT 0
);

-- 補充欄位（若表已存在但缺欄位）
ALTER TABLE realm_templates ADD COLUMN IF NOT EXISTS required_aura INTEGER NOT NULL DEFAULT 120;
ALTER TABLE realm_templates ADD COLUMN IF NOT EXISTS bonus_max_ep  INTEGER NOT NULL DEFAULT 0;

-- 境界種子資料（凡人期 = level 1，無突破加成；往後各期逐步提升）
INSERT INTO realm_templates
  (level, name, required_aura, bonus_max_hp, bonus_max_sp, bonus_max_ep, bonus_attack, bonus_defense)
VALUES
  (1, '凡人期',    0,   0,   0,   0,  0,  0),
  (2, '煉氣期',  120,  20,  20,  20,  5,  3),
  (3, '築基期',  240,  40,  30,  30, 10,  5),
  (4, '金丹期',  480,  80,  50,  50, 20, 10),
  (5, '元嬰期',  960, 150,  80,  80, 35, 18),
  (6, '化神期', 1920, 250, 120, 120, 60, 30)
ON CONFLICT (level) DO NOTHING;


-- ============================================================
-- 3. items 表
--    遊戲物品字典（所有掉落 / 製造 / 使用的物品定義）
-- ============================================================

CREATE TABLE IF NOT EXISTS items (
  id           UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT    NOT NULL UNIQUE,
  item_type    TEXT    NOT NULL DEFAULT '素材',   -- 素材/丹藥/法器/符籙/傀儡/靈石/裝備
  rarity       TEXT    NOT NULL DEFAULT 'white',  -- white/green/blue/purple/gold
  description  TEXT    NOT NULL DEFAULT '',
  effect_type  TEXT,                              -- heal_hp/heal_sp/add_exp/null
  effect_value INTEGER NOT NULL DEFAULT 0,
  equip_slot   TEXT,                              -- weapon/armor/trinket/null
  stat_bonus   JSONB   NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_items_item_type ON items(item_type);
CREATE INDEX IF NOT EXISTS idx_items_rarity    ON items(rarity);

-- 補充欄位（若表已存在但缺欄位）
ALTER TABLE items ADD COLUMN IF NOT EXISTS item_type    TEXT    NOT NULL DEFAULT '素材';
ALTER TABLE items ADD COLUMN IF NOT EXISTS rarity       TEXT    NOT NULL DEFAULT 'white';
ALTER TABLE items ADD COLUMN IF NOT EXISTS description  TEXT    NOT NULL DEFAULT '';
ALTER TABLE items ADD COLUMN IF NOT EXISTS effect_type  TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS effect_value INTEGER NOT NULL DEFAULT 0;
ALTER TABLE items ADD COLUMN IF NOT EXISTS equip_slot   TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS stat_bonus   JSONB   NOT NULL DEFAULT '{}';

-- 基礎素材種子資料
INSERT INTO items (name, item_type, rarity, description) VALUES
  ('破銅爛鐵',   '素材', 'white', '品質低劣的金屬廢料，或許有人能加以利用。'),
  ('下品靈石',   '靈石', 'white', '含有微薄靈氣的寶石，修士常用的交易貨幣。'),
  ('中品靈石',   '靈石', 'green', '靈氣充盈的寶石，比下品靈石更具价值。'),
  ('聚氣丹',     '丹藥', 'white', '凡人期常見的入門丹藥，服用後略感清爽。'),
  ('妖丹（下）', '素材', 'white', '弱小妖獸的妖丹，靈氣稀薄，可作煉丹素材。'),
  ('妖丹（中）', '素材', 'green', '中等妖獸的妖丹，靈氣較為充沛。'),
  ('劍胚',       '素材', 'white', '未經煉製的毛坯劍身，帶有金屬的靈性。'),
  ('刀胚',       '素材', 'white', '未經煉製的毛坯刀身，重量可觀。'),
  ('符紙',       '素材', 'white', '專供繪製符籙的空白紙張，帶有微弱靈性。'),
  ('靈符紙',     '素材', 'green', '經過特殊處理的符紙，繪製效果更佳。'),
  ('木偶素體',   '素材', 'white', '尚未注入靈性的木製傀儡素體。'),
  ('機關素體',   '素材', 'green', '帶有精密機關構造的傀儡素體。')
ON CONFLICT (name) DO NOTHING;


-- ============================================================
-- 4. player_inventory 表
--    玩家背包（player_id + item_id 唯一）
-- ============================================================

CREATE TABLE IF NOT EXISTS player_inventory (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id   UUID    NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  item_id     UUID    NOT NULL REFERENCES items(id),
  quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  is_equipped BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(player_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_player   ON player_inventory(player_id);
CREATE INDEX IF NOT EXISTS idx_inventory_equipped ON player_inventory(player_id, is_equipped);


-- ============================================================
-- 5. enemies 表
--    妖獸 / 怪物字典，供 ATB 戰鬥引擎使用
-- ============================================================

CREATE TABLE IF NOT EXISTS enemies (
  id             UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT    NOT NULL,
  hp             INTEGER NOT NULL DEFAULT 50,
  attack         INTEGER NOT NULL DEFAULT 8,
  defense        INTEGER NOT NULL DEFAULT 3,
  mind           INTEGER NOT NULL DEFAULT 0,
  realm_level    INTEGER NOT NULL DEFAULT 1,
  element        TEXT,                         -- metal/wood/water/fire/earth
  skills         JSONB,                        -- [{name, mult, rate, cast_time}, ...]
  exp_reward     INTEGER NOT NULL DEFAULT 10,
  drop_item_id   UUID    REFERENCES items(id),
  drop_rate      DECIMAL(3,2) NOT NULL DEFAULT 0.50
);

-- 補充欄位（若表已存在但缺欄位）
ALTER TABLE enemies ADD COLUMN IF NOT EXISTS mind        INTEGER      NOT NULL DEFAULT 0;
ALTER TABLE enemies ADD COLUMN IF NOT EXISTS realm_level INTEGER      NOT NULL DEFAULT 1;
ALTER TABLE enemies ADD COLUMN IF NOT EXISTS element     TEXT;
ALTER TABLE enemies ADD COLUMN IF NOT EXISTS skills      JSONB;
ALTER TABLE enemies ADD COLUMN IF NOT EXISTS exp_reward  INTEGER      NOT NULL DEFAULT 10;
ALTER TABLE enemies ADD COLUMN IF NOT EXISTS drop_item_id UUID        REFERENCES items(id);
ALTER TABLE enemies ADD COLUMN IF NOT EXISTS drop_rate   DECIMAL(3,2) NOT NULL DEFAULT 0.50;

-- 妖獸種子資料（對應 lbs_node_templates 妖獸節點）
INSERT INTO enemies (name, hp, attack, defense, mind, realm_level, element, exp_reward)
SELECT t.name, t.hp, t.attack, t.defense, t.mind, t.realm_level, t.element, t.exp_reward
FROM (VALUES
  ('小妖狐',   40,  8,  2, 10, 1, 'fire',  8),
  ('山野毒蛇', 55, 10,  3, 15, 1, 'earth', 12),
  ('溪邊蛟蛇', 70, 12,  5, 20, 2, 'water', 18),
  ('林中魔熊', 90, 15,  8,  5, 2, 'earth', 25),
  ('石蠍妖王', 60, 14,  6, 25, 2, 'metal', 22),
  ('幽谷蝙蝠', 45,  9,  4, 30, 2, 'water', 15)
) AS t(name, hp, attack, defense, mind, realm_level, element, exp_reward)
WHERE NOT EXISTS (SELECT 1 FROM enemies LIMIT 1);


-- ============================================================
-- 6. world_events 表
--    世界事件（每日由 cron 生成）
-- ============================================================

CREATE TABLE IF NOT EXISTS world_events (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT        NOT NULL,
  event_type     TEXT        NOT NULL DEFAULT '異象',   -- 異象/靈潮/天雷/妖潮
  lat            DECIMAL(9,6) NOT NULL,
  lng            DECIMAL(9,6) NOT NULL,
  danger_radius  INTEGER     NOT NULL DEFAULT 500,      -- 公尺
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  expires_at     TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  generated_date DATE        NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS idx_world_events_active  ON world_events(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_world_events_gen_date ON world_events(generated_date);


-- ============================================================
-- 7. lbs_node_templates 表
--    LBS 探索節點模板
-- ============================================================

CREATE TABLE IF NOT EXISTS lbs_node_templates (
  id              UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_type       TEXT    NOT NULL,   -- 勞作/見聞/衝突/拾荒/妖獸/機緣/靈泉/道友
  node_name       TEXT    NOT NULL,
  sp_cost         INTEGER NOT NULL DEFAULT 0,
  hp_cost         INTEGER NOT NULL DEFAULT 0,
  phase           TEXT    NOT NULL DEFAULT 'both',  -- mortal/immortal/both
  mud_texts       TEXT[]  NOT NULL DEFAULT '{}',    -- 隨機描述文字
  lbs_categories  TEXT[]  NOT NULL DEFAULT '{}'     -- 標籤
);

CREATE INDEX IF NOT EXISTS idx_lbs_phase ON lbs_node_templates(phase);


-- ============================================================
-- 8. player_grid_scans 表
--    記錄每位玩家每個 100m 格子的最後掃描時間
-- ============================================================

CREATE TABLE IF NOT EXISTS player_grid_scans (
  player_id  UUID        NOT NULL,
  grid_id    TEXT        NOT NULL,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (player_id, grid_id)
);


-- ============================================================
-- 9. pvp_logs 表
--    道友切磋 / 掠奪的戰鬥記錄
-- ============================================================

CREATE TABLE IF NOT EXISTS pvp_logs (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  attacker_id    UUID        NOT NULL,
  defender_id    UUID        NOT NULL,
  pvp_type       TEXT        NOT NULL CHECK (pvp_type IN ('spar', 'plunder')),
  outcome        TEXT        NOT NULL CHECK (outcome IN ('win', 'lose')),
  prestige_delta INTEGER     NOT NULL DEFAULT 0,
  sha_qi_delta   INTEGER     NOT NULL DEFAULT 0,
  item_lost      TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pvp_logs_attacker ON pvp_logs(attacker_id);
CREATE INDEX IF NOT EXISTS idx_pvp_logs_defender ON pvp_logs(defender_id);


-- ============================================================
-- 10. daily_hint_pool 表
--     每日麵包屑文字池（由 /api/daily/generate 生成）
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_hint_pool (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  hint_text      TEXT        NOT NULL,
  zone_type      TEXT        NOT NULL,    -- danger/mid/secret_realm/spirit_vein
  generated_date DATE        NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS idx_hint_pool_date ON daily_hint_pool(generated_date);
CREATE INDEX IF NOT EXISTS idx_hint_pool_zone ON daily_hint_pool(zone_type);


-- ============================================================
-- 完成
-- ============================================================

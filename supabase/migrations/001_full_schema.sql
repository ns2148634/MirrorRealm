-- ============================================================
-- 鏡界 Mirror Realm — 完整資料庫建置腳本
-- 在 Supabase SQL Editor 全部貼入執行
-- ============================================================


-- ============================================================
-- 1. players 表補充欄位
-- ============================================================

-- 神識（掃描距離、戰鬥加成）
ALTER TABLE players ADD COLUMN IF NOT EXISTS mind                  INTEGER NOT NULL DEFAULT 50;

-- 聲望 / 煞氣
ALTER TABLE players ADD COLUMN IF NOT EXISTS prestige              INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS sha_qi                INTEGER NOT NULL DEFAULT 0;

-- 靈泉每日計數
ALTER TABLE players ADD COLUMN IF NOT EXISTS springs_claimed_today INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS springs_reset_date    DATE;

-- 靈根五行（凡人期探索累積）
ALTER TABLE players ADD COLUMN IF NOT EXISTS sr_wood               INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS sr_fire               INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS sr_water              INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS sr_metal              INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS sr_earth              INTEGER NOT NULL DEFAULT 0;

-- 天地熔爐熟練度
ALTER TABLE players ADD COLUMN IF NOT EXISTS prof_general          INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS prof_pill             INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS prof_artifact         INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS prof_talisman         INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS prof_puppet           INTEGER NOT NULL DEFAULT 0;

-- 探索掃描時間（重複格子懲罰用）
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_scan_time        TIMESTAMPTZ;


-- ============================================================
-- 2. world_events 補充欄位
-- ============================================================

ALTER TABLE world_events ADD COLUMN IF NOT EXISTS generated_date DATE;


-- ============================================================
-- 3. 新增 player_grid_scans 表
--    記錄每位玩家每個 100m 格子的最後掃描時間
-- ============================================================

CREATE TABLE IF NOT EXISTS player_grid_scans (
  player_id  UUID        NOT NULL,
  grid_id    TEXT        NOT NULL,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, grid_id)
);


-- ============================================================
-- 4. 新增 pvp_logs 表
--    記錄道友切磋 / 掠奪的戰鬥結果
-- ============================================================

CREATE TABLE IF NOT EXISTS pvp_logs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  attacker_id    UUID        NOT NULL,
  defender_id    UUID        NOT NULL,
  pvp_type       TEXT        NOT NULL CHECK (pvp_type IN ('spar', 'plunder')),
  outcome        TEXT        NOT NULL CHECK (outcome IN ('win', 'lose')),
  prestige_delta INTEGER     NOT NULL DEFAULT 0,
  sha_qi_delta   INTEGER     NOT NULL DEFAULT 0,
  item_lost      TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- 5. items 表補充必要欄位（若尚未存在）
-- ============================================================

ALTER TABLE items ADD COLUMN IF NOT EXISTS rarity       TEXT    NOT NULL DEFAULT 'white';
ALTER TABLE items ADD COLUMN IF NOT EXISTS effect_type  TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS effect_value INTEGER NOT NULL DEFAULT 0;
ALTER TABLE items ADD COLUMN IF NOT EXISTS equip_slot   TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS stat_bonus   JSONB   NOT NULL DEFAULT '{}';
ALTER TABLE items ADD COLUMN IF NOT EXISTS description  TEXT    NOT NULL DEFAULT '';


-- ============================================================
-- 6. player_inventory 補充 is_equipped 欄位
-- ============================================================

ALTER TABLE player_inventory ADD COLUMN IF NOT EXISTS is_equipped BOOLEAN NOT NULL DEFAULT false;


-- ============================================================
-- 7. 天地熔爐煉製結果種子資料（20 筆）
--    丹藥 / 法器 / 符籙 / 傀儡 × 5 品質
-- ============================================================

INSERT INTO items (name, item_type, rarity, description, effect_type, effect_value) VALUES
  -- 丹藥
  ('下品聚靈丹', '丹藥', 'white',  '品質普通的聚靈丹，可恢復少量靈氣。',       'add_exp',  20),
  ('中品聚靈丹', '丹藥', 'green',  '品質精良的聚靈丹，可恢復中量靈氣。',       'add_exp',  50),
  ('上品聚靈丹', '丹藥', 'blue',   '品質稀有的聚靈丹，可恢復大量靈氣。',       'add_exp', 100),
  ('極品聚靈丹', '丹藥', 'purple', '品質珍稀的聚靈丹，可恢復極大量靈氣。',     'add_exp', 200),
  ('傳說靈丹',   '丹藥', 'gold',   '傳說中的靈丹，吞服後修為大增，餘韻悠長。', 'add_exp', 500),

  -- 法器
  ('下品靈器', '法器', 'white',  '普通品質的靈器，略有靈氣加持。',     NULL, 0),
  ('中品靈器', '法器', 'green',  '精良品質的靈器，靈氣流轉順暢。',     NULL, 0),
  ('上品靈器', '法器', 'blue',   '稀有品質的靈器，靈紋清晰可見。',     NULL, 0),
  ('極品靈器', '法器', 'purple', '珍稀品質的靈器，法力加持深厚。',     NULL, 0),
  ('傳說靈器', '法器', 'gold',   '傳說級靈器，天地法則在其中流轉。',   NULL, 0),

  -- 符籙
  ('下品符籙', '符籙', 'white',  '普通品質的符籙，效果有限。',         NULL, 0),
  ('中品符籙', '符籙', 'green',  '精良品質的符籙，符文清晰。',         NULL, 0),
  ('上品符籙', '符籙', 'blue',   '稀有品質的符籙，靈力充沛。',         NULL, 0),
  ('極品符籙', '符籙', 'purple', '珍稀品質的符籙，符道精深。',         NULL, 0),
  ('傳說符籙', '符籙', 'gold',   '傳說級符籙，天道印記若隱若現。',     NULL, 0),

  -- 傀儡
  ('下品傀儡', '傀儡', 'white',  '普通品質的傀儡，動作遲緩。',         NULL, 0),
  ('中品傀儡', '傀儡', 'green',  '精良品質的傀儡，反應靈敏。',         NULL, 0),
  ('上品傀儡', '傀儡', 'blue',   '稀有品質的傀儡，身法矯健。',         NULL, 0),
  ('極品傀儡', '傀儡', 'purple', '珍稀品質的傀儡，幾近活物。',         NULL, 0),
  ('傳說傀儡', '傀儡', 'gold',   '傳說傀儡，傳聞已生出靈識。',         NULL, 0)

ON CONFLICT (name) DO NOTHING;


-- ============================================================
-- 8. lbs_node_templates 補充 phase 欄位（若尚未存在）
-- ============================================================

ALTER TABLE lbs_node_templates ADD COLUMN IF NOT EXISTS phase TEXT NOT NULL DEFAULT 'both';

-- 將現有凡人期節點打上標記
UPDATE lbs_node_templates SET phase = 'mortal'
WHERE node_type IN ('勞作', '見聞', '衝突')
  AND phase = 'both';

-- 修仙期節點
UPDATE lbs_node_templates SET phase = 'immortal'
WHERE node_type IN ('妖獸', '機緣')
  AND phase = 'both';


-- ============================================================
-- 9. 初始 lbs_node_templates 種子資料（若表為空則插入）
-- ============================================================

INSERT INTO lbs_node_templates (node_type, node_name, sp_cost, hp_cost, phase, mud_texts, lbs_categories)
SELECT node_type, node_name, sp_cost, hp_cost, phase, mud_texts::jsonb, lbs_categories::text[]
FROM (VALUES
  -- ── 凡人期 ──
  ('勞作', '田間農活',   10, 0, 'mortal',
   '["此地有農田，可協助耕作換取報酬。","農人忙碌，似乎需要幫手。"]',
   '{勞動}'),
  ('勞作', '碼頭搬運',   12, 0, 'mortal',
   '["碼頭船隻往來，有搬運工作可做。","船東正在招募短工。"]',
   '{勞動}'),
  ('勞作', '市集攤位',    8, 0, 'mortal',
   '["市集熱鬧，可擺攤或幫忙招呼客人。","攤主需要人手協助。"]',
   '{勞動}'),
  ('見聞', '茶館說書',    5, 0, 'mortal',
   '["茶館內說書人正在講述江湖奇聞。","說書人口若懸河，或有奇聞。"]',
   '{見聞}'),
  ('見聞', '老者問道',    5, 0, 'mortal',
   '["路旁有位老者，眼神深邃，似有所悟。","老者正在打坐，周身隱有靈氣波動。"]',
   '{見聞}'),
  ('見聞', '廟宇碑文',    5, 0, 'mortal',
   '["廟宇前有古老碑文，字跡模糊卻隱有玄機。","碑文刻有前人修行感悟。"]',
   '{見聞}'),
  ('衝突', '街頭惡霸',   15, 5, 'mortal',
   '["幾個地痞正在欺壓百姓。","有人被攔路打劫，呼救聲傳來。"]',
   '{衝突}'),
  ('衝突', '門派糾紛',   10, 3, 'mortal',
   '["兩個小門派的弟子正在爭執。","附近傳來劍氣波動，有人在比武。"]',
   '{衝突}'),
  -- ── 通用 ──
  ('拾荒', '廢墟遺址',    8, 0, 'both',
   '["廢墟中或有遺落的修仙物品。","此地昔日似為修士聚居之所，或有殘留。"]',
   '{拾取}'),
  ('拾荒', '荒野草叢',    6, 0, 'both',
   '["草叢間有異物閃光。","感應到微弱的靈氣波動，似有靈草。"]',
   '{拾取}'),
  ('拾荒', '山洞入口',   10, 0, 'both',
   '["山洞深處或藏有寶物。","洞口有獸跡，但靈氣充盈。"]',
   '{拾取}'),
  -- ── 修仙期 ──
  ('妖獸', '山野妖狐',    0, 10, 'immortal',
   '["一隻妖狐盤踞此地，靈氣濃郁。","感應到妖獸氣息，小心戒備。"]',
   '{戰鬥}'),
  ('妖獸', '溪邊蛟蛇',    0, 12, 'immortal',
   '["水邊有蛟蛇盤臥，靈氣蜷繞。","濃厚的妖氣從水中升騰而起。"]',
   '{戰鬥}'),
  ('妖獸', '林中魔熊',    0, 15, 'immortal',
   '["林中有魔熊出沒，氣勢兇猛。","巨大的腳印延伸至林中深處。"]',
   '{戰鬥}'),
  ('機緣', '古樹靈穴',    5, 0, 'immortal',
   '["千年古樹下有靈穴，靈氣充沛。","古樹枝椏間隱有靈光閃動。"]',
   '{機緣}'),
  ('機緣', '石碑法訣',    5, 0, 'immortal',
   '["荒野中有一塊石碑，刻有殘缺功法。","石碑上的符文在月光下發出幽光。"]',
   '{機緣}')
) AS t(node_type, node_name, sp_cost, hp_cost, phase, mud_texts, lbs_categories)
WHERE NOT EXISTS (SELECT 1 FROM lbs_node_templates LIMIT 1);


-- ============================================================
-- 完成
-- ============================================================

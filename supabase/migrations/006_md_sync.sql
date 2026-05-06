-- ============================================================
-- 006_md_sync.sql
-- 對照 docs/ 設計文件補齊缺失欄位與資料
-- ============================================================


-- ============================================================
-- 1. 修正 players.max_age 預設值
--    docs 壽元.md：凡人期壽元上限 = 80 歲（非 120）
-- ============================================================

ALTER TABLE players ALTER COLUMN max_age SET DEFAULT 80;

-- 現有凡人玩家（realm_level = 1）且 max_age 仍為舊預設值 120 → 修正為 80
UPDATE players
SET max_age = 80
WHERE realm_level = 1
  AND max_age = 120;


-- ============================================================
-- 2. realm_templates 補充 max_age 欄位
--    docs 壽元.md：各大境階段對應壽元上限
--    凡人 80 / 煉氣 120 / 築基 250 / 金丹 500 / 元嬰 1000 / 化神 2000
-- ============================================================

ALTER TABLE realm_templates
  ADD COLUMN IF NOT EXISTS max_age INTEGER NOT NULL DEFAULT 80;

UPDATE realm_templates SET max_age = 80   WHERE realm_stage = '凡人';
UPDATE realm_templates SET max_age = 120  WHERE realm_stage = '煉氣期';
UPDATE realm_templates SET max_age = 250  WHERE realm_stage = '築基期';
UPDATE realm_templates SET max_age = 500  WHERE realm_stage = '金丹期';
UPDATE realm_templates SET max_age = 1000 WHERE realm_stage = '元嬰期';
UPDATE realm_templates SET max_age = 2000 WHERE realm_stage = '化神期';


-- ============================================================
-- 3. realm_templates 補充 bonus_max_body
--    players.body/max_body 於 005 新增，境界突破應有煉體加成
-- ============================================================

ALTER TABLE realm_templates
  ADD COLUMN IF NOT EXISTS bonus_max_body INTEGER NOT NULL DEFAULT 0;

-- 煉體加成：煉氣 +10, 築基 +30, 金丹 +60, 元嬰 +120, 化神 +250
UPDATE realm_templates SET bonus_max_body = 10  WHERE realm_stage = '煉氣期';
UPDATE realm_templates SET bonus_max_body = 30  WHERE realm_stage = '築基期';
UPDATE realm_templates SET bonus_max_body = 60  WHERE realm_stage = '金丹期';
UPDATE realm_templates SET bonus_max_body = 120 WHERE realm_stage = '元嬰期';
UPDATE realm_templates SET bonus_max_body = 250 WHERE realm_stage = '化神期';


-- ============================================================
-- 4. players 補充丹毒欄位
--    docs 丹毒.md：防沉迷核心機制，每日服藥累積丹毒值
--    pill_toxicity：0 ~ 100（百分比）
--    pill_toxicity_date：當日重置標記
-- ============================================================

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS pill_toxicity      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pill_toxicity_date DATE;


-- ============================================================
-- 5. players 補充缺失的百藝熟練度欄位
--    docs 百藝.md + 任務.md：五大副職 符籙/陣法/煉丹/靈獸/傀儡
--    現有：prof_pill(煉丹)、prof_artifact(煉器)、prof_talisman(符籙)、prof_puppet(傀儡)
--    缺少：prof_formation(陣法術)、prof_beast(御獸術)
-- ============================================================

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS prof_formation INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prof_beast     INTEGER NOT NULL DEFAULT 0;


-- ============================================================
-- 6. players 補充儲物袋容量
--    docs 壽元.md：儲物袋系統，初階 3 格，高階更大
-- ============================================================

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS storage_slots INTEGER NOT NULL DEFAULT 3;


-- ============================================================
-- 7. items 補充靈力負載欄位
--    docs 戰鬥.md：無上限靈力負載系統，每件裝備 / 符籙有靈力消耗值
--    lingli_cost = 0 表示無需靈力（凡人武器 / 凡物）
-- ============================================================

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS lingli_cost INTEGER NOT NULL DEFAULT 0;

-- 補充現有物品的靈力消耗（法器高，符籙低）
UPDATE items SET lingli_cost = 80  WHERE item_type = '法器';
UPDATE items SET lingli_cost = 10  WHERE item_type = '符籙';
UPDATE items SET lingli_cost = 50  WHERE item_type = '傀儡';
UPDATE items SET lingli_cost = 0   WHERE item_type IN ('素材', '丹藥', '靈石', '材料');


-- ============================================================
-- 8. 補充核心消耗品種子資料
--    docs 體力與精力.md / 丹毒.md / 壽元.md / 情報.md
-- ============================================================

INSERT INTO items (name, item_type, rarity, description, effect_type, effect_value, lingli_cost) VALUES
  -- 回復類（丹毒機制核心）
  ('回體丹',     '丹藥', 'white',  '服用後瞬間恢復體力，過度服用會累積丹毒。', 'heal_sp',   50,  0),
  ('養神丹',     '丹藥', 'white',  '服用後瞬間恢復精力，過度服用會累積丹毒。', 'heal_ep',   50,  0),
  ('上品回體丹', '丹藥', 'green',  '品質較佳的回體丹，恢復量更豐沛。',          'heal_sp',  100,  0),
  ('上品養神丹', '丹藥', 'green',  '品質較佳的養神丹，恢復量更豐沛。',          'heal_ep',  100,  0),

  -- 壽元類
  ('壽元丹',     '丹藥', 'blue',   '煉製極難的珍稀靈丹，服用後延長壽元 5 歲。', 'add_age',    5,  0),
  ('極品壽元丹', '丹藥', 'purple', '傳聞得自上古仙人秘法，服用後延長壽元 20 歲。', 'add_age', 20,  0),

  -- 空間類
  ('空間傳送符', '符籙', 'blue',   '刻有虛空法則的傳送符，可無視距離開啟異地秘境副本。', NULL, 0, 10),
  ('初階空間符', '符籙', 'green',  '傳送距離有限的入門傳送符。', NULL, 0, 5),

  -- 陣法類
  ('聚靈陣',     '陣法', 'green',  '布置於洞府後可加速周天靈氣回復，適合閉關修煉。', NULL, 0, 0),
  ('上品聚靈陣', '陣法', 'blue',   '品質更佳的聚靈陣，靈氣匯聚效率提升一倍。',   NULL, 0, 0),

  -- 凡人武器（lingli_cost=0，凡人三格位系統用）
  ('生鏽的鐵劍', '法器', 'white',  '年久失修的鐵劍，凡人武鬥時可用。',            NULL, 0, 0),
  ('粗布衣',     '法器', 'white',  '普通的粗布衣物，能提供些許防護。',             NULL, 0, 0),
  ('飛鏢',       '法器', 'white',  '凡人暗器，可在戰鬥中投擲造成傷害。',           NULL, 0, 0),
  ('金創藥',     '丹藥', 'white',  '凡人使用的外傷藥，可恢復少量生命。',           'heal_hp', 20, 0)

ON CONFLICT (name) DO NOTHING;


-- ============================================================
-- 9. items 補充 item_type 允許新類型（陣法）
--    現有：素材/丹藥/法器/符籙/傀儡/靈石/材料
--    新增：陣法（docs 百藝.md 明確區分陣法為獨立產品）
-- ============================================================
-- 注意：PostgreSQL TEXT 欄位不需要 ENUM 修改，直接 INSERT 即可


-- ============================================================
-- 10. 新增百藝煉製配方表
--     docs 百藝.md：配方資料表（Target_Item + Materials + Rate + Time）
-- ============================================================

CREATE TABLE IF NOT EXISTS craft_recipes (
  id               UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_item_id   UUID    NOT NULL REFERENCES items(id),
  craft_type       TEXT    NOT NULL,  -- 煉丹/製符/煉器/陣法
  material_a_id    UUID    REFERENCES items(id),
  material_a_qty   INTEGER NOT NULL DEFAULT 1,
  material_b_id    UUID    REFERENCES items(id),
  material_b_qty   INTEGER NOT NULL DEFAULT 0,
  material_c_id    UUID    REFERENCES items(id),
  material_c_qty   INTEGER NOT NULL DEFAULT 0,
  base_success_pct INTEGER NOT NULL DEFAULT 80,  -- 基礎成功率 %
  craft_minutes    INTEGER NOT NULL DEFAULT 120, -- 煉製所需分鐘
  min_prof_level   INTEGER NOT NULL DEFAULT 0,   -- 所需最低熟練度
  silver_cost      INTEGER NOT NULL DEFAULT 0,   -- 開爐費（銀兩）
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_craft_recipes_type   ON craft_recipes(craft_type);
CREATE INDEX IF NOT EXISTS idx_craft_recipes_target ON craft_recipes(target_item_id);


-- ============================================================
-- 11. 初始煉製配方種子資料
-- ============================================================

INSERT INTO craft_recipes (
  target_item_id, craft_type,
  material_a_id, material_a_qty,
  material_b_id, material_b_qty,
  base_success_pct, craft_minutes, min_prof_level, silver_cost
)
SELECT
  t.id,
  r.craft_type,
  ma.id, r.mat_a_qty,
  mb.id, r.mat_b_qty,
  r.success_pct, r.minutes, r.min_prof, r.silver
FROM (VALUES
  ('回體丹',     '煉丹', '妖丹（下）', 2, '符紙',    0, 85, 120, 0, 10),
  ('養神丹',     '煉丹', '妖丹（下）', 2, '靈符紙',  0, 80, 150, 0, 10),
  ('上品回體丹', '煉丹', '妖丹（中）', 2, '下品靈石', 1, 70, 180, 2, 30),
  ('上品養神丹', '煉丹', '妖丹（中）', 2, '下品靈石', 1, 70, 180, 2, 30),
  ('下品符籙',   '製符', '符紙',       2, NULL,       0, 90,  60, 0,  5),
  ('中品符籙',   '製符', '靈符紙',     2, '下品靈石', 1, 75, 120, 1, 15),
  ('下品靈器',   '煉器', '破銅爛鐵',   3, NULL,       0, 80, 240, 0, 20),
  ('中品靈器',   '煉器', '劍胚',       1, '下品靈石', 2, 65, 360, 2, 50),
  ('聚靈陣',     '陣法', '符紙',       3, '下品靈石', 1, 75, 180, 1, 30),
  ('空間傳送符', '製符', '靈符紙',     3, '中品靈石', 1, 60, 240, 3, 80)
) AS r(target, craft_type, mat_a, mat_a_qty, mat_b, mat_b_qty, success_pct, minutes, min_prof, silver)
JOIN items t  ON t.name = r.target
LEFT JOIN items ma ON ma.name = r.mat_a
LEFT JOIN items mb ON mb.name = r.mat_b
WHERE NOT EXISTS (
  SELECT 1 FROM craft_recipes cr2
  JOIN items ti ON ti.id = cr2.target_item_id
  WHERE ti.name = r.target
);


-- ============================================================
-- 完成
-- ============================================================

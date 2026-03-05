-- ========================================
-- 《鏡界》修仙遊戲資料庫架構
-- Mirror Realm LBS Cultivation Game Database Schema
-- ========================================

-- 啟用 UUID 擴充功能
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. 玩家資料表 (players)
-- 儲存玩家的基本屬性與修仙進度
-- ========================================
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL DEFAULT '道友',
    age INTEGER NOT NULL DEFAULT 16,
    max_age INTEGER NOT NULL DEFAULT 76,
    stamina INTEGER NOT NULL DEFAULT 80 CHECK (stamina >= 0 AND stamina <= 100),
    energy INTEGER NOT NULL DEFAULT 80 CHECK (energy >= 0 AND energy <= 100),
    physique DECIMAL(4,1) NOT NULL DEFAULT 20.5 CHECK (physique >= 0 AND physique <= 100),
    silver BIGINT NOT NULL DEFAULT 0 CHECK (silver >= 0),
    spirit_stones BIGINT NOT NULL DEFAULT 0 CHECK (spirit_stones >= 0),
    current_realm VARCHAR(20) NOT NULL DEFAULT '凡人期',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立索引以提升查詢效能
CREATE INDEX idx_players_realm ON players(current_realm);
CREATE INDEX idx_players_name ON players(name);

-- ========================================
-- 2. 遊戲物品字典 (items)
-- 定義所有遊戲中的物品
-- ========================================
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('凡物', '靈寶', '丹藥', '功法', '符籙', '法器')),
    description TEXT,
    base_cost BIGINT NOT NULL DEFAULT 0 CHECK (base_cost >= 0),
    element VARCHAR(10) CHECK (element IN ('金', '木', '水', '火', '土', '風', '無')),
    rarity VARCHAR(10) NOT NULL DEFAULT '普通' CHECK (rarity IN ('普通', '精良', '稀有', '傳說', '神話')),
    stack_limit INTEGER NOT NULL DEFAULT 1 CHECK (stack_limit > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立索引
CREATE INDEX idx_items_type ON items(type);
CREATE INDEX idx_items_element ON items(element);
CREATE INDEX idx_items_rarity ON items(rarity);

-- ========================================
-- 3. 玩家背包 (player_inventory)
-- 儲存玩家的物品持有狀況
-- ========================================
CREATE TABLE player_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    is_equipped BOOLEAN NOT NULL DEFAULT FALSE,
    unique_attributes JSONB DEFAULT '{}',
    acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(player_id, item_id, is_equipped) -- 防止重複裝備同一物品
);

-- 建立索引
CREATE INDEX idx_inventory_player ON player_inventory(player_id);
CREATE INDEX idx_inventory_item ON player_inventory(item_id);
CREATE INDEX idx_inventory_equipped ON player_inventory(is_equipped);

-- ========================================
-- 觸發器：自動更新 updated_at 欄位
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_players_updated_at 
    BEFORE UPDATE ON players 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 初始資料範例
-- ========================================

-- 插入一些基礎物品
INSERT INTO items (name, type, description, base_cost, element, rarity, stack_limit) VALUES
('凡塵銀兩', '凡物', '凡間流通的貨幣', 1, '無', '普通', 9999),
('粗製鐵劍', '凡物', '新手修士的基礎武器', 100, '金', '普通', 1),
('饅頭', '凡物', '恢復體力的基礎食物', 5, '土', '普通', 10),
('下品靈石', '靈寶', '含有微薄靈氣的寶石', 100, '無', '普通', 99),
('回體丹', '丹藥', '快速恢復體力的丹藥', 50, '木', '精良', 20),
('神行符', '符籙', '提升移動速度的符籙', 80, '風', '精良', 10),
('吐納訣', '功法', '修仙入門基礎功法', 200, '無', '普通', 1),
('青銅劍', '法器', '注入靈氣的青銅劍', 500, '金', '精良', 1);

-- 插入測試玩家資料
INSERT INTO players (name, age, max_age, stamina, energy, physique, silver, spirit_stones, current_realm) VALUES
('創辦人', 16, 76, 80, 80, 20.5, 50, 0, '凡人期'),
('清風劍客', 25, 85, 90, 70, 35.2, 200, 50, '煉氣期');

-- 為測試玩家添加初始物品
INSERT INTO player_inventory (player_id, item_id, quantity) 
SELECT p.id, i.id, 
  CASE 
    WHEN i.name = '凡塵銀兩' THEN 50
    WHEN i.name = '粗製鐵劍' THEN 1
    WHEN i.name = '饅頭' THEN 2
    ELSE 0
  END
FROM players p, items i 
WHERE p.name = '創辦人' AND i.name IN ('凡塵銀兩', '粗製鐵劍', '饅頭')
AND CASE 
  WHEN i.name = '凡塵銀兩' THEN 50
  WHEN i.name = '粗製鐵劍' THEN 1
  WHEN i.name = '饅頭' THEN 2
  ELSE 0
END > 0;

-- 為清風劍客添加物品
INSERT INTO player_inventory (player_id, item_id, quantity) 
SELECT p.id, i.id, 
  CASE 
    WHEN i.name = '凡塵銀兩' THEN 200
    WHEN i.name = '下品靈石' THEN 50
    WHEN i.name = '青銅劍' THEN 1
    ELSE 0
  END
FROM players p, items i 
WHERE p.name = '清風劍客' AND i.name IN ('凡塵銀兩', '下品靈石', '青銅劍')
AND CASE 
  WHEN i.name = '凡塵銀兩' THEN 200
  WHEN i.name = '下品靈石' THEN 50
  WHEN i.name = '青銅劍' THEN 1
  ELSE 0
END > 0;

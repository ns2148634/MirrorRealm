-- 添加境界欄位到 players 表
ALTER TABLE players ADD COLUMN realm VARCHAR(20) DEFAULT '凡人期';

-- 建立索引以提高查詢效能
CREATE INDEX IF NOT EXISTS idx_players_realm ON players(realm);

-- 更新現有玩家的境界為預設值
UPDATE players SET realm = '凡人期' WHERE realm IS NULL;

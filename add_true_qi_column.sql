-- 新增真氣欄位到 players 表
ALTER TABLE players 
ADD COLUMN true_qi DECIMAL(5,2) DEFAULT 0.0;

-- 為 true_qi 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_players_true_qi ON players(true_qi);

-- 更新現有玩家的真氣值（如果有的話）
UPDATE players 
SET true_qi = 0.0 
WHERE true_qi IS NULL;

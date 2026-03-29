-- 添加靈根欄位到 players 表
ALTER TABLE players ADD COLUMN spiritual_root VARCHAR(20) DEFAULT '尚未覺醒';

-- 添加靈石欄位到 players 表（如果不存在）
ALTER TABLE players ADD COLUMN IF NOT EXISTS spirit_stones INTEGER DEFAULT 0;

-- 建立索引以提高查詢效能
CREATE INDEX IF NOT EXISTS idx_players_spiritual_root ON players(spiritual_root);
CREATE INDEX IF NOT EXISTS idx_players_spirit_stones ON players(spirit_stones);

-- 更新現有玩家的靈根為預設值
UPDATE players SET spiritual_root = '尚未覺醒' WHERE spiritual_root IS NULL;

-- 更新 players 表，新增時間流逝相關欄位
ALTER TABLE players 
ADD COLUMN last_login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN last_recovery_time TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 為 last_login_time 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_players_last_login ON players(last_login_time);

-- 為 last_recovery_time 建立索引以提升查詢效能  
CREATE INDEX IF NOT EXISTS idx_players_last_recovery ON players(last_recovery_time);

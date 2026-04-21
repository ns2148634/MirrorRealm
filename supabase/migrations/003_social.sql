-- ============================================================
-- 鏡界 Mirror Realm — 社交系統 schema
-- 包含：friendships（好友）、sects（宗門）、sect_members（成員）
-- 在 Supabase SQL Editor 執行
-- ============================================================


-- ============================================================
-- 1. friendships 好友關係表
-- ============================================================
CREATE TABLE IF NOT EXISTS friendships (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_a_id  UUID        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  player_b_id  UUID        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status       TEXT        NOT NULL DEFAULT 'pending',  -- pending / accepted / blocked
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- 保證 a < b，避免重複紀錄
  CONSTRAINT friendships_ordered CHECK (player_a_id < player_b_id),
  UNIQUE(player_a_id, player_b_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_a ON friendships(player_a_id);
CREATE INDEX IF NOT EXISTS idx_friendships_b ON friendships(player_b_id);


-- ============================================================
-- 2. sects 宗門表
-- ============================================================
CREATE TABLE IF NOT EXISTS sects (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT        NOT NULL UNIQUE,
  description  TEXT        NOT NULL DEFAULT '',
  leader_id    UUID        REFERENCES players(id) ON DELETE SET NULL,
  member_count INTEGER     NOT NULL DEFAULT 1,
  level        INTEGER     NOT NULL DEFAULT 1,         -- 宗門等級（未來擴充）
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sects_leader ON sects(leader_id);


-- ============================================================
-- 3. sect_members 宗門成員表
-- ============================================================
CREATE TABLE IF NOT EXISTS sect_members (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  sect_id    UUID        NOT NULL REFERENCES sects(id)   ON DELETE CASCADE,
  player_id  UUID        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL DEFAULT 'member',    -- leader / elder / member
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(player_id)  -- 一個玩家只能屬於一個宗門
);

CREATE INDEX IF NOT EXISTS idx_sect_members_sect   ON sect_members(sect_id);
CREATE INDEX IF NOT EXISTS idx_sect_members_player ON sect_members(player_id);


-- ============================================================
-- 自動維護 sects.member_count 的觸發器
-- ============================================================
CREATE OR REPLACE FUNCTION sync_sect_member_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE sects SET member_count = member_count + 1 WHERE id = NEW.sect_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE sects SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.sect_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sect_member_count ON sect_members;
CREATE TRIGGER trg_sect_member_count
  AFTER INSERT OR DELETE ON sect_members
  FOR EACH ROW EXECUTE FUNCTION sync_sect_member_count();

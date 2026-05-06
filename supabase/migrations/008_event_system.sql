-- ============================================================
-- 008_event_system.sql
-- 探索事件系統資料表（CLAUDE.md §Database Tables Required for Event System）
-- ============================================================


-- ============================================================
-- 1. 補齊 events 表缺少的欄位（007 已建基礎結構）
-- ============================================================

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS sub_types   TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS used_count  INTEGER NOT NULL DEFAULT 0;

-- base_rare_rate 在 007 建為 DECIMAL(4,2)，規格需 FLOAT，補充即可（精度足夠）
-- batch_hash 在 007 建了，保留不動（AI 批次防重複用）


-- ============================================================
-- 2. player_events — 玩家當前進行中的事件狀態
-- ============================================================

CREATE TABLE IF NOT EXISTS player_events (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id     UUID        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  event_id      UUID        NOT NULL REFERENCES events(id),
  current_layer INTEGER     NOT NULL DEFAULT 1,
  start_layer   INTEGER     NOT NULL DEFAULT 1,
  correct_count INTEGER     NOT NULL DEFAULT 0,
  total_visited INTEGER     NOT NULL DEFAULT 0,
  alert_level   INTEGER     NOT NULL DEFAULT 0 CHECK (alert_level BETWEEN 0 AND 100),
  phase         TEXT        NOT NULL DEFAULT 'inference'
                CHECK (phase IN ('inference','interaction','completed')),
  action_log    JSONB       NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_events_player  ON player_events(player_id);
CREATE INDEX IF NOT EXISTS idx_player_events_phase   ON player_events(player_id, phase);

-- updated_at 自動更新觸發器
CREATE OR REPLACE FUNCTION update_player_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_player_events_updated_at ON player_events;
CREATE TRIGGER trg_player_events_updated_at
  BEFORE UPDATE ON player_events
  FOR EACH ROW EXECUTE FUNCTION update_player_events_updated_at();


-- ============================================================
-- 3. jade_items — 玉簡道具（事件進度可刻入交易）
-- ============================================================

CREATE TABLE IF NOT EXISTS jade_items (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id             UUID        REFERENCES players(id) ON DELETE SET NULL,
  event_id             UUID        NOT NULL REFERENCES events(id),
  event_tier           INTEGER     NOT NULL,
  event_attribute      TEXT        NOT NULL,
  snapshot_layer       INTEGER     NOT NULL,
  seller_correct_count INTEGER     NOT NULL DEFAULT 0,
  seller_total_layers  INTEGER     NOT NULL DEFAULT 0,
  player_note          TEXT,
  listed_price         BIGINT,
  status               TEXT        NOT NULL DEFAULT 'held'
                       CHECK (status IN ('held','listed','sold','expired')),
  expires_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jade_items_owner  ON jade_items(owner_id);
CREATE INDEX IF NOT EXISTS idx_jade_items_status ON jade_items(status);
CREATE INDEX IF NOT EXISTS idx_jade_items_tier   ON jade_items(event_tier);


-- ============================================================
-- 完成
-- ============================================================

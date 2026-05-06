# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start both Express backend (port 3000) + Vite frontend (port 5173)
npm run dev:full

# Frontend only — Vite proxies /api/* to localhost:3000
npm run dev

# Production build (outputs to dist/, served by Express)
npm run build

# Lint
npm run lint
```

No test suite exists. To apply a DB migration manually (no Supabase CLI):
```js
// Write a temp .mjs script using pg, then delete it
import pg from 'pg';
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
```
`DATABASE_URL` comes from `.env.local`.

## Architecture

### Two-process development
Vite (`vite.config.js`) proxies all `/api/*` to Express on port 3000. In production on **Render**, Express serves `dist/` as static files + handles API. A **Vercel** path also exists (`api/index.js` exports the Express app as a serverless handler without `listen()`).

### Frontend state machine
`src/store/gameStore.js` (Zustand) is the single source of truth. `gameStage` drives the top-level render:
- `login` / `naming` → `AuthScreen`
- `playing` + `introFinished=true` → `PlayingStage`

`PlayingStage` renders five swipeable tabs: `status` → `cultivate` → `explore` → `bag` → `network`, mapped to views in `src/views/`.

### View sub-state machines
`StatusView` and `CultivateView` each manage their own multi-layer sub-navigation (e.g. `overview → entering-bt → bt → sub-view`) entirely in local `useState` — not in the global store.

### Online recovery pattern
`startOnlineRecovery()` in the store runs a `setInterval` that increments `hp`/`ep`/`aura` on the client for UI animation only — **no DB writes**. The DB is only updated when the player takes an action (meditate, breakthrough, explore). `GET /api/player/:id` is a pure read; all DB flushes happen in POST routes.

### Server layout
```
server/
  app.js          — Express app, no listen()
  index.js        — calls listen() for Render/local
  config/db.js    — pg Pool (max: 1, serverless-safe)
  routes/         — thin routers
  controllers/    — request/response handling
  services/       — business logic + DB queries
  lib/recovery.js — offline delta calculation
```

### Database
Supabase PostgreSQL accessed via `pg` Pool directly (not the Supabase JS client). Pool is capped at `max: 1` to prevent zombie connections in serverless environments.

Key tables: `players`, `realm_templates` (27 realms, lv 1–27), `items`, `player_inventory`, `enemies`, `lbs_node_templates`, `events` (exploration event pool), `anomalies` (天地異象), `craft_recipes`.

`players.id` equals the Supabase Auth UUID — there is no separate foreign key column.

Migrations live in `supabase/migrations/` (000–007) and are applied manually with a temporary Node.js script using `pg`. The Supabase CLI is not available in this environment.

### Logic modules (`src/logic/`)
Pure TypeScript functions — no imports from React or the store. They implement the game-design formulas from `docs/`:
- `combat.ts` — 3-step damage resolution (ATK → hit rate → dual-layer defense)
- `breakthrough.ts` — root threshold check + success rate formula
- `pillToxicity.ts` — `PillToxicityManager` class (+20/pill, -10/hour decay)
- `formation.ts`, `spiritRefinement.ts` — supporting systems

### Styling
Tailwind CSS + inline styles. Mobile-first at `max-w-[430px]` / `max-h-[932px]`. Container query units (`cqw`) are used throughout views. The `animate-float` keyframe (4s ease-in-out infinite, translateY 0→−8px→0) is applied to floating UI elements with staggered `animationDelay`.

### LBS / Map
`ExploreView` uses MapLibre GL with CartoDB dark-nolabels tiles. GPS position drives node generation. Node types: 勞作/見聞/衝突 (mortal phase), 妖獸/機緣 (immortal phase), 拾荒/靈泉/道友 (both).

---

## Game Design Specs (權威文件)

所有遊戲邏輯、數值、公式必須以下列文件為準，不得自行假設：

| 文件 | 說明 |
|------|------|
| `鏡界2_2_完整遊戲架構_for_code.md` | 所有系統設計的唯一權威 |
| `鏡界_事件Outcome計算規格.md` | 探索事件結果計算完整規格 |

文件中沒有定義的內容，**停下來詢問開發者，不要自行填補**。

---

## Implementation Status

### ✅ 已完成

- 玩家基礎資料表（players）
- 物品系統（items / player_inventory）
- 境界系統 UI（StatusView / CultivateView）
- 戰鬥邏輯（src/logic/combat.ts）
- 突破邏輯（src/logic/breakthrough.ts）
- 丹毒系統（src/logic/pillToxicity.ts）
- 五行破陣局（src/logic/formation.ts）
- ExploreView 基礎地圖（MapLibre GL）
- LBS 節點生成（lbs_node_templates）

### 🔲 事件系統（當前任務）

探索事件系統尚未實作，需要從資料庫到前端完整建立：

- [x] DB migration：建立事件相關資料表（008_event_system.sql、009_jade_scroll_item.sql）
- [x] 事件批次生成腳本（手動生成44條入庫）；腳本：scripts/insert-events.mjs + seed-test-events.mjs
- [x] 後端 API：取得事件 / 推進事件 / 結算事件（server/services/exploreService.js）
- [x] 前端：ExploreView 事件互動介面（推演期、互動期、結果、玉簡確認）
- [ ] 玉簡系統（天機閣交易）

### 🔲 待實作（事件系統之後）

- 掉落物系統（材料總表）
- 煉製系統（天爐）
- 轉世重生系統
- 天機閣完整交易介面
- PVP 系統

---

## Event System Specification

### 核心設計原則

1. **所有事件均為綜合型**：同一事件選不同動作可能遇到妖獸、採到靈草或什麼都沒有
2. **層數完全隨機**：T1 也可能出現 L6，層數代表資訊量而非難度
3. **神識決定起始層**：神識高直接從深層開始，不是倍率加成
4. **動作選擇操控機率**：玩家透過動作序列影響結果品質

### 層數分布

```
T1：L1(30%) L2(25%) L3(20%) L4(12%) L5(8%) L6(5%)
T2：L2(30%) L3(25%) L4(20%) L5(15%) L6(10%)
T3：L3(30%) L4(28%) L5(25%) L6(17%)
T4：L4(30%) L5(40%) L6(30%)
T5：L6(100%)
```

### 神識起始層公式

```js
const delta = si - hidden_level
const start_layer = Math.min(
  Math.max(1, 1 + Math.floor(delta / 25)),
  total_layers
)
```

### Outcome 計算（完整版見鏡界_事件Outcome計算規格.md）

```js
final_weight = base_weight × action_mod × layer_mod × alert_mod × randomness

// action_mod：依正確率 0.0~1.0，好收益 0.3~2.0，壞結果反向
// layer_mod：1.0 + (start_layer - 1) × 0.2（只作用於好收益）
// alert_mod：alert≥60 時好收益歸零，alert≥30 時好收益 ×0.5
// randomness：0.85 ~ 1.15
```

### 五大動作

| 代碼 | 中文 | 消耗 |
|------|------|------|
| `search` | 深入探查 | 精力 5 |
| `wait` | 靜觀其變 | 精力 |
| `stone` | 靈石試探 | 靈石 |
| `retreat` | 撤退 | 無 |
| `jade` | 刻入玉簡 | 空白玉簡 |

### 驚動值閾值

```
alert < 30：正常
alert ≥ 30：好收益 ×0.5
alert ≥ 60：好收益消失，普通收益 ×0.5
alert = 100：強制觸發 worst_result
```

### 靈石掉落規則（12.3a節）

靈石內嵌於 normal / good outcome，不是獨立 outcome 類型：

| Tier | normal | good |
|------|--------|------|
| T1 | 5~15 | 10~30 |
| T2 | 10~30 | 25~60 |
| T3 | 20~60 | 50~120 |
| T4 | 40~120 | 100~250 |
| T5 | 80~200 | 200~500 |

metal 屬性事件靈石 ×1.5。玉簡刻入時若未進入互動期，靈石收益歸零。

---

## Database Tables Required for Event System

migration 檔案：`supabase/migrations/008_event_system.sql`

```sql
-- 事件模板池（AI 批次預先生成）
CREATE TABLE events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_type        TEXT NOT NULL,
  sub_types        TEXT[] NOT NULL DEFAULT '{}',
  tier             INT  NOT NULL CHECK (tier BETWEEN 1 AND 5),
  attribute        TEXT NOT NULL CHECK (attribute IN ('fire','water','wood','metal','earth')),
  hidden_level     INT  NOT NULL,
  total_layers     INT  NOT NULL CHECK (total_layers BETWEEN 1 AND 6),
  progression      JSONB NOT NULL,
  outcome_weights  JSONB NOT NULL,
  action_modifiers JSONB NOT NULL,
  base_rare_rate   FLOAT NOT NULL DEFAULT 0.03,
  entity_data      JSONB DEFAULT '{}',
  used_count       INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 玩家當前進行中的事件狀態
CREATE TABLE player_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  event_id      UUID NOT NULL REFERENCES events(id),
  current_layer INT  NOT NULL DEFAULT 1,
  start_layer   INT  NOT NULL DEFAULT 1,
  correct_count INT  NOT NULL DEFAULT 0,
  total_visited INT  NOT NULL DEFAULT 0,
  alert_level   INT  NOT NULL DEFAULT 0 CHECK (alert_level BETWEEN 0 AND 100),
  phase         TEXT NOT NULL DEFAULT 'inference'
                CHECK (phase IN ('inference','interaction','completed')),
  action_log    JSONB NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 玉簡道具
CREATE TABLE jade_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id             UUID REFERENCES players(id) ON DELETE SET NULL,
  event_id             UUID NOT NULL REFERENCES events(id),
  event_tier           INT  NOT NULL,
  event_attribute      TEXT NOT NULL,
  snapshot_layer       INT  NOT NULL,
  seller_correct_count INT  NOT NULL DEFAULT 0,
  seller_total_layers  INT  NOT NULL DEFAULT 0,
  player_note          TEXT,
  listed_price         BIGINT,
  status               TEXT NOT NULL DEFAULT 'held'
                       CHECK (status IN ('held','listed','sold','expired')),
  expires_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);
```

---

## API Endpoints Required for Event System

新增路由至 `server/routes/explore.js`：

```
POST /api/explore/scan
  body: { player_id, lat, lng, poi_type, weather }
  → 從 events 池取出一條事件，建立 player_events 記錄
  → 依神識計算 start_layer
  → 回傳可見層文本（start_layer 以下的層顯示模糊提示）

POST /api/explore/action
  body: { player_event_id, action }
  → 更新 player_events（correct_count / alert_level / current_layer）
  → 若到達 total_layers → phase 改為 'interaction'
  → 回傳下一層文本或互動期提示

POST /api/explore/resolve
  body: { player_event_id }
  → 執行 Outcome 計算（依鏡界_事件Outcome計算規格.md）
  → 發放收益（靈石 / 材料 / 稀有追加）
  → phase 改為 'completed'
  → 回傳結果明細

POST /api/explore/jade
  body: { player_event_id, player_note }
  → 將當前事件打包為 jade_items 記錄
  → 刪除 player_events 記錄
  → 靈石收益歸零（尚未進入互動期時）
  → 回傳 jade_item_id
```

---

## 注意事項

- **不要修改已完成系統**的邏輯，除非開發者明確指示
- **所有數值與公式** 必須對照 `鏡界_事件Outcome計算規格.md`，不得使用估算值
- **LBS 屬性映射**（POI → 五屬傾向）見 `鏡界2_2_完整遊戲架構_for_code.md` 第 13 節
- migration 命名規則延續現有：`008_event_system.sql`
- 遇到設計文件未定義的邊界情況，**停下來問開發者**

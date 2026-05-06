# 鏡界 — 事件 Outcome 計算規格
> 本文件為探索事件結果計算的唯一權威參考。
> 與主文件（鏡界2_2_完整遊戲架構）配合使用，不重複定義已存在的系統。

---

## 目錄

1. [核心架構概覽](#1-核心架構概覽)
2. [第一層：事件生成（LBS Modifier）](#2-第一層事件生成lbs-modifier)
3. [第二層：神識開圖（Visibility Check）](#3-第二層神識開圖visibility-check)
4. [第三層：推演期計算（Inference Phase）](#4-第三層推演期計算inference-phase)
5. [第四層：Outcome 結果計算](#5-第四層outcome-結果計算)
6. [驚動值與懲罰整合](#6-驚動值與懲罰整合)
7. [玉簡 Snapshot 規格](#7-玉簡-snapshot-規格)
8. [完整資料結構（Supabase）](#8-完整資料結構supabase)
9. [後端實作 JavaScript 參考](#9-後端實作-javascript-參考)

---

## 1. 核心架構概覽

整個事件流程分為四層計算，依序執行：

```
掃描觸發
  └→ [層1] LBS Modifier        → 決定事件「屬性與類型傾向」
       └→ [層2] Visibility Check → 決定玩家「從哪層開始」
            └→ [層3] Inference Phase → 玩家選動作 → 驚動值累積
                 └→ [層4] Outcome 計算 → 結果品質與稀有度
```

**重要原則（來自主文件 13 節）：**
- LBS 只影響「內容屬性」，絕對不影響「事件觸發率」
- 神識決定「起始層數」，不影響「結果機率倍率」（這是兩個獨立機制）
- 動作選擇是主要的「機率操控」工具

---

## 2. 第一層：事件生成（LBS Modifier）

### 2.1 屬性傾向權重

根據玩家當前位置 POI 類型，調整事件的屬性池權重。
此權重只決定「出現的是哪個屬性的事件」，不決定 tier。

| POI 類型 | 金 | 木 | 水 | 火 | 土 |
|----------|----|----|----|----|-----|
| 金融/商圈 | 40 | 5  | 25 | 10 | 20 |
| 公園/綠地 | 5  | 40 | 15 | 10 | 30 |
| 餐飲/娛樂 | 10 | 10 | 25 | 40 | 15 |
| 工地/五金 | 35 | 5  | 10 | 15 | 35 |
| 未知/室內 | 20 | 20 | 20 | 20 | 20 |

```js
// 從屬性池中加權隨機抽取
function rollAttribute(poi_type) {
  const weights = ATTRIBUTE_WEIGHTS[poi_type] ?? ATTRIBUTE_WEIGHTS['unknown']
  return weightedRandom(weights)
}
```

### 2.2 天氣修正（疊加在屬性傾向上）

| 天氣 | 效果 |
|------|------|
| 晴天 | 火屬權重 ×1.3 |
| 雨天 | 水屬權重 ×1.5，火屬 ×0.6 |
| 陰天 | 無修正 |
| 風大 | 金屬權重 ×1.2 |

> **注意：** 天氣不修改 tier 分布，只調整屬性傾向。

### 2.3 Tier 分布（與 LBS 無關，純粹機率）

主文件已定義 T1–T5 的層數範圍，tier 本身的觸發機率由全域設定控制，不受 LBS 影響：

| Tier | 建議出現機率 | 說明 |
|------|------------|------|
| T1   | 35%        | 教學/日常 |
| T2   | 30%        | 主要內容 |
| T3   | 20%        | 中階挑戰 |
| T4   | 10%        | 高風險 |
| T5   | 5%         | 極端風險 |

### 2.4 層數分配（完全隨機，低階也可能出深層）

```
T1：L1(30%) / L2(25%) / L3(20%) / L4(12%) / L5(8%) / L6(5%)
T2：L2(30%) / L3(25%) / L4(20%) / L5(15%) / L6(10%)
T3：L3(30%) / L4(28%) / L5(25%) / L6(17%)
T4：L4(30%) / L5(40%) / L6(30%)
T5：L6(100%)
```

> T1 出現 L6 代表環境資訊豐富，但風險仍是 T1 等級。
> 神識高的玩家在深層 T1 事件幾乎零風險，但能得到完整資訊優勢。

---

## 3. 第二層：神識開圖（Visibility Check）

### 3.1 起始層計算

```
Δ = 玩家神識(si) - 事件隱蔽等級(hidden_level)

起始層 = clamp(1 + floor(Δ / 25), 1, total_layers)
```

**分母選擇說明（為什麼是 25）：**

煉氣期神識最高 100，化神期最高 1,600。
hidden_level 範圍：T1 約 10–30，T5 約 80–120。

以煉氣大圓滿玩家（si=100）遇 T3 事件（hidden≈60）為例：
```
Δ = 100 - 60 = 40
起始層 = 1 + floor(40/25) = 1 + 1 = L2
```

以金丹（si≈350）遇 T3 事件（hidden≈60）：
```
Δ = 350 - 60 = 290
起始層 = 1 + floor(290/25) = 1 + 11 = clamp到L4（total_layers=4）
```

### 3.2 各 Tier 的 hidden_level 建議範圍

| Tier | hidden_level 範圍 | 說明 |
|------|-------------------|------|
| T1   | 0–20              | 凡人也能看到 L2 |
| T2   | 20–40             | 煉氣中期開始有優勢 |
| T3   | 40–70             | 築基/金丹才能跳層 |
| T4   | 60–90             | 元嬰才能從深層開始 |
| T5   | 80–120            | 化神才能省略前置層 |

### 3.3 神識符效果

```
使用神識符後：起始層 = min(起始層 + 1, total_layers)
```

只提升一階，不能跳過養成，上限 total_layers。

### 3.4 模糊層（未達到的層）

未達到的深層不是「不存在」，而是顯示模糊提示：

```
「你隱約感覺此地有更深的變化，但神識無法穿透」
```

模糊提示本身不消耗精力，玩家選「深入探查」可嘗試強行推進（消耗精力 5，有一定機率揭曉下一層，但會增加驚動值）。

---

## 4. 第三層：推演期計算（Inference Phase）

### 4.1 每層的 best_action

每個事件模板的每一層都標注一個 `best_action`，對應五大動作之一：

| 動作代碼 | 中文 |
|----------|------|
| `search` | 深入探查 |
| `wait`   | 靜觀其變 |
| `stone`  | 靈石試探 |
| `retreat`| 撤退 |
| `jade`   | 刻入玉簡 |

### 4.2 動作結果

```
選中 best_action → 推進下一層，驚動值不增加
選其他動作 → 驚動值增加（見驚動值機制）
選 retreat → 安全退出，放棄本次事件所有收益
選 jade → 打包事件為玉簡，事件從世界移除
```

### 4.3 驚動值增量（依 Tier）

| Tier | 每次錯誤增加驚動值 |
|------|------------------|
| T1   | +15              |
| T2   | +20              |
| T3   | +30              |
| T4   | +40              |
| T5   | +50              |

閾值效果（主文件 12.7 節已定義）：
- ≥30：後續動作成功率下降
- ≥60：稀有收益消失
- =100：強制觸發最壞結果

---

## 5. 第四層：Outcome 結果計算

這是核心計算層。玩家到達互動期後，計算最終結果的品質與稀有度。

### 5.1 Outcome 類型

每個事件的 `base_type` 決定了「互動期能觸發的結果集合」：

| base_type | 可能的 outcome |
|-----------|----------------|
| monster   | 戰勝（好掉落/普通掉落）、逃脫、失敗 |
| resource  | 稀有採集、普通採集、採集失敗 |
| npc       | 好交易、普通交易、被騙 |
| array     | 破陣成功、部分破陣、失敗 |
| opportunity | 機緣觸發、降級為普通事件、無事發生 |

### 5.2 Outcome 品質權重公式

```
final_weight = base_weight × action_mod × layer_mod × alert_mod × randomness
```

各因子定義如下：

#### base_weight（事件模板定義）

每個事件模板定義各 outcome 的基礎權重。範例（T3 妖獸事件）：

```json
"outcome_weights": {
  "good_drop":    25,
  "normal_drop":  50,
  "no_drop":      20,
  "failure":       5
}
```

#### action_mod（動作修正）

玩家在每一層的動作選擇累積影響 outcome。
用「正確率」來計算：

```
correct_count = 推演期中選中 best_action 的次數
total_layers_visited = 玩家實際經過的層數

correct_rate = correct_count / total_layers_visited
```

| correct_rate | action_mod（好收益） | action_mod（壞結果） |
|-------------|-------------------|-------------------|
| 1.0（全對）  | ×2.0              | ×0.3              |
| 0.75        | ×1.5              | ×0.6              |
| 0.5         | ×1.0              | ×1.0              |
| 0.25        | ×0.6              | ×1.5              |
| 0.0（全錯） | ×0.3              | ×2.0              |

> 設計原則：全對時好結果機率提升到 ×2，全錯時壞結果機率提升到 ×2。
> 讓玩家感受到「我操控了結果」，但不是完全決定性。

#### layer_mod（起始層加成）

玩家從更深的層開始，代表神識高、看得更透徹，好結果加成：

```
layer_mod = 1.0 + (start_layer - 1) × 0.2
```

| 起始層 | layer_mod |
|--------|-----------|
| L1     | 1.0       |
| L2     | 1.2       |
| L3     | 1.4       |
| L4     | 1.6       |
| L5     | 1.8       |
| L6     | 2.0       |

> layer_mod 只作用於「好收益」的 outcome，不影響壞結果。
> 神識高的玩家更容易拿到好東西，但不影響基礎風險。

#### alert_mod（驚動值懲罰）

```
if alert_level >= 60:
  good_weight × 0.0    // 稀有收益消失（主文件定義）
  normal_weight × 0.5  // 普通收益減半
else if alert_level >= 30:
  good_weight × 0.5
  normal_weight × 0.8
else:
  所有 weight × 1.0
```

#### randomness（隨機浮動）

```
randomness = 0.85 + Math.random() × 0.30  // 範圍：0.85 ~ 1.15
```

浮動 ±15%，保留驚喜感，但不壓過策略影響。

### 5.3 最終 Outcome 抽取

```js
// 計算所有 outcome 的 final_weight
for each outcome in outcome_weights:
  if outcome is "good" or "rare":
    final_weight = base_weight × action_mod_good × layer_mod × alert_mod × randomness
  else:
    final_weight = base_weight × action_mod_bad × alert_mod × randomness

// 加權隨機抽取
result = weightedRandom(final_weights)
```

### 5.4 稀有收益追加判定（Rare Check）

部分事件模板有「稀有追加」機率，在基本 outcome 決定後，額外進行一次判定：

```
rare_trigger_rate = base_rare_rate × (1 + correct_rate) × layer_mod

// 若觸發，在正常收益基礎上追加稀有掉落
```

| Tier | base_rare_rate |
|------|----------------|
| T1   | 1%             |
| T2   | 3%             |
| T3   | 8%             |
| T4   | 15%            |
| T5   | 25%            |

---

## 6. 驚動值與懲罰整合

主文件已定義驚動值閾值（12.7節），這裡補充與 Outcome 計算的整合點：

```
alert_level = 100 → 強制 outcome = worst_result（不走權重計算）

worst_result 定義（依 base_type）：
  monster    → failure（失敗，觸發戰鬥失敗懲罰）
  resource   → nothing（什麼都沒有）
  opportunity → downgrade（降級為 T1 普通事件）
```

---

## 7. 玉簡 Snapshot 規格

### 7.1 刻入時機

玩家可在推演期任意層刻入玉簡（選 jade 動作），事件從世界移除，打包為可交易商品。

### 7.2 Snapshot 資料結構

```json
{
  "jade_id": "uuid",
  "event_id": "原始事件uuid",
  "event_tier": 3,
  "event_attribute": "fire",
  "snapshot_layer": 2,
  "seller_correct_count": 1,
  "seller_total_layers": 2,
  "player_note": "火屬強烈，可能三階妖獸，雨天遇到",
  "created_at": 1710000000,
  "expires_at": 1710259200
}
```

**不包含的資訊：**
- ❌ 每層的 best_action
- ❌ outcome 結果
- ❌ entity 具體數值
- ❌ 完整層數（total_layers）

### 7.3 買家使用玉簡

```
1. 買家從天機閣購得玉簡
2. 玉簡進入買家探索佇列
3. 買家觸發事件時，用自己的神識重新計算 start_layer
4. 推演期從 max(snapshot_layer, buyer_start_layer) 開始
   → 買家神識高 → 可能比賣家看到更深的層
   → 買家神識低 → 從賣家截止的層繼續（不回溯）
5. 之後正常走推演期 → Outcome 計算
```

### 7.4 玉簡天機閣顯示資訊

買家在天機閣只能看到：
- Tier（T1–T5）
- 屬性（金/木/水/火/土）
- 賣家已探索層數（snapshot_layer / unknown）
- 賣家備注（player_note，純文字，賣家自填）

---

## 8. 完整資料結構（Supabase）

### 8.1 events 表

```sql
CREATE TABLE events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_type       TEXT NOT NULL,  -- monster|resource|npc|array|opportunity
  tier            INT  NOT NULL,  -- 1~5
  attribute       TEXT NOT NULL,  -- fire|water|wood|metal|earth
  hidden_level    INT  NOT NULL,  -- 0~120
  total_layers    INT  NOT NULL,  -- 1~6
  progression     JSONB NOT NULL, -- 各層文本與 best_action
  entity_data     JSONB,          -- 實體數值與天氣修正
  outcome_weights JSONB NOT NULL, -- 各 outcome 基礎權重
  base_rare_rate  FLOAT DEFAULT 0.03,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 8.2 progression JSONB 結構

```json
{
  "L1": {
    "text": "前方空氣燥熱異常，地面有幾處焦黑痕跡",
    "best_action": "wait",
    "wrong_alert_add": 20,
    "blur_text": "你隱約感覺此地有更深的變化，但神識無法穿透"
  },
  "L2": {
    "text": "靈力感應到岩石縫隙間有火屬靈氣流動，波動不規律",
    "best_action": "wait",
    "wrong_alert_add": 20
  },
  "L3": {
    "text": "三階赤焰狐靜伏於岩後，正在吐納靈氣，尚未戒備",
    "best_action": "search",
    "wrong_alert_add": 30
  },
  "L4": {
    "text": "牠右後腿有舊傷，行動略顯遲緩，出爪時有 0.2s 破綻",
    "best_action": "search",
    "wrong_alert_add": 30,
    "reward_bonus": "weakness_exposed"
  }
}
```

### 8.3 outcome_weights JSONB 結構

```json
{
  "good_drop":    25,
  "normal_drop":  50,
  "no_drop":      20,
  "failure":       5,
  "worst_result": "failure"
}
```

### 8.4 player_events 表（玩家當前事件狀態）

```sql
CREATE TABLE player_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id       UUID NOT NULL REFERENCES players(id),
  event_id        UUID NOT NULL REFERENCES events(id),
  current_layer   INT  NOT NULL DEFAULT 1,
  correct_count   INT  NOT NULL DEFAULT 0,
  total_visited   INT  NOT NULL DEFAULT 0,
  alert_level     INT  NOT NULL DEFAULT 0,
  phase           TEXT NOT NULL DEFAULT 'inference',  -- inference|interaction|completed
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 8.5 jade_items 表（玉簡道具）

```sql
CREATE TABLE jade_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id             UUID REFERENCES players(id),
  event_id             UUID NOT NULL REFERENCES events(id),
  event_tier           INT  NOT NULL,
  event_attribute      TEXT NOT NULL,
  snapshot_layer       INT  NOT NULL,
  seller_correct_count INT  NOT NULL DEFAULT 0,
  seller_total_layers  INT  NOT NULL DEFAULT 0,
  player_note          TEXT,
  listed_price         INT,          -- 天機閣上架價格（仙玉）
  status               TEXT DEFAULT 'held',  -- held|listed|sold|expired
  expires_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 9. 後端實作 JavaScript 參考

```js
// ========================================
// 層1：屬性抽取
// ========================================
function rollAttribute(poi_type, weather) {
  const base = ATTRIBUTE_WEIGHTS[poi_type] ?? ATTRIBUTE_WEIGHTS['unknown']
  const adjusted = { ...base }

  if (weather === 'sunny')  adjusted.fire  = Math.round(adjusted.fire  * 1.3)
  if (weather === 'rainy')  { adjusted.water = Math.round(adjusted.water * 1.5); adjusted.fire = Math.round(adjusted.fire * 0.6) }
  if (weather === 'windy')  adjusted.metal = Math.round(adjusted.metal * 1.2)

  return weightedRandom(adjusted)
}

// ========================================
// 層2：起始層計算
// ========================================
function calcStartLayer(si, hidden_level, total_layers, has_jade_scroll = false) {
  const delta = si - hidden_level
  let start = Math.max(1, 1 + Math.floor(delta / 25))
  if (has_jade_scroll) start = Math.min(start + 1, total_layers)
  return Math.min(start, total_layers)
}

// ========================================
// 層3：動作修正計算
// ========================================
function calcActionMod(correct_count, total_visited) {
  const rate = total_visited === 0 ? 0.5 : correct_count / total_visited

  // 對好收益的修正
  const good_mod = rate >= 1.0 ? 2.0
    : rate >= 0.75 ? 1.5
    : rate >= 0.5  ? 1.0
    : rate >= 0.25 ? 0.6
    : 0.3

  // 對壞結果的修正
  const bad_mod = rate >= 1.0 ? 0.3
    : rate >= 0.75 ? 0.6
    : rate >= 0.5  ? 1.0
    : rate >= 0.25 ? 1.5
    : 2.0

  return { good_mod, bad_mod }
}

// ========================================
// 層4：Outcome 計算
// ========================================
function calcOutcome({ event, player_state }) {
  const { correct_count, total_visited, alert_level, current_layer } = player_state
  const { outcome_weights, base_rare_rate, total_layers } = event

  // 強制最壞結果
  if (alert_level >= 100) {
    return { result: outcome_weights.worst_result, rare_triggered: false }
  }

  const { good_mod, bad_mod } = calcActionMod(correct_count, total_visited)
  const layer_mod = 1.0 + (current_layer - 1) * 0.2

  // alert_mod
  let alert_good_mod = 1.0
  let alert_normal_mod = 1.0
  if (alert_level >= 60) { alert_good_mod = 0.0; alert_normal_mod = 0.5 }
  else if (alert_level >= 30) { alert_good_mod = 0.5; alert_normal_mod = 0.8 }

  const randomness = () => 0.85 + Math.random() * 0.30

  // 計算每個 outcome 的 final_weight
  const final_weights = {}
  const GOOD_OUTCOMES = ['good_drop', 'rare_drop', 'good_trade', 'full_clear']
  const BAD_OUTCOMES  = ['failure', 'nothing', 'trap', 'downgrade']

  for (const [outcome, base_w] of Object.entries(outcome_weights)) {
    if (outcome === 'worst_result') continue

    const is_good = GOOD_OUTCOMES.includes(outcome)
    const is_bad  = BAD_OUTCOMES.includes(outcome)

    let w = base_w
    if (is_good) w = w * good_mod * layer_mod * alert_good_mod * randomness()
    else if (is_bad) w = w * bad_mod * randomness()
    else w = w * alert_normal_mod * randomness()  // normal

    final_weights[outcome] = Math.max(0, w)
  }

  const result = weightedRandom(final_weights)

  // 稀有追加判定
  const correct_rate = total_visited === 0 ? 0.5 : correct_count / total_visited
  const rare_rate = base_rare_rate * (1 + correct_rate) * layer_mod
  const rare_triggered = Math.random() < rare_rate

  return { result, rare_triggered }
}

// ========================================
// 工具函數
// ========================================
function weightedRandom(weights) {
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0)
  let rand = Math.random() * total
  for (const [key, w] of Object.entries(weights)) {
    rand -= w
    if (rand <= 0) return key
  }
  return Object.keys(weights)[0]
}
```

---

## 附錄：設計原則小結

| 原則 | 實作位置 |
|------|----------|
| LBS 只影響屬性，不影響觸發率 | 層1 LBS Modifier |
| 神識決定「起始層」，不是「倍率」 | 層2 Visibility Check（獨立機制） |
| 動作選擇是主要機率操控手段 | 層4 action_mod |
| 神識高的玩家拿到更好收益，但不消除風險 | 層4 layer_mod 只加成好收益 |
| 驚動值是「自己作死」的懲罰，不是外部強加 | 驚動值 → alert_mod |
| 玉簡買家用自己的神識重新判讀 | 層2 重新計算 start_layer |

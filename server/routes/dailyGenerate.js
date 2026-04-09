// server/routes/dailyGenerate.js
//
// 每日世界事件生成 API
// 由外部 cron（cron-job.org）每天 05:00 打一次：
//   POST /api/daily/generate
//   Header: x-cron-secret: <CRON_SECRET>
//
// 流程：
//   1. 呼叫 OpenWeatherMap 取台灣各城市今日天氣
//   2. 天氣 → 事件類型權重映射
//   3. 依權重 + 地理分布生成 100 筆 world_events
//   4. 呼叫 Claude API 生成今日麵包屑文字池（100 條）
//   5. 清除昨日過期事件與麵包屑
//
// 環境變數需求：
//   OPENWEATHER_API_KEY  — OpenWeatherMap 免費帳號 API key
//   ANTHROPIC_API_KEY    — Claude API key（麵包屑文字生成）
//   CRON_SECRET          — 防止公開觸發的秘密金鑰

import express from 'express';
import * as db from '../config/db.js';

const router = express.Router();

// ── 台灣主要城市座標（用於事件地理分散）──────────────────────────────
const TW_CITIES = [
  { name: '台北', lat: 25.0330, lng: 121.5654, owm_id: 1668341 },
  { name: '新北', lat: 25.0169, lng: 121.4627, owm_id: 7522083 },
  { name: '桃園', lat: 24.9937, lng: 121.3009, owm_id: 1668359 },
  { name: '台中', lat: 24.1477, lng: 120.6736, owm_id: 1668399 },
  { name: '台南', lat: 22.9999, lng: 120.2270, owm_id: 1668065 },
  { name: '高雄', lat: 22.6163, lng: 120.3133, owm_id: 1673820 },
  { name: '新竹', lat: 24.8138, lng: 120.9675, owm_id: 1668318 },
  { name: '嘉義', lat: 23.4801, lng: 120.4491, owm_id: 1675107 },
  { name: '花蓮', lat: 23.9916, lng: 121.6111, owm_id: 1675151 },
  { name: '宜蘭', lat: 24.7021, lng: 121.7378, owm_id: 1673820 },
];

// ── 天氣代碼 → 事件類型權重映射 ────────────────────────────────────
// OWM 天氣代碼：2xx=雷雨, 3xx=毛毛雨, 5xx=雨, 6xx=雪, 7xx=霧/霾, 800=晴, 8xx=雲
function getEventWeights(weatherCode) {
  if (weatherCode >= 200 && weatherCode < 300) {
    // 雷雨 → 極危險，雷系機緣大量出現
    return { '妖獸': 0.45, '機緣': 0.30, '靈泉': 0.10, '世界': 0.15 };
  } else if (weatherCode >= 300 && weatherCode < 600) {
    // 雨天 → 水系靈泉增加，妖獸較活躍
    return { '妖獸': 0.30, '機緣': 0.20, '靈泉': 0.35, '世界': 0.15 };
  } else if (weatherCode >= 600 && weatherCode < 700) {
    // 低溫/霧雨 → 幻象事件增加
    return { '妖獸': 0.20, '機緣': 0.40, '靈泉': 0.20, '世界': 0.20 };
  } else if (weatherCode >= 700 && weatherCode < 800) {
    // 霧/霾 → 幻象、神識事件為主
    return { '妖獸': 0.15, '機緣': 0.50, '靈泉': 0.15, '世界': 0.20 };
  } else if (weatherCode === 800) {
    // 晴天 → 火系妖獸、陽性機緣
    return { '妖獸': 0.35, '機緣': 0.35, '靈泉': 0.15, '世界': 0.15 };
  } else {
    // 多雲 → 均衡
    return { '妖獸': 0.25, '機緣': 0.30, '靈泉': 0.25, '世界': 0.20 };
  }
}

// ── 天氣代碼 → 危險等級 ──────────────────────────────────────────
function getWeatherDangerTier(weatherCode) {
  if (weatherCode >= 200 && weatherCode < 300) return 'extreme'; // 雷雨
  if (weatherCode >= 300 && weatherCode < 600) return 'danger';  // 雨
  if (weatherCode >= 700 && weatherCode < 800) return 'mid';     // 霧
  if (weatherCode === 800) return 'mid';                         // 晴（火盛）
  return 'safe';
}

// ── 依危險等級決定 danger_radius（公尺）──────────────────────────
const DANGER_RADIUS = { extreme: 800, danger: 500, mid: 300, safe: 150 };

// ── 加權隨機選擇 ─────────────────────────────────────────────────
function weightedRandom(weights) {
  const entries = Object.entries(weights);
  const total   = entries.reduce((s, [, v]) => s + v, 0);
  let rand = Math.random() * total;
  for (const [key, val] of entries) {
    rand -= val;
    if (rand <= 0) return key;
  }
  return entries[0][0];
}

// ── 在城市座標附近隨機偏移（0–5km）─────────────────────────────
function randomOffset(lat, lng, maxKm = 5) {
  const R     = 6371;
  const distKm = Math.random() * maxKm;
  const angle  = Math.random() * 2 * Math.PI;
  const dLat   = (distKm / R) * (180 / Math.PI) * Math.cos(angle);
  const dLng   = (distKm / R) * (180 / Math.PI) * Math.sin(angle) / Math.cos(lat * Math.PI / 180);
  return { lat: lat + dLat, lng: lng + dLng };
}

// ── 事件名稱生成（依類型 + 天氣）─────────────────────────────────
const EVENT_NAMES = {
  '妖獸': {
    雷雨: ['雷鳴妖獸侵擾', '天劫妖靈出沒', '雷域兇獸橫行'],
    雨天: ['水族妖靈作亂', '河澤蛟龍現蹤', '濕地妖獸聚集'],
    霧天: ['幽靈妖獸遊蕩', '霧中異獸出沒', '迷霧惡靈徘徊'],
    晴天: ['烈日火獸出沒', '山嶺妖獸橫行', '荒野兇獸聚集'],
    一般: ['妖獸侵擾', '異獸出沒', '兇靈現蹤'],
  },
  '機緣': {
    雷雨: ['雷劫天機降臨', '天道饋贈—雷晶', '雷霆法則感悟'],
    雨天: ['雨中機緣顯現', '水靈結晶湧現', '靈雨洗禮機緣'],
    霧天: ['霧中仙緣隱現', '幻境機緣一閃', '迷途中的悟道'],
    晴天: ['陽光普照機緣', '天火靈晶降世', '日精凝聚機緣'],
    一般: ['天外機緣降臨', '奇遇現蹤', '靈機乍現'],
  },
  '靈泉': {
    雷雨: ['雷湧靈泉', '天雷激活靈脈'],
    雨天: ['天降靈泉', '雨潤靈脈湧現'],
    霧天: ['霧中靈泉', '幽深靈脈湧出'],
    晴天: ['日照靈泉', '陽氣充盈靈脈'],
    一般: ['靈脈湧現', '天地靈泉'],
  },
  '世界': {
    雷雨: ['雷劫降世—全服警戒', '天道示警'],
    雨天: ['靈雨普降—全服恩澤', '天地滋潤'],
    霧天: ['迷霧籠罩—秘境顯現', '幻境開啟'],
    晴天: ['天火淬鍊—修煉加速', '日精積聚'],
    一般: ['天地共鳴', '世界靈氣潮汐'],
  },
};

function pickEventName(eventType, weatherLabel) {
  const pool = EVENT_NAMES[eventType]?.[weatherLabel] ?? EVENT_NAMES[eventType]?.['一般'] ?? ['異象'];
  return pool[Math.floor(Math.random() * pool.length)];
}

function weatherLabel(code) {
  if (code >= 200 && code < 300) return '雷雨';
  if (code >= 300 && code < 600) return '雨天';
  if (code >= 600 && code < 800) return '霧天';
  if (code === 800) return '晴天';
  return '一般';
}

// ── 主路由 ────────────────────────────────────────────────────────
router.post('/generate', async (req, res) => {
  // 驗證 cron secret
  const secret = req.headers['x-cron-secret'];
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ message: '未授權' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    // 防止重複執行
    const existing = await db.query(
      `SELECT id FROM world_events WHERE generated_date = $1 LIMIT 1`,
      [today]
    );
    if (existing.rows.length > 0) {
      return res.json({ message: '今日已生成', date: today });
    }

    // ── Step 1：取台灣天氣（OpenWeatherMap）─────────────────────
    let cityWeathers = [];
    const owmKey = process.env.OPENWEATHER_API_KEY;
    if (owmKey) {
      const weatherFetches = TW_CITIES.map(city =>
        fetch(`https://api.openweathermap.org/data/2.5/weather?id=${city.owm_id}&appid=${owmKey}`)
          .then(r => r.json())
          .then(data => ({
            city,
            code:  data.weather?.[0]?.id ?? 800,
            temp:  data.main?.temp ?? 298,
            desc:  data.weather?.[0]?.description ?? '',
          }))
          .catch(() => ({ city, code: 800, temp: 298, desc: '' }))
      );
      cityWeathers = await Promise.all(weatherFetches);
    } else {
      // 無 API key：使用預設晴天
      cityWeathers = TW_CITIES.map(city => ({ city, code: 800, temp: 298, desc: '' }));
    }

    // ── Step 2：生成 100 筆 world_events ─────────────────────────
    const expiresAt = new Date();
    expiresAt.setHours(23, 59, 59, 999); // 當日 23:59 過期

    const eventsToInsert = [];
    const eventsPerCity  = Math.ceil(100 / TW_CITIES.length); // 每城市約 10 個

    for (const { city, code } of cityWeathers) {
      const weights   = getEventWeights(code);
      const label     = weatherLabel(code);
      const dangerTier = getWeatherDangerTier(code);
      const radius    = DANGER_RADIUS[dangerTier];

      for (let i = 0; i < eventsPerCity; i++) {
        const eventType = weightedRandom(weights);
        const { lat, lng } = randomOffset(city.lat, city.lng, 5);
        eventsToInsert.push({
          name:           pickEventName(eventType, label),
          event_type:     eventType,
          lat,
          lng,
          danger_radius:  radius,
          is_active:      true,
          expires_at:     expiresAt.toISOString(),
          generated_date: today,
        });
      }
    }

    // 批次寫入（截斷到 100）
    const batch = eventsToInsert.slice(0, 100);
    for (const ev of batch) {
      await db.query(
        `INSERT INTO world_events (name, event_type, lat, lng, danger_radius, is_active, expires_at, generated_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [ev.name, ev.event_type, ev.lat, ev.lng, ev.danger_radius, ev.is_active, ev.expires_at, ev.generated_date]
      );
    }

    // ── Step 3：模板生成麵包屑文字池（完全免費，無外部依賴）───────
    const HINT_TEMPLATES = {
      danger: [
        '煞氣如潮水般湧動，令人心悸不安。',
        '附近有強大的妖氣在徘徊，不可輕舉妄動。',
        '神識感應到前方有兇險之物正在逼近。',
        '空氣中瀰漫著血腥氣息，危機四伏。',
        '一股壓迫感從遠處傳來，如山嶽般沉重。',
        '妖獸的低鳴隱約可聞，距此不遠。',
        '此地靈氣紊亂，必有兇靈盤踞。',
        '皮膚微微發麻，有危險正悄然接近。',
      ],
      mid: [
        '天地法則有些許異動，需保持警覺。',
        '遠處靈氣波動異常，似有什麼正在發生。',
        '隱約感應到某種存在，方向不甚清晰。',
        '此地氣場不穩，小心為妙。',
        '有一絲奇特的氣息隨風而來，來源不明。',
        '神識稍加外放，便感到周遭暗流湧動。',
        '天色微變，似乎預示著某種變化。',
        '方圓之內，靈氣有輕微的潮汐感。',
      ],
      secret_realm: [
        '一道若有若無的靈光在遠方一閃而逝。',
        '神識深處隱隱感應到一扇門的存在。',
        '此地殘留著某種古老的氣息，似乎藏有秘密。',
        '天地之間有一絲縫隙，機緣或許就在其中。',
        '隱約察覺到空間的褶皺，秘境或已就在附近。',
        '古老的陣紋氣息若隱若現，引人追尋。',
        '感應到一股超越尋常的靈氣，深不可測。',
        '冥冥之中，似乎有某種緣法在牽引著你。',
      ],
      spirit_vein: [
        '腳下似乎有靈脈流淌，令人神清氣爽。',
        '清澈的靈氣從地底湧出，滋潤心神。',
        '此處靈氣濃郁，修煉於此事半功倍。',
        '感應到一股純淨的水系靈氣在附近流動。',
        '天地靈氣在此交匯，靈泉或就在不遠處。',
        '靈氣如絲線般縈繞，指引著某個方向。',
        '空氣中帶著淡淡的靈氣清香，令人心曠神怡。',
        '神識感應到充沛的靈能在地脈中奔湧。',
      ],
    };

    // 依今日天氣調整各類型比例
    const dominantCode = cityWeathers[0]?.code ?? 800;
    const label        = weatherLabel(dominantCode);
    const weatherHintPrefix = {
      雷雨: '雷鳴聲中，', 雨天: '細雨霏霏，', 霧天: '霧氣瀰漫，', 晴天: '陽光普照下，', 一般: '',
    }[label] ?? '';

    const zoneTypes = ['danger', 'mid', 'secret_realm', 'spirit_vein'];
    const hints = [];
    for (const zone of zoneTypes) {
      const pool = HINT_TEMPLATES[zone];
      for (let i = 0; i < 25; i++) {
        const base = pool[i % pool.length];
        // 前 8 條加天氣前綴，增加今日感
        const text = i < 8 ? weatherHintPrefix + base : base;
        hints.push({ hint_text: text, zone_type: zone });
      }
    }

    // 清除昨日麵包屑，寫入今日
    await db.query(`DELETE FROM daily_hint_pool WHERE generated_date < $1`, [today]);
    for (const h of hints) {
      await db.query(
        `INSERT INTO daily_hint_pool (hint_text, zone_type, generated_date) VALUES ($1, $2, $3)`,
        [h.hint_text, h.zone_type, today]
      );
    }
    const breadcrumbCount = hints.length;

    // ── Step 4：清除昨日過期事件 ────────────────────────────────
    await db.query(
      `DELETE FROM world_events WHERE expires_at < now() AND generated_date < $1`,
      [today]
    );

    return res.json({
      success:          true,
      date:             today,
      events_generated: batch.length,
      breadcrumbs:      breadcrumbCount,
      weather_summary:  cityWeathers.map(w => `${w.city.name}(${w.code})`).join(', '),
    });

  } catch (err) {
    console.error('[DailyGenerate] 失敗:', err);
    return res.status(500).json({ message: '生成失敗', error: err.message });
  }
});

export default router;

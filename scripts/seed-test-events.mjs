import pg from 'pg'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

await client.connect()

const testEvents = [
  {
    base_type: 'unknown',
    sub_types: ['monster', 'resource', 'nothing'],
    tier: 1,
    attribute: 'wood',
    hidden_level: 15,
    total_layers: 3,
    progression: {
      L1: { text: '林間有微風拂過，樹葉沙沙作響，空氣中帶著一絲異味。', best_action: 'wait', wrong_alert_add: 15 },
      L2: { text: '靈氣流動方向突然改變，似乎有什麼東西在移動。', best_action: 'wait', wrong_alert_add: 15 },
      L3: { text: '你發現地面有新鮮的抓痕，深淺不一，爪距頗大。', best_action: 'search', wrong_alert_add: 15 }
    },
    outcome_weights: { good: 20, normal: 50, nothing: 25, failure: 5, worst_result: 'failure' },
    action_modifiers: {
      good: { search: 2.0, wait: 1.5, stone: 1.0 },
      failure: { search: 0.5, wait: 0.3, stone: 0.7 }
    },
    base_rare_rate: 0.01,
    entity_data: {
      environment_modifiers: {
        rainy: { text_addon: '雨水沖淡了氣味，更難判斷方向。' },
        night: { text_addon: '夜色使視線受限，靈識感應更為重要。' }
      }
    }
  },
  {
    base_type: 'unknown',
    sub_types: ['resource', 'nothing', 'opportunity'],
    tier: 2,
    attribute: 'water',
    hidden_level: 35,
    total_layers: 4,
    progression: {
      L1: { text: '溪邊石縫中滲出淡藍色的水光，與尋常泉水不同。', best_action: 'wait', wrong_alert_add: 20 },
      L2: { text: '靠近後感覺到水中有微弱的靈氣波動，如心跳般規律。', best_action: 'stone', wrong_alert_add: 20 },
      L3: { text: '石縫深處有什麼東西在緩緩生長，散發出清涼氣息。', best_action: 'search', wrong_alert_add: 20 },
      L4: { text: '那是一株水靈草，根系已深入岩層，正值採摘最佳時機。', best_action: 'search', wrong_alert_add: 20 }
    },
    outcome_weights: { good: 22, normal: 45, nothing: 23, failure: 10, worst_result: 'failure' },
    action_modifiers: {
      good: { search: 2.2, wait: 1.2, stone: 1.5 },
      failure: { search: 0.4, wait: 0.6, stone: 0.8 }
    },
    base_rare_rate: 0.03,
    entity_data: {
      environment_modifiers: {
        rainy: { text_addon: '雨天水靈氣更旺，靈草似乎更為活躍。' },
        sunny: { text_addon: '陽光照入水中，靈草的輪廓愈發清晰。' }
      }
    }
  },
  {
    base_type: 'unknown',
    sub_types: ['monster', 'resource', 'nothing', 'opportunity'],
    tier: 3,
    attribute: 'fire',
    hidden_level: 58,
    total_layers: 5,
    progression: {
      L1: { text: '前方地面溫度異常，腳下石板微微發燙。', best_action: 'wait', wrong_alert_add: 30 },
      L2: { text: '空氣中飄著淡淡的硫磺氣味，偶有火星在遠處閃爍。', best_action: 'wait', wrong_alert_add: 30 },
      L3: { text: '靈識掃過，感覺到火屬靈氣在某處劇烈匯聚，波動不穩。', best_action: 'stone', wrong_alert_add: 30 },
      L4: { text: '匯聚點附近有兩種截然不同的氣息交疊，一動一靜。', best_action: 'search', wrong_alert_add: 30 },
      L5: { text: '靜止的氣息是一株赤焰靈草，躁動的是守護它的火系妖獸。', best_action: 'search', wrong_alert_add: 30 }
    },
    outcome_weights: { good: 25, normal: 40, nothing: 20, failure: 15, worst_result: 'failure' },
    action_modifiers: {
      good: { search: 2.5, wait: 1.0, stone: 1.8 },
      failure: { search: 0.3, wait: 0.5, stone: 0.6 }
    },
    base_rare_rate: 0.08,
    entity_data: {
      environment_modifiers: {
        rainy: { text_addon: '大雨令火焰萎縮，妖獸氣息明顯減弱。' },
        night: { text_addon: '黑夜中火光更為醒目，但也意味著更難接近。' }
      }
    }
  }
]

for (const event of testEvents) {
  await client.query(
    `INSERT INTO events
      (base_type, sub_types, tier, attribute, hidden_level, total_layers,
       progression, outcome_weights, action_modifiers, base_rare_rate, entity_data)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      event.base_type,
      event.sub_types,
      event.tier,
      event.attribute,
      event.hidden_level,
      event.total_layers,
      JSON.stringify(event.progression),
      JSON.stringify(event.outcome_weights),
      JSON.stringify(event.action_modifiers),
      event.base_rare_rate,
      JSON.stringify(event.entity_data)
    ]
  )
}

await client.end()
console.log('✅ 3 條測試事件已塞入 DB')

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = new pg.Client({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

async function inspect() {
  await client.connect();
  console.log("=== 🔍 Mirror Realm 資料診斷開始 ===");

  // 1. 檢查事件模板 (Events)
  const eventCheck = await client.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE progression IS NULL OR progression = '{}') as missing_progression,
      tier, 
      attribute,
      COUNT(*) as count
    FROM events 
    GROUP BY ROLLUP(tier, attribute)
  `);
  console.log("\n[1] 事件模板分布與完整性:");
  console.table(eventCheck.rows.filter(r => r.tier));

  // 2. 檢查是否有損壞的 JSONB 結構 (針對 progression)
  const jsonCheck = await client.query(`
    SELECT id, tier, attribute 
    FROM events 
    WHERE NOT (progression ? 'L1')
    LIMIT 5
  `);
  if (jsonCheck.rows.length > 0) {
    console.warn("⚠️ 警告: 發現部分事件缺少起始層 L1 數據:", jsonCheck.rows);
  } else {
    console.log("✅ 事件層級結構初步檢查正常。");
  }

  // 檢查資料型態 (檢查 base_rare_rate 是否被錯誤地視為字串)
  const typeCheck = await client.query(`
    SELECT id, base_rare_rate, pg_typeof(base_rare_rate) as db_type 
    FROM events 
    LIMIT 3
  `);
  console.log("\n[1.1] 事件欄位型態檢查 (JS 視角):");
  typeCheck.rows.forEach(r => {
    console.log(`ID: ${r.id} | 值: ${r.base_rare_rate} | JS 型別: ${typeof r.base_rare_rate} | DB 型別: ${r.db_type}`);
  });

  // 3. 檢查進行中的玩家狀態 (Player Events)
  const peCheck = await client.query(`
    SELECT phase, COUNT(*) 
    FROM player_events 
    GROUP BY phase
  `);
  console.log("\n[2] 玩家事件狀態統計:");
  console.table(peCheck.rows);

  console.log("\n=== 診斷完成 ===");
  await client.end();
}

inspect().catch(err => {
  console.error("❌ 診斷過程中出錯:", err);
  process.exit(1);
});
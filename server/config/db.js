import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const { Pool } = pg;

/**
 * 動態 Pool 設定：
 *
 * IS_SERVERLESS=true  → max:1 / idleTimeout:0
 *   Vercel / Render Serverless：每個 invocation 可能是全新 process，
 *   Pool 連線在休眠後殭屍化；限制 max:1 避免堆積。
 *
 * IS_SERVERLESS 未設定（本地 / 長駐 Render Web Service）→ max:10 / idleTimeout:10000
 *   長駐伺服器可維持連線池，提升並發效能。
 *
 * connectionTimeoutMillis: 5000 — 兩種模式共用，5 秒建不上就拋錯。
 */
const isServerless = process.env.IS_SERVERLESS === 'true' || process.env.IS_SERVERLESS === '1';

const pool = new Pool({
    connectionString:        process.env.DATABASE_URL,
    max:                     isServerless ? 1 : 10,
    idleTimeoutMillis:       isServerless ? 0 : 10000,
    connectionTimeoutMillis: 5000,
});

console.info(`[db] Pool mode: ${isServerless ? 'serverless (max=1)' : 'persistent (max=10)'}`);

pool.on('error', (err) => {
    console.error('資料庫連線發生未預期的錯誤', err);
});

export const query     = (text, params) => pool.query(text, params);
export const getClient = ()             => pool.connect();

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const { Pool } = pg;

/**
 * Serverless 友好的 Pool 設定：
 *
 * 問題：Vercel / Render Free Tier 的每個 Function Invocation 可能是全新的 process，
 * 也可能複用前一個 warm instance。pg.Pool 預設會維持最多 10 條 TCP 連線，
 * 在 serverless 環境中這些連線會在 invocation 結束後「殭屍化」（process 休眠但
 * Supabase pooler 仍認為連線存在），下次 warm 重啟時拿到死連線。
 *
 * 修正：
 *   max: 1               — 每個 instance 最多 1 條連線，避免殭屍連線堆積
 *   idleTimeoutMillis: 0 — 不主動保持 idle 連線（讓 pooler 自行管理生命週期）
 *   connectionTimeoutMillis: 5000 — 5 秒建不上就丟 error，不讓 Lambda 卡死
 */
const pool = new Pool({
    connectionString:        process.env.DATABASE_URL,
    max:                     1,
    idleTimeoutMillis:       0,
    connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
    console.error('資料庫連線發生未預期的錯誤', err);
});

export const query     = (text, params) => pool.query(text, params);
export const getClient = ()             => pool.connect();

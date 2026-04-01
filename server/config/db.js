import pg from 'pg';
import dotenv from 'dotenv';

// 讀取 .env.local
dotenv.config({ path: '.env.local' });

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err, client) => {
    console.error('資料庫連線發生未預期的錯誤', err);
});

// 匯出 query 方法
export const query = (text, params) => pool.query(text, params);

// 匯出 client 供 Transaction 使用
export const getClient = () => pool.connect();

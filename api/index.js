/**
 * api/index.js
 *
 * Vercel Serverless Function 入口。
 * Vercel 會把所有 /api/* 請求轉發到這個 handler。
 *
 * 為什麼不需要 app.listen()：
 *   Vercel 直接呼叫 export default 的 handler（Express app 本身就是一個 function）。
 *   不需要（也不能）在 serverless 環境裡開 TCP port。
 */
import app from '../server/app.js';

export default app;

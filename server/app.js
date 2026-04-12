/**
 * server/app.js
 *
 * Express app 定義，不包含 app.listen()。
 * 這樣分離的原因：
 *   - server/index.js  → 本地開發 / Render 部署：import app, 呼叫 listen()
 *   - api/index.js     → Vercel Serverless：import app, export default app
 *     Vercel 會直接呼叫這個 handler，不需要（也不能）呼叫 listen()
 */
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import lbsRoutes           from './routes/lbsRoutes.js';
import playerRoutes        from './routes/playerRoutes.js';
import authRoutes          from './routes/authRoutes.js';
import configRoutes        from './routes/configRoutes.js';
import combatRoutes        from './routes/combatRoutes.js';
import dailyGenerateRoutes from './routes/dailyGenerate.js';
import tutorialRoutes      from './routes/tutorialRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// ── API 路由（必須在靜態資源與 catch-all 之前）────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/lbs',      lbsRoutes);
app.use('/api/player',   playerRoutes);
app.use('/api/config',   configRoutes);
app.use('/api/combat',   combatRoutes);
app.use('/api/daily',    dailyGenerateRoutes);
app.use('/api/tutorial', tutorialRoutes);

// ── 靜態資源（Vite 打包產物）─────────────────────────────────────
// 在 Vercel 環境：靜態檔案由 Vercel CDN 直接服務，這段 code 不會被呼叫。
// 在 Render / 本地：Express 自己服務 dist/。
app.use(express.static(join(__dirname, '../dist')));

// ── SPA Catch-all ─────────────────────────────────────────────────
app.get(/.*/, (req, res) => {
    res.sendFile(join(__dirname, '../dist/index.html'));
});

export default app;

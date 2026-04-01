import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import lbsRoutes from './routes/lbsRoutes.js';
import playerRoutes from './routes/playerRoutes.js';
import authRoutes from './routes/authRoutes.js';

// ESM 環境下沒有 __dirname，需手動重建
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// ── API 路由（必須在靜態資源與 catch-all 之前）────────────────
app.use('/api/auth',   authRoutes);
app.use('/api/lbs',    lbsRoutes);
app.use('/api/player', playerRoutes);

// ── 靜態資源（Vite 打包產物）────────────────────────────────
// dist 資料夾位於專案根目錄，server/ 目錄往上一層
app.use(express.static(join(__dirname, '../dist')));

// ── SPA Catch-all：非 API 請求一律回傳 index.html ────────────
// 這條路由一定要放在所有 /api/... 路由的最下方
// 新寫法 (完美避開版本衝突 👇)
app.get(/.*/, (req, res) => {
    res.sendFile(join(__dirname, '../dist/index.html'));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 伺服器成功啟動！正在監聽 Port ${PORT}`);
    console.log(`👉 本地網址: http://localhost:${PORT}`);
});

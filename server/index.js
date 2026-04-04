/**
 * server/index.js
 * 本地開發 / Render 部署的入口點。
 * 只負責啟動 HTTP server，app 邏輯全部在 server/app.js。
 */
import app from './app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 伺服器成功啟動！正在監聽 Port ${PORT}`);
    console.log(`👉 本地網址: http://localhost:${PORT}`);
});

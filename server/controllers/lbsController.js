// server/controllers/lbsController.js
import { performScan, performExecution } from '../services/lbsService.js';

// 1. 處理探靈掃描的 Controller
export async function scanLbsNodes(req, res) {
    try {
        const { playerId, lat, lng } = req.body;

        if (!lat || !lng) {
            return res.status(400).json({ error: "缺少經緯度座標" });
        }

        const scanResult = await performScan(playerId, lat, lng);

        return res.status(200).json({
            status: "success",
            data: scanResult
        });

    } catch (error) {
        console.error("LBS 掃描失敗:", error);
        if (error.message === "精力不足") {
            return res.status(400).json({ status: "error", message: "精力不足，請稍作歇息或服用回復丹藥。" });
        }
        return res.status(500).json({ status: "error", message: "伺服器異常，請稍後再試。" });
    }
}

// 2. 處理點擊節點互動的 Controller
export async function executeLbsNode(req, res) {
    try {
        const { playerId, nodeType, nodeName } = req.body;

        if (!nodeType) {
            return res.status(400).json({ error: "缺少節點資訊" });
        }

        const executeResult = await performExecution(playerId, nodeType, nodeName);

        return res.status(200).json({
            status: "success",
            data: executeResult
        });

    } catch (error) {
        console.error("節點互動失敗:", error);
        // 如果是資源不足等錯誤，把錯誤訊息傳給前端顯示
        return res.status(400).json({ status: "error", message: error.message });
    }
}

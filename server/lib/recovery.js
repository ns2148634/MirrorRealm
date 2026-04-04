/**
 * server/lib/recovery.js
 *
 * 純函數：根據 last_sync_time 計算離線回復後的新數值。
 * 不查 DB、不寫 DB — 只做數學運算。
 *
 * 回復速率（每分鐘）：
 *   HP  : +1/3 min（即每 3 分鐘 +1）
 *   SP  : +1/min
 *   EP  : +1/min
 *   Aura: 不離線回復（只在線上時透過 setInterval 動畫累積）
 *
 * @param {object} player  - 含 hp/sp/ep/aura 及各自 max_* 欄位，以及 last_sync_time
 * @param {Date}   [now]   - 計算基準時間，預設 new Date()
 * @returns {{ hp, sp, ep, aura }}  - 回復後的新數值（已套用上限）
 */
export function calculateOfflineDelta(player, now = new Date()) {
    const lastSync   = player.last_sync_time ? new Date(player.last_sync_time) : now;
    const elapsedMin = Math.max(0, (now - lastSync) / 60000);

    return {
        hp:   Math.min(player.max_hp   ?? 100, (player.hp   ?? 0) + Math.floor(elapsedMin / 3)),
        sp:   Math.min(player.max_sp   ?? 100, (player.sp   ?? 0) + Math.floor(elapsedMin)),
        ep:   Math.min(player.max_ep   ?? 100, (player.ep   ?? 0) + Math.floor(elapsedMin)),
        aura: player.aura ?? 0,  // aura 只由線上計時器累積，離線不增加
    };
}

import React, { useRef, useEffect, useState } from 'react';
import useGameStore from '../store/gameStore';

export default function StatusView() {
  const player = useGameStore((state) => state.player);
  const canvasRef = useRef(null);

  // 狀態：是否正在按壓、是否進入打坐(定神調息)狀態
  const [isPressing, setIsPressing] = useState(false);
  const [isMeditating, setIsMeditating] = useState(false);
  const pressTimer = useRef(null);

  const meditatorImg = player?.gender === 'female' ? 'meditator_female.svg' : 'meditator_male.svg';

  // 處理長按事件 (3秒)
  const handlePointerDown = (e) => {
    // 避免觸控設備的預設手勢干擾
    e.preventDefault(); 
    setIsPressing(true);
    if (navigator.vibrate) navigator.vibrate(15);

    pressTimer.current = setTimeout(() => {
      // 3秒後觸發打坐狀態切換
      setIsMeditating((prev) => !prev);
      if (navigator.vibrate) navigator.vibrate([50, 50, 150]); // 成功時的強烈震動反饋
      setIsPressing(false);
    }, 3000);
  };

  const cancelPress = () => {
    if (isPressing) {
      setIsPressing(false);
      if (pressTimer.current) clearTimeout(pressTimer.current);
    }
  };

  // 繪製底層：旋轉五角陣紋、五行文字、靈根雷達、外層靈氣環
  useEffect(() => {
    if (!canvasRef.current || !player) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const r = Math.min(canvas.width, canvas.height) * 0.30;
    const elements = ['金', '木', '水', '火', '土'];
    const rootValues = [85, 40, 60, 95, 30];

    // 根據是否打坐，切換靈氣的顏色 (常態：青色，打坐：紫金色)
    const auraColorStr = isMeditating ? '155, 92, 255' : '0, 229, 255'; 
    const auraHex = isMeditating ? '#9B5CFF' : '#00E5FF';

    let animationId;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const pulse = Math.sin(Date.now() / 1500) * 0.15 + 0.85;
      const rot = Date.now() / 8000;

      // ==========================================
      // 1. 繪製外層黃色五角陣紋骨架 (旋轉)
      // ==========================================
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255, 214, 10, ${0.3 * pulse})`;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 5; i++) {
        let angle = -Math.PI / 2 + (i * 2 * Math.PI / 5) + rot;
        let px = cx + Math.cos(angle) * r;
        let py = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.strokeStyle = `rgba(255, 214, 10, ${0.15 * pulse})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        let angle = -Math.PI / 2 + (i * 2 * Math.PI / 5) + rot;
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      }
      ctx.stroke();

      // ==========================================
      // 2. 繪製五行靈根雷達圖 (旋轉)
      // ==========================================
      ctx.beginPath();
      ctx.fillStyle = `rgba(${auraColorStr}, ${0.2 * pulse})`;
      ctx.strokeStyle = `rgba(${auraColorStr}, ${0.6 * pulse})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        let angle = -Math.PI / 2 + (i * 2 * Math.PI / 5) + rot;
        let dist = r * (rootValues[i] / 100);
        let px = cx + Math.cos(angle) * dist;
        let py = cy + Math.sin(angle) * dist;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // ==========================================
      // 3. 繪製「五行文字」(旋轉但保持正向)
      // ==========================================
      ctx.font = 'bold 16px "Noto Serif TC", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(255, 214, 10, ${0.9 * pulse})`;
      ctx.shadowBlur = 8;
      ctx.shadowColor = "rgba(255, 214, 10, 0.6)";

      for (let i = 0; i < 5; i++) {
        let angle = -Math.PI / 2 + (i * 2 * Math.PI / 5) + rot;
        let tx = cx + Math.cos(angle) * (r + 22);
        let ty = cy + Math.sin(angle) * (r + 22);
        ctx.fillText(elements[i], tx, ty);
      }
      ctx.shadowBlur = 0;

      // ==========================================
      // 4. 最外層「周天靈氣環」(固定不轉)
      // ==========================================
      const auraRadius = r + 65; 
      const auraPercent = Math.min(1, Math.max(0, player.aura / (player.max_aura || 1)));
      const startAngle = -Math.PI / 2; 
      const endAngle = startAngle + (Math.PI * 2 * auraPercent);

      // 空軌道
      ctx.beginPath();
      ctx.arc(cx, cy, auraRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${auraColorStr}, 0.1)`;
      ctx.lineWidth = 2;
      ctx.stroke();

      if (auraPercent > 0) {
        // 發光進度
        ctx.beginPath();
        ctx.arc(cx, cy, auraRadius, startAngle, endAngle);
        ctx.strokeStyle = `rgba(${auraColorStr}, ${0.8 * pulse})`;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round'; 
        ctx.shadowBlur = 15;
        ctx.shadowColor = `rgba(${auraColorStr}, 0.8)`;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 引導真氣小光球
        ctx.beginPath();
        let px = cx + Math.cos(endAngle) * auraRadius;
        let py = cy + Math.sin(endAngle) * auraRadius;
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.shadowBlur = 12;
        ctx.shadowColor = auraHex;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animationId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animationId);
  }, [player, isMeditating]); // 依賴加入 isMeditating，狀態切換時重新渲染畫布

  if (!player) return null;

  return (
    <div className="h-full w-full flex flex-col items-center pt-[2cqw] px-[6cqw] overflow-y-auto no-scrollbar pb-[10cqw] relative z-10">

      {/* =========================================
          1. 法陣與人像顯化區 (加入長按互動邏輯)
          ========================================= */}
      <div className="relative shrink-0 mb-[1cqw] w-full max-w-[320px] aspect-square flex items-center justify-center">

        {/* Z-0: 陣法、雷達、靈氣環 */}
        <canvas ref={canvasRef} width="320" height="320" className="absolute inset-0 w-full h-full object-contain z-0 pointer-events-none"></canvas>

        {/* Z-10: 打坐者 SVG (長按互動目標) */}
        <img
          src={`/images/status/${meditatorImg}`}
          alt="修煉身姿"
          onPointerDown={handlePointerDown}
          onPointerUp={cancelPress}
          onPointerLeave={cancelPress}
          onContextMenu={(e) => e.preventDefault()} // 阻止手機長按選單
          className="absolute inset-0 w-full h-full object-contain z-10 p-[24%] cursor-pointer touch-none"
          style={{ 
            // 如果正在按壓，3秒內緩慢變小變亮；否則迅速恢復
            transition: isPressing ? 'all 3s ease-in-out' : 'all 0.3s ease-out',
            transform: isPressing ? 'scale(0.85)' : 'scale(1)',
            filter: isPressing 
              ? 'brightness(1.5) drop-shadow(0 0 20px rgba(255,255,255,1))' 
              : 'drop-shadow(0 0 12px rgba(255,255,255,0.7))' 
          }}
        />

        {/* Z-20: 丹田氣旋 (顏色隨打坐狀態變化) */}
        <div 
          className={`absolute top-[60%] left-1/2 -translate-x-1/2 w-[12%] h-[12%] rounded-full opacity-40 blur-[12px] animate-[pulse_3s_infinite] z-20 pointer-events-none transition-colors duration-1000 ${isMeditating ? 'bg-[#9B5CFF]' : 'bg-[#00E5FF]'}`}
        ></div>

        {/* 隱藏提示：讓玩家知道可以長按 */}
        <div className={`absolute -bottom-2 text-[10px] tracking-widest text-gray-500 transition-opacity duration-500 ${isPressing ? 'opacity-100' : 'opacity-30'}`}>
          {isMeditating ? '[ 悟道中... 長按可甦醒 ]' : '[ 長按身姿 聚氣調息 ]'}
        </div>
      </div>

      {/* =========================================
          2. 境界與靈氣文字
          ========================================= */}
      <div className="w-full flex flex-col items-center mb-[4cqw] shrink-0 z-10">
        <div 
          className={`flex items-center gap-3 bg-white/5 border px-5 py-1.5 rounded-full transition-all duration-1000 ${isMeditating ? 'border-[#9B5CFF]/30 shadow-[0_0_15px_rgba(155,92,255,0.2)]' : 'border-[#00E5FF]/20 shadow-[0_0_10px_rgba(0,229,255,0.1)]'}`}
        >
          <span className={`text-[clamp(12px,3.5cqw,16px)] tracking-widest opacity-80 transition-colors duration-1000 ${isMeditating ? 'text-[#9B5CFF]' : 'text-[#00E5FF]'}`}>周天靈氣</span>
          <span className="font-mono text-[clamp(14px,4.5cqw,22px)] text-white">
            {player.aura} <span className="text-gray-400 text-sm">/ {player.max_aura}</span>
          </span>
        </div>
      </div>

      {/* =========================================
          3. 修仙資訊面板 (首行：姓名、境界、資質)
          ========================================= */}
      <div className="w-full flex flex-col gap-[2.5cqw] mb-[6cqw] pt-[2cqw] bg-white/[0.02] rounded-xl p-[4cqw] border border-white/5 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] z-10">

        {/* 首行：姓名、境界、資質 */}
        <div className="flex justify-between items-end border-b border-white/10 pb-[1.5cqw] mb-[1.5cqw]">
          <span className="text-[clamp(16px,4cqw,22px)] text-white tracking-widest drop-shadow-[0_0_5px_rgba(255,255,255,0.4)]">{player.name}</span>
          <span className="text-[clamp(16px,4cqw,22px)] text-white tracking-widest drop-shadow-[0_0_5px_rgba(255,255,255,0.4)]">{player.realm_name}</span>
          <span className="text-[clamp(16px,4cqw,22px)] text-[#FFD700] tracking-widest drop-shadow-[0_0_5px_rgba(255,215,0,0.4)]">天賦異稟</span>
        </div>

        {/* 第二行：均分三欄 (春秋、修為、神識) */}
        <div className="grid grid-cols-3 gap-x-[2cqw] gap-y-[3cqw] mb-[1cqw]">
          <div className="flex flex-col items-center">
            <span className="text-[clamp(12px,3.5cqw,16px)] text-gray-500 tracking-widest mb-1">春秋</span>
            <span className="text-[clamp(16px,4.5cqw,22px)] text-gray-200 font-mono">{player.age}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[clamp(12px,3.5cqw,16px)] text-gray-500 tracking-widest mb-1">修為</span>
            <span className="text-[clamp(16px,4.5cqw,22px)] text-gray-200 font-mono">{player.max_hp}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[clamp(12px,3.5cqw,16px)] text-gray-500 tracking-widest mb-1">神識</span>
            <span className="text-[clamp(16px,4.5cqw,22px)] text-gray-200 font-mono">{(player.id ? player.id.slice(0, 4).toUpperCase() : '---')}</span>
          </div>
        </div>

        {/* 底部：因果/業障 */}
        <div className="mt-[2cqw] pt-[2cqw] border-t border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-[clamp(12px,3.5cqw,16px)] text-gray-500 tracking-widest">功德</span>
            <span className="text-[clamp(14px,4cqw,18px)] text-[#00E5FF] px-2 py-0.5 bg-[#00E5FF]/10 rounded border border-[#00E5FF]/20">{player.karma_good > 500 ? '名震一方' : '初入修行'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[clamp(12px,3.5cqw,16px)] text-gray-500 tracking-widest">業障</span>
            <span className="text-[clamp(14px,4cqw,18px)] text-[#FF3B30] px-2 py-0.5 bg-[#FF3B30]/10 rounded border border-[#FF3B30]/20">{player.karma_evil > 100 ? '血染雙手' : '心如止水'}</span>
          </div>
        </div>
      </div>

    </div>
  );
}
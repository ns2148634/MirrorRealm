// src/views/StatusView.jsx
import React, { useRef, useEffect } from 'react';
import useGameStore from '../store/gameStore';

export default function StatusView() {
  const player = useGameStore((state) => state.player);
  const canvasRef = useRef(null);

  // 繪製底層：包含五角雷達、五行文字與周天環
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    
    // 稍微縮小內部雷達的基礎半徑，讓外圍圓環有更大的延展空間
    const r = Math.min(canvas.width, canvas.height) * 0.25; 

    // 模擬靈根數值 (未來可從 player 資料庫讀取)
    const elements = ['金', '木', '水', '火', '土'];
    const rootValues = [85, 40, 60, 95, 30];

    let animationId;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 🌟 呼吸脈動變數 (0.5 ~ 1.0 之間平滑震盪，讓光暈有明顯的呼吸感)
      const pulse = Math.sin(Date.now() / 1200) * 0.25 + 0.75;
      const rot = Date.now() / 15000; // 極度緩慢的陣法流轉

      // 🌟 1. 最外層「周天靈氣環」(半徑擴大，並加上呼吸光暈)
      ctx.beginPath();
      // 半徑從 r + 40 擴大到 r + 65
      ctx.arc(cx, cy, r + 65, 0, Math.PI * 2); 
      ctx.strokeStyle = `rgba(0, 229, 255, ${0.5 * pulse})`;
      ctx.lineWidth = 2;
      // 注入呼吸光暈效果
      ctx.shadowBlur = 25 * pulse; 
      ctx.shadowColor = `rgba(0, 229, 255, ${0.8 * pulse})`;
      ctx.stroke();
      ctx.shadowBlur = 0; // 重置陰影，避免影響內部陣紋

      // 2. 繪製「五角陣紋骨架」(金芒)
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255, 214, 10, ${0.5 * pulse})`;
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

      // 3. 繪製「內部靈根雷達圖」(半透明填充)
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 214, 10, ${0.15 * pulse})`;
      ctx.strokeStyle = `rgba(255, 214, 10, ${0.8 * pulse})`;
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

      // 4. 繪製「五行文字」
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

      animationId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animationId);
  }, []); 

  if (!player) return null;

  // 稱號判定邏輯
  const getGoodTitle = (karma) => karma > 500 ? '名震一方' : '默默無聞';
  const getEvilTitle = (karma) => karma > 100 ? '殺戮成性' : '心如止水';

  return (
    // 陣法精煉：維持 overflow-hidden 徹底禁止滑動，完美鎖定單屏
    <div className="h-full w-full relative bg-transparent overflow-hidden flex flex-col items-center pt-[4vh] pb-[calc(env(safe-area-inset-bottom,20px)+8vh)]">

      {/* =========================================
          1. 靈根顯化區 (雷達與資質) 
          ========================================= */}
      <div className="relative w-full max-w-[320px] max-h-[45vh] flex-1 flex flex-col items-center justify-center shrink-0 mt-[2vh]">
        
        {/* Z-0: 陣紋背景 */}
        <canvas ref={canvasRef} width="320" height="320" className="absolute inset-0 w-full h-full object-contain z-0 pointer-events-none"></canvas>
        
        
      </div>

      {/* 周天靈氣文字 */}
      <div className="mt-4 text-[clamp(14px,4cqw,16px)] text-white/80 tracking-[0.2em] font-serif text-center shrink-0">
        周天靈氣 <span className="text-[#00E5FF] font-mono">{player.aura || 0}</span>/{player.max_aura || 120}
      </div>

      {/* =========================================
          2. 命格資訊區 (直排古籍風格)
          ========================================= */}
      <div className="flex flex-row justify-center items-center mt-auto gap-[8cqw] px-[8cqw] w-full max-w-[400px] shrink-0 z-10">
        
        {/* 左側：名號 (垂直排版) */}
        <div 
          className="text-[clamp(32px,10cqw,42px)] text-white tracking-[0.3em] font-serif leading-none shrink-0"
          style={{ 
            writingMode: 'vertical-rl', 
            textOrientation: 'upright',
            textShadow: '0 0 10px rgba(255,255,255,0.4)'
          }}
        >
          {player.name || '無名散修'}
        </div>

        {/* 右側：修煉數值與境界 */}
        <div className="flex flex-col flex-grow text-[clamp(16px,4.5cqw,20px)] text-white tracking-[0.2em] font-serif pt-2 pb-4">
          
          {/* 境界 */}
          <div className="mb-[3cqw] font-bold text-[#FFD700]" style={{ textShadow: '0 0 8px rgba(255,215,0,0.5)' }}>
            {player.realm_name || '煉氣一階'}
          </div>
          
          <div className="flex justify-between items-end w-full mb-[1cqw]">
            <span className="opacity-70 text-[14px]">壽元</span>
            <span className="text-[clamp(16px,5cqw,20px)] font-mono">{player.age || 18}</span>
          </div>
          
          <div className="flex justify-between items-end w-full mb-[1cqw]">
            <span className="opacity-70 text-[14px]">靈力</span>
            <span className="text-[clamp(16px,5cqw,20px)] font-mono">{player.max_hp || 100}</span>
          </div>
          
          <div className="flex justify-between items-end w-full mb-[1cqw]">
            <span className="opacity-70 text-[14px]">神識</span>
            <span className="text-[clamp(16px,5cqw,20px)] font-mono">50</span>
          </div>

          {/* 聲望與煞氣 (緊湊排版) */}
          <div className="flex justify-between items-end w-full mt-[3cqw] mb-[1cqw]">
            <span className="opacity-70 text-[14px]">聲望</span>
            <span className="text-[12px] text-[#00E5FF] tracking-[0.3em]">{getGoodTitle(player.karma_good)}</span>
          </div>

          <div className="flex justify-between items-end w-full">
            <span className="opacity-70 text-[14px]">煞氣</span>
            <span className="text-[12px] text-[#FF3B30] tracking-[0.3em]">{getEvilTitle(player.karma_evil)}</span>
          </div>

        </div>
      </div>

    </div>
  );
}
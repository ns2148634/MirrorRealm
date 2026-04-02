import React from 'react';

export default function StatOrbs({ player }) {
  const getPct = (val, max) => Math.min(100, Math.max(0, ((val || 0) / (max || 1)) * 100));

  const hpPct = getPct(player?.hp, player?.max_hp);
  const spPct = getPct(player?.sp, player?.max_sp);
  const epPct = getPct(player?.ep, player?.max_ep);

  return (
    <div className="absolute top-[calc(env(safe-area-inset-top,10px)+2.5vh)] left-0 right-0 w-full flex justify-center items-start gap-[4cqw] z-50 pointer-events-none px-[4cqw]">
      
      {/* 🔴 氣血 */}
      <SpiritualVein icon="health" val={player?.hp} max={player?.max_hp} pct={hpPct} color="#ef4444" shadow="rgba(239,68,68,0.6)" />
      
      {/* 🔵 精力 */}
      <SpiritualVein icon="energy" val={player?.sp} max={player?.max_sp} pct={spPct} color="#3b82f6" shadow="rgba(59,130,246,0.6)" />
      
      {/* 🟣 體力 */}
      <SpiritualVein icon="stamina" val={player?.ep} max={player?.max_ep} pct={epPct} color="#a855f7" shadow="rgba(168,85,247,0.6)" />

    </div>
  );
}

// 🔮 帶有極簡數字的靈氣紋元件
const SpiritualVein = ({ icon, val, max, pct, color, shadow }) => (
  <div className="flex flex-col items-end gap-[1px] opacity-90">
    
    {/* 上半部：圖示與光軌 */}
    <div className="flex items-center gap-1.5">
      <div className="w-[14px] h-[14px] flex-shrink-0 flex items-center justify-center">
        <img 
          src={`/images/status/${icon}.svg`} 
          alt={icon}
          className="w-full h-full object-contain opacity-90"
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
      </div>
      
      <div className="w-[20cqw] max-w-[80px] h-[2px] bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-700 ease-out rounded-full relative"
          style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 8px ${shadow}` }}
        >
          <div className="absolute right-0 top-0 w-2 h-full bg-white/80 blur-[1px] animate-pulse" />
        </div>
      </div>
    </div>

    {/* 下半部：極微小的數值顯示 */}
    <span className="text-[9px] font-mono tracking-widest text-white/40 scale-90 origin-right">
      {Math.floor(val || 0)} / {Math.floor(max || 1)}
    </span>

  </div>
);
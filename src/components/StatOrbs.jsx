import React from 'react';

export default function StatOrbs({ player }) {
  // 🛡️ 防呆計算百分比
  const getPct = (val, max) => Math.min(100, Math.max(0, ((val || 0) / (max || 1)) * 100));

  const hpPct = getPct(player?.hp, player?.max_hp);
  const spPct = getPct(player?.sp, player?.max_sp);
  const epPct = getPct(player?.ep, player?.max_ep);

  return (
    // 🌟 絕對定位於正上方，完全不佔據 Flex 排版空間，徹底解放畫面！
    <div className="absolute top-[calc(env(safe-area-inset-top,10px)+2.5vh)] left-0 right-0 w-full flex justify-center items-center gap-[5cqw] z-50 pointer-events-none px-[4cqw]">
      
      {/* 🔴 血脈 (氣血) */}
      <SpiritualVein label="血" pct={hpPct} color="#ef4444" shadow="rgba(239,68,68,0.6)" />
      
      {/* 🔵 神脈 (精力) */}
      <SpiritualVein label="精" pct={spPct} color="#3b82f6" shadow="rgba(59,130,246,0.6)" />
      
      {/* 🟣 體脈 (體力) */}
      <SpiritualVein label="體" pct={epPct} color="#a855f7" shadow="rgba(168,85,247,0.6)" />

    </div>
  );
};

// 🔮 極簡靈氣紋元件
const SpiritualVein = ({ label, pct, color, shadow }) => (
  <div className="flex items-center gap-2 opacity-85">
    {/* 極小的修真字體 */}
    <span className="text-[11px] font-serif font-bold tracking-widest drop-shadow-md" style={{ color }}>
      {label}
    </span>
    
    {/* 極細的軌道 (高 2px) */}
    <div className="w-[22cqw] max-w-[90px] h-[2px] bg-white/10 rounded-full overflow-hidden">
      {/* 發光的流動靈氣 */}
      <div
        className="h-full transition-all duration-700 ease-out rounded-full relative"
        style={{
          width: `${pct}%`,
          backgroundColor: color,
          boxShadow: `0 0 8px ${shadow}`
        }}
      >
        {/* 軌道末端的呼吸高光點 */}
        <div className="absolute right-0 top-0 w-2 h-full bg-white/60 blur-[1px] animate-pulse" />
      </div>
    </div>
  </div>
);
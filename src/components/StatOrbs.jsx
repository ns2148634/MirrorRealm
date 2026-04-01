import React from 'react';

const StatOrbs = ({ player }) => {
  // 🛡️ 防呆：確保數值存在，並計算百分比 (0~100)
  const getPct = (val, max) => Math.min(100, Math.max(0, ((val || 0) / (max || 1)) * 100));

  const hpPct = getPct(player?.hp, player?.max_hp);
  const spPct = getPct(player?.sp, player?.max_sp);
  const epPct = getPct(player?.ep, player?.max_ep);

  return (
    <div className="flex justify-center items-center gap-6 w-full py-4">
      {/* 🔮 靈珠核心 CSS 動畫魔法 */}
      <style>{`
        /* 烈火不規則閃爍與上浮 */
        @keyframes flame-flicker {
          0%, 100% { transform: scale(1) translateY(0); opacity: 0.85; filter: blur(3px) brightness(1); }
          25% { transform: scale(1.05) translateY(-2%); opacity: 1; filter: blur(2px) brightness(1.2); }
          50% { transform: scale(0.95) translateY(1%); opacity: 0.9; filter: blur(4px) brightness(0.9); }
          75% { transform: scale(1.02) translateY(-1%); opacity: 0.95; filter: blur(3px) brightness(1.1); }
        }
        
        /* 星辰旋轉與明滅 */
        @keyframes star-twinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8) rotate(0deg); }
          50% { opacity: 1; transform: scale(1.2) rotate(180deg); filter: brightness(1.5); }
        }

        /* 雷電急促脈衝與形變 */
        @keyframes lightning-zap {
          0%, 100% { transform: scale(1) skewX(0deg); opacity: 0.8; }
          10% { transform: scale(1.15) skewX(-10deg); opacity: 1; filter: brightness(1.5); }
          20% { transform: scale(0.9) skewX(10deg); opacity: 0.9; }
          30% { transform: scale(1.1) skewX(-5deg); opacity: 1; filter: brightness(1.8); }
          40% { transform: scale(0.95) skewX(0deg); opacity: 0.85; }
        }
      `}</style>

      {/* ❤️ 氣血 (烈火) */}
      <Orb name="氣血" value={player?.hp} max={player?.max_hp} color="text-red-400" pct={hpPct}>
        {/* 火焰水位與光暈 */}
        <div
          className="absolute bottom-0 w-full bg-gradient-to-t from-red-600 via-orange-500 to-transparent origin-bottom"
          style={{
            height: `${hpPct}%`,
            animation: 'flame-flicker 2s infinite alternate ease-in-out',
            boxShadow: '0 -5px 15px rgba(239, 68, 68, 0.6)'
          }}
        />
      </Orb>

      {/* ✨ 精力 (星辰) */}
      <Orb name="精力" value={player?.sp} max={player?.max_sp} color="text-blue-300" pct={spPct}>
        {/* 星空背景隨數值變淡 */}
        <div
          className="absolute inset-0 rounded-full flex items-center justify-center transition-opacity duration-500"
          style={{
            opacity: Math.max(0.2, spPct / 100), // 最低保留 20% 亮度
            background: 'radial-gradient(circle, rgba(96,165,250,0.5) 0%, rgba(30,58,138,0) 70%)',
          }}
        >
          {/* 用純 CSS 刻出的閃爍星點，動畫延遲錯開營造層次感 */}
          <div className="absolute w-1 h-1 bg-white rounded-full top-1/4 left-1/4 shadow-[0_0_6px_#fff]" style={{ animation: 'star-twinkle 3s infinite 0.2s' }} />
          <div className="absolute w-1.5 h-1.5 bg-blue-100 rounded-full bottom-1/3 right-1/4 shadow-[0_0_8px_#bfdbfe]" style={{ animation: 'star-twinkle 4s infinite 0.7s' }} />
          <div className="absolute w-1 h-1 bg-white rounded-full top-1/2 right-1/3 shadow-[0_0_5px_#fff]" style={{ animation: 'star-twinkle 2.5s infinite 1.5s' }} />
          <div className="absolute w-[2px] h-[2px] bg-blue-200 rounded-full bottom-1/4 left-1/3 shadow-[0_0_4px_#fff]" style={{ animation: 'star-twinkle 2s infinite 0.5s' }} />
        </div>
      </Orb>

      {/* ⚡ 體力 (雷電) */}
      <Orb name="體力" value={player?.ep} max={player?.max_ep} color="text-purple-400" pct={epPct}>
        {/* 閃電核心：使用 clip-path 削出尖銳的能量體，並隨數值縮放 */}
        <div
          className="absolute m-auto inset-0 bg-gradient-to-br from-purple-400 to-indigo-600 transition-all duration-300"
          style={{
            width: `${epPct}%`,
            height: `${epPct}%`,
            animation: 'lightning-zap 1s infinite',
            filter: 'drop-shadow(0 0 10px rgba(168,85,247,0.8))',
            clipPath: 'polygon(50% 0%, 65% 35%, 100% 50%, 65% 65%, 50% 100%, 35% 65%, 0% 50%, 35% 35%)' // 尖銳的八角星芒形狀模擬能量爆發
          }}
        />
      </Orb>

    </div>
  );
};

// 🔮 共用的玻璃球外殼與文字標籤組件
const Orb = ({ name, value, max, color, children }) => (
  <div className="flex flex-col items-center gap-2">
    {/* 玻璃球本體 (Glassmorphism) */}
    <div className="relative w-16 h-16 rounded-full overflow-hidden bg-[#0A0C10]/40 backdrop-blur-md border border-white/10 shadow-[inset_0_4px_8px_rgba(255,255,255,0.2),inset_0_-6px_10px_rgba(0,0,0,0.8),0_4px_10px_rgba(0,0,0,0.5)]">
      
      {/* 內部的元素 (火、星、雷) 會被渲染在這裡 */}
      {children}
      
      {/* 玻璃球頂部的高光反射 (畫龍點睛的關鍵) */}
      <div className="absolute top-1 left-1/2 -translate-x-1/2 w-10 h-3 bg-gradient-to-b from-white/40 to-transparent rounded-full blur-[1px] pointer-events-none" />
      {/* 玻璃球底部的邊緣反光 */}
      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gradient-to-t from-white/10 to-transparent rounded-full blur-[1px] pointer-events-none" />
    </div>

    {/* 底部文字標籤 */}
    <div className="flex flex-col items-center">
      <span className={`text-[11px] tracking-widest ${color} drop-shadow-[0_0_6px_currentColor] opacity-90`}>{name}</span>
      <span className={`text-xs font-mono font-bold ${color} drop-shadow-[0_0_8px_currentColor]`}>
        {value || 0}/{max || 0}
      </span>
    </div>
  </div>
);

export default StatOrbs;
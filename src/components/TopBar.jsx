import React from 'react';
import useGameStore from '../store/gameStore';

export default function TopBar() {
  const player = useGameStore((state) => state.player);

  if (!player) return <div className="h-16 bg-[#050505] animate-pulse"></div>;

  const hpPercent = Math.max(0, Math.min(100, (player.hp / player.max_hp) * 100));
  const spPercent = Math.max(0, Math.min(100, (player.sp / player.max_sp) * 100));
  const epPercent = Math.max(0, Math.min(100, (player.ep / player.max_ep) * 100));

  return (
    <div className="bg-[#050505] pt-4 pb-2 px-4 border-b border-[#222] shrink-0 z-10">
      <div className="flex justify-between items-center mb-2">
        <span className="text-white font-bold text-sm tracking-widest">{player.realm_name}</span>
        <span className="text-gray-400 text-xs">骨齡 {player.age}/{player.max_age} 歲</span>
      </div>

      <div className="flex justify-between gap-4">
        {/* 體力 (黃) */}
        <div className="flex flex-col items-center flex-1">
          <div className="text-white font-bold text-[11px] mb-1 tracking-widest">體力</div>
          <div className="w-full h-1.5 bg-[#333] rounded overflow-hidden mb-1">
            <div className="h-full bg-[#FFD60A] shadow-[0_0_5px_#FFD60A]" style={{ width: `${spPercent}%` }}></div>
          </div>
          <div className="text-[#AAA] text-[10px] font-mono">{player.sp}/{player.max_sp}</div>
        </div>

        {/* 精力 (綠) */}
        <div className="flex flex-col items-center flex-1">
          <div className="text-white font-bold text-[11px] mb-1 tracking-widest">精力</div>
          <div className="w-full h-1.5 bg-[#333] rounded overflow-hidden mb-1">
            <div className="h-full bg-[#32D74B] shadow-[0_0_5px_#32D74B]" style={{ width: `${epPercent}%` }}></div>
          </div>
          <div className="text-[#AAA] text-[10px] font-mono">{player.ep}/{player.max_ep}</div>
        </div>

        {/* 氣血 (紅) */}
        <div className="flex flex-col items-center flex-1">
          <div className="text-white font-bold text-[11px] mb-1 tracking-widest">氣血</div>
          <div className="w-full h-1.5 bg-[#333] rounded overflow-hidden mb-1">
            <div className="h-full bg-[#FF3B30] shadow-[0_0_5px_#FF3B30]" style={{ width: `${hpPercent}%` }}></div>
          </div>
          <div className="text-[#AAA] text-[10px] font-mono">{player.hp}/{player.max_hp}</div>
        </div>
      </div>
    </div>
  );
}
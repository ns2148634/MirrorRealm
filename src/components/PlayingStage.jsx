// src/views/PlayingStage.jsx
import React, { useState } from 'react';
import useGameStore from '../store/gameStore';
import ExploreView from '../views/ExploreView';
import StatusView from '../views/StatusView';
import CultivateView from '../views/CultivateView';
import RealmBackground from '../components/RealmBackground';
import BagView from '../views/BagView';
import WorldView from '../views/WorldView'; // 🌟 新增：引入大千世界陣法
import StatOrbs from '../components/StatOrbs'; // 根據你的資料夾路徑調整

export default function PlayingStage() {
  const [currentMode, setCurrentMode] = useState('status');
  const player = useGameStore((state) => state.player);

  const triggerHaptic = () => {
    if (navigator.vibrate) navigator.vibrate(10);
  };

  // 🛡️ 防呆護法陣：如果資料庫還沒傳回資料，先顯示載入畫面！
  if (!player) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-[#0F1115] text-[#00E5FF] font-serif tracking-[8px] animate-pulse">
        凝神聚氣中...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-transparent text-white absolute inset-0 font-serif overflow-hidden select-none">
      
      {/* 天地靈氣背景 (鋪在最底層) */}
      <RealmBackground />

      <StatOrbs player={player} />

      {/* =========================================
          2. 中央主顯示區
          ========================================= */}
      <div className="flex-grow relative z-10 overflow-hidden">
        {currentMode === 'status' && <StatusView />}
        {currentMode === 'cultivate' && <CultivateView />}
        {currentMode === 'explore' && <ExploreView />}
        {currentMode === 'bag' && <BagView />}
        
        {/* 🌟 核心替換：將原本的 [仙網連線中] 換成大千世界 (WorldView) */}
        {currentMode === 'network' && <WorldView />}
      </div>

      {/* =========================================
          3. 下方符文導航：五大法器按鈕 (自訂圖示)
          ========================================= */}
      <div className="pb-[calc(env(safe-area-inset-bottom,20px)+15px)] pt-4 px-[5cqw] flex justify-between items-center bg-gradient-to-t from-[#0A0C10] to-transparent shrink-0 relative z-50">
        {[
          { id: 'status', label: '本命', color: '#9B5CFF', glow: 'rgba(155,92,255,0.4)' },
          { id: 'cultivate', label: '造化', color: '#FFD700', glow: 'rgba(255,215,0,0.4)' },
          { id: 'explore', label: '探索', color: '#00E5FF', glow: 'rgba(0,229,255,0.4)' },
          { id: 'bag', label: '芥子', color: '#B8860B', glow: 'rgba(184,134,11,0.4)' },
          { id: 'network', label: '仙網', color: '#32D74B', glow: 'rgba(50,215,75,0.4)' }
        ].map((tab) => {
          const isActive = currentMode === tab.id;
          return (
            <div
              key={tab.id}
              onClick={() => {
                triggerHaptic();
                setCurrentMode(tab.id);
              }}
              className="relative flex flex-col items-center justify-center cursor-pointer"
            >
              <div
                className={`w-[clamp(40px,12cqw,60px)] h-[clamp(40px,12cqw,60px)] flex items-center justify-center rounded-full transition-all duration-700 ${isActive ? 'bg-[#151821] scale-110' : 'bg-transparent'}`}
                style={isActive ? {
                  boxShadow: `inset 0 0 12px ${tab.glow}, 0 0 20px ${tab.glow}`,
                  border: `0.5px solid ${tab.color}44`
                } : {}}
              >
                <img
                  src={`/images/runes/${tab.id}.svg`}
                  alt={tab.label}
                  className="w-[60%] h-[60%] object-contain transition-all duration-500"
                  style={{
                    opacity: isActive ? 1 : 0.4,
                    filter: isActive ? `drop-shadow(0 0 8px ${tab.color}) drop-shadow(0 0 15px ${tab.color})` : 'none',
                  }}
                />
              </div>
              {isActive && (
                <div
                  className="absolute -bottom-3 w-[clamp(4px,1.5cqw,8px)] h-[clamp(4px,1.5cqw,8px)] rounded-full animate-pulse"
                  style={{ backgroundColor: tab.color, boxShadow: `0 0 8px ${tab.color}` }}
                ></div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
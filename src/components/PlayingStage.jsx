import React, { useState } from 'react';
import useGameStore from '../store/gameStore';
import ExploreView from '../views/ExploreView';
import StatusView from '../views/StatusView';
import CultivateView from '../views/CultivateView';
import RealmBackground from '../components/RealmBackground';
import BagView from '../views/BagView';

export default function PlayingStage() {
  const [currentMode, setCurrentMode] = useState('status');
  const player = useGameStore((state) => state.player);

  const triggerHaptic = () => {
    if (navigator.vibrate) navigator.vibrate(10);
  };

  // 🛡️ 防呆護法陣：如果資料庫還沒傳回資料，先顯示載入畫面！
  if (!player) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-[#0F1115] text-gray-500 font-serif tracking-[8px] animate-pulse">
        凝神聚氣中...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#0F1115] text-white absolute inset-0 font-serif overflow-hidden select-none">
<RealmBackground />
      {/* =========================================
          1. 上方資訊欄：動態氣旋槽 + 自訂圖示 (防跑版設計)
          ========================================= */}
      <div className="pt-[env(safe-area-inset-top,20px)] pb-4 px-[5cqw] flex flex-col gap-[3cqw] shrink-0 relative z-50 items-start">

        {/* 體力 (水藍氣流) */}
        <div className="flex items-center gap-[2cqw] w-full group">
          {/* 體力圖示 */}
          <div className="w-[clamp(24px,6cqw,36px)] h-[clamp(24px,6cqw,36px)] shrink-0 flex items-center justify-center opacity-80">
            <img 
              src="/images/status/stamina.svg" 
              alt="體力" 
              className="w-full h-full object-contain"
              style={{ filter: 'drop-shadow(0 0 5px #00E5FF) drop-shadow(0 0 10px #00E5FF)' }} 
            />
          </div>
          {/* 氣旋槽 */}
          <div className="h-[clamp(10px,3cqw,16px)] flex-grow bg-[#1C1F2A] rounded-full relative overflow-hidden border border-white/5">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#00E5FF] to-[#00E5FF88] rounded-full opacity-70 transition-all duration-500"
              style={{ width: `${Math.max(0, Math.min(100, (player.sp / player.max_sp) * 100))}%`, boxShadow: '0 0 10px #00E5FF' }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            </div>
          </div>
          {/* 數值 */}
          <span className="font-mono text-[clamp(12px,4cqw,20px)] w-[15%] text-right text-gray-200 shrink-0">
            {player.sp}
          </span>
        </div>

        {/* 精力 (金黃氣流) */}
        <div className="flex items-center gap-[2cqw] w-full group">
          {/* 精力圖示 */}
          <div className="w-[clamp(24px,6cqw,36px)] h-[clamp(24px,6cqw,36px)] shrink-0 flex items-center justify-center opacity-80">
            <img 
              src="/images/status/energy.svg" 
              alt="精力" 
              className="w-full h-full object-contain"
              style={{ filter: 'drop-shadow(0 0 5px #FFD700) drop-shadow(0 0 10px #FFD700)' }} 
            />
          </div>
          {/* 氣旋槽 */}
          <div className="h-[clamp(10px,3cqw,16px)] flex-grow bg-[#1C1F2A] rounded-full relative overflow-hidden border border-white/5">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#FFD700] to-[#FFD70088] rounded-full opacity-70 transition-all duration-500"
              style={{ width: `${Math.max(0, Math.min(100, (player.ep / player.max_ep) * 100))}%`, boxShadow: '0 0 10px #FFD700' }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            </div>
          </div>
          {/* 數值 */}
          <span className="font-mono text-[clamp(12px,4cqw,20px)] w-[15%] text-right text-gray-200 shrink-0">
            {player.ep}
          </span>
        </div>

        {/* 氣血 (深紅脈動) */}
        <div className="flex items-center gap-[2cqw] w-full group">
          {/* 氣血圖示 */}
          <div className="w-[clamp(24px,6cqw,36px)] h-[clamp(24px,6cqw,36px)] shrink-0 flex items-center justify-center opacity-80">
            <img 
              src="/images/status/health.svg" 
              alt="氣血" 
              className="w-full h-full object-contain"
              style={{ filter: 'drop-shadow(0 0 8px #FF3B30) drop-shadow(0 0 12px #FF3B30)' }} 
            />
          </div>
          {/* 氣旋槽 */}
          <div className="h-[clamp(12px,3.5cqw,18px)] flex-grow bg-[#1C1F2A] rounded-full relative overflow-visible border border-white/5">
            {/* 脈動中心特效 (只在氣血條保留) */}
            <div className="absolute top-1/2 left-0 -translate-y-1/2 h-3 w-3 bg-[#FF3B30] rounded-full blur-[4px] animate-[pulse_2s_infinite] z-10"></div>
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#FF3B30] to-[#FF3B3088] rounded-full opacity-80 transition-all duration-500 overflow-hidden"
              style={{ width: `${Math.max(0, Math.min(100, (player.hp / player.max_hp) * 100))}%`, boxShadow: '0 0 12px #FF3B30' }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            </div>
          </div>
          {/* 數值 */}
          <span className="font-mono text-[clamp(12px,4cqw,20px)] w-[15%] text-right text-gray-200 shrink-0">
            {player.hp}
          </span>
        </div>
      </div>

      {/* =========================================
          2. 中央主顯示區
          ========================================= */}
      <div className="flex-grow relative z-10 overflow-hidden">
        {currentMode === 'status' && <StatusView />}
        {/* 👇 新增這行：當模式為 cultivate 時，渲染剛做好的戰鬥配置介面 */}
        {currentMode === 'cultivate' && <CultivateView />}
        {currentMode === 'explore' && <ExploreView />}
        {currentMode === 'bag' && <BagView />}
        
        {/* 把 cultivate 從這個陣列中拿掉，只留下還沒做的背包與仙網 */}
        {currentMode === 'network' && (
  <div className="h-full flex items-center justify-center text-[clamp(16px,5cqw,24px)] tracking-[8px] text-gray-600 animate-pulse">
    [ 仙網連線中 ]
  </div>
)}
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
                {/* 底部導航自訂圖示 */}
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
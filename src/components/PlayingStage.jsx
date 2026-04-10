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
  const [breakConfirm, setBreakConfirm] = useState(false); // 中斷調息確認框
  const player        = useGameStore((state) => state.player);
  const isMeditating  = useGameStore((state) => state.isMeditating);
  const setMeditating = useGameStore((state) => state.setMeditating);

  const triggerHaptic = () => {
    if (navigator.vibrate) navigator.vibrate(10);
  };

  // 調息中點擊內容區 → 跳確認框
  const handleContentClick = () => {
    if (!isMeditating) return;
    setBreakConfirm(true);
  };

  const confirmBreak = () => {
    setMeditating(false);
    setBreakConfirm(false);
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
        {currentMode === 'network' && <WorldView />}

        {/* 調息攔截遮罩：調息中覆蓋內容區，攔截所有操作 */}
        {isMeditating && (
          <div
            className="absolute inset-0 z-50 cursor-pointer"
            onClick={handleContentClick}
          />
        )}

        {/* 中斷調息確認框 */}
        {breakConfirm && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#12141A] border border-[#FFD700]/30 rounded-2xl w-[280px] overflow-hidden text-center shadow-[0_0_40px_rgba(255,215,0,0.15)]">
              <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#FFD700] to-transparent opacity-50" />
              <div className="p-7">
                <p className="text-[#FFD700] text-xl font-bold tracking-widest mb-2">定神調息中</p>
                <p className="text-white/50 text-sm tracking-wider mb-7 leading-relaxed">
                  中斷調息將停止體力・精力・氣血的加速回復
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setBreakConfirm(false)}
                    className="flex-1 py-3 rounded-xl border border-white/20 text-white/50 text-base tracking-widest active:scale-95 transition-all"
                  >繼續調息</button>
                  <button
                    onClick={confirmBreak}
                    className="flex-1 py-3 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/50 text-[#FFD700] text-base tracking-widest active:scale-95 transition-all"
                  >中斷調息</button>
                </div>
              </div>
            </div>
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
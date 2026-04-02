// src/views/ExploreView.jsx
import React, { useState, useRef } from 'react';
import useGameStore from '../store/gameStore';

// 戰鬥日誌各行類型對應顏色
const LOG_LINE_COLOR = {
  'player-atk':  '#FFD700', // 玩家攻擊 → 黃
  'enemy-atk':   '#FF3B30', // 敵人攻擊 → 紅
  'outcome-win': '#FFD700', // 勝利分隔 → 金
  'outcome-lose':'#FF3B30', // 重傷分隔 → 紅
  'reward':      '#32D74B', // 獎勵     → 綠
  'header':      '#00E5FF', // 雙方資訊 → 青藍
  'info':        '#9CA3AF', // 其他     → 灰
};

const POI_MAPPING = {
  'convenience': { name: '修真坊市', color: '#FFD700', glow: 'rgba(255,215,0,0.6)', type: 'shop' }, 
  'place_of_worship': { name: '前輩遺物', color: '#9B5CFF', glow: 'rgba(155,92,255,0.6)', type: 'ruin' }, 
  'default': { name: '低階妖獸', color: '#FF3B30', glow: 'rgba(255,59,48,0.6)', type: 'beast' }     
};

const TERRAIN_MAPPING = {
  'water': { type: '水脈', color: '#00E5FF', size: 'w-[40cqw] h-[40cqw]', animation: 'animate-[pulse_4s_infinite]' },
  'forest': { type: '靈林', color: '#32D74B', size: 'w-[50cqw] h-[50cqw]', animation: 'animate-[pulse_6s_infinite]' }
};

export default function ExploreView() {
  const player = useGameStore((state) => state.player);
  const reduceEp = useGameStore((state) => state.reduceEp); 
  
  const [isScanning, setIsScanning] = useState(false);
  const [isTuning, setIsTuning] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  
  const [events, setEvents] = useState([]); 
  const [terrains, setTerrains] = useState([]); 
  const [message, setMessage] = useState('凝神聚氣，外放神識');

  // 控制彈出視窗的狀態
  const [activeModal, setActiveModal] = useState(null); 

  const pressTimer = useRef(null);
  const pressStartTime = useRef(null);

  const handlePointerDown = (e) => {
    e.preventDefault();
    if (isScanning || activeModal) return; 
    pressStartTime.current = Date.now();
    setIsPressing(true);
    if (navigator.vibrate) navigator.vibrate(10); 
    
    pressTimer.current = setTimeout(async () => {
      const entering = !isTuning;
      setIsTuning(entering);
      setIsPressing(false);
      if (navigator.vibrate) navigator.vibrate([50, 50, 150]);

      if (!entering) {
        setMessage('凝神聚氣，外放神識');
        return;
      }

      if (!player?.id) {
        setMessage('尚未感知到道友的命格');
        setIsTuning(false);
        return;
      }

      setMessage('凝神入定，調息中...');
      try {
        const res = await fetch('/api/player/meditate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: player.id }),
        });
        const result = await res.json();
        if (!res.ok) {
          setMessage(result.message || '氣息尚未平穩');
          setIsTuning(false);
        } else {
          const { hp_restored, sp_restored } = result.data;
          setMessage(`調息完畢，氣血 +${hp_restored}，體力 +${sp_restored}`);
        }
      } catch {
        setMessage('調息失敗，天地靈氣紊亂');
        setIsTuning(false);
      }
    }, 3000);
  };

  const handlePointerUp = (e) => {
    e.preventDefault();
    if (!pressStartTime.current) return;
    const duration = Date.now() - pressStartTime.current;
    clearTimeout(pressTimer.current);
    pressTimer.current = null;
    pressStartTime.current = null;
    setIsPressing(false);
    
    if (duration < 500) {
      if (isTuning) {
        setIsTuning(false);
        setMessage('凝神聚氣，外放神識');
        if (navigator.vibrate) navigator.vibrate(15);
      } else {
        handleScan();
      }
    }
  };

  const openNodeModal = (clickedNode) => {
    setActiveModal({ step: 'info', node: clickedNode });
  };

  const confirmExecuteNode = async () => {
    if (!player?.id || !activeModal?.node) return;
    try {
      setActiveModal(prev => ({ ...prev, step: 'loading' }));

      const res = await fetch('/api/lbs/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: player.id, 
          nodeType: activeModal.node.nodeType || '拾荒', 
          nodeName: activeModal.node.name
        })
      });

      const result = await res.json();

      if (!res.ok) {
        setMessage(result.message || '互動失敗，天地法則紊亂');
        setActiveModal(null);
        return;
      }

      setActiveModal(prev => ({
          ...prev,
          step:          'result',
          resultMessage: result.data.message,
          battleLog:     result.data.battleLog   ?? null,
          outcome:       result.data.outcome     ?? null,
          itemDropped:   result.data.item_dropped ?? null,
          expGained:     result.data.exp_gained  ?? 0,
      }));
      
      setEvents(prevEvents => prevEvents.filter(e => e.id !== activeModal.node.id));
      if (navigator.vibrate) navigator.vibrate([50, 50, 100]); 

    } catch (error) {
      setMessage('天地法則紊亂，無法互動');
      setActiveModal(null);
    }
  };

  const closeModal = () => {
      setActiveModal(null);
  };

  const handleScan = () => {
    if (!player?.id) {
        setMessage('尚未感知到道友的命格');
        return;
    }
    if (player.ep < 10) {
      setMessage('精力不足，無法外放神識');
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]); 
      return;
    }

    setIsScanning(true);
    setEvents([]); 
    setMessage('神識牽引天地，搜尋周遭...');

    if (!navigator.geolocation) {
      fallbackScan();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await fetch('/api/lbs/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerId: player.id,
              lat: position.coords.latitude,
              lng: position.coords.longitude
            })
          });

          if (!res.ok) {
            setMessage('天地法則紊亂，探靈失敗');
            setIsScanning(false);
            return;
          }

          const result = await res.json();
          const backendNodes = result.data.nodes;

          const newEvents = backendNodes.map((node) => {
            let mapping = POI_MAPPING['default'];
            if (node.type === '拾荒') mapping = POI_MAPPING['convenience'];
            else if (node.type === '機緣' || node.type === '勞動') mapping = POI_MAPPING['place_of_worship'];
            
            return {
              id: node.instance_id,
              name: node.name,
              description: node.description,
              cost: { sp: node.cost_sp, hp: node.cost_hp },
              nodeType: node.type, 
              ...mapping,
              top: `${Math.floor(Math.random() * 70 + 15)}%`, 
              left: `${Math.floor(Math.random() * 70 + 15)}%`
            };
          });

          setEvents(newEvents);
          setTerrains([{ id: 't1', ...TERRAIN_MAPPING['water'], top: '30%', left: '70%' }]); 
          setIsScanning(false);
          setMessage(`探尋完畢，發現 ${newEvents.length} 處靈力波動`);
          if (reduceEp) reduceEp(10);

        } catch (error) {
          fallbackScan(); 
        }
      },
      () => fallbackScan(),
      { timeout: 10000 }
    );
  };

  const fallbackScan = () => {
    setTimeout(() => {
      setEvents(Array.from({ length: Math.floor(Math.random() * 3) + 2 }).map((_, i) => ({
        id: `mock-${i}`, nodeType: '拾荒', name: '未知遺落物', description: '似乎散發著微弱的靈氣', cost: { sp: 10, hp: 0 }, ...POI_MAPPING['convenience'],
        top: `${Math.floor(Math.random() * 70 + 15)}%`, left: `${Math.floor(Math.random() * 70 + 15)}%`,
      })));
      setIsScanning(false);
      setMessage('探尋完畢');
    }, 1500);
  };

  return (
    <div className="h-full w-full relative flex items-center justify-center overflow-hidden bg-transparent">      
      {/* 🌟 核心修復：被 AI 刪除的動畫樣式補回 */}
      <style>{`
        @keyframes ripple-out {
          0% { transform: scale(0.5); opacity: 0.8; }
          100% { transform: scale(3.5); opacity: 0; }
        }
        @keyframes ripple-in {
          0% { transform: scale(3.5); opacity: 0; }
          100% { transform: scale(0.5); opacity: 0.8; }
        }
      `}</style>

      {/* 1. 底層風水地形光暈 */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {terrains.map((terrain) => (
          <div key={terrain.id} className={`absolute rounded-[40%] blur-[30px] opacity-20 mix-blend-screen transition-all duration-1000 ${terrain.size} ${terrain.animation}`} style={{ top: terrain.top, left: terrain.left, backgroundColor: terrain.color, transform: 'translate(-50%, -50%) rotate(15deg)' }}></div>
        ))}
      </div>

      {/* 2. 掃描到的事件節點 */}
      {events.map((ev) => (
        <div key={ev.id} className="absolute flex flex-col items-center justify-center cursor-pointer group z-20 animate-[bounce-subtle_2s_infinite]" style={{ top: ev.top, left: ev.left }}
          onClick={(e) => { e.stopPropagation(); openNodeModal(ev); }} 
        >
          <div className="relative flex items-center justify-center translate-y-[-50%]">
            <div className="absolute w-8 h-8 rounded-full animate-ping opacity-40" style={{ backgroundColor: ev.color }}></div>
            <div className="w-4 h-4 rounded-full relative z-10" style={{ backgroundColor: ev.color, boxShadow: `0 0 15px ${ev.glow}, 0 0 30px ${ev.glow}` }}></div>
          </div>
          <span className="mt-2 text-[12px] tracking-widest text-white/90 drop-shadow-[0_0_8px_rgba(0,0,0,1)] bg-black/40 px-2 py-0.5 rounded border border-white/10">{ev.name}</span>
        </div>
      ))}

      {/* =====================================================================
          🌟 核心修復：中央探靈陣盤與波紋動畫
          ===================================================================== */}
      <div 
        className={`relative flex flex-col items-center justify-center cursor-pointer transition-transform duration-500 z-30 
          ${isScanning ? 'scale-110' : isPressing ? 'scale-90' : isTuning ? 'scale-100' : 'hover:scale-105 active:scale-95'}`} 
        onPointerDown={handlePointerDown} 
        onPointerUp={handlePointerUp} 
        onPointerLeave={handlePointerUp} 
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* 🌟 探測時：向外擴散的青色波紋 */}
        {isScanning && (
          <>
            <div className="absolute w-[80px] h-[80px] rounded-full border-[1.5px] border-[#00E5FF] animate-[ripple-out_2s_infinite_ease-out]" style={{ animationDelay: '0s' }}></div>
            <div className="absolute w-[80px] h-[80px] rounded-full border-[1.5px] border-[#00E5FF] animate-[ripple-out_2s_infinite_ease-out]" style={{ animationDelay: '0.6s' }}></div>
            <div className="absolute w-[80px] h-[80px] rounded-full border-[1.5px] border-[#00E5FF] animate-[ripple-out_2s_infinite_ease-out]" style={{ animationDelay: '1.2s' }}></div>
          </>
        )}

        {/* 🌟 長按調息時：向內聚攏的金色波紋 */}
        {(isPressing || isTuning) && (
          <>
            <div className="absolute w-[80px] h-[80px] rounded-full border-[2px] border-[#FFD700] animate-[ripple-in_1.5s_infinite_ease-in]" style={{ animationDelay: '0s' }}></div>
            <div className="absolute w-[80px] h-[80px] rounded-full border-[2px] border-[#FFD700] animate-[ripple-in_1.5s_infinite_ease-in]" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute w-[80px] h-[80px] rounded-full border-[2px] border-[#FFD700] animate-[ripple-in_1.5s_infinite_ease-in]" style={{ animationDelay: '1.0s' }}></div>
          </>
        )}

        {/* 核心陣眼背景色變換 */}
        <div className={`w-[80px] h-[80px] rounded-full flex flex-col items-center justify-center transition-all duration-1000 
          ${isScanning ? 'shadow-[0_0_50px_rgba(0,229,255,0.8)] bg-[#00E5FF]/30 backdrop-blur-md' : 
            (isPressing || isTuning) ? 'shadow-[0_0_50px_rgba(255,215,0,0.8)] bg-[#FFD700]/30 backdrop-blur-md' : 
            'shadow-[0_0_20px_rgba(0,229,255,0.15)] bg-[#0A0C10]/80 backdrop-blur-sm'}`}
        >
          {/* 陣眼內部的旋轉方塊 */}
          <div className={`w-[40px] h-[40px] border-[2px] rounded-sm transition-all duration-500 
            ${isScanning ? 'border-white animate-[spin_1s_linear_infinite]' : 
              (isPressing || isTuning) ? 'border-white animate-[spin_0.5s_linear_infinite_reverse] scale-75' : 
              'border-[#00E5FF] opacity-80 animate-[spin_4s_linear_infinite]'}
            `}
            style={(!isScanning && !isPressing && !isTuning) ? { transform: 'rotate(45deg)' } : {}}
          ></div>
        </div>
      </div>

      {/* 底部狀態提示文字 */}
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom,20px)+40px)] bg-black/60 backdrop-blur-sm px-6 py-2 rounded-full border border-[#00E5FF]/20 text-[#00E5FF] text-[14px] tracking-[8px] opacity-90 font-light shadow-[0_0_15px_rgba(0,229,255,0.1)] z-30 pointer-events-none">
        {message}
      </div>

      {/* 互動彈出視窗 (Modal Overlay) */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-[#12141A] border border-[#00E5FF]/30 rounded-xl w-full max-w-[320px] shadow-[0_0_40px_rgba(0,229,255,0.15)] flex flex-col overflow-hidden text-center transform transition-all">
            
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#00E5FF] to-transparent opacity-50"></div>

            <div className="p-6">
              {activeModal.step === 'info' && (
                <>
                  <h3 className="text-[#00E5FF] text-xl mb-2 font-bold tracking-widest">{activeModal.node.name}</h3>
                  <p className="text-gray-400 text-sm mb-6 min-h-[40px] leading-relaxed">
                    {activeModal.node.description || '此地似乎隱藏著某種機緣...'}
                  </p>
                  
                  <div className="bg-black/40 rounded p-3 mb-6 border border-white/5">
                    <p className="text-[#FF3B30] text-xs tracking-widest">
                      預計消耗: {activeModal.node.cost?.sp || 10} 體力
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <button onClick={closeModal} className="flex-1 py-2 rounded border border-white/20 text-gray-400 text-sm tracking-widest hover:bg-white/5 active:scale-95 transition-all">
                      離去
                    </button>
                    <button onClick={confirmExecuteNode} className="flex-1 py-2 rounded bg-[#00E5FF]/10 border border-[#00E5FF]/50 text-[#00E5FF] text-sm tracking-widest shadow-[0_0_10px_rgba(0,229,255,0.2)] hover:bg-[#00E5FF]/20 active:scale-95 transition-all">
                      探索
                    </button>
                  </div>
                </>
              )}

              {activeModal.step === 'loading' && (
                <div className="py-8 flex flex-col items-center justify-center">
                  <div className="w-8 h-8 border-2 border-[#00E5FF] border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-[#00E5FF] text-sm tracking-widest animate-pulse">神識交匯中...</p>
                </div>
              )}

              {activeModal.step === 'result' && (
                <>
                  {activeModal.battleLog ? (
                    <>
                      <h3 className={`text-xl mb-3 font-bold tracking-widest ${activeModal.outcome === 'win' ? 'text-[#FFD700]' : 'text-[#FF3B30]'}`}>
                        {activeModal.outcome === 'win' ? '⚔ 勝利' : '💀 重傷'}
                      </h3>
                      <div className="bg-black/60 border border-white/10 rounded-lg p-3 mb-4 max-h-[220px] overflow-y-auto text-left space-y-1 font-mono text-[11px] leading-relaxed">
                        {activeModal.battleLog.map((entry, i) => (
                          <p key={i} style={{ color: LOG_LINE_COLOR[entry.type] ?? '#9CA3AF' }}>
                            {entry.text}
                          </p>
                        ))}
                      </div>
                      <div className="bg-black/40 rounded p-3 mb-4 border border-white/5 text-xs space-y-1">
                        {activeModal.expGained > 0 && <p className="text-[#32D74B] tracking-widest">修為 +{activeModal.expGained}</p>}
                        {activeModal.itemDropped && <p className="text-[#FFD700] tracking-widest">獲得【{activeModal.itemDropped}】×1</p>}
                        {!activeModal.itemDropped && activeModal.outcome === 'win' && <p className="text-white/30 tracking-widest">此番未有掉落</p>}
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="text-[#FFD700] text-xl mb-4 font-bold tracking-widest">探索結果</h3>
                      <p className="text-white/90 text-sm mb-8 leading-relaxed">{activeModal.resultMessage}</p>
                    </>
                  )}
                  <button onClick={closeModal} className="w-full py-2 rounded bg-[#00E5FF]/10 border border-[#00E5FF]/50 text-[#00E5FF] text-sm tracking-widest hover:bg-[#00E5FF]/20 active:scale-95 transition-all">
                    收下
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
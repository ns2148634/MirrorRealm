// src/views/WorldView.jsx
import React, { useState } from 'react';
import useGameStore from '../store/gameStore';

// ==========================================
// 大千世界：五大系統節點
// ==========================================
const TABS = [
  { id: 'market',   label: '市場', color: '#FFD700', pos: { top: '25%', left: '25%' }, delay: '0s'   }, // 左上
  { id: 'bounty',   label: '懸賞', color: '#FF3B30', pos: { top: '20%', left: '75%' }, delay: '1.2s' }, // 右上
  { id: 'friend',   label: '道友', color: '#32D74B', pos: { top: '50%', left: '50%' }, delay: '2.5s' }, // 正中
  { id: 'sect',     label: '宗門', color: '#00E5FF', pos: { top: '75%', left: '25%' }, delay: '0.8s' }, // 左下
  { id: 'settings', label: '天機', color: '#9B5CFF', pos: { top: '80%', left: '75%' }, delay: '1.7s' }, // 右下
];

// 沿用修仙界品階顏色
const RARITY_COLORS = {
  white: { border: '#FFFFFF', bg: 'rgba(255,255,255,0.05)', shadow: 'rgba(255,255,255,0.2)' },
  green: { border: '#32D74B', bg: 'rgba(50,215,75,0.05)', shadow: 'rgba(50,215,75,0.3)' },
  blue:  { border: '#00E5FF', bg: 'rgba(0,229,255,0.05)', shadow: 'rgba(0,229,255,0.3)' },
  purple:{ border: '#9B5CFF', bg: 'rgba(155,92,255,0.05)', shadow: 'rgba(155,92,255,0.4)' },
  gold:  { border: '#FFD700', bg: 'rgba(255,215,0,0.05)', shadow: 'rgba(255,215,0,0.4)' },
  red:   { border: '#FF3B30', bg: 'rgba(255,59,48,0.05)', shadow: 'rgba(255,59,48,0.4)' },
};

// 模擬各系統的資料庫
const MOCK_WORLD_DATA = {
  market: [
    { id: 'm1', name: '聚寶閣', rarity: 'gold', desc: '修真界最大的連鎖商行，只要有靈石，連仙器都買得到。' },
    { id: 'm2', name: '黑市', rarity: 'purple', desc: '魚龍混雜的地下交易場所，常有見不得光的來路不明之物。' },
    { id: 'm3', name: '地攤', rarity: 'white', desc: '散修們擺攤的地方，全憑眼力撿漏。' },
  ],
  bounty: [
    { id: 'b1', name: '誅殺血魔', rarity: 'red', desc: '懸賞令：血魔老祖為禍一方，取其首級者賞靈石十萬。' },
    { id: 'b2', name: '採集靈草', rarity: 'green', desc: '委託：百草谷急需五十株星辰草，報酬豐厚。' },
    { id: 'b3', name: '護送商隊', rarity: 'blue', desc: '委託：護送聚寶閣商隊穿越黑風林。' },
  ],
  friend: [
    { id: 'f1', name: '清虛散人', rarity: 'blue', desc: '【好感度：泛泛之交】在雲遊時結識的散修，精通陣法之道。' },
    { id: 'f2', name: '紅蓮仙子', rarity: 'purple', desc: '【好感度：莫逆之交】曾與你並肩作戰的道友，性格火爆。' },
  ],
  sect: [
    { id: 's1', name: '執事殿', rarity: 'green', desc: '領取宗門日常任務與發放俸祿之處。' },
    { id: 's2', name: '藏經閣', rarity: 'gold', desc: '收藏宗門歷代功法秘籍的重地，需消耗宗門貢獻點進入。' },
    { id: 's3', name: '宗門大殿', rarity: 'purple', desc: '掌門與長老議事之處，閒雜人等不得擅入。' },
  ],
  furnace: [
    { id: 'fu1', name: '煉丹', rarity: 'gold', desc: '將收集來的靈草仙藥投入八卦爐中，煉製成各種神奇丹藥。' },
    { id: 'fu2', name: '煉器', rarity: 'purple', desc: '以天地異火熔煉神鐵，打造屬於你的本命法寶。' },
    { id: 'fu3', name: '分解', rarity: 'white', desc: '將無用的廢棄法器重新化為基礎素材。' },
  ],
};

export default function WorldView() {
  const player   = useGameStore((s) => s.player);
  const signOut  = useGameStore((s) => s.signOut);
  const [viewState,     setViewState]     = useState('overview');
  const [activeTab,     setActiveTab]     = useState('market');
  const [selectedItem,  setSelectedItem]  = useState(null);
  const [showSettings,  setShowSettings]  = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [settingsMsg,   setSettingsMsg]   = useState('');

  const triggerHaptic = (pattern) => {
    if (navigator.vibrate) navigator.vibrate(pattern);
  };

  // ── 天機：刪除帳號 ──────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    setSettingsMsg('');
    try {
      const res = await fetch('/api/auth/delete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id }),
      });
      const result = await res.json();
      if (!res.ok) { setSettingsMsg(result.message ?? '刪除失敗'); return; }
      await signOut();
    } catch { setSettingsMsg('刪除失敗，請稍後再試'); }
  };

  // ── 天機：重生 ──────────────────────────────────────────────────
  const handleReborn = async () => {
    setSettingsMsg('');
    try {
      const res = await fetch('/api/player/reborn', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id }),
      });
      const result = await res.json();
      if (!res.ok) { setSettingsMsg(result.message ?? '重生失敗'); return; }
      await signOut();
    } catch { setSettingsMsg('重生失敗，請稍後再試'); }
  };

  const handleEnterCategory = (tabId) => {
    if (tabId === 'settings') {
      setConfirmAction(null); setSettingsMsg('');
      setShowSettings(true);
      return;
    }
    triggerHaptic([20, 30]);
    setActiveTab(tabId);
    setViewState('entering');
    setTimeout(() => setViewState('detail'), 400);
  };

  const handleReturnOverview = () => {
    triggerHaptic(15);
    setViewState('exiting'); 
    setTimeout(() => setViewState('overview'), 400);
  };

  const handleEnterItem = (item) => {
    if (!item) return;
    triggerHaptic([20, 30]);
    setSelectedItem(item);
    setViewState('entering-item');
    setTimeout(() => setViewState('item-detail'), 400);
  };

  const handleReturnDetail = () => {
    triggerHaptic(15);
    setViewState('exiting-item');
    setTimeout(() => setViewState('detail'), 400);
  };

  const handleAction = (action) => {
    if (!selectedItem) return;
    triggerHaptic([30, 50, 30]);
    alert(`對 [${selectedItem.name}] 執行了：${action}`);
  };

  const currentItems = MOCK_WORLD_DATA[activeTab] || [];
  
  // 網格佈局格子數
  const TOTAL_SLOTS = 24; 
  const displayGrid = Array.from({ length: TOTAL_SLOTS }).map((_, index) => currentItems[index] || null);

  const showL1 = ['overview', 'entering', 'exiting'].includes(viewState);
  const showL2 = ['detail', 'entering', 'exiting', 'entering-item', 'exiting-item'].includes(viewState);
  const showL3 = ['item-detail', 'entering-item', 'exiting-item'].includes(viewState);

  return (
    <div className="h-full w-full relative flex flex-col bg-transparent overflow-hidden text-white font-serif z-10 pt-[5cqw]">


      {/* 空間穿梭動畫法則 */}
      <style>{`
        @keyframes gentle-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        .animate-float { animation: gentle-float 5s ease-in-out infinite; }

        @keyframes zoom-out-fade {
          from { transform: scale(1); opacity: 1; }
          to { transform: scale(2); opacity: 0; }
        }
        .animate-zoom-out-fade { animation: zoom-out-fade 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        @keyframes zoom-in-fade {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-zoom-in-fade { animation: zoom-in-fade 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        @keyframes shrink-out-fade {
          from { transform: scale(1); opacity: 1; }
          to { transform: scale(0.5); opacity: 0; }
        }
        .animate-shrink-out-fade { animation: shrink-out-fade 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        @keyframes shrink-in-fade {
          from { transform: scale(2); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-shrink-in-fade { animation: shrink-in-fade 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
      `}</style>

      {/* =========================================
          L1 視圖：大千世界總覽 (散落星圖顯化)
          ========================================= */}
      {showL1 && (
        <div 
          className={`absolute inset-0 flex flex-col items-center justify-center px-[4cqw] pt-[5cqw] z-20
            ${viewState === 'overview' ? 'opacity-100' : ''}
            ${viewState === 'entering' ? 'animate-zoom-out-fade pointer-events-none' : ''} 
            ${viewState === 'exiting' ? 'animate-shrink-in-fade pointer-events-none' : ''}
          `}
        >
          {/* 星圖容器：設定相對高度，讓內部的絕對座標生效 */}
          <div className="relative w-full h-[65vh] max-w-[400px] mx-auto">
            {TABS.map((tab) => (
              
              // 外層負責絕對定位 (定死座標)
              <div 
                key={tab.id}
                className="absolute z-10"
                style={{ 
                  top: tab.pos.top, 
                  left: tab.pos.left, 
                  transform: 'translate(-50%, -50%)' 
                }}
              >
                {/* 內層負責互動與漂浮動畫 */}
                <div 
                  onClick={() => viewState === 'overview' && handleEnterCategory(tab.id)}
                  className={`relative flex items-center justify-center cursor-pointer group active:scale-95 transition-all duration-300 ${viewState === 'overview' ? 'animate-float' : ''}`}
                  style={{ animationDelay: tab.delay }}
                >
                  {/* SVG 圖騰本體 */}
                  <div className="w-[20cqw] h-[20cqw] max-w-[85px] max-h-[85px] flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                    <img 
                      src={`/images/icons/icon_${tab.id}.svg`} 
                      alt={tab.label}
                      className="w-full h-full object-contain opacity-90"
                      style={{ filter: `drop-shadow(0 0 15px ${tab.color})` }}
                    />
                  </div>
                </div>
              </div>

            ))}
          </div>
          
          {/* 底部微弱的神識提示 */}
          <div className="absolute bottom-[calc(env(safe-area-inset-bottom,20px)+10cqw)] text-[#FFD700] tracking-[0.5em] text-[12px] opacity-40 pointer-events-none">
            神識探查大千世界
          </div>
        </div>
      )}

      {/* =========================================
          L2 視圖：空間內部 (具體節點網格)
          ========================================= */}
      {showL2 && (
        <div 
          className={`absolute inset-0 flex flex-col z-30
            ${viewState === 'detail' ? 'opacity-100' : ''}
            ${viewState === 'entering' ? 'animate-zoom-in-fade pointer-events-none' : ''}
            ${viewState === 'exiting' ? 'animate-shrink-out-fade pointer-events-none' : ''}
            ${viewState === 'entering-item' ? 'animate-zoom-out-fade pointer-events-none' : ''}
            ${viewState === 'exiting-item' ? 'animate-shrink-in-fade pointer-events-none' : ''}
          `}
        >
          <div className="px-[5cqw] flex-grow overflow-y-auto no-scrollbar pb-[4cqw] pt-[5cqw]">
            <div className="grid grid-cols-4 gap-[3cqw] w-full max-w-[500px] mx-auto">
              {displayGrid.map((item, index) => {
                const isSelected = selectedItem?.id === item?.id;
                const rarityStyle = item ? RARITY_COLORS[item.rarity] : null;

                return (
                  <div
                    key={item ? item.id : `empty-${index}`}
                    onClick={() => viewState === 'detail' && handleEnterItem(item)} 
                    className={`relative aspect-square rounded-xl transition-all duration-300 flex items-center justify-center overflow-hidden
                      ${item ? `cursor-pointer active:scale-95 ${viewState === 'detail' ? 'animate-float' : ''}` : 'border border-dashed border-white/5 bg-transparent'}
                    `}
                    style={item ? {
                      backgroundColor: rarityStyle.bg,
                      border: `1px solid ${isSelected ? rarityStyle.border : rarityStyle.border + '44'}`,
                      boxShadow: isSelected ? `inset 0 0 20px ${rarityStyle.shadow}, 0 0 15px ${rarityStyle.shadow}` : `0 5px 15px rgba(0,0,0,0.5)`,
                      animationDelay: viewState === 'detail' ? `${(index * 0.2) % 3}s` : '0s',
                      transform: isSelected ? 'scale(1.05)' : 'scale(1)'
                    } : {}}
                  >
                    {item && (
                      <>
                        <span className="text-[clamp(16px,4.5cqw,22px)] font-bold drop-shadow-lg whitespace-nowrap" style={{ color: rarityStyle.border }}>
                          {item.name.substring(0, 2)} {/* 顯示前兩個字 */}
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="w-full shrink-0 bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col pt-[8cqw]">
            <div className="px-[6cqw] pb-[6cqw] flex justify-between items-center w-full max-w-[500px] mx-auto">
              <button 
                onClick={() => viewState === 'detail' && handleReturnOverview()}
                className="text-gray-400 hover:text-white tracking-widest text-[clamp(14px,4cqw,16px)] flex items-center gap-2 border border-white/10 bg-black/40 px-4 py-1.5 rounded-full active:scale-95 transition-all"
              >
                <span className="text-lg leading-none mt-[-2px]">‹</span> 抽離神識
              </button>
              <span className="text-[#FFD700] tracking-[0.4em] text-[clamp(16px,4.5cqw,20px)] drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]">
                {TABS.find(t => t.id === activeTab)?.label}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          L3 視圖：項目詳情與互動
          ========================================= */}
      {showL3 && selectedItem && (
        <div 
          className={`absolute inset-0 flex flex-col z-40 bg-black/40 backdrop-blur-sm
            ${viewState === 'item-detail' ? 'opacity-100' : ''}
            ${viewState === 'entering-item' ? 'animate-zoom-in-fade pointer-events-none' : ''}
            ${viewState === 'exiting-item' ? 'animate-shrink-out-fade pointer-events-none' : ''}
          `}
        >
          <div className="flex-grow flex flex-col items-center justify-center px-[8cqw]">
            <div 
              className={`relative w-[35cqw] h-[35cqw] rounded-full flex items-center justify-center mb-[8cqw] ${viewState === 'item-detail' ? 'animate-float' : ''}`}
              style={{
                backgroundColor: RARITY_COLORS[selectedItem.rarity].bg,
                border: `2px solid ${RARITY_COLORS[selectedItem.rarity].border}`,
                boxShadow: `inset 0 0 30px ${RARITY_COLORS[selectedItem.rarity].shadow}, 0 0 40px ${RARITY_COLORS[selectedItem.rarity].shadow}`
              }}
            >
              <span 
                className="text-[clamp(36px,10cqw,48px)] font-bold drop-shadow-lg" 
                style={{ color: RARITY_COLORS[selectedItem.rarity].border }}
              >
                {selectedItem.name.charAt(0)}
              </span>
            </div>

            <h3 
              className="text-[clamp(24px,7cqw,32px)] font-bold tracking-[0.3em] mb-4 drop-shadow-md text-center"
              style={{ color: RARITY_COLORS[selectedItem.rarity].border }}
            >
              {selectedItem.name}
            </h3>

            <p className="text-gray-300 text-[clamp(14px,4cqw,16px)] tracking-wider leading-relaxed text-center px-[4cqw] bg-black/30 border border-white/5 p-4 rounded-xl backdrop-blur-md">
              {selectedItem.desc}
            </p>
          </div>

          <div className="w-full shrink-0 bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col pt-[8cqw]">
            
            <div className="px-[5cqw] flex gap-[4cqw] pb-[4cqw] w-full max-w-[500px] mx-auto">
              <button
                onClick={() => handleAction('放棄')}
                className="flex-1 py-3 rounded-full text-[clamp(16px,4.5cqw,20px)] tracking-[0.5em] transition-all duration-300 border backdrop-blur-sm border-[#FF3B30] text-[#FF3B30] bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 shadow-[0_0_15px_rgba(255,59,48,0.2)] active:scale-95"
              >
                放棄
              </button>
              <button
                onClick={() => handleAction('前往')}
                className="flex-1 py-3 rounded-full text-[clamp(16px,4.5cqw,20px)] tracking-[0.5em] transition-all duration-300 border backdrop-blur-sm border-[#00E5FF] text-[#00E5FF] bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 shadow-[0_0_15px_rgba(0,229,255,0.2)] active:scale-95"
              >
                前往
              </button>
            </div>

            <div className="px-[6cqw] pb-[6cqw] flex justify-between items-center w-full max-w-[500px] mx-auto">
              <button 
                onClick={() => viewState === 'item-detail' && handleReturnDetail()}
                className="text-gray-400 hover:text-white tracking-widest text-[clamp(14px,4cqw,16px)] flex items-center gap-2 border border-white/10 bg-black/40 px-4 py-1.5 rounded-full active:scale-95 transition-all"
              >
                <span className="text-lg leading-none mt-[-2px]">‹</span> 返回
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* ── 天機設定 Modal ────────────────────────────────────────── */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md"
          onClick={(e) => { if (e.target === e.currentTarget) setShowSettings(false); }}
        >
          <div
            className="w-full max-w-[320px] mx-4 flex flex-col gap-3 px-6 py-8"
            style={{
              background: 'rgba(10,12,18,0.92)',
              border: '1px solid rgba(155,92,255,0.25)',
              borderRadius: '1rem',
              boxShadow: '0 0 40px rgba(155,92,255,0.1)',
            }}
          >
            <div className="text-center mb-2">
              <div className="text-[18px] tracking-[0.5em] font-serif text-white/80">天　機</div>
              <div className="w-12 h-[1px] bg-[#9B5CFF]/40 mx-auto mt-2" />
            </div>

            {!confirmAction && (
              <>
                <button
                  onClick={async () => { setShowSettings(false); await signOut(); }}
                  className="w-full py-3 rounded-lg text-[15px] tracking-[0.3em] font-serif transition-all active:scale-95"
                  style={{ background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.25)', color: 'rgba(200,240,255,0.8)' }}
                >
                  離開仙途（登出）
                </button>
                <button
                  onClick={() => setConfirmAction('reborn')}
                  className="w-full py-3 rounded-lg text-[15px] tracking-[0.3em] font-serif transition-all active:scale-95"
                  style={{ background: 'rgba(255,140,0,0.06)', border: '1px solid rgba(255,140,0,0.3)', color: 'rgba(255,180,80,0.85)' }}
                >
                  輪迴重生（重置角色）
                </button>
                <button
                  onClick={() => setConfirmAction('delete')}
                  className="w-full py-3 rounded-lg text-[15px] tracking-[0.3em] font-serif transition-all active:scale-95"
                  style={{ background: 'rgba(255,59,48,0.06)', border: '1px solid rgba(255,59,48,0.3)', color: 'rgba(255,100,90,0.85)' }}
                >
                  道消形滅（刪除帳號）
                </button>
                {settingsMsg && <p className="text-center text-[13px] text-red-400 tracking-wider">{settingsMsg}</p>}
                <button
                  onClick={() => setShowSettings(false)}
                  className="mt-2 w-full py-2 text-[13px] tracking-[0.3em] font-serif text-white/30 hover:text-white/60 transition-colors"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  返回
                </button>
              </>
            )}

            {confirmAction === 'reborn' && (
              <>
                <p className="text-center text-[14px] tracking-wider font-serif text-white/70 leading-relaxed">
                  輪迴重生將清除所有修為與角色資料，<br />重新踏上仙途。
                  <br /><span className="text-orange-400/80">此操作無法復原。</span>
                </p>
                <button
                  onClick={handleReborn}
                  className="w-full py-3 rounded-lg text-[15px] tracking-[0.3em] font-serif active:scale-95"
                  style={{ background: 'rgba(255,140,0,0.15)', border: '1px solid rgba(255,140,0,0.5)', color: '#FFAA40' }}
                >確認重生</button>
                {settingsMsg && <p className="text-center text-[13px] text-red-400 tracking-wider">{settingsMsg}</p>}
                <button onClick={() => setConfirmAction(null)} className="w-full py-2 text-[13px] tracking-[0.3em] font-serif text-white/30" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>取消</button>
              </>
            )}

            {confirmAction === 'delete' && (
              <>
                <p className="text-center text-[14px] tracking-wider font-serif text-white/70 leading-relaxed">
                  道消形滅將永久刪除帳號與所有資料，<br />
                  <span className="text-red-400/80">此操作無法復原。</span>
                </p>
                <button
                  onClick={handleDeleteAccount}
                  className="w-full py-3 rounded-lg text-[15px] tracking-[0.3em] font-serif active:scale-95"
                  style={{ background: 'rgba(255,59,48,0.15)', border: '1px solid rgba(255,59,48,0.5)', color: '#FF6B6B' }}
                >確認刪除</button>
                {settingsMsg && <p className="text-center text-[13px] text-red-400 tracking-wider">{settingsMsg}</p>}
                <button onClick={() => setConfirmAction(null)} className="w-full py-2 text-[13px] tracking-[0.3em] font-serif text-white/30" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>取消</button>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
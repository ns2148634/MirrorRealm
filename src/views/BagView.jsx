// src/views/BagView.jsx
import React, { useState } from 'react';

// ==========================================
// 模擬：芥子空間資料庫
// ==========================================
const TABS = [
  { id: 'material', label: '素材', color: '#E2E8F0', glow: 'rgba(226,232,240,0.5)' },
  { id: 'artifact', label: '法器', color: '#00E5FF', glow: 'rgba(0,229,255,0.5)' },
  { id: 'pill', label: '丹藥', color: '#32D74B', glow: 'rgba(50,215,75,0.5)' },
  { id: 'talisman', label: '符籙', color: '#9B5CFF', glow: 'rgba(155,92,255,0.5)' },
  { id: 'puppet', label: '傀儡', color: '#FF3B30', glow: 'rgba(255,59,48,0.5)' },
  { id: 'pet', label: '靈獸', color: '#FFD700', glow: 'rgba(255,215,0,0.5)' },
];

const RARITY_COLORS = {
  white: { border: '#FFFFFF', bg: 'rgba(255,255,255,0.05)', shadow: 'rgba(255,255,255,0.2)' },
  green: { border: '#32D74B', bg: 'rgba(50,215,75,0.05)', shadow: 'rgba(50,215,75,0.3)' },
  blue:  { border: '#00E5FF', bg: 'rgba(0,229,255,0.05)', shadow: 'rgba(0,229,255,0.3)' },
  purple:{ border: '#9B5CFF', bg: 'rgba(155,92,255,0.05)', shadow: 'rgba(155,92,255,0.4)' },
  gold:  { border: '#FFD700', bg: 'rgba(255,215,0,0.05)', shadow: 'rgba(255,215,0,0.4)' },
  red:   { border: '#FF3B30', bg: 'rgba(255,59,48,0.05)', shadow: 'rgba(255,59,48,0.4)' },
};

const MOCK_INVENTORY = {
  material: [
    { id: 'm1', name: '鐵精', count: 12, rarity: 'white', desc: '凡鐵經過千錘百鍊後提取的精華，是煉製低階法器的基礎素材。' },
    { id: 'm2', name: '百年靈草', count: 5, rarity: 'green', desc: '吸收天地靈氣百年方才成熟的靈草，蘊含溫和的木屬性靈力。' },
    { id: 'm3', name: '星辰砂', count: 2, rarity: 'blue', desc: '採集自隕星墜落之地的奇砂，可用於刻畫高級聚靈陣法。' },
    { id: 'm4', name: '三階妖丹', count: 1, rarity: 'purple', desc: '築基期妖獸隕落後殘留的力量核心，靈氣狂暴，需謹慎煉化。' },
  ],
  artifact: [
    { id: 'a1', name: '青木劍', count: 1, rarity: 'green', desc: '以百年青木為劍骨煉製的飛劍，輕巧靈動，適合木系功法。' },
    { id: 'a2', name: '玄鐵印', count: 1, rarity: 'blue', desc: '沉重無比的法印，祭出時可如泰山壓頂，鎮壓邪祟。' },
  ],
  pill: [
    { id: 'p1', name: '辟穀丹', count: 99, rarity: 'white', desc: '低階修士必備丹藥，服用一顆可保七日不餓。' },
    { id: 'p2', name: '聚氣散', count: 15, rarity: 'green', desc: '加速吸收周遭天地靈氣，適合在靈氣稀薄之地修煉時使用。' },
    { id: 'p3', name: '築基丹', count: 1, rarity: 'gold', desc: '無數煉氣期修士夢寐以求的仙丹！能大幅提高突破築基期的成功率。' },
  ],
  talisman: [
    { id: 't1', name: '烈火符', count: 20, rarity: 'green', desc: '封印了火系法術的符籙，以神識引爆後可造成範圍火焰灼燒。' },
    { id: 't2', name: '神行符', count: 5, rarity: 'blue', desc: '貼於雙腿之上，可日行千里，是逃命趕路的絕佳法寶。' },
  ],
  puppet: [],
  pet: [
    { id: 'pet1', name: '尋寶鼠', count: 1, rarity: 'purple', desc: '對天地靈物極度敏感的罕見靈獸，能幫主人找到隱藏的機緣。' }
  ],
};

export default function BagView() {
  const [viewState, setViewState] = useState('overview'); 
  const [activeTab, setActiveTab] = useState('material');
  const [selectedItem, setSelectedItem] = useState(null);

  const triggerHaptic = (pattern) => {
    if (navigator.vibrate) navigator.vibrate(pattern);
  };

  const handleEnterCategory = (tabId) => {
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
    setTimeout(() => {
      setViewState('detail');
    }, 400);
  };

  const handleAction = (action) => {
    if (!selectedItem) return;
    triggerHaptic([30, 50, 30]);
    alert(`對 [${selectedItem.name}] 執行了：${action}`);
  };

  const currentItems = MOCK_INVENTORY[activeTab] || [];
  
  // 🌟 陣法微調 1：格子數量從 20 增加為 24 (4列 x 6行)
  const TOTAL_SLOTS = 24; 
  const displayGrid = Array.from({ length: TOTAL_SLOTS }).map((_, index) => currentItems[index] || null);

  const showL1 = ['overview', 'entering', 'exiting'].includes(viewState);
  const showL2 = ['detail', 'entering', 'exiting', 'entering-item', 'exiting-item'].includes(viewState);
  const showL3 = ['item-detail', 'entering-item', 'exiting-item'].includes(viewState);

  return (
    <div className="h-full w-full relative flex flex-col bg-transparent overflow-hidden text-white font-serif z-10 pt-[5cqw]">
      
      {/* 🌟 空間穿梭動畫法則 */}
      <style>{`
        @keyframes gentle-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        .animate-float { animation: gentle-float 4s ease-in-out infinite; }

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
          L1 視圖：芥子總覽 (六大分類懸浮)
          ========================================= */}
      {showL1 && (
        <div 
          className={`absolute inset-0 flex flex-col items-center justify-center px-[8cqw] pt-[10cqw] z-20
            ${viewState === 'overview' ? 'opacity-100' : ''}
            ${viewState === 'entering' ? 'animate-zoom-out-fade pointer-events-none' : ''} 
            ${viewState === 'exiting' ? 'animate-shrink-in-fade pointer-events-none' : ''}
          `}
        >
          <div className="grid grid-cols-2 gap-[6cqw] w-full max-w-[400px]">
            {TABS.map((tab, i) => (
              <div 
                key={tab.id}
                onClick={() => viewState === 'overview' && handleEnterCategory(tab.id)}
                className={`cursor-pointer group ${viewState === 'overview' ? 'animate-float' : ''}`}
                style={viewState === 'overview' ? { animationDelay: `${(i * 0.5) % 2}s` } : {}}
              >
                <div 
                  className="aspect-square rounded-full flex flex-col items-center justify-center border border-white/10 bg-black/40 backdrop-blur-md transition-all duration-500 group-hover:scale-105 group-hover:bg-white/5 group-active:scale-95"
                  style={{ boxShadow: `inset 0 0 20px rgba(255,255,255,0.02), 0 0 15px ${tab.glow}` }}
                >
                  <span 
                    className="text-[clamp(18px,5cqw,24px)] font-bold tracking-widest drop-shadow-[0_0_8px_currentColor]"
                    style={{ color: tab.color }}
                  >
                    {tab.label}
                  </span>
                  <span className="text-[10px] text-gray-500 mt-2 tracking-widest">
                    {MOCK_INVENTORY[tab.id]?.length || 0} 種類
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================
          L2 視圖：空間內部 (具體物品網格)
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
          {/* 中央納物網格 */}
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
                        <span className="text-[clamp(16px,4.5cqw,22px)] font-bold drop-shadow-lg" style={{ color: rarityStyle.border }}>
                          {item.name.charAt(0)}
                        </span>
                        
                        {item.count > 1 && (
                          <div className="absolute bottom-1 right-1.5 text-[10px] font-mono text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,1)] bg-black/40 px-1 rounded">
                            x{item.count}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 🌟 陣法微調 2：L2 底部返回區域 (統一底座架構，移除 safe-area 計算) */}
          <div className="w-full shrink-0 bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col pt-[8cqw]">
            <div className="px-[6cqw] pb-[6cqw] flex justify-between items-center w-full max-w-[500px] mx-auto">
              <button 
                onClick={() => viewState === 'detail' && handleReturnOverview()}
                className="text-gray-400 hover:text-white tracking-widest text-[clamp(14px,4cqw,16px)] flex items-center gap-2 border border-white/10 bg-black/40 px-4 py-1.5 rounded-full active:scale-95 transition-all"
              >
                <span className="text-lg leading-none mt-[-2px]">‹</span> 抽離空間
              </button>
              <span className="text-[#00E5FF] tracking-[0.4em] text-[clamp(16px,4.5cqw,20px)] drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]">
                {TABS.find(t => t.id === activeTab)?.label}空間
              </span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          L3 視圖：物品詳情 (單一物品放大展示)
          ========================================= */}
      {showL3 && selectedItem && (
        <div 
          className={`absolute inset-0 flex flex-col z-40 bg-black/40 backdrop-blur-sm
            ${viewState === 'item-detail' ? 'opacity-100' : ''}
            ${viewState === 'entering-item' ? 'animate-zoom-in-fade pointer-events-none' : ''}
            ${viewState === 'exiting-item' ? 'animate-shrink-out-fade pointer-events-none' : ''}
          `}
        >
          {/* 🌟 陣法微調 3：中央物品大圖與資訊 (最大化空間，拔除頂部額外按鈕) */}
          <div className="flex-grow flex flex-col items-center justify-center px-[8cqw]">
            {/* 懸浮法球 (大圖示) */}
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
              {/* 數量 */}
              <div className="absolute -bottom-2 px-3 py-1 text-[12px] font-mono text-white tracking-widest bg-black/80 border border-white/20 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.8)]">
                數量: {selectedItem.count}
              </div>
            </div>

            {/* 物品名稱 */}
            <h3 
              className="text-[clamp(24px,7cqw,32px)] font-bold tracking-[0.3em] mb-4 drop-shadow-md text-center"
              style={{ color: RARITY_COLORS[selectedItem.rarity].border }}
            >
              {selectedItem.name}
            </h3>

            {/* 物品描述 */}
            <p className="text-gray-300 text-[clamp(14px,4cqw,16px)] tracking-wider leading-relaxed text-center px-[4cqw] bg-black/30 border border-white/5 p-4 rounded-xl backdrop-blur-md">
              {selectedItem.desc || '一件散發著微弱靈氣的修仙物品。'}
            </p>
          </div>

          {/* 🌟 陣法微調 4：L3 底部區域 (與 L2 完全對齊的底座) */}
          <div className="w-full shrink-0 bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col pt-[8cqw]">
            
            {/* 動作按鈕：合成 / 銷毀 */}
            <div className="px-[5cqw] flex gap-[4cqw] pb-[4cqw] w-full max-w-[500px] mx-auto">
              <button
                onClick={() => handleAction('銷毀')}
                className="flex-1 py-3 rounded-full text-[clamp(16px,4.5cqw,20px)] tracking-[0.5em] transition-all duration-300 border backdrop-blur-sm border-[#FF3B30] text-[#FF3B30] bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 shadow-[0_0_15px_rgba(255,59,48,0.2)] active:scale-95"
              >
                銷毀
              </button>
              <button
                onClick={() => handleAction('合成')}
                className="flex-1 py-3 rounded-full text-[clamp(16px,4.5cqw,20px)] tracking-[0.5em] transition-all duration-300 border backdrop-blur-sm border-[#00E5FF] text-[#00E5FF] bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 shadow-[0_0_15px_rgba(0,229,255,0.2)] active:scale-95"
              >
                合成
              </button>
            </div>

            {/* 返回鍵 (精準對齊 L2 的座標與高度) */}
            <div className="px-[6cqw] pb-[6cqw] flex justify-between items-center w-full max-w-[500px] mx-auto">
              <button 
                onClick={() => viewState === 'item-detail' && handleReturnDetail()}
                className="text-gray-400 hover:text-white tracking-widest text-[clamp(14px,4cqw,16px)] flex items-center gap-2 border border-white/10 bg-black/40 px-4 py-1.5 rounded-full active:scale-95 transition-all"
              >
                <span className="text-lg leading-none mt-[-2px]">‹</span> 返回空間
              </button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}
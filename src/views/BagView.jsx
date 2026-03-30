// src/views/BagView.jsx
import React, { useState } from 'react';

// ==========================================
// 模擬：芥子空間資料庫 (🌟 陣法升級：加入絕對座標與浮動延遲)
// ==========================================
const TABS = [
  { id: 'material', label: '素材', color: '#E2E8F0', pos: { top: '22%', left: '25%' }, delay: '0s' },
  { id: 'artifact', label: '法器', color: '#00E5FF', pos: { top: '15%', left: '75%' }, delay: '1.2s' },
  { id: 'pill', label: '丹藥', color: '#32D74B', pos: { top: '50%', left: '18%' }, delay: '2.5s' },
  { id: 'talisman', label: '符籙', color: '#9B5CFF', pos: { top: '45%', left: '82%' }, delay: '0.8s' },
  { id: 'puppet', label: '傀儡', color: '#FF3B30', pos: { top: '78%', left: '30%' }, delay: '3.1s' },
  { id: 'pet', label: '靈獸', color: '#FFD700', pos: { top: '72%', left: '72%' }, delay: '1.7s' },
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
          L1 視圖：芥子總覽 (散落星圖顯化)
          ========================================= */}
      {showL1 && (
        <div 
          className={`absolute inset-0 flex flex-col items-center justify-center px-[4cqw] pt-[5cqw] z-20
            ${viewState === 'overview' ? 'opacity-100' : ''}
            ${viewState === 'entering' ? 'animate-zoom-out-fade pointer-events-none' : ''} 
            ${viewState === 'exiting' ? 'animate-shrink-in-fade pointer-events-none' : ''}
          `}
        >
          {/* 🌟 星圖容器：設定相對高度，讓內部的絕對座標生效 */}
          <div className="relative w-full h-[65vh] max-w-[400px] mx-auto">
            {TABS.map((tab) => (
              
              // 外層負責絕對定位 (定死座標)
              <div 
                key={tab.id}
                className="absolute z-10"
                style={{ 
                  top: tab.pos.top, 
                  left: tab.pos.left, 
                  transform: 'translate(-50%, -50%)' // 確保座標對齊圖騰中心
                }}
              >
                {/* 內層負責互動與漂浮動畫 */}
                <div 
                  onClick={() => viewState === 'overview' && handleEnterCategory(tab.id)}
                  className={`relative flex items-center justify-center cursor-pointer group active:scale-95 transition-all duration-300 ${viewState === 'overview' ? 'animate-float' : ''}`}
                  style={{ animationDelay: tab.delay }}
                >
                  <div className="w-[18cqw] h-[18cqw] max-w-[80px] max-h-[80px] flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
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
          
          {/* 點綴：底部微弱的神識提示 */}
          <div className="absolute bottom-[calc(env(safe-area-inset-bottom,20px)+10cqw)] text-[#00E5FF] tracking-[0.5em] text-[12px] opacity-40 pointer-events-none">
            探入神識以檢視
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
              <div className="absolute -bottom-2 px-3 py-1 text-[12px] font-mono text-white tracking-widest bg-black/80 border border-white/20 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.8)]">
                數量: {selectedItem.count}
              </div>
            </div>

            <h3 
              className="text-[clamp(24px,7cqw,32px)] font-bold tracking-[0.3em] mb-4 drop-shadow-md text-center"
              style={{ color: RARITY_COLORS[selectedItem.rarity].border }}
            >
              {selectedItem.name}
            </h3>

            <p className="text-gray-300 text-[clamp(14px,4cqw,16px)] tracking-wider leading-relaxed text-center px-[4cqw] bg-black/30 border border-white/5 p-4 rounded-xl backdrop-blur-md">
              {selectedItem.desc || '一件散發著微弱靈氣的修仙物品。'}
            </p>
          </div>

          <div className="w-full shrink-0 bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col pt-[8cqw]">
            
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
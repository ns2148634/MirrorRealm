// src/views/BagView.jsx
import React, { useState } from 'react';

// ==========================================
// 模擬：芥子空間資料庫
// ==========================================
const TABS = [
  { id: 'material', label: '素材' },
  { id: 'artifact', label: '法器' },
  { id: 'pill', label: '丹藥' },
  { id: 'talisman', label: '符籙' },
  { id: 'puppet', label: '傀儡' },
  { id: 'pet', label: '靈獸' },
];

// 稀有度對應顏色字典
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
    { id: 'm1', name: '鐵精', count: 12, rarity: 'white' },
    { id: 'm2', name: '百年靈草', count: 5, rarity: 'green' },
    { id: 'm3', name: '星辰砂', count: 2, rarity: 'blue' },
    { id: 'm4', name: '三階妖丹', count: 1, rarity: 'purple' },
  ],
  artifact: [
    { id: 'a1', name: '青木劍', count: 1, rarity: 'green' },
    { id: 'a2', name: '玄鐵印', count: 1, rarity: 'blue' },
  ],
  pill: [
    { id: 'p1', name: '辟穀丹', count: 99, rarity: 'white' },
    { id: 'p2', name: '聚氣散', count: 15, rarity: 'green' },
    { id: 'p3', name: '築基丹', count: 1, rarity: 'gold' },
  ],
  talisman: [
    { id: 't1', name: '烈火符', count: 20, rarity: 'green' },
    { id: 't2', name: '神行符', count: 5, rarity: 'blue' },
  ],
  puppet: [],
  pet: [
    { id: 'pet1', name: '尋寶鼠', count: 1, rarity: 'purple' }
  ],
};

const CRAFTING_SKILLS = [
  { id: 'forge', name: '煉器', current: 1250, max: 2000, color: '#FFD700' }, // 金
  { id: 'alchemy', name: '丹藥', current: 800, max: 2000, color: '#32D74B' }, // 木
  { id: 'talisman', name: '符籙', current: 1950, max: 2000, color: '#00E5FF' }, // 水
  { id: 'puppet', name: '傀儡', current: 150, max: 2000, color: '#FF3B30' },  // 火
];

export default function BagView() {
  const [activeTab, setActiveTab] = useState('material');
  const [selectedItem, setSelectedItem] = useState(null);

  const triggerHaptic = (pattern) => {
    if (navigator.vibrate) navigator.vibrate(pattern);
  };

  const handleTabClick = (tabId) => {
    triggerHaptic(10);
    setActiveTab(tabId);
    setSelectedItem(null); // 切換標籤時清空選擇
  };

  const handleItemClick = (item) => {
    if (!item) return;
    triggerHaptic(15);
    setSelectedItem(prev => prev?.id === item.id ? null : item); // 點擊已選中的則取消選擇
  };

  const handleAction = (action) => {
    if (!selectedItem) return;
    triggerHaptic([30, 50, 30]);
    alert(`對 [${selectedItem.name}] 執行了：${action}`);
    // 這裡可以接 API 或 Store 邏輯
  };

  // 取得當前分類的物品，並補齊 25 格 (5x5) 的空位
  const currentItems = MOCK_INVENTORY[activeTab] || [];
  const TOTAL_SLOTS = 25;
  const displayGrid = Array.from({ length: TOTAL_SLOTS }).map((_, index) => currentItems[index] || null);

  return (
    <div className="h-full w-full relative flex flex-col bg-transparent overflow-hidden text-white font-serif z-10">
      
      {/* =========================================
          1. 頂部分類頁籤 (橫向滾動)
          ========================================= */}
      <div className="pt-[2cqw] px-[4cqw] pb-[3cqw] shrink-0">
        <div className="flex justify-between items-center gap-0.6 overflow-x-auto no-scrollbar pb-2 mask-linear-fade">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`relative px-4 py-2 shrink-0 text-[clamp(14px,4cqw,18px)] tracking-widest transition-all duration-300 ${
                  isActive ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {tab.label}
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-[2px] bg-[#00E5FF] shadow-[0_0_8px_#00E5FF] rounded-full"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================
          2. 中央 5x5 納物網格
          ========================================= */}
      <div className="px-[5cqw] shrink-0 flex justify-center mb-[4cqw] animate-fade-in">
        <div className="grid grid-cols-5 gap-[2cqw] w-full max-w-[500px]">
          {displayGrid.map((item, index) => {
            const isSelected = selectedItem?.id === item?.id;
            const rarityStyle = item ? RARITY_COLORS[item.rarity] : null;

            return (
              <div
                key={item ? item.id : `empty-${index}`}
                onClick={() => handleItemClick(item)}
                className={`relative aspect-square rounded-md transition-all duration-300 flex items-center justify-center overflow-hidden
                  ${item ? 'cursor-pointer active:scale-95' : 'border border-dashed border-white/10 bg-black/20'}
                `}
                style={item ? {
                  backgroundColor: rarityStyle.bg,
                  border: `1px solid ${isSelected ? rarityStyle.border : rarityStyle.border + '66'}`,
                  boxShadow: isSelected ? `inset 0 0 15px ${rarityStyle.shadow}, 0 0 10px ${rarityStyle.shadow}` : 'none',
                } : {}}
              >
                {item && (
                  <>
                    {/* 這裡未來可以放真實的道具 SVG 圖示，目前先用首字代替 */}
                    <span className="text-[clamp(14px,4cqw,20px)] font-bold drop-shadow-md" style={{ color: rarityStyle.border }}>
                      {item.name.charAt(0)}
                    </span>
                    
                    {/* 數量標籤 */}
                    {item.count > 1 && (
                      <div className="absolute bottom-0.5 right-1 text-[9px] font-mono text-white/90 drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
                        x{item.count}
                      </div>
                    )}

                    {/* 選取狀態的光暈遮罩 */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none"></div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================
          3. 操作按鈕區 (丟棄 / 合成)
          ========================================= */}
      <div className="px-[5cqw] flex gap-[4cqw] mb-[6cqw] shrink-0 max-w-[500px] mx-auto w-full">
        <button
          onClick={() => handleAction('丟棄')}
          disabled={!selectedItem}
          className={`flex-1 py-3 rounded-full text-[clamp(16px,4.5cqw,20px)] tracking-[0.5em] transition-all duration-300 border backdrop-blur-sm
            ${selectedItem 
              ? 'border-[#FF3B30] text-[#FF3B30] bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 shadow-[0_0_15px_rgba(255,59,48,0.2)] active:scale-95' 
              : 'border-white/10 text-gray-600 bg-black/30 cursor-not-allowed'
            }
          `}
        >
          丟棄
        </button>
        <button
          onClick={() => handleAction('合成')}
          disabled={!selectedItem}
          className={`flex-1 py-3 rounded-full text-[clamp(16px,4.5cqw,20px)] tracking-[0.5em] transition-all duration-300 border backdrop-blur-sm
            ${selectedItem 
              ? 'border-[#00E5FF] text-[#00E5FF] bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 shadow-[0_0_15px_rgba(0,229,255,0.2)] active:scale-95' 
              : 'border-white/10 text-gray-600 bg-black/30 cursor-not-allowed'
            }
          `}
        >
          合成
        </button>
      </div>

      {/* =========================================
          4. 生活職業造詣區 (向下滾動區域)
          ========================================= */}
      <div className="flex-grow px-[5cqw] pb-[calc(env(safe-area-inset-bottom,20px)+30cqw)] overflow-y-auto no-scrollbar mask-linear-fade-bottom">
        <div className="grid grid-cols-2 gap-[3cqw] max-w-[500px] mx-auto">
          {CRAFTING_SKILLS.map((skill) => {
            const percentage = Math.min(100, (skill.current / skill.max) * 100);
            return (
              <div 
                key={skill.id} 
                className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-[3cqw] flex flex-col justify-between hover:bg-black/60 transition-colors"
              >
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[clamp(14px,4cqw,16px)] tracking-widest text-gray-200">{skill.name}</span>
                  <span className="text-[10px] text-gray-400 font-mono tracking-wider">進度</span>
                </div>
                
                {/* 數字進度 */}
                <div className="text-center mb-2 font-mono text-[clamp(12px,3.5cqw,14px)]" style={{ color: skill.color }}>
                  {skill.current} <span className="text-gray-500">/ {skill.max}</span>
                </div>

                {/* 能量進度條 */}
                <div className="h-[6px] w-full bg-[#1C1F2A] rounded-full overflow-hidden border border-white/5 relative">
                  <div 
                    className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000"
                    style={{ 
                      width: `${percentage}%`, 
                      backgroundColor: skill.color,
                      boxShadow: `0 0 10px ${skill.color}` 
                    }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
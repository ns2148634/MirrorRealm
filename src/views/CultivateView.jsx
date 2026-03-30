// src/views/CultivateView.jsx
import React, { useState } from 'react';
import useGameStore from '../store/gameStore'; 

// 模擬玩家擁有的功法與法寶庫 
const MOCK_INVENTORY = {
  mainMethod: [
    { id: 'm1', name: '青木長春訣', desc: '【主功法】每回合恢復 5% 靈力', level: '第三層', color: '#32D74B' },
    { id: 'm2', name: '大日如來真解', desc: '【主功法】火/陽屬性法術威力提升 30%', level: '第一層', color: '#FF3B30' }
  ],
  subMethod: [
    { id: 's1', name: '游龍步', desc: '【副功法】增加 15% 閃避機率', level: '小成', color: '#00E5FF' },
    { id: 's2', name: '斂息術', desc: '【副功法】降低被高階妖獸發現機率', level: '大成', color: '#00E5FF' }
  ],
  talisman: [
    { id: 't1', name: '烈火符', cost: 2, desc: '爆發 150 點火屬性傷害', color: '#9B5CFF' },
    { id: 't2', name: '神行符', cost: 1, desc: '短暫提升極高閃避', color: '#9B5CFF' },
    { id: 't3', name: '金剛符', cost: 3, desc: '抵擋致命傷害', color: '#9B5CFF' }
  ],
  artifact: [
    { id: 'a1', name: '青木劍', cost: 10, drain: 20, desc: '消耗20靈力，造成80傷害', color: '#FFD700' },
    { id: 'a2', name: '玄鐵重印', cost: 15, drain: 40, desc: '造成180傷害，具備破甲', color: '#FFD700' },
    { id: 'a3', name: '引魂鈴', cost: 12, drain: 15, desc: '機率造成敵方神識混亂', color: '#FFD700' }
  ],
  formation: [
    { id: 'f1', name: '小聚靈陣', cost: 5, desc: '戰鬥中靈氣回覆速度+10%', color: '#32D74B' },
    { id: 'f2', name: '四象鎖妖陣', cost: 15, desc: '開場束縛敵方 1 回合', color: '#FFD700' }
  ],
  puppet: [
    { id: 'p1', name: '木牛流馬', cost: 5, desc: '增加背包負重', color: '#E2E8F0' },
    { id: 'p2', name: '機關銅人', cost: 12, desc: '代為承受 20% 物理傷害', color: '#FFD700' }
  ],
  pet: [
    { id: 'pet1', name: '尋寶鼠', cost: 8, desc: '探索時機緣發現率+15%', color: '#FF9500' }
  ]
};

export default function CultivateView() {
  const player = useGameStore((state) => state.player);
  const isMale = player?.gender !== 'female'; 
  const auraColor = isMale ? '#00E5FF' : '#9B5CFF'; 
  const meditatorImg = player?.gender === 'female' ? 'meditator_female.svg' : 'meditator_male.svg';

  // 空間穿梭狀態機
  const [viewState, setViewState] = useState('array'); 
  const [activeCategory, setActiveCategory] = useState(null); 

  // 裝備狀態
  const [methods, setMethods] = useState({ main: null, sub1: null, sub2: null });
  const [gear, setGear] = useState({
    talisman: {},    // { id: count } 多選與數量
    artifact: [],    // [item1, item2] 多選
    formation: null, // 單選
    puppet: null,    // 單選
    pet: null        // 單選
  });
  
  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // =========================================
  // 神識計算邏輯
  // =========================================
  const maxGodSense = 50; 
  let currentLoad = 0;
  Object.entries(gear.talisman).forEach(([id, count]) => {
    const item = MOCK_INVENTORY.talisman.find(t => t.id === id);
    if (item) currentLoad += item.cost * count;
  });
  gear.artifact.forEach(item => currentLoad += item.cost);
  if (gear.formation) currentLoad += gear.formation.cost;
  if (gear.puppet) currentLoad += gear.puppet.cost;
  if (gear.pet) currentLoad += gear.pet.cost;

  const isOverloaded = currentLoad > maxGodSense;

  // =========================================
  // 互動處理邏輯 
  // =========================================
  const handleOpenLibrary = (category) => {
    if (navigator.vibrate) navigator.vibrate([20, 30]);
    setActiveCategory(category);
    setViewState('entering-library');
    setTimeout(() => setViewState('selecting'), 400);
  };

  const handleReturnArray = () => {
    if (navigator.vibrate) navigator.vibrate(15);
    setViewState('exiting-library');
    setTimeout(() => {
      setViewState('array');
      setActiveCategory(null);
    }, 400);
  };

  // 處理單選裝備
  const handleEquipSingle = (item) => {
    if (navigator.vibrate) navigator.vibrate(15);
    setIsModified(true);
    if (['main', 'sub1', 'sub2'].includes(activeCategory)) {
      setMethods(prev => ({ ...prev, [activeCategory]: item }));
      handleReturnArray();
    } else {
      setGear(prev => ({ ...prev, [activeCategory]: item }));
      handleReturnArray();
    }
  };

  // 處理法器多選
  const toggleArtifact = (item) => {
    if (navigator.vibrate) navigator.vibrate(10);
    setIsModified(true);
    setGear(prev => {
      const exists = prev.artifact.find(a => a.id === item.id);
      if (exists) return { ...prev, artifact: prev.artifact.filter(a => a.id !== item.id) };
      return { ...prev, artifact: [...prev.artifact, item] };
    });
  };

  // 處理符籙數量增減
  const updateTalismanCount = (item, delta) => {
    if (navigator.vibrate) navigator.vibrate(5);
    setIsModified(true);
    setGear(prev => {
      const newCount = (prev.talisman[item.id] || 0) + delta;
      const newTalisman = { ...prev.talisman };
      if (newCount <= 0) delete newTalisman[item.id];
      else newTalisman[item.id] = newCount;
      return { ...prev, talisman: newTalisman };
    });
  };

  const handleSaveConfiguration = () => {
    if (isOverloaded) return alert("神識超載，無法銘記此法陣！");
    if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setIsModified(false);
    }, 800);
  };

  const getAvailableItems = () => {
    if (!activeCategory) return [];
    if (['main', 'sub1', 'sub2'].includes(activeCategory)) return MOCK_INVENTORY[activeCategory === 'main' ? 'mainMethod' : 'subMethod'];
    return MOCK_INVENTORY[activeCategory] || [];
  };

  const showArray = ['array', 'entering-library', 'exiting-library'].includes(viewState);
  const showLibrary = ['selecting', 'entering-library', 'exiting-library'].includes(viewState);

  return (
    <div className="h-full w-full relative flex flex-col bg-transparent overflow-hidden text-white font-serif z-10 pt-[5cqw]">
      
      {/* 🌟 空間穿梭與懸浮法則 */}
      <style>{`
        @keyframes gentle-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-float { animation: gentle-float 4s ease-in-out infinite; }
        
        @keyframes zoom-out-fade {
          from { transform: scale(1); opacity: 1; }
          to { transform: scale(1.5); opacity: 0; }
        }
        .animate-zoom-out-fade { animation: zoom-out-fade 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        @keyframes zoom-in-fade {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-zoom-in-fade { animation: zoom-in-fade 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        @keyframes shrink-out-fade {
          from { transform: scale(1); opacity: 1; }
          to { transform: scale(0.8); opacity: 0; }
        }
        .animate-shrink-out-fade { animation: shrink-out-fade 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        @keyframes shrink-in-fade {
          from { transform: scale(1.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-shrink-in-fade { animation: shrink-in-fade 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
      `}</style>

      {/* =========================================
          L1 視圖：識海大陣
          ========================================= */}
      {showArray && (
        <div 
          className={`absolute inset-0 flex flex-col z-20 
            ${viewState === 'array' ? 'opacity-100' : ''}
            ${viewState === 'entering-library' ? 'animate-zoom-out-fade pointer-events-none' : ''} 
            ${viewState === 'exiting-library' ? 'animate-shrink-in-fade pointer-events-none' : ''}
          `}
        >
          {/* 頂部操作 */}
          <div className="pt-[2cqw] px-[6cqw] shrink-0 flex justify-between items-center mb-[2cqw]">
            <h2 className="text-[clamp(20px,6cqw,28px)] tracking-[0.4em] drop-shadow-[0_0_8px_currentColor]" style={{ color: auraColor }}>
              造化識海
            </h2>
            <button 
              onClick={handleSaveConfiguration}
              disabled={!isModified || isSaving}
              className={`px-4 py-1.5 rounded-full text-[12px] tracking-[0.3em] transition-all duration-300 border ${
                isSaving ? 'bg-white/20 border-white/40 text-white animate-pulse' :
                isModified && !isOverloaded
                  ? `bg-[${auraColor}]/20 border-[${auraColor}] text-[${auraColor}] shadow-[0_0_15px_${auraColor}40] active:scale-95` 
                  : 'bg-black/50 border-white/10 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSaving ? '周天運轉...' : '銘記法陣'}
            </button>
          </div>

          <div className="flex-grow overflow-y-auto no-scrollbar flex flex-col px-[5cqw] pb-[calc(env(safe-area-inset-bottom,20px)+5cqw)]">
            
            {/* 🌟 1. 丹田氣旋 (人像與陣眼) */}
            <div className="relative w-full max-w-[280px] mx-auto aspect-[4/5] flex items-center justify-center mb-[6cqw] shrink-0">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                 <div className="w-[80%] h-[80%] rounded-full animate-pulse opacity-20 blur-[40px]" style={{ backgroundColor: auraColor }}></div>
              </div>
              <div className="absolute inset-0 border border-white/5 rounded-full animate-[spin_40s_linear_infinite] pointer-events-none flex items-center justify-center z-0">
                <div className="w-[90%] h-[90%] border-[0.5px] border-dashed border-white/20 rounded-full"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-60 pointer-events-none z-10 animate-float">
                <div className="w-[60%] h-[80%] relative mt-8">
                  <img src={`/images/status/${meditatorImg}`} alt="打坐虛影" className="w-full h-full object-contain" style={{ filter: `drop-shadow(0 0 10px ${auraColor})` }} />
                </div>
              </div>
              
              {/* 三大陣眼 */}
              <div className="absolute z-20 w-[35%] aspect-square bottom-[5%] left-1/2 -translate-x-1/2 animate-float" style={{ animationDelay: '0s' }}>
                <EnergyNode item={methods.main} title="主修 (丹田)" defaultColor="#FFD700" onClick={() => handleOpenLibrary('main')} onRemove={(e) => { e.stopPropagation(); handleEquipSingle(null); }} />
              </div>
              <div className="absolute z-20 w-[28%] aspect-square top-[20%] left-[-5%] animate-float" style={{ animationDelay: '1s' }}>
                <EnergyNode item={methods.sub1} title="副修 (左肩)" defaultColor="#00E5FF" onClick={() => handleOpenLibrary('sub1')} onRemove={(e) => { e.stopPropagation(); setActiveCategory('sub1'); handleEquipSingle(null); }} />
              </div>
              <div className="absolute z-20 w-[28%] aspect-square top-[20%] right-[-5%] animate-float" style={{ animationDelay: '2s' }}>
                <EnergyNode item={methods.sub2} title="副修 (右肩)" defaultColor="#00E5FF" onClick={() => handleOpenLibrary('sub2')} onRemove={(e) => { e.stopPropagation(); setActiveCategory('sub2'); handleEquipSingle(null); }} />
              </div>
            </div>

            {/* 🌟 2. 五道法寶懸浮區 (符、器、寵、陣、傀儡) */}
            <div className="flex flex-col gap-[8cqw] w-full max-w-[320px] mx-auto mb-auto shrink-0 z-10">
              
              {/* 第一排：符籙、法器 */}
              <div className="flex justify-around items-center px-[4cqw]">
                <FloatingIcon 
                  type="talisman" title="符籙" 
                  isActive={Object.keys(gear.talisman).length > 0} 
                  count={Object.values(gear.talisman).reduce((a,b)=>a+b,0)}
                  color={auraColor} delay="0s" 
                  onClick={() => handleOpenLibrary('talisman')} 
                />
                <FloatingIcon 
                  type="artifact" title="法器" 
                  isActive={gear.artifact.length > 0} 
                  count={gear.artifact.length}
                  color={auraColor} delay="1.5s" 
                  onClick={() => handleOpenLibrary('artifact')} 
                />
              </div>

              {/* 第二排：靈寵、陣法、傀儡 */}
              <div className="flex justify-between items-center px-[2cqw]">
                <FloatingIcon 
                  type="pet" title="靈寵" 
                  isActive={!!gear.pet} 
                  color={auraColor} delay="0.5s" 
                  onClick={() => handleOpenLibrary('pet')} 
                />
                <FloatingIcon 
                  type="formation" title="陣法" 
                  isActive={!!gear.formation} 
                  color={auraColor} delay="2s" 
                  onClick={() => handleOpenLibrary('formation')} 
                />
                <FloatingIcon 
                  type="puppet" title="傀儡" 
                  isActive={!!gear.puppet} 
                  color={auraColor} delay="1s" 
                  onClick={() => handleOpenLibrary('puppet')} 
                />
              </div>

            </div>

            {/* 🌟 3. 神識負載條 (壓在最底部) */}
            <div className="w-full max-w-[400px] mx-auto shrink-0 mt-[10cqw]">
              <div className="text-center text-[clamp(14px,4cqw,16px)] text-white tracking-[0.5em] drop-shadow-md mb-3">神識負載</div>
              <div className="flex justify-between items-end mb-1">
                <span className="text-[10px] text-[#FFD700] tracking-widest opacity-80">當前佔用</span>
                <span className={`font-mono text-[14px] ${isOverloaded ? 'text-[#FF3B30] animate-pulse drop-shadow-[0_0_5px_#FF3B30]' : 'text-[#FFD700]'}`}>
                  {currentLoad} / {maxGodSense}
                </span>
              </div>
              <div className="h-[4px] bg-black/60 rounded-full overflow-hidden border border-white/10">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${isOverloaded ? 'bg-[#FF3B30] shadow-[0_0_10px_#FF3B30]' : 'bg-[#FFD700] shadow-[0_0_8px_#FFD700]'}`}
                  style={{ width: `${Math.min(100, (currentLoad / maxGodSense) * 100)}%` }}
                ></div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* =========================================
          L2 視圖：藏經閣/萬寶閣 (挑選裝備)
          ========================================= */}
      {showLibrary && (
        <div 
          className={`absolute inset-0 flex flex-col z-30 bg-black/80 backdrop-blur-xl
            ${viewState === 'selecting' ? 'opacity-100' : ''}
            ${viewState === 'entering-library' ? 'animate-zoom-in-fade pointer-events-none' : ''}
            ${viewState === 'exiting-library' ? 'animate-shrink-out-fade pointer-events-none' : ''}
          `}
        >
          <div className="pt-[10cqw] px-[6cqw] shrink-0 flex flex-col mb-[4cqw]">
            <h3 className="text-[clamp(18px,5cqw,24px)] font-bold tracking-[0.4em] text-white mb-4 text-center">
              神識探查
            </h3>
          </div>

          <div className="flex-grow overflow-y-auto px-[6cqw] flex flex-col gap-[4cqw] no-scrollbar pb-[4cqw]">
            {getAvailableItems().length === 0 ? (
              <div className="text-center text-gray-500 py-20 tracking-widest text-[14px]">空間空無一物</div>
            ) : (
              getAvailableItems().map((item, i) => {
                const isTalisman = activeCategory === 'talisman';
                const isArtifact = activeCategory === 'artifact';
                const tCount = isTalisman ? (gear.talisman[item.id] || 0) : 0;
                const isEquippedArtifact = isArtifact && gear.artifact.find(a => a.id === item.id);
                // 判斷單選是否裝備
                let isSingleEquipped = false;
                if (!isTalisman && !isArtifact) {
                  if (['main', 'sub1', 'sub2'].includes(activeCategory)) isSingleEquipped = methods[activeCategory]?.id === item.id;
                  else isSingleEquipped = gear[activeCategory]?.id === item.id;
                }
                
                const isEquipped = isTalisman ? (tCount > 0) : (isArtifact ? isEquippedArtifact : isSingleEquipped);
                
                return (
                  <div 
                    key={item.id}
                    onClick={() => {
                      if (isTalisman) return; 
                      if (isArtifact) toggleArtifact(item);
                      else handleEquipSingle(isEquipped ? null : item); // 點擊已裝備的則卸下
                    }}
                    className={`relative flex flex-col p-[4cqw] rounded-xl border backdrop-blur-sm transition-all animate-float
                      ${isEquipped ? `bg-[${auraColor}]/10 border-[${auraColor}]/50 shadow-[0_0_15px_${auraColor}30]` : 'bg-[#1A1F2E]/80 border-white/10 hover:bg-white/5'}
                      ${!isTalisman && 'cursor-pointer active:scale-95'}
                    `}
                    style={{ animationDelay: `${(i * 0.1) % 1}s` }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[clamp(16px,4.5cqw,20px)] tracking-widest font-bold" style={{ color: item.color || '#fff' }}>
                        {item.name}
                      </span>
                      <div className="flex gap-2 items-center">
                        {item.cost > 0 && <span className="text-[10px] text-[#FFD700] font-mono bg-[#FFD700]/10 px-1.5 py-0.5 rounded border border-[#FFD700]/20">負載 {item.cost}</span>}
                        
                        {/* 符籙數量增減 */}
                        {isTalisman && (
                          <div className="flex items-center gap-3 bg-black/60 rounded-lg px-2 py-1 border border-white/10 ml-2">
                            <button onClick={(e) => { e.stopPropagation(); updateTalismanCount(item, -1); }} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white bg-white/5 rounded">-</button>
                            <span className={`font-mono text-[14px] w-4 text-center ${tCount > 0 ? `text-[${auraColor}]` : 'text-gray-500'}`}>{tCount}</span>
                            <button onClick={(e) => { e.stopPropagation(); updateTalismanCount(item, 1); }} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white bg-white/5 rounded">+</button>
                          </div>
                        )}

                        {/* 裝備標籤 */}
                        {!isTalisman && isEquipped && (
                          <span className="text-sm ml-2 font-bold" style={{ color: auraColor }}>已刻印</span>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-[clamp(12px,3.5cqw,14px)] text-gray-400 leading-relaxed tracking-wider bg-black/30 p-2 rounded-lg border border-white/5">
                      {item.desc}
                    </p>
                  </div>
                )
              })
            )}
          </div>

          <div className="w-full shrink-0 bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col pt-[8cqw]">
            <div className="px-[6cqw] pb-[6cqw] flex justify-between items-center w-full max-w-[500px] mx-auto">
              <button 
                onClick={handleReturnArray}
                className="text-gray-400 hover:text-white tracking-widest text-[clamp(14px,4cqw,16px)] flex items-center gap-2 border border-white/10 bg-black/40 px-4 py-1.5 rounded-full active:scale-95 transition-all"
              >
                <span className="text-lg leading-none mt-[-2px]">‹</span> 收回神識
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// =========================================
// 共用元件：浮動法寶圖騰 (根據截圖手繪 SVG)
// ==========================================
function FloatingIcon({ type, title, isActive, count, color, delay, onClick }) {
  // 動態調整外觀
  const renderIcon = () => {
    const iconClass = `w-full h-full transition-all duration-500 ${isActive ? 'drop-shadow-[0_0_10px_currentColor]' : 'opacity-40'}`;
    const fill = "currentColor";

    switch(type) {
      case 'talisman': // 符籙 (兩張符紙交疊)
        return (
          <svg viewBox="0 0 24 24" className={iconClass} style={{ color }}>
            <path d="M6 8L16 5.5L18.5 16.5L8.5 19Z" fill="none" stroke={fill} strokeWidth="1.5" />
            <path d="M4 11L14 9.5L15.5 18.5L5.5 20Z" fill={fill} opacity="0.8" />
          </svg>
        );
      case 'artifact': // 法器 (一柄飛劍)
        return (
          <svg viewBox="0 0 24 24" className={iconClass} style={{ color, transform: 'rotate(45deg)' }}>
            <path d="M11 2L13 2L13 14L11 14Z" fill={fill} />
            <path d="M8 14L16 14L16 16L8 16Z" fill={fill} />
            <path d="M11 16L13 16L13 22L11 22Z" fill={fill} />
            <circle cx="12" cy="15" r="1.5" fill="#1A1F2E" />
          </svg>
        );
      case 'pet': // 靈寵 (獸印/爪印)
        return (
          <svg viewBox="0 0 24 24" className={iconClass} style={{ color }}>
            <circle cx="12" cy="15" r="4.5" fill={fill} />
            <circle cx="6.5" cy="10" r="2.5" fill={fill} />
            <circle cx="12" cy="6" r="3" fill={fill} />
            <circle cx="17.5" cy="10" r="2.5" fill={fill} />
          </svg>
        );
      case 'formation': // 陣法 (陣旗)
        return (
          <svg viewBox="0 0 24 24" className={iconClass} style={{ color }}>
            <path d="M7 2L7 22" stroke={fill} strokeWidth="2" strokeLinecap="round"/>
            <path d="M7 4L19 7L13 10L19 13L7 16" fill={fill} opacity="0.9" />
          </svg>
        );
      case 'puppet': // 傀儡 (機關人)
        return (
          <svg viewBox="0 0 24 24" className={iconClass} style={{ color }}>
            <rect x="10" y="3" width="4" height="4" rx="1" fill={fill} />
            <path d="M7 9H17V14H15V21H13V15H11V21H9V14H7V9Z" fill={fill} />
            <path d="M5 9H7V13H5V9Z" fill={fill} />
            <path d="M17 9H19V13H17V9Z" fill={fill} />
          </svg>
        );
      default: return null;
    }
  };

  return (
    <div 
      onClick={onClick}
      className="relative flex flex-col items-center justify-center cursor-pointer group animate-float"
      style={{ animationDelay: delay }}
    >
      <div className="w-[12cqw] h-[12cqw] flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-active:scale-95">
        {renderIcon()}
      </div>
      
      {/* 裝備數量或亮點指示器 */}
      {isActive && (
        <div className="absolute -top-1 -right-2 bg-black/80 px-1.5 py-0.5 rounded-md border border-white/20 shadow-[0_0_5px_rgba(0,0,0,0.8)]">
          <span className="text-[10px] font-mono font-bold" style={{ color }}>{count > 0 ? `x${count}` : '✓'}</span>
        </div>
      )}
    </div>
  );
}

// =========================================
// 共用元件：陣眼節點 (保持不變)
// ==========================================
function EnergyNode({ item, title, defaultColor, onClick, onRemove }) {
  const isFilled = !!item;
  const color = isFilled ? (item.color || defaultColor) : 'rgba(255,255,255,0.2)';

  return (
    <div className="relative w-full h-full group" onClick={onClick}>
      <div 
        className={`w-full h-full rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-500
          ${isFilled ? 'bg-black/60 backdrop-blur-sm' : 'bg-black/20 border border-dashed hover:bg-white/5'}
        `}
        style={isFilled ? { border: `2px solid ${color}`, boxShadow: `inset 0 0 20px ${color}40, 0 0 30px ${color}60` } : { borderColor: color }}
      >
        {isFilled ? (
          <>
            <span className="text-[clamp(24px,7cqw,32px)] font-bold drop-shadow-[0_0_8px_currentColor]" style={{ color }}>{item.name.charAt(0)}</span>
            <span className="absolute -bottom-6 text-[10px] text-gray-400 tracking-widest whitespace-nowrap drop-shadow-md">{item.name}</span>
          </>
        ) : (
          <>
            <span className="text-2xl font-thin text-white/40 mb-1">+</span>
            <span className="text-[9px] text-gray-500 tracking-widest drop-shadow-md">{title}</span>
          </>
        )}
      </div>

      {isFilled && onRemove && (
        <button 
          onClick={onRemove}
          className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-black/80 border border-[#FF3B30] text-[#FF3B30] text-[12px] flex items-center justify-center hover:bg-[#FF3B30] hover:text-white transition-colors z-10"
        >×</button>
      )}
    </div>
  );
}
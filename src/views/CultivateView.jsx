// src/views/CultivateView.jsx
import React, { useState, useEffect } from 'react';
import useGameStore from '../store/gameStore';

// 品階對應顏色
const RARITY_COLOR_MAP = {
  white:  '#FFFFFF',
  green:  '#32D74B',
  blue:   '#00E5FF',
  purple: '#9B5CFF',
  gold:   '#FFD700',
  red:    '#FF3B30',
};

// 將背包 API 回傳資料轉為修煉頁所需格式
function transformCultivateInventory(apiItems) {
  const result = { mainMethod: [], subMethod: [], artifact: [], talisman: [], formation: [], puppet: [], pet: [] };
  for (const item of apiItems) {
    const base = {
      id:    String(item.item_id),
      name:  item.name,
      desc:  item.description ?? '',
      color: RARITY_COLOR_MAP[item.rarity] ?? '#FFFFFF',
      cost:  item.effect_value ?? 0,
    };
    switch (item.item_type) {
      case '主功法': result.mainMethod.push(base); break;
      case '副功法': result.subMethod.push(base); break;
      case '功法':   result.subMethod.push(base); break;
      case '法器':   result.artifact.push({ ...base, drain: item.effect_value ?? 0 }); break;
      case '符籙':   result.talisman.push(base); break;
      case '陣法':   result.formation.push(base); break;
      case '傀儡':   result.puppet.push(base); break;
      case '靈獸':   result.pet.push(base); break;
      default: break;
    }
  }
  return result;
}

const EMPTY_CULTIVATE_INVENTORY = { mainMethod: [], subMethod: [], artifact: [], talisman: [], formation: [], puppet: [], pet: [] };

// 初始空裝備配置
const initialLoadout = {
  methods: { main: null, sub1: null, sub2: null },
  gear: { talisman: {}, artifact: [], formation: null, puppet: null, pet: null }
};

export default function CultivateView() {
  const player        = useGameStore((state) => state.player);
  const triggerCombat = useGameStore((state) => state.triggerCombat);
  const isMale = player?.gender !== 'female';
  const auraColor = isMale ? '#00E5FF' : '#9B5CFF';
  const meditatorImg = player?.gender === 'female' ? 'meditator_female.svg' : 'meditator_male.svg';

  const [inventory, setInventory] = useState(EMPTY_CULTIVATE_INVENTORY);

  useEffect(() => {
    if (!player?.id) return;
    fetch(`/api/player/backpack/${player.id}`)
      .then(r => r.json())
      .then(json => { if (json.status === 'success') setInventory(transformCultivateInventory(json.data)); })
      .catch(err => console.error('修煉庫載入失敗:', err));
  }, [player?.id]);

  // 空間穿梭狀態機: overview (L1), layout-detail (L2), selecting (L3)
  const [viewState, setViewState] = useState('overview'); 
  const [activeCategory, setActiveCategory] = useState(null); 
  const [isBrowsing, setIsBrowsing] = useState(false); // 標記是否為純瀏覽模式

  // 🌟 三重部局資料庫
  const [loadouts, setLoadouts] = useState([
    JSON.parse(JSON.stringify(initialLoadout)),
    JSON.parse(JSON.stringify(initialLoadout)),
    JSON.parse(JSON.stringify(initialLoadout))
  ]);
  const [currentLayoutIdx, setCurrentLayoutIdx] = useState(0);

  // 當前編輯中的裝備狀態 (L2)
  const [methods, setMethods] = useState(initialLoadout.methods);
  const [gear, setGear] = useState(initialLoadout.gear);
  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 神識計算邏輯
  const maxGodSense = 50;
  let currentLoad = 0;
  Object.entries(gear.talisman).forEach(([id, count]) => {
    const item = inventory.talisman.find(t => t.id === id);
    if (item) currentLoad += (item.cost ?? 0) * count;
  });
  gear.artifact.forEach(item => currentLoad += item.cost);
  if (gear.formation) currentLoad += gear.formation.cost;
  if (gear.puppet) currentLoad += gear.puppet.cost;
  if (gear.pet) currentLoad += gear.pet.cost;
  const isOverloaded = currentLoad > maxGodSense;

  // =========================================
  // 互動處理邏輯 
  // =========================================
  
  // 進入 L2 (配置特定部局)
  const handleEnterLayout = (idx) => {
    if (navigator.vibrate) navigator.vibrate([20, 30]);
    setCurrentLayoutIdx(idx);
    setMethods(loadouts[idx].methods);
    setGear(loadouts[idx].gear);
    setIsModified(false);
    setViewState('entering-layout');
    setTimeout(() => setViewState('layout-detail'), 400);
  };

  // 返回 L1 (總覽)
  const handleReturnOverview = () => {
    if (navigator.vibrate) navigator.vibrate(15);
    setViewState('exiting-layout');
    setTimeout(() => setViewState('overview'), 400);
  };

  // 進入 L3 (瀏覽模式 - 從 L1 觸發)
  const handleBrowseLibrary = (category) => {
    if (navigator.vibrate) navigator.vibrate(15);
    setIsBrowsing(true);
    setActiveCategory(category);
    setViewState('entering-library');
    setTimeout(() => setViewState('selecting'), 400);
  };

  // 進入 L3 (裝備模式 - 從 L2 觸發)
  const handleEquipLibrary = (category) => {
    if (navigator.vibrate) navigator.vibrate(15);
    setIsBrowsing(false);
    setActiveCategory(category);
    setViewState('entering-library');
    setTimeout(() => setViewState('selecting'), 400);
  };

  // 從 L3 返回
  const handleReturnLibrary = () => {
    if (navigator.vibrate) navigator.vibrate(15);
    setViewState('exiting-library');
    setTimeout(() => setViewState(isBrowsing ? 'overview' : 'layout-detail'), 400);
  };

  // 裝備操作邏輯 (僅在 isBrowsing === false 時觸發)
  const handleEquipSingle = (item) => {
    if (isBrowsing) return;
    if (navigator.vibrate) navigator.vibrate(15);
    setIsModified(true);
    if (['main', 'sub1', 'sub2'].includes(activeCategory)) {
      setMethods(prev => ({ ...prev, [activeCategory]: item }));
      handleReturnLibrary();
    } else {
      setGear(prev => ({ ...prev, [activeCategory]: item }));
      handleReturnLibrary();
    }
  };

  const toggleArtifact = (item) => {
    if (isBrowsing) return;
    if (navigator.vibrate) navigator.vibrate(10);
    setIsModified(true);
    setGear(prev => {
      const exists = prev.artifact.find(a => a.id === item.id);
      if (exists) return { ...prev, artifact: prev.artifact.filter(a => a.id !== item.id) };
      return { ...prev, artifact: [...prev.artifact, item] };
    });
  };

  const updateTalismanCount = (item, delta) => {
    if (isBrowsing) return;
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
      const newLoadouts = [...loadouts];
      newLoadouts[currentLayoutIdx] = { methods, gear };
      setLoadouts(newLoadouts);
      setIsSaving(false);
      setIsModified(false);
    }, 800);
  };

  const getAvailableItems = () => {
    if (!activeCategory) return [];
    if (activeCategory === 'main') return inventory.mainMethod;
    if (['sub', 'sub1', 'sub2'].includes(activeCategory)) return inventory.subMethod;
    return inventory[activeCategory] ?? [];
  };

  // 🌟 動畫判斷法訣
  const getL1AnimationClass = () => {
    if (viewState === 'overview') return 'opacity-100';
    if (viewState === 'entering-layout' || (isBrowsing && viewState === 'entering-library')) return 'animate-zoom-out-fade pointer-events-none';
    if (viewState === 'exiting-layout' || (isBrowsing && viewState === 'exiting-library')) return 'animate-shrink-in-fade pointer-events-none';
    return 'opacity-0 pointer-events-none hidden';
  };

  const getL2AnimationClass = () => {
    if (viewState === 'layout-detail') return 'opacity-100';
    if (viewState === 'entering-layout') return 'animate-zoom-in-fade pointer-events-none';
    if (viewState === 'exiting-layout') return 'animate-shrink-out-fade pointer-events-none';
    if (!isBrowsing && viewState === 'entering-library') return 'animate-zoom-out-fade pointer-events-none';
    if (!isBrowsing && viewState === 'exiting-library') return 'animate-shrink-in-fade pointer-events-none';
    return 'opacity-0 pointer-events-none hidden';
  };

  const showL3 = ['selecting', 'entering-library', 'exiting-library'].includes(viewState);

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

      {/* 🌟 L2 懸浮按鈕：純絕對定位，L1 時不佔任何排版空間 */}
      <div className={`absolute top-[4vh] left-0 right-0 flex justify-between items-center px-[8cqw] transition-all duration-300 z-50 ${getL2AnimationClass()}`}>
        <button onClick={handleReturnOverview} className="flex items-center gap-2 border border-white/10 bg-black/40 px-4 py-1.5 rounded-full text-gray-400 hover:text-white tracking-widest text-[clamp(13px,3.8cqw,15px)] active:scale-95 transition-all">
          <span className="text-lg leading-none mt-[-2px]">‹</span> 收回神識
        </button>
        <button
          onClick={handleSaveConfiguration} disabled={!isModified || isSaving}
          className={`px-4 py-1.5 rounded-full text-[12px] tracking-[0.3em] transition-all duration-300 border ${
            isSaving ? 'bg-white/20 border-white/40 text-white animate-pulse' :
            isModified && !isOverloaded ? `bg-[${auraColor}]/20 border-[${auraColor}] text-[${auraColor}] shadow-[0_0_15px_${auraColor}40] active:scale-95`
              : 'bg-black/50 border-white/10 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isSaving ? '周天運轉...' : '銘記法陣'}
        </button>
      </div>

      <div className="flex-1 flex flex-col px-[5cqw] pb-[calc(env(safe-area-inset-bottom,20px)+2vh)] overflow-hidden">
        
        {/* =========================================
            🌟 丹田氣旋 (人像固定不動，只有法陣淡入淡出)
            ========================================= */}
        <div className="relative w-full max-w-[260px] mx-auto aspect-[4/5] max-h-[42vh] flex items-center justify-center shrink mb-[2vh]">
          {/* 打坐人像背景 (永遠顯示，不參與動畫) */}
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
          
          {/* L1 陣法 (部局壹、貳、參) */}
          <div className={`absolute inset-0 z-20 ${getL1AnimationClass()}`}>
            <div className="absolute w-[35%] aspect-square bottom-[5%] left-1/2 -translate-x-1/2 animate-float" style={{ animationDelay: '0s' }}>
              <LayoutNode label="壹" color="#FFD700" onClick={() => handleEnterLayout(0)} />
            </div>
            <div className="absolute w-[28%] aspect-square top-[20%] left-[-5%] animate-float" style={{ animationDelay: '1s' }}>
              <LayoutNode label="貳" color="#00E5FF" onClick={() => handleEnterLayout(1)} />
            </div>
            <div className="absolute w-[28%] aspect-square top-[20%] right-[-5%] animate-float" style={{ animationDelay: '2s' }}>
              <LayoutNode label="參" color="#00E5FF" onClick={() => handleEnterLayout(2)} />
            </div>
          </div>

          {/* L2 陣法 (主修、副修) */}
          <div className={`absolute inset-0 z-20 ${getL2AnimationClass()}`}>
            <div className="absolute w-[35%] aspect-square bottom-[5%] left-1/2 -translate-x-1/2 animate-float" style={{ animationDelay: '0s' }}>
              <EnergyNode item={methods.main} title="主修 (丹田)" defaultColor="#FFD700" onClick={() => handleEquipLibrary('main')} onRemove={(e) => { e.stopPropagation(); handleEquipSingle(null); }} />
            </div>
            <div className="absolute w-[28%] aspect-square top-[20%] left-[-5%] animate-float" style={{ animationDelay: '1s' }}>
              <EnergyNode item={methods.sub1} title="副修 (左肩)" defaultColor="#00E5FF" onClick={() => handleEquipLibrary('sub1')} onRemove={(e) => { e.stopPropagation(); setActiveCategory('sub1'); handleEquipSingle(null); }} />
            </div>
            <div className="absolute w-[28%] aspect-square top-[20%] right-[-5%] animate-float" style={{ animationDelay: '2s' }}>
              <EnergyNode item={methods.sub2} title="副修 (右肩)" defaultColor="#00E5FF" onClick={() => handleEquipLibrary('sub2')} onRemove={(e) => { e.stopPropagation(); setActiveCategory('sub2'); handleEquipSingle(null); }} />
            </div>
          </div>
        </div>

        {/* =========================================
            🌟 底部法寶區 (Absolute 切換)
            ========================================= */}
        <div className="flex-1 relative w-full max-w-[320px] mx-auto">
          
          {/* L1 底部：主副功法與陣法 (純瀏覽) */}
         {/* L1 底部：主副功法與陣法 (純瀏覽) */}
<div className={`absolute inset-0 flex flex-col ${getL1AnimationClass()}`}>
  {/* 🌟 改為相對空間，讓圖騰在內部自由散落 */}
  <div className="relative w-full flex-grow mt-[2vh]">
    
    {/* 主功法 (左上方，最大) */}
    <div className="absolute top-[10%] left-[20%] scale-[2] z-10">
      <FloatingIcon type="main" isActive={true} hideCount={true} color={auraColor} delay="0s" onClick={() => handleBrowseLibrary('main')} />
    </div>

    {/* 副功法 (右方偏中，次大) */}
    <div className="absolute top-[25%] right-[18%] scale-[2] z-10">
      <FloatingIcon type="sub" isActive={true} hideCount={true} color={auraColor} delay="0.8s" onClick={() => handleBrowseLibrary('sub')} />
    </div>

    {/* 陣法 (左方偏下，次大) */}
    <div className="absolute bottom-[15%] left-[45%] -translate-x-1/2 scale-[2] z-10">
      <FloatingIcon type="formation" isActive={true} hideCount={true} color={auraColor} delay="1.5s" onClick={() => handleBrowseLibrary('formation')} />
    </div>

  </div>
{/* 🌟 新增：與 BagView 一致的底部神識提示 */}
            <div 
              className="absolute bottom-[calc(env(safe-area-inset-bottom,20px)+2cqw)] w-full text-center tracking-[0.5em] text-[12px] opacity-40 pointer-events-none"
              style={{ color: auraColor }}
            >
              推演萬法以禦敵
            </div>
  
</div>

          {/* L2 底部：五大法寶與神識條 (裝備模式) */}
          <div className={`absolute inset-0 flex flex-col ${getL2AnimationClass()}`}>
            <div className="flex flex-col gap-[2vh] w-full shrink-0 z-10 mt-[1vh]">
              <div className="flex justify-around items-center px-[4cqw]">
                <FloatingIcon type="talisman" title="符籙" isActive={Object.keys(gear.talisman).length > 0} count={Object.values(gear.talisman).reduce((a,b)=>a+b,0)} color={auraColor} delay="0s" onClick={() => handleEquipLibrary('talisman')} />
                <FloatingIcon type="artifact" title="法器" isActive={gear.artifact.length > 0} count={gear.artifact.length} color={auraColor} delay="1.5s" onClick={() => handleEquipLibrary('artifact')} />
              </div>
              <div className="flex justify-between items-center px-[2cqw]">
                <FloatingIcon type="pet" title="靈寵" isActive={!!gear.pet} color={auraColor} delay="0.5s" onClick={() => handleEquipLibrary('pet')} />
                <FloatingIcon type="formation" title="陣法" isActive={!!gear.formation} color={auraColor} delay="2s" onClick={() => handleEquipLibrary('formation')} />
                <FloatingIcon type="puppet" title="傀儡" isActive={!!gear.puppet} color={auraColor} delay="1s" onClick={() => handleEquipLibrary('puppet')} />
              </div>
            </div>

            {/* 神識負載條 */}
            <div className="w-full shrink-0 mt-auto pt-[2vh] pb-[2vh]">
              <div className="text-center text-[clamp(14px,4cqw,16px)] text-white tracking-[0.5em] drop-shadow-md mb-2">神識負載</div>
              <div className="flex justify-between items-end mb-1">
                <span className="text-[10px] text-[#FFD700] tracking-widest opacity-80">當前佔用</span>
                <span className={`font-mono text-[14px] ${isOverloaded ? 'text-[#FF3B30] animate-pulse drop-shadow-[0_0_5px_#FF3B30]' : 'text-[#FFD700]'}`}>
                  {currentLoad} / {maxGodSense}
                </span>
              </div>
              <div className="h-[4px] bg-black/60 rounded-full overflow-hidden border border-white/10">
                <div className={`h-full rounded-full transition-all duration-500 ${isOverloaded ? 'bg-[#FF3B30] shadow-[0_0_10px_#FF3B30]' : 'bg-[#FFD700] shadow-[0_0_8px_#FFD700]'}`} style={{ width: `${Math.min(100, (currentLoad / maxGodSense) * 100)}%` }}></div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* =========================================
          L3 視圖：藏經閣/萬寶閣 (清單列表)
          ========================================= */}
      {showL3 && (
        <div className={`absolute inset-0 flex flex-col z-50 bg-black/80 backdrop-blur-xl
          ${viewState === 'selecting' ? 'opacity-100' : ''}
          ${viewState === 'entering-library' ? 'animate-zoom-in-fade pointer-events-none' : ''}
          ${viewState === 'exiting-library' ? 'animate-shrink-out-fade pointer-events-none' : ''}
        `}>
          <div className="pt-[10cqw] px-[6cqw] shrink-0 flex flex-col mb-[4cqw]">
            <h3 className="text-[clamp(18px,5cqw,24px)] font-bold tracking-[0.4em] text-white mb-4 text-center">
              {isBrowsing ? '藏經閣' : '神識探查'}
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
                      if (isBrowsing) return; // 瀏覽模式不可裝備
                      if (isTalisman) return; 
                      if (isArtifact) toggleArtifact(item);
                      else handleEquipSingle(isEquipped ? null : item); 
                    }}
                    className={`relative flex flex-col p-[4cqw] rounded-xl border backdrop-blur-sm transition-all animate-float
                      ${isEquipped && !isBrowsing ? `bg-[${auraColor}]/10 border-[${auraColor}]/50 shadow-[0_0_15px_${auraColor}30]` : 'bg-[#1A1F2E]/80 border-white/10 hover:bg-white/5'}
                      ${(!isBrowsing && !isTalisman) ? 'cursor-pointer active:scale-95' : ''}
                    `}
                    style={{ animationDelay: `${(i * 0.1) % 1}s` }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[clamp(16px,4.5cqw,20px)] tracking-widest font-bold" style={{ color: item.color || '#fff' }}>
                        {item.name}
                      </span>
                      <div className="flex gap-2 items-center">
                        {item.cost > 0 && <span className="text-[10px] text-[#FFD700] font-mono bg-[#FFD700]/10 px-1.5 py-0.5 rounded border border-[#FFD700]/20">負載 {item.cost}</span>}
                        
                        {!isBrowsing && isTalisman && (
                          <div className="flex items-center gap-3 bg-black/60 rounded-lg px-2 py-1 border border-white/10 ml-2">
                            <button onClick={(e) => { e.stopPropagation(); updateTalismanCount(item, -1); }} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white bg-white/5 rounded">-</button>
                            <span className={`font-mono text-[14px] w-4 text-center ${tCount > 0 ? `text-[${auraColor}]` : 'text-gray-500'}`}>{tCount}</span>
                            <button onClick={(e) => { e.stopPropagation(); updateTalismanCount(item, 1); }} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white bg-white/5 rounded">+</button>
                          </div>
                        )}
                        {!isBrowsing && !isTalisman && isEquipped && (
                          <span className="text-sm ml-2 font-bold" style={{ color: auraColor }}>已刻印</span>
                        )}
                      </div>
                    </div>
                    <p className="text-[clamp(12px,3.5cqw,14px)] text-gray-400 leading-relaxed tracking-wider bg-black/30 p-2 rounded-lg border border-white/5">
                      {item.desc}
                    </p>

                    {/* 法器專屬：演武練功入口 */}
                    {isArtifact && !isBrowsing && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerCombat({
                            source:   'training',
                            nodeName: `演武幻影・${item.name}`,
                            // 演武幻影：以法器數值生成對應強度的假想敵
                            enemyOverride: {
                              name:        `演武幻影・${item.name}`,
                              hp:          Math.max(30, (item.cost ?? 5) * 8),
                              attack:      Math.max(8,  (item.cost ?? 5) * 2),
                              defense:     Math.max(3,  (item.cost ?? 5)),
                              mind:        0,
                              realm_level: player?.realm_level ?? 1,
                              element:     null,
                              skills:      null, // 使用預設技能池
                              exp_reward:  Math.max(5, (item.cost ?? 5) * 3),
                              drop_item_name: null,
                              drop_rate:   0,
                            },
                          });
                        }}
                        className="mt-2 w-full py-1.5 rounded-lg border border-[#9B5CFF]/40 bg-[#9B5CFF]/10 text-[#9B5CFF] text-[11px] tracking-[0.4em] hover:bg-[#9B5CFF]/20 active:scale-95 transition-all"
                      >
                        演武練功
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>

          <div className="w-full shrink-0 bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col pt-[8cqw]">
            <div className="px-[6cqw] pb-[6cqw] flex justify-between items-center w-full max-w-[500px] mx-auto">
              <button 
                onClick={handleReturnLibrary}
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
// 共用元件：新版部局節點 (純文字)
// ==========================================
function LayoutNode({ label, title, color, onClick }) {
  return (
    <div className="relative w-full h-full group" onClick={onClick}>
      <div
        className="w-full h-full rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-500 bg-black/40 backdrop-blur-sm border border-white/10 hover:bg-white/5"
        style={{ boxShadow: `0 0 20px ${color}30, inset 0 0 15px ${color}20` }}
      >
        <span className="text-[clamp(20px,6cqw,28px)] font-bold drop-shadow-[0_0_8px_currentColor]" style={{ color }}>{label}</span>
        <span className="absolute -bottom-6 text-[10px] text-gray-400 tracking-widest whitespace-nowrap drop-shadow-md">{title}</span>
      </div>
    </div>
  );
}

// =========================================
// 共用元件：浮動法寶圖騰
// ==========================================
function FloatingIcon({ type, title, isActive, hideCount, count, color, delay, onClick }) {
  const imgSrc = `/images/icons/icon_${type}.svg`; 
  
  return (
    <div 
      onClick={onClick}
      className="relative flex flex-col items-center justify-center cursor-pointer group animate-float"
      style={{ animationDelay: delay }}
    >
      <div 
        className={`w-[10cqw] h-[10cqw] flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-active:scale-95
          ${isActive ? 'opacity-100' : 'opacity-30'}
        `}
      >
        <img 
          src={imgSrc} 
          alt={title}
          className="w-full h-full object-contain"
          style={{ filter: isActive ? `drop-shadow(0 0 10px ${color})` : 'none' }}
        />
      </div>
      
      {!hideCount && isActive && (
        <div className="absolute -top-1 -right-2 bg-black/80 px-1.5 py-0.5 rounded-md border border-white/20 shadow-[0_0_5px_rgba(0,0,0,0.8)]">
          <span className="text-[10px] font-mono font-bold" style={{ color }}>
            {count > 0 ? `x${count}` : '✓'}
          </span>
        </div>
      )}

      {/* 瀏覽模式下，顯示文字標籤 */}
      {hideCount && (
        <span className="absolute -bottom-5 text-[10px] text-gray-400 tracking-widest">{title}</span>
      )}
    </div>
  );
}

// =========================================
// 共用元件：陣眼節點 (L2)
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
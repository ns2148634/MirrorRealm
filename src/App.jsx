import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Coins, Clock, Sparkles, ScrollText, Compass, 
  Package, BookOpen, Store, MapPin, ChevronRight, Download, X, Info, Map
} from 'lucide-react';

// --- 核心邏輯導入 ---
import { calculateAge, getStaminaRecoveryRate } from './logic/timeAndStamina';
import { calculateInheritance } from './logic/inheritance';
import { calculateSpiritRoot } from './logic/spiritRoot';

// 案几上的物件 - 無限循環
const DESK_ITEMS = [
  { id: 'map', label: '地圖', icon: <Map />, asset: 'grid_compass.png', color: 'from-cyan-600' },
  { id: 'scroll', label: '卷軸', icon: <ScrollText />, asset: 'grid_log.png', color: 'from-blue-600' },
  { id: 'cultivate', label: '修煉', icon: <Sparkles />, asset: 'grid_manual.png', color: 'from-emerald-600' },
  { id: 'market', label: '市場', icon: <Store />, asset: 'grid_market.png', color: 'from-amber-600' },
  { id: 'bag', label: '行囊', icon: <Package />, asset: 'grid_bag.png', color: 'from-stone-600' },
];

function App() {
  // --- 1. 系統狀態 ---
  const [activeIdx, setActiveIdx] = useState(1);
  const [timeProgress, setTimeProgress] = useState(0);
  const [view, setView] = useState('room');
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(480);
  
  // 自動滾動計時器
  const autoScrollRef = useRef(null);

  // --- 2. 玩家屬性狀態 ---
  const [stats, setStats] = useState({
    name: '創辦人',
    daysPassed: 0,
    age: 24,
    ageDaysRemaining: 26,
    physique: 20.5,
    qi: 0,
    stamina: 80,
    danDou: 0,
    money: 100,
    inventory: { rice: 5 },
    affinities: { GOLD: 20, WOOD: 10, WATER: 10, FIRE: 10, EARTH: 10 }
  });

  // --- 3. 核心計算 ---
  const currentAge = useMemo(() => stats.age + (stats.ageDaysRemaining / 365), [stats.age, stats.ageDaysRemaining]);
  const recoveryRate = useMemo(() => getStaminaRecoveryRate(currentAge), [currentAge]);
  const spiritResult = useMemo(() => calculateSpiritRoot(stats.affinities), [stats.affinities]);
  const nextGenBonus = useMemo(() => Math.floor(stats.money / 3000), [stats.money]);

  // 計算日夜漸變值
  const dayPhase = useMemo(() => {
    return Math.sin(timeProgress * Math.PI);
  }, [timeProgress]);

  // 中間內容
  const [centerContent, setCenterContent] = useState('');

  // 更新中間內容
  const updateCenterContent = (idx) => {
    const item = DESK_ITEMS[idx];
    switch(item.id) {
      case 'map':
        setCenterContent(`您在碼頭搬運了兩小時貨物...
獲得銀兩 +30，體力 -10
        
精進榜：
挑夫 - 熟練度 15/100
扁擔功 - 熟練度 5/100`);
        break;
      case 'scroll':
        setCenterContent(`【歷練任務】
▸ 碼頭挑夫：+20銀/小時
▸ 藥鋪搗藥：+15銀/小時
▸ 鐵匠幫忙：+25銀/小時`);
        break;
      case 'cultivate':
        setCenterContent(`【功法修煉】
體魄：${stats.physique}%
真氣：${stats.qi}% (未感知)

【可用功法】
• 扁擔功 (入門)
• 基礎吐納術 (未解鎖)`);
        break;
      case 'market':
        setCenterContent(`【資產清算】
銀兩：${stats.money}

世襲加成：+${nextGenBonus} pt
靈米：${stats.inventory.rice} 斗`);
        break;
      case 'bag':
        setCenterContent(`【行囊】
▸ 靈米 x${stats.inventory.rice}
▸ 銀兩 x${stats.money}
▸ 基礎丹藥 x0`);
        break;
      default:
        setCenterContent('載入中...');
    }
  };

  // --- 4. 系統初始化 ---
  useEffect(() => {
    // 容器寬度偵測
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);

    // 遊戲主循環計時器
    const timer = setInterval(() => {
      setStats(prev => {
        const nextDays = prev.daysPassed + (1 / 86400);
        const nextAge = calculateAge(nextDays);
        if (nextAge >= 76) { setView('rebirth'); return { ...prev, age: 76 }; }
        return { ...prev, daysPassed: nextDays, stamina: Math.min(100, prev.stamina + 0.05 * getStaminaRecoveryRate(nextAge)) };
      });
    }, 1000);

    // 日夜循環
    const dayNightTimer = setInterval(() => {
      setTimeProgress(p => (p + 0.02) % 1);
    }, 60000);

    // 無限自動滾動底部卡片
    autoScrollRef.current = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % DESK_ITEMS.length);
    }, 3000);

    updateCenterContent(activeIdx);

    return () => {
      window.removeEventListener('resize', updateWidth);
      clearInterval(timer);
      clearInterval(dayNightTimer);
      clearInterval(autoScrollRef.current);
    };
  }, []);

  // 當 activeIdx 改變時更新內容
  useEffect(() => {
    updateCenterContent(activeIdx);
  }, [activeIdx]);

  // 處理用戶點擊停止自動滾動
  const handleManualNav = (index) => {
    setActiveIdx(index);
    clearInterval(autoScrollRef.current);
    autoScrollRef.current = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % DESK_ITEMS.length);
    }, 3000);
  };

  const handleRebirth = () => {
    const result = calculateInheritance(stats.money, stats.heirlooms, { physique: Math.min(stats.money, 3000), qi: 0 });
    setStats(p => ({ ...p, daysPassed: 0, money: result.nextGeneration.startingCash, physique: 15 + result.nextGeneration.startingStats.physique, stamina: 100 }));
    setView('room');
  };

  const assetPath = '/assets/mortal';
  const cardGap = Math.min(containerWidth * 0.28, 110);
  const isNight = dayPhase > 0.3;

  return (
    <div className="fixed inset-0 bg-stone-950 flex justify-center items-center overflow-hidden font-serif select-none text-stone-200">
      <style>{`
        @keyframes sway { 0%, 100% { transform: translate(0px, 0px) scale(1.1); } 50% { transform: translate(10px, 5px) scale(1.15); } }
        .animate-sway { animation: sway 15s ease-in-out infinite; }
        .day-night-overlay { transition: opacity 3s ease-in-out; }
        .slide-transition { transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), filter 0.4s ease; }
        .scroll-content::-webkit-scrollbar { width: 4px; }
        .scroll-content::-webkit-scrollbar-thumb { background: #78716c; border-radius: 2px; }
        .scroll-content::-webkit-scrollbar-track { background: #1c1917; }
      `}</style>

      {/* 主容器 */}
      <div 
        ref={containerRef}
        className="relative w-full max-w-[480px] h-full flex flex-col bg-stone-900 overflow-hidden shadow-2xl"
      >
        {/* ==================== 頂部狀態列 ==================== */}
        <div className="flex-shrink-0 bg-stone-950 border-b-2 border-stone-800 p-3 z-30">
          <div className="flex items-center justify-between text-xs">
            {/* 姓名 */}
            <div className="text-center">
              <span className="text-stone-500 text-[10px] block">姓名</span>
              <span className="font-bold text-white text-sm">{stats.name}</span>
            </div>
            
            {/* 年齡 */}
            <div className="text-center px-2">
              <span className="text-stone-500 text-[10px] block">年齡</span>
              <span className="font-bold text-amber-400">{stats.age} <span className="text-[10px]">(餘 {stats.ageDaysRemaining} 天)</span></span>
            </div>
            
            {/* 體力 */}
            <div className="text-center">
              <span className="text-stone-500 text-[10px] block">體力</span>
              <div className="flex items-center gap-1">
                <div className="w-12 h-2 bg-stone-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all"
                    style={{ width: `${stats.stamina}%` }}
                  />
                </div>
              </div>
            </div>
            
            {/* 丹毒 */}
            <div className="text-center">
              <span className="text-stone-500 text-[10px] block">丹毒</span>
              <span className={`font-bold ${stats.danDou > 50 ? 'text-red-500' : 'text-stone-400'}`}>
                {stats.danDou}
              </span>
            </div>
          </div>
          
          {/* 體魄 & 真氣 */}
          <div className="flex items-center justify-around mt-3 text-xs">
            <div className="text-center">
              <span className="text-stone-600 text-[9px] block">體魄</span>
              <div className="flex items-center gap-1">
                <div className="w-16 h-1.5 bg-stone-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-600 to-orange-400"
                    style={{ width: `${stats.physique}%` }}
                  />
                </div>
                <span className="text-orange-400 text-[9px]">{stats.physique}%</span>
              </div>
            </div>
            <div className="text-center">
              <span className="text-stone-600 text-[9px] block">真氣</span>
              <div className="flex items-center gap-1">
                <div className="w-16 h-1.5 bg-stone-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400"
                    style={{ width: `${stats.qi}%` }}
                  />
                </div>
                <span className="text-blue-400 text-[9px]">{stats.qi}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== 中間：背景圖 + 敘事視窗 ==================== */}
        <div className="relative flex-1 min-h-0 z-0 overflow-hidden">
          {/* 背景圖 + 日夜漸變 */}
          <img src={`${assetPath}/view-day.jpg`} className="absolute inset-0 w-full h-full object-cover object-bottom" alt="view" />
          <div 
            className="absolute inset-0 day-night-overlay"
            style={{ 
              background: `linear-gradient(to bottom, 
                rgba(15, 23, 42, ${dayPhase * 0.85}) 0%, 
                rgba(15, 23, 42, ${dayPhase * 0.7}) 50%, 
                rgba(15, 23, 42, ${dayPhase * 0.5}) 100%)`,
              opacity: dayPhase > 0 ? 1 : 0
            }} 
          />
          <img src={`${assetPath}/wall.png`} className="absolute inset-0 w-full h-full object-cover object-bottom z-10 pointer-events-none" alt="wall" />

          {/* 中央敘事展示區 - 固定尺寸，可滾動 */}
          <div className="absolute inset-0 flex items-center justify-center px-4 z-20 pointer-events-none">
            <div className="w-full max-w-[300px] h-[60%] pointer-events-auto">
              <div className="bg-black/50 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl h-full flex flex-col">
                <h2 className={`text-[10px] tracking-[0.5em] uppercase text-center mb-3
                  ${DESK_ITEMS[activeIdx].id === 'map' ? 'text-cyan-400' : 
                    DESK_ITEMS[activeIdx].id === 'scroll' ? 'text-blue-400' :
                    DESK_ITEMS[activeIdx].id === 'cultivate' ? 'text-emerald-400' :
                    DESK_ITEMS[activeIdx].id === 'market' ? 'text-amber-400' : 'text-stone-400'}`}>
                  {DESK_ITEMS[activeIdx].label}
                </h2>
                <div className="flex-1 overflow-y-auto scroll-content">
                  <p className="text-stone-300 text-xs leading-relaxed whitespace-pre-line">
                    {centerContent}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== 底部：案几互動區 (無限循環) ==================== */}
        <div className="relative flex-shrink-0 h-[25%] min-h-[140px] z-10 bg-stone-900 overflow-visible">
          <img src={`${assetPath}/desk.png`} className="absolute inset-0 w-full h-full object-cover object-top opacity-70" alt="desk" />
          <div className="absolute inset-0 z-15 pointer-events-none opacity-30 mix-blend-multiply animate-sway" style={{ backgroundImage: `url('/assets/leaf-shadows.png')`, backgroundSize: 'cover' }} />

          <div className="relative h-full w-full flex items-center justify-center z-20 overflow-visible">
            <motion.div
              drag="x" 
              dragConstraints={{ left: 0, right: 0 }} 
              dragElastic={0.5}
              onDragEnd={(e, { offset, velocity }) => {
                const swipeThreshold = containerWidth * 0.15;
                const swipe = offset.x + velocity.x * 0.2;
                if (swipe < -swipeThreshold) {
                  handleManualNav((activeIdx + 1) % DESK_ITEMS.length);
                }
                if (swipe > swipeThreshold) {
                  handleManualNav((activeIdx - 1 + DESK_ITEMS.length) % DESK_ITEMS.length);
                }
              }}
              className="relative flex items-center justify-center w-full h-full cursor-grab active:cursor-grabbing"
            >
              {DESK_ITEMS.map((item, i) => (
                <motion.div
                  key={item.id}
                  animate={{ 
                    x: (i - activeIdx) * cardGap,
                    opacity: Math.max(0.3, 1 - Math.abs(i - activeIdx) * 0.4),
                    scale: i === activeIdx ? 1 : 0.85,
                    filter: i === activeIdx ? 'brightness(1.2) drop-shadow(0 0 15px rgba(255,255,255,0.2))' : 'brightness(0.5)'
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="absolute flex-shrink-0 slide-transition"
                  onClick={() => handleManualNav(i)}
                >
                  <div 
                    className="relative flex items-center justify-center aspect-square"
                    style={{ 
                      width: i === activeIdx ? '11rem' : '9rem',
                      transform: 'translateY(-40%)'
                    }}
                  >
                    {i === activeIdx && (
                      <div className={`absolute -inset-6 sm:-inset-8 bg-gradient-to-t ${item.color} to-transparent blur-2xl sm:blur-3xl opacity-20 rounded-full z-0`} />
                    )}
                    <img 
                      src={`${assetPath}/${item.asset}`} 
                      className="w-full h-full object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.8)] relative z-10" 
                      alt={item.label} 
                    />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* 轉生層 */}
        {view === 'rebirth' && (
          <div className="absolute inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-xl">
            <h2 className="text-2xl font-bold text-amber-600 mb-4 tracking-[0.2em]">壽終正寢</h2>
            <p className="text-stone-500 text-xs mb-8">一世凡塵終須盡，洗髓池中待重生。</p>
            <button onClick={handleRebirth} className="w-full py-3 bg-amber-900/40 border border-amber-600/30 text-amber-500 rounded-2xl font-bold shadow-lg active:scale-95 transition-all">
              洗髓轉生
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

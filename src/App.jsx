import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Zap, Coins, Clock, Sparkles, ScrollText, Compass,
  Package, BookOpen, Store, MapPin, ChevronRight, Download, X, Info, Map
} from 'lucide-react';

// --- 核心邏輯導入 ---
import { calculateAge, getStaminaRecoveryRate } from './logic/timeAndStamina';
import { calculateInheritance } from './logic/inheritance';
import { calculateSpiritRoot } from './logic/spiritRoot';

// 案几上的物件
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

  // debounce 用
  const debounceTimerRef = useRef(null);

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
  const currentAge = useMemo(
    () => stats.age + (stats.ageDaysRemaining / 365),
    [stats.age, stats.ageDaysRemaining]
  );
  const recoveryRate = useMemo(
    () => getStaminaRecoveryRate(currentAge),
    [currentAge]
  );
  const spiritResult = useMemo(
    () => calculateSpiritRoot(stats.affinities),
    [stats.affinities]
  );
  const nextGenBonus = useMemo(
    () => Math.floor(stats.money / 3000),
    [stats.money]
  );

  // 計算日夜漸變值
  const dayPhase = useMemo(() => {
    return Math.sin(timeProgress * Math.PI);
  }, [timeProgress]);

  // 中間內容
  const [centerContent, setCenterContent] = useState('');

  // 更新中間內容
  const updateCenterContent = (idx) => {
    const item = DESK_ITEMS[idx];
    switch (item.id) {
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
        if (nextAge >= 76) {
          setView('rebirth');
          return { ...prev, age: 76 };
        }
        return {
          ...prev,
          daysPassed: nextDays,
          stamina: Math.min(
            100,
            prev.stamina + 0.05 * getStaminaRecoveryRate(nextAge)
          )
        };
      });
    }, 1000);

    // 日夜循環
    const dayNightTimer = setInterval(() => {
      setTimeProgress(p => (p + 0.02) % 1);
    }, 60000);

    // 初始化一次內容
    updateCenterContent(activeIdx);

    return () => {
      window.removeEventListener('resize', updateWidth);
      clearInterval(timer);
      clearInterval(dayNightTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // debounce：只有在玩家停下來一段時間後才更新內容
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      updateCenterContent(activeIdx);
    }, 400); // 可依手感調整 300–600ms

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx]);

  // 處理用戶手動切換（取消自動輪播，只保留手動）
  const handleManualNav = (index) => {
    const len = DESK_ITEMS.length;
    // 頭尾相接：確保 index 在 0 ~ len-1 之間
    const normalized = ((index % len) + len) % len;
    setActiveIdx(normalized);
  };

  const handleRebirth = () => {
    const result = calculateInheritance(
      stats.money,
      stats.heirlooms,
      { physique: Math.min(stats.money, 3000), qi: 0 }
    );
    setStats(p => ({
      ...p,
      daysPassed: 0,
      money: result.nextGeneration.startingCash,
      physique: 15 + result.nextGeneration.startingStats.physique,
      stamina: 100
    }));
    setView('room');
  };

  const assetPath = '/assets/mortal';
  const cardGap = Math.min(containerWidth * 0.28, 110);
  const isNight = dayPhase > 0.3;

  // 計算「頭尾相接」時每張卡片的位置差（負的表示在左邊）
  const getOffsetIndex = (i) => {
    const len = DESK_ITEMS.length;
    let diff = i - activeIdx;

    // 讓 diff 落在 [-len/2, len/2] 範圍內，達到頭尾相接效果
    if (diff > len / 2) diff -= len;
    if (diff < -len / 2) diff += len;

    return diff;
  };

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
        {/* 頂部狀態列建議結構 */}
        <div className="flex-shrink-0 bg-[url('/assets/paper-texture.png')] bg-cover border-b-4 border-double border-stone-800 p-4 shadow-inner">
          <div className="flex items-end justify-between">
            {/* 名字區：改用印章感 */}
            <div className="relative">
              <div className="absolute -inset-1 bg-red-900/20 blur-sm rounded-sm"></div>
              <span className="relative font-bold text-stone-200 text-lg tracking-widest" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                {stats.name}
              </span>
            </div>

            {/* 年齡：強化金屬或玉石感 */}
            <div className="text-right">
              <span className="text-stone-500 text-[10px] block">骨齡</span>
              <span className="font-bold text-amber-200/80 italic text-sm">
                {stats.age}載 <span className="text-[10px] text-stone-400">(餘 {stats.ageDaysRemaining}日)</span>
              </span>
            </div>
          </div>

          {/* 進度條改進：增加漸變層次與內陰影 */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[9px] text-stone-500">
                <span>體魄</span>
                <span className="text-orange-400">{stats.physique}%</span>
              </div>
              <div className="h-2 bg-black/40 rounded-none border border-stone-700 p-[1px] shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-orange-900 via-orange-500 to-orange-200 shadow-[0_0_8px_rgba(251,146,60,0.5)]"
                  style={{ width: `${stats.physique}%` }}
                />
              </div>
            </div>
            {/* 真氣同理... */}
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

          {/* 中央敘事展示區 */}
          {/* 改良後的中間敘事區 */}
          <div className="absolute inset-0 flex items-center justify-center px-6 z-20 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative w-full max-w-[320px] h-[55%] flex flex-col items-center"
            >
              {/* 背景：移除死板的黑框，改用帶有紋理的極淺色捲軸感 */}
              <div className="absolute inset-0 bg-[url('/assets/parchment-texture.png')] opacity-20 mix-blend-overlay pointer-events-none" />

              {/* 標題：改用書法字體與裝飾線 */}
              <div className="relative mb-6 text-center">
                <div className="absolute -inset-x-8 top-1/2 h-[1px] bg-gradient-to-r from-transparent via-stone-500 to-transparent" />
                <h2 className="relative bg-stone-900 px-4 text-xs tracking-[0.3em] text-amber-500/80 font-bold">
                  {DESK_ITEMS[activeIdx].label}
                </h2>
              </div>

              {/* 文字內容：增加行間距與字距，並使用水墨感配色 */}
              <div className="flex-1 overflow-y-auto scroll-content pointer-events-auto px-2">
                <p className="text-stone-300 text-sm leading-[2.2] tracking-wide font-medium drop-shadow-md">
                  {centerContent.split('\n').map((line, i) => (
                    <span key={i} className="block mb-2">
                      {line.startsWith('▸') ? <span className="text-amber-600 mr-2">◈</span> : null}
                      {line.replace('▸', '')}
                    </span>
                  ))}
                </p>
              </div>

              {/* 底部裝飾：淡淡的煙霧效果 */}
              <div className="absolute -bottom-4 w-full h-12 bg-gradient-to-t from-stone-900 to-transparent z-10" />
            </motion.div>
          </div>
        </div>

        {/* ==================== 底部：案几互動區 (頭尾相接，純手動) ==================== */}
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
                  handleManualNav(activeIdx + 1); // 下一張
                }
                if (swipe > swipeThreshold) {
                  handleManualNav(activeIdx - 1); // 上一張
                }
              }}
              className="relative flex items-center justify-center w-full h-full cursor-grab active:cursor-grabbing"
            >
              {DESK_ITEMS.map((item, i) => {
                const diff = getOffsetIndex(i);
                return (
                  <motion.div
                    key={item.id}
                    animate={{
                      x: diff * cardGap,
                      opacity: Math.max(0.3, 1 - Math.abs(diff) * 0.4),
                      scale: diff === 0 ? 1 : 0.85,
                      filter: diff === 0
                        ? 'brightness(1.2) drop-shadow(0 0 15px rgba(255,255,255,0.2))'
                        : 'brightness(0.5)'
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="absolute flex-shrink-0 slide-transition"
                    onClick={() => handleManualNav(i)}
                  >
                    <div
                      className="relative flex items-center justify-center aspect-square"
                      style={{
                        width: diff === 0 ? '11rem' : '9rem',
                        transform: 'translateY(-40%)'
                      }}
                    >
                      {diff === 0 && (
                        <div className={`absolute -inset-6 sm:-inset-8 bg-gradient-to-t ${item.color} to-transparent blur-2xl sm:blur-3xl opacity-20 rounded-full z-0`} />
                      )}
                      <img
                        src={`${assetPath}/${item.asset}`}
                        className="w-full h-full object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.8)] relative z-10"
                        alt={item.label}
                      />
                    </div>
                  </motion.div>
                );
              })}
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

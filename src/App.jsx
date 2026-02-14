import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Zap, Coins, Clock, Sparkles, ScrollText, Compass, Package, BookOpen, Store, MapPin, ChevronRight } from 'lucide-react';

// --- 核心邏輯導入 ---
import { calculateAge, getStaminaRecoveryRate } from './logic/timeAndStamina';
import { calculateInheritance } from './logic/inheritance';
import { calculateSpiritRoot } from './logic/spiritRoot';
import { TIME_CONFIG, AWAKENING_CONFIG } from './constants';

const DESK_ITEMS = [
  { id: 'scroll', label: '青色卷軸', icon: <ScrollText />, asset: 'grid_log.png', color: 'from-blue-600' },
  { id: 'market', label: '交易市集', icon: <Store />, asset: 'grid_market.png', color: 'from-amber-600' },
  { id: 'compass', label: '司南羅盤', icon: <Compass />, asset: 'grid_compass.png', color: 'from-cyan-600' },
  { id: 'manual', label: '習武秘笈', icon: <BookOpen />, asset: 'grid_manual.png', color: 'from-emerald-600' },
  { id: 'bag', label: '錢袋', icon: <Package />, asset: 'grid_bag.png', color: 'from-stone-600' },
];

function App() {
  const [activeIdx, setActiveIdx] = useState(2);
  const [time, setTime] = useState('day');
  const [scale, setScale] = useState(1);
  const [view, setView] = useState('room');

  const [stats, setStats] = useState({
    name: '虛雲子', daysPassed: 0, physique: 15, qi: 0, stamina: 80, money: 1000,
    inventory: { rice: 5 }, affinities: { GOLD: 20, WOOD: 10, WATER: 10, FIRE: 10, EARTH: 10 }
  });

  const currentAge = useMemo(() => calculateAge(stats.daysPassed), [stats.daysPassed]);
  const recoveryRate = useMemo(() => getStaminaRecoveryRate(currentAge), [currentAge]);
  const spiritResult = useMemo(() => calculateSpiritRoot(stats.affinities), [stats.affinities]);

  useEffect(() => {
    const handleResize = () => setScale(Math.min(window.innerWidth / 480, window.innerHeight / 854) * 0.95);
    handleResize(); window.addEventListener('resize', handleResize);
    const timer = setInterval(() => {
      setStats(prev => {
        const nextDays = prev.daysPassed + (1 / 86400);
        const nextAge = calculateAge(nextDays);
        if (nextAge >= 76) { setView('rebirth'); return { ...prev, age: 76 }; }
        return { ...prev, daysPassed: nextDays, stamina: Math.min(100, prev.stamina + 0.05 * getStaminaRecoveryRate(nextAge)) };
      });
    }, 1000);
    const dayNightTimer = setInterval(() => setTime(p => p === 'day' ? 'night' : 'day'), 30000);
    return () => { window.removeEventListener('resize', handleResize); clearInterval(timer); clearInterval(dayNightTimer); };
  }, []);

  const assetPath = '/assets/mortal';

  return (
    <div className="fixed inset-0 bg-stone-950 flex justify-center items-center overflow-hidden font-serif select-none text-stone-200">
      <style>{`
        @keyframes sway { 0%, 100% { transform: translate(0px, 0px) scale(1.1); } 50% { transform: translate(10px, 5px) scale(1.15); } }
        .animate-sway { animation: sway 15s ease-in-out infinite; }
      `}</style>

      <div style={{ width: '480px', height: '854px', transform: `scale(${scale})` }} className="relative bg-stone-900 overflow-hidden border-4 border-stone-800 flex flex-col shadow-2xl">

        {/* --- 上方 75%：環境敘事區 --- */}
        <div className="relative w-full h-[75%] z-0 border-b-2 border-stone-950 overflow-hidden">
          <img src={`${assetPath}/view-day.jpg`} className="absolute inset-0 w-full h-full object-cover object-bottom" alt="view" />
          <div className={`absolute inset-0 bg-[#0f172a] mix-blend-multiply transition-opacity duration-[5000ms] ${time === 'night' ? 'opacity-90' : 'opacity-0'}`} />
          <img src={`${assetPath}/wall.png`} className="absolute inset-0 w-full h-full object-cover object-bottom z-10 pointer-events-none" alt="wall" />

          {/* HUD */}
          <header className="absolute top-0 left-0 w-full p-6 flex justify-between z-30">
            <div className="bg-black/30 p-3 rounded-2xl backdrop-blur-md border border-white/5 shadow-xl">
              <h1 className="text-2xl font-bold tracking-widest text-white">{stats.name}</h1>
              <p className="text-amber-500 font-mono text-xs mt-1">{currentAge.toFixed(2)} 歲 | {time === 'day' ? '晝' : '夜'}</p>
            </div>
            <div className="text-right space-y-2">
              <div className="bg-black/30 px-3 py-1 rounded-full border border-white/5 flex items-center gap-2 text-blue-400 backdrop-blur-sm">
                <Zap size={14} /> <span className="text-xs font-bold">{Math.floor(stats.stamina)}% (x{recoveryRate.toFixed(1)})</span>
              </div>
              <div className="bg-black/30 px-3 py-1 rounded-full border border-white/5 flex items-center justify-end gap-2 text-amber-400 font-mono text-xs backdrop-blur-sm">
                <Coins size={14} /> <span>{stats.money}</span>
              </div>
            </div>
          </header>

          {/* 中央展示區 */}
          <div className="absolute inset-0 flex items-center justify-center px-8 z-20">
            <AnimatePresence mode="wait">
              <motion.div key={activeIdx} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
                className="bg-black/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl w-full max-w-[300px] text-center"
              >
                {DESK_ITEMS[activeIdx].id === 'scroll' && (
                  <div className="space-y-4">
                    <h2 className="text-blue-400 text-[10px] tracking-[0.5em] uppercase">凡塵歷練</h2>
                    <p className="text-stone-300 text-sm leading-relaxed">碼頭挑夫：+20銀<br/>藥鋪搗藥：+15銀</p>
                  </div>
                )}
                {DESK_ITEMS[activeIdx].id === 'compass' && (
                  <div className="space-y-4">
                    <h2 className="text-cyan-400 text-[10px] tracking-[0.5em] uppercase">司南感應</h2>
                    <p className="font-bold text-stone-100">青雲鎮 - 西郊</p>
                    <button className="mt-4 px-6 py-2 bg-cyan-900/30 border border-cyan-500/50 text-cyan-300 text-[10px] rounded-full mx-auto flex items-center gap-2">
                      出外探查 <ChevronRight size={12}/>
                    </button>
                  </div>
                )}
                {DESK_ITEMS[activeIdx].id === 'manual' && (
                  <div className="space-y-4">
                    <h2 className="text-emerald-400 text-[10px] tracking-[0.5em] uppercase">功法修煉</h2>
                    <p className="text-stone-300 text-sm">體魄: {stats.physique} | 真氣: {stats.qi}</p>
                  </div>
                )}
                {DESK_ITEMS[activeIdx].id === 'market' && (
                  <div className="space-y-4">
                    <h2 className="text-amber-400 text-[10px] tracking-[0.5em] uppercase">資產清算</h2>
                    <p className="text-stone-300 text-sm">銀錢：{stats.money}</p>
                  </div>
                )}
                {DESK_ITEMS[activeIdx].id === 'bag' && (
                  <div className="space-y-4">
                    <h2 className="text-stone-400 text-[10px] tracking-[0.5em] uppercase">存身小物</h2>
                    <p className="text-stone-300 text-sm">靈米：{stats.inventory.rice} 斗</p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* --- 下方 25%：案几互動區 (優化距離與吸附) --- */}
        <div className="relative w-full h-[25%] z-10 bg-stone-900 overflow-visible">
          <img src={`${assetPath}/desk.png`} className="absolute inset-0 w-full h-full object-cover object-top opacity-70" alt="desk" />
          <div className="absolute inset-0 z-15 pointer-events-none opacity-30 mix-blend-multiply animate-sway" style={{ backgroundImage: `url('/assets/leaf-shadows.png')`, backgroundSize: 'cover' }} />

          {/* 靈物容器：使用 flex 與 center 確保初始位置 */}
          <div className="relative h-full w-full flex items-center justify-center z-20 overflow-visible">
            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }} // 手放開後自動回彈吸附至計算位置
              dragElastic={0.6}
              onDragEnd={(e, { offset, velocity }) => {
                const swipe = offset.x + velocity.x * 0.2;
                if (swipe < -35 && activeIdx < DESK_ITEMS.length - 1) setActiveIdx(activeIdx + 1);
                if (swipe > 35 && activeIdx > 0) setActiveIdx(activeIdx - 1);
              }}
              className="relative flex items-center justify-center w-full h-full cursor-grab active:cursor-grabbing"
            >
              {DESK_ITEMS.map((item, i) => (
                <motion.div
                  key={item.id}
                  animate={{ 
                    x: (i - activeIdx) * 180, // 距離拉近 (從 160 調為 110)
                    opacity: 1, 
                    filter: i === activeIdx ? 'brightness(1.2) drop-shadow(0 0 15px rgba(255,255,255,0.2))' : 'brightness(0.5)' 
                  }}
                  transition={{ type: 'spring', stiffness: 250, damping: 30 }}
                  className="absolute flex-shrink-0" // 使用 absolute 讓所有靈物以正中央為基準偏移
                >
                  {/* 統一寬度 w-44 (約 176px)，高度向上偏移維持 40% */}
                  <div className="relative w-44 flex items-center justify-center aspect-square" style={{ transform: 'translateY(-40%)' }}>
                    {i === activeIdx && (
                      <div className={`absolute -inset-8 bg-gradient-to-t ${item.color} to-transparent blur-3xl opacity-20 rounded-full z-0`} />
                    )}
                    <img src={`${assetPath}/${item.asset}`} className="w-full h-full object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.8)] relative z-10" alt={item.label} />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
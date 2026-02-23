import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ASSET_PATH = '/assets/mortal';

const NAV_ITEMS = [
  { id: 'status', label: '本命', asset: 'nav_status.webp' },
  { id: 'map', label: '尋緣', asset: 'nav_map.webp' },
  { id: 'scroll', label: '歷練', asset: 'nav_scroll.webp' },
  { id: 'cultivate', label: '修煉', asset: 'nav_cultivate.webp' },
  { id: 'market', label: '市場', asset: 'nav_market.webp' },
  { id: 'bag', label: '行囊', asset: 'nav_bag.webp' },
];

function App() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [scale, setScale] = useState(1);
  
  useEffect(() => {
    const updateScale = () => {
      const scaleX = window.innerWidth / 450;
      const scaleY = window.innerHeight / 975;
      const newScale = Math.min(scaleX, scaleY, 1); // 不超過 1
      setScale(newScale);
    };
    
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);
  
  const [stats, setStats] = useState({
    name: '創辦人',
    age: 16,
    ageDaysRemaining: 30,
    stamina: 80,
    energy: 90,
    physique: 20.5,
    qi: 0,
    danDou: 0,
    money: 100,
  });

  // ----------------------------------------------------------------
  // 核心：內容邏輯
  // ----------------------------------------------------------------
  const centerContent = useMemo(() => {
    const item = NAV_ITEMS[activeIdx];
    switch (item.id) {
      case 'status': return `【本命神識】\n名諱：${stats.name}\n骨齡：${stats.age} 載\n\n體魄：${stats.physique}%\n真氣：${stats.qi}%\n穢氣：${stats.danDou}%`;
      case 'map': return `【雷達感應】\n「心之所向，機緣自現。」\n\n當前範圍：五百步\n感應中...`;
      case 'scroll': return `【凡塵歷練】\n▸ 碼頭搬運 (+銀兩)\n▸ 山林狩獵 (+體魄)\n▸ 礦脈採掘 (+潛能)`;
      case 'cultivate': return `【功法修煉】\n體魄需達 100% 始可啟動引氣。\n\n當前運行：無`;
      case 'market': return `【坊市交易】\n買賣收取 10% 稅率。\n\n持有銀兩：${stats.money}`;
      case 'bag': return `【個人行囊】\n▸ 靈米 x5\n▸ 殘破的地圖 x1`;
      default: return '';
    }
  }, [activeIdx, stats]);

  // ----------------------------------------------------------------
  // 核心：環形導航邏輯
  // ----------------------------------------------------------------
  const getOffsetIndex = (i) => {
    const len = NAV_ITEMS.length;
    let diff = i - activeIdx;
    if (diff > len / 2) diff -= len;
    if (diff < -len / 2) diff += len;
    return diff;
  };

  const handleManualNav = (index) => {
    const len = NAV_ITEMS.length;
    const normalized = ((index % len) + len) % len;
    setActiveIdx(normalized);
  };

  return (
    <div className="fixed inset-0 bg-black flex justify-center items-center overflow-hidden font-serif select-none text-stone-200 max-w-full max-h-full">
      <style>{`
        @keyframes inkEmerging { from { opacity: 0; filter: blur(10px); } to { opacity: 1; filter: blur(0); } }
        .ink-appear { animation: inkEmerging 1s ease-out forwards; }
        .glow-cyan { filter: drop-shadow(0 0 15px rgba(34, 211, 238, 0.8)); }
        
        .game-canvas {
          width: 450px;
          height: 975px;
          position: relative;
          background: #1c1917;
          overflow: hidden;
          box-shadow: 0 0 50px rgba(0,0,0,0.5);
        }
        
        body, html { 
          overflow: hidden; 
          margin: 0; 
          padding: 0; 
          width: 100%; 
          height: 100dvh;
          background: #000;
          padding-top: env(safe-area-inset-top);
          padding-bottom: env(safe-area-inset-bottom);
          padding-left: env(safe-area-inset-left);
          padding-right: env(safe-area-inset-right);
        }
      `}</style>

      {/* 遊戲畫布 */}
      <div className="game-canvas" style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
        
        {/* 1. 全屏掛軸底圖 */}
        <div className="absolute inset-0 z-0">
          <img src={`${ASSET_PATH}/bg_scroll.webp`} className="w-full h-full object-cover" alt="scroll" />
        </div>

        {/* 2. 掛軸內容區域 (使用 px 鎖定位置) */}
        <div className="absolute inset-0 z-10 flex flex-col pt-[180px] px-[60px]">
          
          {/* 上方狀態列 */}
          <div className="w-full flex justify-between items-center mb-[80px]">
            <div className="flex flex-col items-center">
              <img src={`${ASSET_PATH}/ui_incense.webp`} className="w-12 h-12 object-contain" alt="life" />
              <span className="text-[12px] text-amber-950 font-bold mt-1">16/76</span>
            </div>
            <div className="flex flex-col items-center">
              <img src={`${ASSET_PATH}/ui_flame.webp`} className="w-12 h-12 object-contain" alt="stamina" />
              <span className="text-[12px] text-orange-950 font-bold mt-1">80/100</span>
            </div>
            <div className="flex flex-col items-center">
              <img src={`${ASSET_PATH}/ui_cloud.webp`} className="w-12 h-12 object-contain" alt="energy" />
              <span className="text-[12px] text-cyan-950 font-bold mt-1">90/100</span>
            </div>
          </div>

          {/* 中央文字區 */}
          <div className="flex-1 w-full flex flex-col pt-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIdx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="text-stone-900"
              >
                <p className="text-[18px] leading-[2.6] tracking-[0.1em] whitespace-pre-line ink-appear font-medium">
                  {centerContent}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* 紅印 (固定在內容區右下方) */}
          <div className="absolute top-[650px] right-[330px] w-28 h-28 flex items-center justify-center">
            <img src={`${ASSET_PATH}/ui_seal.webp`} className="absolute inset-0 w-full h-full object-contain opacity-90" alt="seal" />
            <span className="relative z-12 text-white font-bold text-[22px]" style={{ writingMode: 'vertical-rl' }}>
              {stats.name}
            </span>
          </div>
        </div>

        {/* 3. 前景茶几：高度向下調整 (佔比 18%) */}
        <div className="absolute bottom-0 w-full h-[18%] z-20 pointer-events-none">
          <img src={`${ASSET_PATH}/bg_desk.webp`} className="w-full h-full object-cover object-top" alt="desk" />
        </div>

        {/* 4. 底部法寶：左右滑動，頭尾對接 */}
        <div className="absolute bottom-0 inset-x-0 h-[320px] z-30 flex items-center justify-center overflow-visible">
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.4}
            onDragEnd={(e, { offset, velocity }) => {
              const swipeThreshold = 50;
              if (offset.x < -swipeThreshold || velocity.x < -500) handleManualNav(activeIdx + 1);
              else if (offset.x > swipeThreshold || velocity.x > 500) handleManualNav(activeIdx - 1);
            }}
            className="relative w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
          >
            {NAV_ITEMS.map((item, i) => {
              const diff = getOffsetIndex(i);
              return (
                <motion.div
                  key={item.id}
                  animate={{
                    x: diff * 150, // 固定間距 140px
                    zIndex: diff === 0 ? 50 : 10,
                  }}
                  transition={{ type: 'spring', stiffness: 220, damping: 28 }}
                  className="absolute"
                  onClick={() => handleManualNav(i)}
                >
                  <div className="relative flex flex-col items-center">
                    {/* 選中發青光 */}
                    {diff === 0 && (
                      <div className="absolute -inset-10 bg-cyan-400/20 blur-3xl rounded-full z-0 animate-pulse" />
                    )}
                    
                    {/* 物件大小完全鎖定為  */}
                    <img
                      src={`${ASSET_PATH}/${item.asset}`}
                      className={`w-[145px] h-[145px] object-contain relative z-10 transition-all duration-300
                        ${diff === 0 ? 'glow-cyan brightness-110' : 'brightness-75 grayscale-[20%]'}`}
                      alt={item.label}
                    />
                    
                    {diff === 0 && (
                      <div className="absolute -bottom-8 text-[14px] text-cyan-100 font-bold tracking-[0.2em] whitespace-nowrap">
                        {item.label}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

      </div>
    </div>
  );
}

export default App;
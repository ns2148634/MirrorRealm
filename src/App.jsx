import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ASSET_PATH = '/assets/mortal';

// 導航項目與資源對應
const NAV_ITEMS = [
  { id: 'status', label: '本命', asset: 'nav_status.webp' },
  { id: 'map', label: '尋緣', asset: 'nav_map.webp' },
  { id: 'scroll', label: '歷練', asset: 'nav_scroll.webp' },
  { id: 'cultivate', label: '修煉', asset: 'nav_cultivate.webp' },
  { id: 'market', label: '市場', asset: 'nav_market.webp' },
  { id: 'bag', label: '行囊', asset: 'nav_bag.webp' },
];

function App() {
  const [activeIdx, setActiveIdx] = useState(1); // 預設為尋緣
  
  const [stats] = useState({
    name: '創辦人',
    age: 16,
    maxAge: 76,
    stamina: 80,
    energy: 80,
    physique: 20.5, // 體魄
  });

  // 根據當前導航顯示內容
  const centerContent = useMemo(() => {
    const item = NAV_ITEMS[activeIdx];
    switch (item.id) {
      case 'status': 
        return `【本命神識】\n名諱：${stats.name}\n骨齡：${stats.age} 載\n\n體魄：${stats.physique}%\n真氣：0%\n穢氣：0%`;
      case 'map': 
        return `北方300公尺發現靈脈現象\n(偵測到 2 名道友神識在附近)`;
      default: 
        return `【${item.label}】 內容建設中...\n此區域高度會隨內容自動撐開。`;
    }
  }, [activeIdx, stats]);

  const getOffsetIndex = (i) => {
    const len = NAV_ITEMS.length;
    let diff = i - activeIdx;
    if (diff > len / 2) diff -= len;
    if (diff < -len / 2) diff += len;
    return diff;
  };

  const handleNav = (direction) => {
    const len = NAV_ITEMS.length;
    setActiveIdx((prev) => (prev + direction + len) % len);
  };

  return (
    /* 1. 全局背景層：負責無限平鋪綠色花紋 */
    <div 
      className="fixed inset-0 flex justify-center items-center font-serif select-none overflow-hidden" 
      style={{ 
        width: '100vw', 
        height: '100dvh',
        backgroundImage: `url(${ASSET_PATH}/bg_pattern_tile.webp)`,
        backgroundRepeat: 'repeat',
        backgroundSize: '256px auto' 
      }}
    >
      <style>{`
        @font-face {
          font-family: 'Kaiti';
          src: local('Kaiti TC'), local('STKaiti'), local('KaiTi');
        }
        .font-kaiti { font-family: 'Kaiti', serif; }
        .glow-cyan { filter: drop-shadow(0 0 15px rgba(34, 211, 238, 0.8)); }
        
        /* 增加邊緣陰影讓中柱更立體，區隔桌機背景 */
        .game-pillar-shadow {
          box-shadow: 0 0 80px rgba(0,0,0,0.6);
        }
      `}</style>

      {/* 2. 中柱容器 (Game Pillar)：鎖定最大寬度 500px，防止桌機災難 */}
      <div className="relative w-full max-w-[500px] h-full flex flex-col game-pillar-shadow overflow-hidden bg-transparent">
        
        {/* ================= 上方狀態列 (三段式之頂) ================= */}
        <div className="flex-shrink-0 w-full px-8 pt-10 pb-4 z-20 relative">
          <div className="flex justify-between items-baseline w-full">
             <span style={{ fontSize: 'clamp(42px, 8vw, 56px)' }} className="font-bold text-stone-900 font-kaiti leading-none">凡人期</span>
             <span style={{ fontSize: 'clamp(36px, 7vw, 52px)' }} className="font-bold text-stone-800 font-sans tracking-tighter opacity-90">
               {stats.age}/{stats.maxAge}
             </span>
          </div>
          
          <div className="flex gap-10 mt-5 ml-1">
            <div className="flex items-center gap-2">
              <img src={`${ASSET_PATH}/ui_flame.webp`} className="w-8 h-8 object-contain" alt="stamina" />
              <span className="text-[26px] font-bold text-stone-800">{stats.stamina}/100</span>
            </div>
            <div className="flex items-center gap-2">
              <img src={`${ASSET_PATH}/ui_cloud.webp`} className="w-8 h-8 object-contain" alt="energy" />
              <span className="text-[26px] font-bold text-stone-800">{stats.energy}/100</span>
            </div>
          </div>
        </div>

        {/* ================= 中間內容區域 (三段式之身：彈性伸縮紙張) ================= */}
        <div className="flex-grow w-full relative z-10 flex flex-col items-center overflow-y-auto py-6">
          <div 
            className="w-[90%] relative rounded-sm"
            style={{
              // [關鍵適配] 米白紙張貼圖平鋪
              backgroundImage: `url(${ASSET_PATH}/bg_paper_tile.webp)`,
              backgroundRepeat: 'repeat',
              minHeight: '60%', 
              boxShadow: '0 10px 40px -10px rgba(0,0,0,0.4), inset 0 0 30px rgba(0,0,0,0.05)'
            }}
          >
            <div className="px-10 py-12">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIdx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="text-stone-800 font-kaiti"
                >
                  <p className="text-[28px] leading-[1.8] tracking-[0.2em] whitespace-pre-wrap">
                    {centerContent}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* 紅印：精確定位於紙張左下角 */}
            <div className="absolute bottom-10 left-8 w-24 h-24 flex items-center justify-center">
              <img src={`${ASSET_PATH}/ui_seal.webp`} className="absolute inset-0 w-full h-full object-contain opacity-95" alt="seal" />
              <span className="relative z-12 text-white/90 font-bold text-[20px] font-kaiti mt-1" style={{ writingMode: 'vertical-rl' }}>
                {stats.name}
              </span>
            </div>
          </div>
        </div>

        {/* ================= 底部桌案與導航 (三段式之底) ================= */}
        <div className="flex-shrink-0 w-full h-[280px] relative z-30 mt-[-30px]">
          {/* 前景茶几：使用陰影壓在紙張上，消除白線 */}
          <div className="absolute bottom-0 w-full h-[180px] z-10 pointer-events-none">
            {/* 陰影層：解決銜接白線問題 */}
            <div className="absolute top-[-20px] left-0 right-0 h-[25px] shadow-[0_-25px_50px_-10px_rgba(0,0,0,0.8)]"></div>
            <img src={`${ASSET_PATH}/bg_desk.webp`} className="w-full h-full object-cover object-top" alt="desk" />
          </div>

          {/* 環形導航物件 */}
          <div className="absolute bottom-0 inset-x-0 h-full z-20 flex items-center justify-center overflow-visible">
            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.4}
              onDragEnd={(e, { offset, velocity }) => {
                const swipeThreshold = 50;
                if (offset.x < -swipeThreshold || velocity.x < -400) handleNav(1);
                else if (offset.x > swipeThreshold || velocity.x > 400) handleNav(-1);
              }}
              className="relative w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing pt-12"
            >
              {NAV_ITEMS.map((item, i) => {
                const diff = getOffsetIndex(i);
                const isActive = diff === 0;
                const isFar = Math.abs(diff) > 1.5;

                return (
                  <motion.div
                    key={item.id}
                    animate={{
                      x: diff * 135,
                      scale: isActive ? 1.2 : 0.75,
                      opacity: isFar ? 0 : 1,
                      zIndex: isActive ? 50 : 10,
                      y: isActive ? -45 : 15,
                    }}
                    transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                    className="absolute"
                    onClick={() => setActiveIdx(i)}
                  >
                    <div className="relative flex flex-col items-center">
                      {isActive && (
                        <div className="absolute -inset-10 bg-cyan-400/25 blur-[50px] rounded-full z-0" />
                      )}
                      <img
                        src={`${ASSET_PATH}/${item.asset}`}
                        className={`w-[145px] h-[145px] object-contain transition-all duration-300
                          ${isActive ? 'glow-cyan brightness-110' : 'brightness-50 grayscale-[20%]'}`}
                        alt={item.label}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </div>

      </div> {/* 結束中柱容器 */}
    </div>
  );
}

export default App;
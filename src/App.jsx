import React, { useState, useEffect, useMemo } from 'react';
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
  const [activeIdx, setActiveIdx] = useState(1);
  
  const [stats] = useState({
    name: '創辦人',
    age: 16,
    maxAge: 76,
    stamina: 80,
    energy: 80,
    physique: 20.5,
  });

  const centerContent = useMemo(() => {
    const item = NAV_ITEMS[activeIdx];
    switch (item.id) {
      case 'status': 
        return `【本命神識】\n名諱：${stats.name}\n骨齡：${stats.age} 載\n\n體魄：${stats.physique}%\n真氣：0%\n穢氣：0%`;
      case 'map': 
        return `北方300公尺發現靈脈現象\n(偵測到 2 名道友神識在附近)`;
      default: 
        return `【${item.label}】 內容建設中...\n全佈局已鎖定黃金比例，無論設備如何變換皆不會跑版。`;
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
        .game-pillar-shadow { box-shadow: 0 0 80px rgba(0,0,0,0.6); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* [核心魔法]: 鎖定容器比例 (Fixed Aspect Ratio)
        這裡計算出長寬永遠維持 9:19，最大寬度不超過 500px，高度不超過螢幕。
        加上 containerType: 'inline-size' 讓我們可以使用 cqw 完美縮放字體。
      */}
      <div 
        className="relative flex flex-col game-pillar-shadow overflow-hidden bg-transparent"
        style={{
          aspectRatio: '9 / 19',
          width: 'min(100vw, 500px, calc(100dvh * (9 / 19)))',
          height: 'calc(min(100vw, 500px, calc(100dvh * (9 / 19))) * (19 / 9))',
          containerType: 'inline-size'
        }}
      >
        
        {/* ================= 1. 上方狀態列 (嚴格鎖定 20% 高度) ================= */}
        <div className="w-full h-[10%] px-[8%] flex flex-col justify-center z-20 relative">
          <div className="flex justify-between items-baseline w-full">
             <span style={{ fontSize: '11cqw' }} className="font-bold text-stone-900 font-kaiti leading-none">凡人期</span>
             <span style={{ fontSize: '9cqw' }} className="font-bold text-stone-800 font-sans tracking-tighter opacity-90">
               {stats.age}/{stats.maxAge}
             </span>
          </div>
          
         
        </div>

        {/* ================= 2. 中間內容區域 (嚴格鎖定 55% 高度，紙張寬 80%) ================= */}
        <div className="w-full h-[70%] relative z-10 flex justify-center items-stretch">
          <div 
            className="w-[80%] h-full relative no-scrollbar overflow-y-auto"
            style={{
              backgroundImage: `url(${ASSET_PATH}/bg_paper_tile.webp)`,
              backgroundRepeat: 'repeat',
              boxShadow: '0 0 30px rgba(0,0,0,0.5), inset 0 0 30px rgba(0,0,0,0.05)'
            }}
          > <div className="flex gap-[10%] mt-[4%] ml-[2%]">
            <div className="flex items-center gap-[1.5cqw]">
              <img src={`${ASSET_PATH}/ui_flame.webp`} className="w-[7cqw] aspect-square object-contain" alt="stamina" />
              <span style={{ fontSize: '5.5cqw' }} className="font-bold text-stone-800">{stats.stamina}/100</span>
            </div>
            <div className="flex items-center gap-[1.5cqw]">
              <img src={`${ASSET_PATH}/ui_cloud.webp`} className="w-[7cqw] aspect-square object-contain" alt="energy" />
              <span style={{ fontSize: '5.5cqw' }} className="font-bold text-stone-800">{stats.energy}/100</span>
            </div>
          </div>
            <div className="p-[8%] pb-[25%] h-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIdx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="text-stone-800 font-kaiti"
                >
                  {/* 字體使用 cqw 完全跟隨容器比例縮放 */}
                  <p style={{ fontSize: '4.8cqw' }} className="leading-[1.8] tracking-[0.2em] whitespace-pre-wrap">
                    {centerContent}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* 紅印章大小及位置都鎖定容器比例 */}
            <div className="absolute bottom-[2%] left-[2%] w-[22%] aspect-square flex items-center justify-center pointer-events-none">
              <img src={`${ASSET_PATH}/ui_seal.webp`} className="absolute inset-0 w-full h-full object-contain opacity-95" alt="seal" />
              <span style={{ fontSize: '3.8cqw', writingMode: 'vertical-rl' }} className="relative z-12 text-white/90 font-bold font-kaiti mt-[5%]">
                {stats.name}
              </span>
            </div>
          </div>
        </div>

        {/* ================= 3. 底部桌案與導航 (嚴格鎖定 25% 高度) ================= */}
        <div className="w-full h-[20%] relative z-30">
          
          <div className="absolute inset-0 w-full h-full z-10 pointer-events-none">
            <div className="absolute top-[-10%] left-0 right-0 h-[10%] shadow-[0_-25px_50px_-10px_rgba(0,0,0,0.8)]"></div>
            <img src={`${ASSET_PATH}/bg_desk.webp`} className="w-full h-full object-cover object-top" alt="desk" />
          </div>

          <div className="absolute inset-0 z-20 flex items-center justify-center overflow-visible">
            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.4}
              onDragEnd={(e, { offset, velocity }) => {
                const swipeThreshold = 50;
                if (offset.x < -swipeThreshold || velocity.x < -400) handleNav(1);
                else if (offset.x > swipeThreshold || velocity.x > 400) handleNav(-1);
              }}
              className="relative w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing pb-[5%]"
            >
              {NAV_ITEMS.map((item, i) => {
                const diff = getOffsetIndex(i);
                const isActive = diff === 0;
                const isFar = Math.abs(diff) > 1.5;

                return (
                  <motion.div
                    key={item.id}
                    animate={{
                      // 位移同樣基於自身的百分比，永不跑位
                      x: `${diff * 115}%`, 
                      scale: isActive ? 1.15 : 0.75,
                      opacity: isFar ? 0 : 1,
                      zIndex: isActive ? 50 : 10,
                      y: isActive ? "-40%" : "-15%", 
                    }}
                    transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                    // 選單項目大小佔畫布寬度 26%，也是等比例縮放
                    className="absolute w-[36%] aspect-square flex flex-col items-center justify-center"
                    onClick={() => setActiveIdx(i)}
                  >
                    <div className="relative flex flex-col items-center justify-center w-full h-full">
                      {isActive && (
                        <div className="absolute -inset-[20%] bg-cyan-400/25 blur-[3cqw] rounded-full z-0" />
                      )}
                      <img
                        src={`${ASSET_PATH}/${item.asset}`}
                        className={`w-full h-full object-contain transition-all duration-300
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
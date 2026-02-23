import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ASSET_PATH = '/assets/mortal';

// 回歸原本正確的檔案名稱
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
  const [scale, setScale] = useState(1);
  
  useEffect(() => {
    const updateScale = () => {
      const scaleX = window.innerWidth / 450;
      const scaleY = window.innerHeight / 975;
      const newScale = Math.min(scaleX, scaleY, 1);
      setScale(newScale);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);
  
  const [stats] = useState({
    name: '創辦人', // 紅印姓名
    age: 16,
    maxAge: 76,
    stamina: 80,
    energy: 80,
  });

  const centerContent = useMemo(() => {
    const item = NAV_ITEMS[activeIdx];
    switch (item.id) {
      case 'map': return `北方300公尺發現靈脈現象`;
      default: return `【${item.label}】 內容建設中...`;
    }
  }, [activeIdx]);

  // 計算循環偏移，並處理物件間距防止出畫面
  const getOffsetIndex = (i) => {
    const len = NAV_ITEMS.length;
    let diff = i - activeIdx;
    if (diff > len / 2) diff -= len;
    if (diff < -len / 2) diff += len;
    return diff;
  };

  const handleManualNav = (direction) => {
    const len = NAV_ITEMS.length;
    setActiveIdx((prev) => (prev + direction + len) % len);
  };

  return (
    <div className="fixed inset-0 bg-black flex justify-center items-center overflow-hidden font-serif select-none" style={{ width: '100vw', height: '100dvh' }}>
      <style>{`
        @font-face {
          font-family: 'Kaiti';
          src: local('Kaiti TC'), local('STKaiti'), local('KaiTi');
        }
        .font-kaiti { font-family: 'Kaiti', serif; }
        .game-canvas {
          width: 450px;
          height: 975px;
          position: relative;
          background: #1c1917;
          overflow: hidden;
        }
        .glow-cyan { filter: drop-shadow(0 0 20px rgba(34, 211, 238, 0.7)); }
      `}</style>

      <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="game-canvas" style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
        
        {/* 1. 背景掛軸 */}
        <div className="absolute inset-0 z-0">
          <img src={`${ASSET_PATH}/bg_scroll.webp`} className="w-full h-full object-cover" alt="scroll" />
        </div>

        {/* 2. 上方狀態列 - 位置調高並優化比例 */}
        <div className="absolute top-[20px] inset-x-0 z-20 px-[50px]">
          <div className="flex justify-between items-baseline w-full">
             <span className="text-[54px] font-bold text-stone-900 font-kaiti leading-none">凡人期</span>
             <span className="text-[48px] font-bold text-stone-800 font-sans tracking-tighter opacity-90">16/76</span>
          </div>
          
          <div className="flex gap-10 mt-2 ml-1">
            <div className="flex items-center gap-2">
              <img src={`${ASSET_PATH}/ui_flame.webp`} className="w-8 h-8 object-contain" alt="hp" />
              <span className="text-[26px] font-bold text-stone-800">80/100</span>
            </div>
            <div className="flex items-center gap-2">
              <img src={`${ASSET_PATH}/ui_cloud.webp`} className="w-8 h-8 object-contain" alt="mp" />
              <span className="text-[26px] font-bold text-stone-800">80/100</span>
            </div>
          </div>
        </div>

        {/* 3. 掛軸內容區域 */}
        <div className="absolute top-[150px] inset-x-0 bottom-[260px] z-10 px-[60px] flex flex-col">
          <div className="mt-6 flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIdx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="text-stone-800 font-kaiti"
              >
                <p className="text-[28px] leading-[1.8] tracking-widest">
                  {centerContent}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* 4. 紅印 - 移至左下且恢復姓名 */}
          <div className="absolute bottom-[20px] left-[50px] w-24 h-24 flex items-center justify-center">
            <img src={`${ASSET_PATH}/ui_seal.webp`} className="absolute inset-0 w-full h-full object-contain opacity-90" alt="seal" />
            <span className="relative z-12 text-white/90 font-bold text-[18px] mt-1 font-kaiti" style={{ writingMode: 'vertical-rl' }}>
              {stats.name}
            </span>
          </div>
        </div>

        {/* 5. 前景茶几 */}
        <div className="absolute bottom-0 w-full h-[180px] z-20 pointer-events-none">
          <img src={`${ASSET_PATH}/bg_desk.webp`} className="w-full h-full object-cover object-top" alt="desk" />
        </div>

        {/* 6. 底部導航 - 修復出畫面與首尾接合邏輯 */}
        <div className="absolute bottom-0 inset-x-0 h-[280px] z-30 flex items-center justify-center">
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.4}
            onDragEnd={(e, { offset, velocity }) => {
              const swipeThreshold = 50;
              if (offset.x < -swipeThreshold || velocity.x < -400) handleManualNav(1);
              else if (offset.x > swipeThreshold || velocity.x > 400) handleManualNav(-1);
            }}
            className="relative w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
          >
            {NAV_ITEMS.map((item, i) => {
              const diff = getOffsetIndex(i);
              const isActive = diff === 0;
              
              // 當物件處於邊界切換時（diff 絕對值大於 1），將其隱藏，防止從畫面中間飛過去
              const isHidden = Math.abs(diff) > 1.5;

              return (
                <motion.div
                  key={item.id}
                  initial={false}
                  animate={{
                    x: diff * 135, // 縮小間距防止超出 450px 畫布
                    scale: isActive ? 1.15 : 0.7,
                    opacity: isHidden ? 0 : 1, // 首尾接合時直接淡出，不飛過去
                    zIndex: isActive ? 50 : 10,
                    y: isActive ? -30 : 20,
                  }}
                  transition={{ type: 'spring', stiffness: 250, damping: 30 }}
                  className="absolute"
                  onClick={() => setActiveIdx(i)}
                >
                  <div className="relative flex flex-col items-center">
                    {/* 選中青光特效 - 恢復顯示 */}
                    {isActive && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 bg-cyan-400/25 blur-[40px] rounded-full z-0" 
                      />
                    )}
                    
                    <img
                      src={`${ASSET_PATH}/${item.asset}`}
                      className={`w-[140px] h-[140px] object-contain transition-all duration-300
                        ${isActive ? 'glow-cyan brightness-110' : 'brightness-50 grayscale-[20%]'}`}
                      alt={item.label}
                    />
                    
                    {isActive && (
                      <div className="absolute -bottom-10 text-[18px] text-cyan-50 font-bold tracking-[0.2em] whitespace-nowrap drop-shadow-lg">
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
    </div>
  );
}

export default App;
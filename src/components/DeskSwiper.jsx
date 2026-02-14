import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, ScrollText, Sparkles, Package } from 'lucide-react';

// 定義案几上的物件
export const NAV_ITEMS = [
  { id: 'map', label: '羅盤 (靈脈)', icon: <Compass size={40} />, asset: 'grid_compass.png', color: 'from-amber-600' },
  { id: 'tasks', label: '卷軸 (歷練)', icon: <ScrollText size={40} />, asset: 'grid_log.png', color: 'from-blue-600' },
  { id: 'stats', label: '玉簡 (傳承)', icon: <Sparkles size={40} />, asset: 'grid_jade.png', color: 'from-emerald-600' },
  { id: 'bag', label: '行囊 (物資)', icon: <Package size={40} />, asset: 'grid_bag.png', color: 'from-stone-600' },
];

// 動畫變數定義
const variants = {
  enter: (direction) => ({
    x: direction > 0 ? 200 : -200, // 從右側或左側進入
    opacity: 0,
    scale: 0.8,
    rotate: direction > 0 ? 5 : -5, // 輕微旋轉增加物理感
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      x: { type: "spring", stiffness: 300, damping: 30 },
      opacity: { duration: 0.2 }
    }
  },
  exit: (direction) => ({
    zIndex: 0,
    x: direction < 0 ? 200 : -200, // 向反方向移出
    opacity: 0,
    scale: 0.8,
    rotate: direction < 0 ? 5 : -5,
    transition: {
      x: { type: "spring", stiffness: 300, damping: 30 },
      opacity: { duration: 0.2 }
    }
  })
};

const DeskSwiper = ({ activeIndex, setActiveIndex, assetPath }) => {
  const [[page, direction], setPage] = useState([activeIndex, 0]);

  // 處理滑動結束
  const paginate = (newDirection) => {
    const newIndex = page + newDirection;
    // 循環切換 (若不需要循環，可在此加入邊界檢查)
    let standardizedIndex = newIndex % NAV_ITEMS.length;
    if (standardizedIndex < 0) standardizedIndex = NAV_ITEMS.length - 1;
    
    setPage([standardizedIndex, newDirection]);
    setActiveIndex(standardizedIndex);
  };

  const activeItem = NAV_ITEMS[activeIndex];

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* 感應區域 */}
      <div className="absolute inset-0 z-10" 
        // 簡單的點擊兩側切換，也可換成完整的 useDragControls
        onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            if (x < rect.width / 3) paginate(-1); // 點左側
            else if (x > rect.width * 2 / 3) paginate(1); // 點右側
        }}
      />
      
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={page}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          drag="x" // 啟用水平拖曳
          dragConstraints={{ left: 0, right: 0 }} // 限制拖曳範圍回彈
          dragElastic={0.2}
          onDragEnd={(e, { offset, velocity }) => {
            const swipe = swipePower(offset.x, velocity.x);
            if (swipe < -swipeConfidenceThreshold) {
              paginate(1); // 向左滑，下一頁
            } else if (swipe > swipeConfidenceThreshold) {
              paginate(-1); // 向右滑，上一頁
            }
          }}
          className="absolute flex flex-col items-center justify-center pointer-events-auto cursor-grab active:cursor-grabbing"
          style={{ width: 200, height: 200 }} // 設定物件觸控區大小
        >
          {/* 物件圖檔 (若無圖檔則顯示備用 Icon) */}
          <div className={`relative w-36 h-36 drop-shadow-2xl transition-transform ${activeItem.color ? '' : ''}`}>
             {/* 發光底座效果 */}
             <div className={`absolute inset-x-4 bottom-0 h-1/3 bg-gradient-to-t ${activeItem.color} to-transparent opacity-30 blur-xl rounded-full`}></div>
             
             <img 
               src={`${assetPath}/${activeItem.asset}`} 
               alt={activeItem.label}
               className="w-full h-full object-contain relative z-10"
               onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} 
             />
             {/* 備用 Icon */}
             <div className="hidden w-full h-full items-center justify-center bg-stone-800/50 rounded-2xl border border-stone-600/50 backdrop-blur-sm text-stone-300">
               {activeItem.icon}
             </div>
          </div>
          {/* 標籤 */}
          <motion.p 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-stone-400 text-xs font-bold tracking-widest uppercase text-shadow"
          >
            {activeItem.label}
          </motion.p>
        </motion.div>
      </AnimatePresence>
      
      {/* 兩側提示箭頭 */}
      <div className="absolute left-4 text-stone-600 opacity-30 animate-pulse pointer-events-none">◀</div>
      <div className="absolute right-4 text-stone-600 opacity-30 animate-pulse pointer-events-none">▶</div>
    </div>
  );
};

// 滑動判定輔助函數
const swipeConfidenceThreshold = 10000;
const swipePower = (offset, velocity) => {
  return Math.abs(offset) * velocity;
};

export default DeskSwiper;
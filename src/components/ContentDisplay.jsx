import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, AlertTriangle } from 'lucide-react';

const ContentDisplay = ({ activeTabId, stats, spiritResult, canAwake, triggerRisk }) => {
  
  const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { delay: 0.1, duration: 0.3 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.2 } }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTabId}
        variants={contentVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="w-full text-center flex flex-col items-center gap-4"
      >
        {activeTabId === 'map' && (
          <>
            <h2 className="text-stone-400 text-xs tracking-[0.5em] uppercase mb-2 flex items-center justify-center gap-1">
              <MapPin size={14}/> 靈脈感應
            </h2>
            <p className="text-stone-200 text-lg leading-relaxed font-serif text-shadow-sm">
              「催動羅盤，神識外放。城南方向隱約傳來靈氣波動，似乎有新的機緣...」
            </p>
            <button onClick={triggerRisk} className="mt-4 px-4 py-1.5 border border-stone-600/50 bg-stone-800/30 text-stone-500 text-[10px] rounded-full hover:bg-red-900/20 hover:text-red-400 transition-colors flex items-center gap-1">
              <AlertTriangle size={10}/> 測試風險
            </button>
          </>
        )}

        {activeTabId === 'tasks' && (
          <>
             <h2 className="text-stone-400 text-xs tracking-[0.5em] uppercase mb-2">凡塵歷練</h2>
             <p className="text-stone-200 text-lg leading-relaxed font-serif text-shadow-sm">
              「攤開卷軸，近日懸賞不多。碼頭缺人搬運靈材，雖勞累但報酬尚可。」
            </p>
            {/* 這裡未來可以放任務列表 */}
          </>
        )}

        {activeTabId === 'stats' && (
          <>
            <h2 className="text-stone-400 text-xs tracking-[0.5em] uppercase mb-2">傳承玉簡</h2>
            <div className="bg-stone-800/40 p-4 rounded-2xl border border-emerald-900/30 backdrop-blur-sm">
                <div className="flex justify-center gap-6 text-sm mb-4 font-mono">
                    <div className="flex flex-col items-center"><span className="text-red-400 font-bold text-lg">{stats.physique}</span><span className="text-stone-500 text-xs">體魄</span></div>
                    <div className="flex flex-col items-center"><span className="text-blue-400 font-bold text-lg">{Math.floor(stats.qi)}</span><span className="text-stone-500 text-xs">真氣</span></div>
                </div>
                {canAwake ? (
                  <div className="text-center">
                    <p className="text-xs text-stone-500 mb-1">靈根已覺醒</p>
                    <p className={`text-xl font-bold ${spiritResult.color} animate-pulse`}>{spiritResult.description}</p>
                  </div>
                ) : (
                  <p className="text-stone-500 italic text-xs">「體魄與真氣未達圓滿，玉簡黯淡無光，無法感應靈根。」</p>
                )}
            </div>
          </>
        )}

         {activeTabId === 'bag' && (
          <>
             <h2 className="text-stone-400 text-xs tracking-[0.5em] uppercase mb-2">行囊物資</h2>
             <p className="text-stone-200 text-lg leading-relaxed font-serif text-shadow-sm">
              「打開行囊，內有靈米 {stats.inventory.rice} 斗。在這殘酷的修仙界，這是你最後的依仗。」
            </p>
            {/* 這裡未來可以放物品網格 */}
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default ContentDisplay;
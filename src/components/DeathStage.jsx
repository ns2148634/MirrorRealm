import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from '../store/gameStore';

const DeathStage = () => {
  const isDead = useGameStore((state) => state.isDead);
  const stats = useGameStore((state) => state.stats);
  const inventory = useGameStore((state) => state.inventory);
  const reincarnate = useGameStore((state) => state.reincarnate);

  return (
    <AnimatePresence>
      {isDead && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[80] flex items-center justify-center"
          style={{
            background: 'radial-gradient(circle at center, rgba(139,0,0,0.95) 0%, rgba(0,0,0,0.98) 100%)'
          }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center justify-center text-center px-[8cqw] max-w-[90%]"
          >
            {/* 主標題 */}
            <motion.h1
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="font-calligraphy text-[8cqw] text-red-100 tracking-widest mb-[6cqw] drop-shadow-[0_0_20px_rgba(220,38,38,0.8)]"
              style={{
                textShadow: '0 0 30px rgba(220, 38, 38, 0.6), 0 0 60px rgba(220, 38, 38, 0.3)'
              }}
            >
              壽元已盡，身死道消
            </motion.h1>

            {/* 結算說明 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="mb-[8cqw]"
            >
              <p className="font-kaiti text-[4.2cqw] text-stone-300 leading-relaxed mb-[4cqw]">
                即將進入輪迴。天道將抽取兩成資產，
              </p>
              <p className="font-kaiti text-[4.2cqw] text-stone-300 leading-relaxed mb-[4cqw]">
                且僅有儲物袋內的前 3 件物品能隨靈魂傳承...
              </p>
              
              {/* 資產結算 */}
              <div className="bg-stone-900/60 border border-stone-700/50 rounded-lg p-[4cqw] mb-[4cqw]">
                <div className="flex justify-between mb-[2cqw]">
                  <span className="text-amber-400 font-kaiti text-[3.8cqw]">銀兩遺產：</span>
                  <span className="text-amber-300 font-kaiti text-[3.8cqw]">
                    {stats.silver} → {Math.floor(stats.silver * 0.8)}
                  </span>
                </div>
                <div className="flex justify-between mb-[2cqw]">
                  <span className="text-cyan-400 font-kaiti text-[3.8cqw]">靈石遺產：</span>
                  <span className="text-cyan-300 font-kaiti text-[3.8cqw]">
                    {stats.spirit_stones} → {Math.floor(stats.spirit_stones * 0.8)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400 font-kaiti text-[3.8cqw]">傳承物品：</span>
                  <span className="text-stone-300 font-kaiti text-[3.8cqw]">
                    {inventory.length} 件 → {Math.min(inventory.length, 3)} 件
                  </span>
                </div>
              </div>

              {/* 傳承物品預覽 */}
              {inventory.length > 0 && (
                <div className="bg-stone-800/40 border border-stone-600/40 rounded-lg p-[3cqw]">
                  <p className="text-stone-400 font-kaiti text-[3.5cqw] mb-[2cqw]">隨靈魂傳承：</p>
                  <div className="flex flex-col gap-[1cqw]">
                    {inventory.slice(0, 3).map((item, index) => (
                      <div key={item.id} className="text-stone-300 font-kaiti text-[3.5cqw]">
                        {index + 1}. {item.name} × {item.quantity}
                      </div>
                    ))}
                    {inventory.length > 3 && (
                      <div className="text-red-400 font-kaiti text-[3.2cqw] italic">
                        ... 其餘 {inventory.length - 3} 件物品化為飛灰
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>

            {/* 轉世按鈕 */}
            <motion.button
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.6 }}
              onClick={reincarnate}
              className="px-[8cqw] py-[4cqw] bg-red-900/60 border border-red-600/50 rounded-lg 
                         hover:bg-red-800/80 transition-all duration-300 
                         font-kaiti text-[4.5cqw] text-red-100
                         shadow-[0_0_30px_rgba(220,38,38,0.4)]
                         hover:shadow-[0_0_40px_rgba(220,38,38,0.6)]"
              style={{
                backdropFilter: 'blur(4px)'
              }}
            >
              ▶ 散盡修為，轉世重修
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DeathStage;

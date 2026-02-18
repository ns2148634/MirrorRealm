import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Coins, Map, Sparkles, Package, Store, Compass, ScrollText, X, Download } from 'lucide-react';

// 模擬丹毒系統
const INITIAL_DAN_DOU = 0;

// 底部導航項目 - 無限循環
const BOTTOM_NAV = [
  { id: 'map', label: '地圖', icon: Map },
  { id: 'cultivate', label: '修煉', icon: Sparkles },
  { id: 'bag', label: '行囊', icon: Package },
  { id: 'market', label: '市場', icon: Store },
];

function App() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [scrollContent, setScrollContent] = useState('');
  const [containerWidth, setContainerWidth] = useState(480);
  const containerRef = useRef(null);
  
  // 自動滾動計時器
  const autoScrollRef = useRef(null);

  // 玩家屬性
  const [stats, setStats] = useState({
    name: '創辦人',
    age: 24,
    ageDaysRemaining: 26,
    stamina: 80,
    danDou: 0,
    physique: 20.5,
    qi: 0,
    money: 100,
  });

  // 模擬中間內容滾動
  useEffect(() => {
    // 模擬獲得內容
    setScrollContent(`您在碼頭搬運了兩小時貨物...
獲得銀兩 +30，體力 -10
    
精進榜：
挑夫 - 熟練度 15/100
扁擔功 - 熟練度 5/100`);
  }, []);

  // 無限自動滾動
  useEffect(() => {
    autoScrollRef.current = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % BOTTOM_NAV.length);
    }, 3000); // 每3秒自動切換
    
    return () => clearInterval(autoScrollRef.current);
  }, []);

  // 容器寬度偵測
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // 處理用戶點擊停止自動滾動
  const handleManualNav = (index) => {
    setActiveIdx(index);
    // 重置計時器
    clearInterval(autoScrollRef.current);
    autoScrollRef.current = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % BOTTOM_NAV.length);
    }, 3000);
  };

  const cardGap = Math.min(containerWidth * 0.35, 120);

  return (
    <div className="fixed inset-0 bg-stone-950 flex justify-center items-center overflow-hidden font-serif select-none text-stone-200">
      <style>{`
        .scroll-content::-webkit-scrollbar { width: 4px; }
        .scroll-content::-webkit-scrollbar-thumb { background: #78716c; border-radius: 2px; }
        .scroll-content::-webkit-scrollbar-track { background: #1c1917; }
      `}</style>

      {/* 主容器 */}
      <div 
        ref={containerRef}
        className="relative w-full max-w-[480px] h-full flex flex-col bg-stone-900 overflow-hidden shadow-2xl"
      >
        {/* --- 頂部狀態欄 --- */}
        <div className="flex-shrink-0 bg-stone-950 border-b-2 border-stone-800 p-3">
          <div className="flex items-center justify-between text-xs">
            {/* 姓名 */}
            <div className="text-center">
              <span className="text-stone-400 text-[10px] block">姓名</span>
              <span className="font-bold text-white">{stats.name}</span>
            </div>
            
            {/* 年齡 */}
            <div className="text-center px-3">
              <span className="text-stone-400 text-[10px] block">年齡</span>
              <span className="font-bold text-amber-400">{stats.age} <span className="text-[10px]">(餘 {stats.ageDaysRemaining} 天)</span></span>
            </div>
            
            {/* 體力 */}
            <div className="text-center">
              <span className="text-stone-400 text-[10px] block">體力</span>
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
              <span className="text-stone-400 text-[10px] block">丹毒</span>
              <span className={`font-bold ${stats.danDou > 50 ? 'text-red-500' : 'text-stone-400'}`}>
                {stats.danDou}
              </span>
            </div>
          </div>
          
          {/* 體魄 & 真氣 */}
          <div className="flex items-center justify-around mt-3 text-xs">
            <div className="text-center">
              <span className="text-stone-500 text-[10px] block">體魄</span>
              <div className="flex items-center gap-1">
                <div className="w-16 h-1.5 bg-stone-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-600 to-orange-400"
                    style={{ width: `${stats.physique}%` }}
                  />
                </div>
                <span className="text-orange-400 text-[10px]">{stats.physique}%</span>
              </div>
            </div>
            <div className="text-center">
              <span className="text-stone-500 text-[10px] block">真氣</span>
              <div className="flex items-center gap-1">
                <div className="w-16 h-1.5 bg-stone-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400"
                    style={{ width: `${stats.qi}%` }}
                  />
                </div>
                <span className="text-blue-400 text-[10px]">{stats.qi}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* --- 中間固定尺寸視窗 (內容可滑動) --- */}
        <div className="flex-1 min-h-0 bg-stone-900 border-b-2 border-stone-800 overflow-hidden">
          <div className="h-full p-4 overflow-y-auto scroll-content">
            <div className="text-stone-300 text-sm leading-relaxed whitespace-pre-line">
              {scrollContent || '載入中...'}
            </div>
          </div>
        </div>

        {/* --- 底部導航 (無限循環) --- */}
        <div className="flex-shrink-0 bg-stone-950 border-t-4 border-stone-800 p-4">
          <div className="flex items-center justify-center gap-2">
            {BOTTOM_NAV.map((item, i) => (
              <motion.button
                key={item.id}
                onClick={() => handleManualNav(i)}
                className={`
                  flex flex-col items-center justify-center px-4 py-2 rounded-xl transition-all
                  ${i === activeIdx 
                    ? 'bg-amber-900/40 border border-amber-600/50 text-amber-400 scale-110' 
                    : 'bg-stone-800/50 border border-stone-700 text-stone-500'}
                `}
                animate={{
                  scale: i === activeIdx ? 1.1 : 1,
                }}
              >
                <item.icon size={20} />
                <span className="text-[10px] mt-1 font-bold">{item.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

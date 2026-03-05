import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from './store/gameStore';

const ASSET_PATH = '/assets/mortal';
// 1. 定義你準備好的兩張新圖檔路徑
const JADE_ASSET = `${ASSET_PATH}/ui_letter.webp`;
const TAIJI_ASSET = `${ASSET_PATH}/ui_taiji.webp`;

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
  const constraintsRef = useRef(null); // 用來限制玉珮只能在畫面內拖動

  // 從 Zustand store 獲取資料
  const stats = useGameStore((state) => state.stats);
  const notifications = useGameStore((state) => state.notifications);
  const markAllNotificationsRead = useGameStore((state) => state.markAllNotificationsRead);
  const doMortalWork = useGameStore((state) => state.doMortalWork);

  // 彈窗開關狀態
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const unreadCount = notifications.filter(n => n.unread).length;

  // 拆分出 標題 與 內文，以配合左右直橫排版
  const pageData = useMemo(() => {
    const item = NAV_ITEMS[activeIdx];
    switch (item.id) {
      case 'status':
        return {
          title: '本命神識',
          body: `體魄：${stats.physique}%\n真氣：0%\n穢氣：0%\n\n境界：一介凡人\n靈根：尚未覺醒`
        };
      case 'map':
        return {
          title: '尋緣探秘',
          body: `北方 300 公尺處\n靈氣隱隱躁動...\n\n(偵測到 2 名道友神識)`
        };
      case 'scroll':
        return {
          title: '紅塵歷練',
          body: (
            <div>
              <p style={{ fontSize: '4.8cqw' }} className="leading-[1.8] tracking-[0.1em] whitespace-pre-wrap mb-[2cqw]">
                街角傳來陣陣喧鬧，\n似乎有凡人正在爭執。
              </p>
              <div 
                onClick={doMortalWork}
                className="inline-block cursor-pointer hover:text-cyan-600 transition-colors"
                style={{ fontSize: '4.8cqw' }}
              >
                ▶ 前往查看 (消耗 10 體力)
              </div>
            </div>
          )
        };
      case 'cultivate':
        return {
          title: '閉關修煉',
          body: `當前未選擇功法。\n\n建議前往坊市尋找\n基礎《吐納訣》。`
        };
      case 'market':
        return {
          title: '萬象坊市',
          body: `今日市集熱鬧非凡。\n\n【回體丹】跌價 5%\n【神行符】缺貨中`
        };
      case 'bag':
        return {
          title: '隨身行囊',
          body: `下品儲物袋 (3/10)\n\n• 凡塵銀兩 × ${stats.silver || 50}\n• 粗製鐵劍 × 1\n• 饅頭 × 2`
        };
      default:
        return { title: item.label, body: '內容建設中...\n全佈局已鎖定黃金比例。' };
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

  const handleOpenMessage = () => {
    setIsMessageOpen(true);
    // 打開後將所有訊息設為已讀
    markAllNotificationsRead();
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
        @import url('https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&display=swap');
        
        @font-face {
          font-family: 'Kaiti';
          src: local('Kaiti TC'), local('STKaiti'), local('KaiTi');
        }
        .font-kaiti { font-family: 'Kaiti', serif; }
        .font-calligraphy { font-family: 'Ma Shan Zheng', cursive; }
        
        .glow-cyan { filter: drop-shadow(0 0 15px rgba(34, 211, 238, 0.8)); }
        .game-pillar-shadow { box-shadow: 0 0 80px rgba(0,0,0,0.6); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        /* 太極圖緩慢旋轉動畫 */
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow { animation: spin-slow 15s linear infinite; }
      `}</style>

      {/* 核心容器加入 ref，用來當作拖曳範圍的結界 */}
      <div
        ref={constraintsRef}
        className="relative flex flex-col game-pillar-shadow overflow-hidden bg-transparent"
        style={{
          aspectRatio: '9 / 19',
          width: 'min(100vw, 500px, calc(100dvh * (9 / 19)))',
          height: 'calc(min(100vw, 500px, calc(100dvh * (9 / 19))) * (19 / 9))',
          containerType: 'inline-size'
        }}
      >

        {/* ================= 1. 上方狀態列 (左上壽元 / 右上太極設定) ================= */}
        <div className="w-full h-[10%] px-[8%] flex flex-col justify-center z-20 relative pt-[4%]">
          <div className="relative flex justify-between items-center w-full text-white drop-shadow-md">
            
            {/* 左上：境界與壽元 */}
            <div className="flex items-baseline gap-[3cqw]">
              <span style={{ fontSize: '8cqw' }} className="font-calligraphy leading-none tracking-widest text-white">凡人期</span>
              <span style={{ fontSize: '6cqw' }} className="font-kaiti tracking-tighter drop-shadow-md">
                <span className={stats.maxAge - stats.age <= 10 ? 'text-red-400 font-bold' : 'text-white'}>
                  {stats.age}
                </span>
                <span className="text-white/50 mx-[0.5cqw] font-sans">/</span>
                <span className="text-white/80">{stats.maxAge}</span>
                <span style={{ fontSize: '4cqw' }} className="ml-[1cqw] text-white/70">載</span>
              </span>
            </div>

            {/* 右上：太極 (系統設定) */}
            <div 
              className="w-[10cqw] aspect-square flex items-center justify-center cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
              onClick={() => setIsSettingsOpen(true)}
            >
              <img src={TAIJI_ASSET} className="w-full h-full object-contain animate-spin-slow drop-shadow-md" alt="settings" />
            </div>

          </div>
        </div>

        {/* ================= 2. 中間紙張區域 ================= */}
        <div className="w-full h-[70%] relative z-10 flex justify-center items-stretch">
          <div
            className="w-[85%] h-full relative no-scrollbar overflow-y-auto"
            style={{
              backgroundImage: `url(${ASSET_PATH}/bg_paper_tile.webp)`,
              backgroundRepeat: 'repeat',
              boxShadow: '0 0 30px rgba(0,0,0,0.5), inset 0 0 30px rgba(0,0,0,0.05)'
            }}
          > 
            {/* 體力與精力 (維持原位) */}
            <div className="flex gap-[10%] mt-[6%] ml-[10%]">
              <div className="flex items-center gap-[1.5cqw]">
                <img src={`${ASSET_PATH}/ui_flame.webp`} className="w-[7cqw] aspect-square object-contain" alt="stamina" />
                <span style={{ fontSize: '5.5cqw' }} className="font-bold text-stone-800">{stats.stamina}/100</span>
              </div>
              <div className="flex items-center gap-[1.5cqw]">
                <img src={`${ASSET_PATH}/ui_cloud.webp`} className="w-[7cqw] aspect-square object-contain" alt="energy" />
                <span style={{ fontSize: '5.5cqw' }} className="font-bold text-stone-800">{stats.energy}/100</span>
              </div>
            </div>
            
            {/* 內文與直式標題區塊 */}
            <div className="flex px-[8%] pt-[6%] pb-[25%] h-full">
              
              {/* 左側：橫式內文 */}
              <div className="flex-1 pr-[4cqw]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`body-${activeIdx}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.4 }}
                    className="text-stone-800 font-kaiti"
                  >
                    <div style={{ fontSize: '4.8cqw' }} className="leading-[1.8] tracking-[0.1em] whitespace-pre-wrap">
                      {typeof pageData.body === 'string' ? pageData.body : pageData.body}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* 右側：直式大標題 */}
              <div className="w-[12cqw] border-l border-stone-800/20 flex flex-col items-center pt-[2%] relative pointer-events-none">
                 <AnimatePresence mode="wait">
                   <motion.h2
                     key={`title-${activeIdx}`}
                     initial={{ opacity: 0, y: -10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -10 }}
                     transition={{ duration: 0.4 }}
                     style={{ writingMode: 'vertical-rl', fontSize: '7.5cqw' }}
                     className="font-bold text-stone-900 font-kaiti tracking-[0.3em]"
                   >
                     {pageData.title}
                   </motion.h2>
                 </AnimatePresence>
              </div>

            </div>

            {/* 右下角：紅印章落款 */}
            <div className="absolute bottom-[4%] right-[5%] w-[20%] aspect-square flex items-center justify-center pointer-events-none opacity-90">
              <img src={`${ASSET_PATH}/ui_seal.webp`} className="absolute inset-0 w-full h-full object-contain" alt="seal" />
              <span style={{ fontSize: '3.8cqw', writingMode: 'vertical-rl' }} className="relative z-12 text-white/95 font-bold font-kaiti mt-[5%]">
                {stats.name}
              </span>
            </div>

          </div>
        </div>

        {/* ================= 3. 底部桌案與導航 ================= */}
        <div className="w-full h-[20%] relative z-30 pointer-events-none">
          {/* 加入 pointer-events-none 讓玉珮拖動時不會被茶几擋住判定，但選單仍可點 */}
          <div className="absolute inset-0 w-full h-full z-10">
            <div className="absolute top-[-10%] left-0 right-0 h-[10%] shadow-[0_-25px_50px_-10px_rgba(0,0,0,0.8)]"></div>
            <img src={`${ASSET_PATH}/bg_desk.webp`} className="w-full h-full object-cover object-top" alt="desk" />
          </div>

          <div className="absolute inset-0 z-20 flex items-center justify-center overflow-visible pointer-events-auto">
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
                      x: `${diff * 115}%`,
                      scale: isActive ? 1.15 : 0.75,
                      opacity: isFar ? 0 : 1,
                      zIndex: isActive ? 50 : 10,
                      y: isActive ? "-40%" : "-15%",
                    }}
                    transition={{ type: 'spring', stiffness: 260, damping: 30 }}
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

        {/* ================= 4. 可拖曳的神識玉珮 (社交通知) ================= */}
        <motion.div
          drag
          dragConstraints={constraintsRef} // 限制只能在畫面內拖動
          dragElastic={0.1}
          dragMomentum={false} // 放開後不滑行，精準停留在玩家放下的位置
          whileTap={{ scale: 0.95 }}
          onClick={handleOpenMessage}
          className="absolute z-[40] flex items-center justify-center cursor-pointer"
          style={{ width: '15cqw', height: '15cqw', right: '5%', bottom: '25%' }} // 預設位置
        >
          <img src={JADE_ASSET} alt="jade" className="w-full h-full object-contain drop-shadow-[0_5px_15px_rgba(0,0,0,0.6)]" />
          
          {/* 未讀紅點提示 */}
          {unreadCount > 0 && (
            <>
              <span className="absolute top-[5%] right-[5%] w-[3.5cqw] h-[3.5cqw] bg-red-500 rounded-full animate-ping opacity-75" />
              <span className="absolute top-[5%] right-[5%] w-[3.5cqw] h-[3.5cqw] bg-red-500 rounded-full border border-white/50" />
            </>
          )}
        </motion.div>

        {/* ================= 5. 神識玉簡 Modal (半透明暗黑琉璃風) ================= */}
        <AnimatePresence>
          {isMessageOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="absolute inset-[6%] z-[60] p-[5cqw] rounded-xl backdrop-blur-md bg-stone-950/85 border border-cyan-500/40 shadow-[0_0_30px_rgba(34,211,238,0.2)] flex flex-col"
            >
              <div className="flex justify-between items-center mb-[4cqw] pb-[2cqw] border-b border-cyan-800/60">
                <h2 className="text-cyan-300 font-calligraphy text-[7cqw] tracking-widest drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">神識玉簡</h2>
                <button onClick={() => setIsMessageOpen(false)} className="text-stone-400 hover:text-white text-[6cqw]">✕</button>
              </div>
              
              <div className="flex-grow overflow-y-auto no-scrollbar flex flex-col gap-[3cqw]">
                {notifications.map(n => (
                  <div key={n.id} className="p-[3.5cqw] rounded-lg bg-stone-900/60 border border-stone-700/50 shadow-inner">
                    <div className="flex justify-between items-center mb-1">
                      <span className={`font-bold text-[4cqw] ${n.type === '天道提示' ? 'text-amber-400' : 'text-cyan-400'}`}>
                        【{n.type}】
                      </span>
                      <span className="text-stone-500 text-[3.5cqw]">{n.time}</span>
                    </div>
                    <p className="text-stone-300 text-[4cqw] leading-relaxed font-kaiti mt-1">{n.text}</p>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <p className="text-stone-500 text-center mt-[10cqw] font-kaiti text-[4.5cqw]">神識之中，一片虛無。</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ================= 6. 設定 Modal (半透明暗黑琉璃風) ================= */}
        <AnimatePresence>
          {isSettingsOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-[10%] bottom-[20%] z-[60] p-[6cqw] rounded-xl backdrop-blur-md bg-stone-950/85 border border-stone-500/40 shadow-[0_0_30px_rgba(0,0,0,0.8)] flex flex-col items-center"
            >
              <div className="w-full flex justify-between items-center mb-[6cqw] pb-[3cqw] border-b border-stone-600/50">
                <h2 className="text-stone-200 font-calligraphy text-[7cqw] tracking-widest">造化設定</h2>
                <button onClick={() => setIsSettingsOpen(false)} className="text-stone-400 hover:text-white text-[6cqw]">✕</button>
              </div>
              
              <div className="flex-grow w-full flex flex-col gap-[4cqw] justify-center">
                <button className="py-[3.5cqw] w-full border border-stone-600/50 rounded-lg text-stone-300 bg-stone-800/40 hover:bg-stone-700/60 font-kaiti text-[4.5cqw] transition-colors">
                  【仙音靈籟】 音效開關
                </button>
                <button className="py-[3.5cqw] w-full border border-stone-600/50 rounded-lg text-stone-300 bg-stone-800/40 hover:bg-stone-700/60 font-kaiti text-[4.5cqw] transition-colors">
                  【凝聚神魂】 綁定帳號
                </button>
                <button className="py-[3.5cqw] w-full border border-stone-600/50 rounded-lg text-red-400 bg-stone-800/40 hover:bg-stone-700/60 font-kaiti text-[4.5cqw] transition-colors mt-[4cqw]">
                  【神遊太虛】 登出
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

export default App;
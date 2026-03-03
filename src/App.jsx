import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ASSET_PATH = '/assets/mortal';
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
  // ================= 狀態管理 =================
  // 控制遊戲階段：'login' (登入) -> 'naming' (創角) -> 'playing' (主遊戲)
  const [gameStage, setGameStage] = useState('login'); 
  const [inputName, setInputName] = useState(''); // 暫存玩家輸入的名字

  const [activeIdx, setActiveIdx] = useState(1);
  const constraintsRef = useRef(null);

  const [stats, setStats] = useState({
    name: '無名氏', // 預設名字，會在 naming 階段被替換
    age: 16,
    maxAge: 76,
    stamina: 80,
    energy: 80,
    physique: 20.5,
  });

  const [notifications, setNotifications] = useState([
    { id: 1, type: '天道提示', text: '天降甘霖，獲得每日登入機緣：下品靈石 x50。', time: '剛剛', unread: true },
    { id: 2, type: '神識傳音', text: '道友「清風劍客」向你發來一道傳音符：『今晚一起探索秘境嗎？』', time: '1小時前', unread: true },
  ]);

  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const unreadCount = notifications.filter(n => n.unread).length;

  // ================= 邏輯與事件 =================
  const handleConfirmName = () => {
    if (inputName.trim() === '') return;
    setStats(prev => ({ ...prev, name: inputName })); // 更新狀態裡的名字
    setGameStage('playing'); // 進入主遊戲
  };

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

  const handleOpenMessage = () => {
    setIsMessageOpen(true);
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
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
        @font-face { font-family: 'Kaiti'; src: local('Kaiti TC'), local('STKaiti'), local('KaiTi'); }
        .font-kaiti { font-family: 'Kaiti', serif; }
        .font-calligraphy { font-family: 'Ma Shan Zheng', cursive; }
        .glow-cyan { filter: drop-shadow(0 0 15px rgba(34, 211, 238, 0.8)); }
        .game-pillar-shadow { box-shadow: 0 0 80px rgba(0,0,0,0.6); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 15s linear infinite; }
      `}</style>

      {/* 核心容器保持 9:19 比例 */}
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
        <AnimatePresence mode="wait">
          
          {/* ================= 階段一：登入/註冊畫面 ================= */}
          {gameStage === 'login' && (
            <motion.div 
              key="login"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center p-[8cqw] backdrop-blur-sm bg-stone-900/60"
            >
              <h1 className="text-white font-calligraphy text-[15cqw] drop-shadow-lg mb-[2cqw] tracking-widest text-cyan-100">
                鏡界
              </h1>
              <p className="text-stone-300 font-kaiti text-[4.5cqw] mb-[15cqw] tracking-widest">踏入仙途，尋覓長生</p>

              <div className="w-full max-w-[80%] flex flex-col gap-[4cqw]">
                {/* 這裡之後可以綁定 Supabase 的 handleEmailLogin */}
                <button 
                  onClick={() => setGameStage('naming')} 
                  className="py-[3.5cqw] w-full border border-stone-400/50 rounded-lg text-stone-200 bg-stone-800/80 hover:bg-stone-700 font-kaiti text-[4.5cqw] transition-colors shadow-lg"
                >
                  【飛劍傳印】 Email 註冊/登入
                </button>
                
                {/* 這裡之後可以綁定 Supabase 的 handleGoogleLogin */}
                <button 
                  onClick={() => setGameStage('naming')} 
                  className="py-[3.5cqw] w-full border border-cyan-500/50 rounded-lg text-cyan-100 bg-cyan-900/40 hover:bg-cyan-800/60 font-kaiti text-[4.5cqw] transition-colors shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                >
                  【天道之力】 Google 一鍵登入
                </button>
              </div>
            </motion.div>
          )}

          {/* ================= 階段二：輸入姓名 (創角) ================= */}
          {gameStage === 'naming' && (
            <motion.div 
              key="naming"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center p-[8cqw] backdrop-blur-md bg-stone-900/80"
            >
              <div className="w-full max-w-[85%] p-[8cqw] rounded-xl border border-stone-500/40 shadow-[0_0_30px_rgba(0,0,0,0.8)] flex flex-col items-center bg-stone-950/60">
                <h2 className="text-stone-200 font-calligraphy text-[8cqw] tracking-widest mb-[6cqw]">凝聚真名</h2>
                
                <input 
                  type="text" 
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  placeholder="請輸入道友名諱..."
                  className="w-full bg-stone-800/50 border border-stone-600/50 rounded-lg py-[3cqw] px-[4cqw] text-white font-kaiti text-[5cqw] text-center focus:outline-none focus:border-cyan-500/80 transition-colors mb-[6cqw]"
                  maxLength={6}
                />

                <button 
                  onClick={handleConfirmName}
                  disabled={inputName.trim() === ''}
                  className={`py-[3cqw] w-full rounded-lg font-kaiti text-[5cqw] transition-colors tracking-widest ${
                    inputName.trim() === '' 
                      ? 'bg-stone-800 text-stone-500 border border-stone-700' 
                      : 'bg-cyan-800/80 text-cyan-100 border border-cyan-500/50 hover:bg-cyan-700 shadow-[0_0_15px_rgba(34,211,238,0.3)]'
                  }`}
                >
                  踏入仙途
                </button>
              </div>
            </motion.div>
          )}

          {/* ================= 階段三：正式遊戲主畫面 ================= */}
          {gameStage === 'playing' && (
            <motion.div 
              key="playing"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}
              className="absolute inset-0 flex flex-col"
            >
              {/* --- 上方狀態列 --- */}
              <div className="w-full h-[10%] px-[8%] flex flex-col justify-center z-20 relative">
                <div className="relative flex justify-between items-baseline w-full text-white drop-shadow-md">
                  <span style={{ fontSize: '6cqw' }} className="font-kaiti opacity-90">{stats.name}</span>
                  <span style={{ fontSize: '9cqw' }} className="absolute left-1/2 -translate-x-1/2 font-calligraphy leading-none tracking-widest text-white">凡人期</span>
                  <div className="flex flex-col items-end justify-center">
                    <span style={{ fontSize: '6cqw' }} className="font-kaiti tracking-tighter drop-shadow-md">
                      <span className={stats.maxAge - stats.age <= 10 ? 'text-red-400 font-bold' : 'text-white'}>{stats.age}</span>
                      <span className="text-white/50 mx-[0.5cqw] font-sans">/</span>
                      <span className="text-white/80">{stats.maxAge}</span>
                      <span style={{ fontSize: '4cqw' }} className="ml-[1cqw] text-white/70">載</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* --- 中間紙張區域 --- */}
              <div className="w-full h-[70%] relative z-10 flex justify-center items-stretch">
                <div className="w-[85%] h-full relative no-scrollbar overflow-y-auto" style={{ backgroundImage: `url(${ASSET_PATH}/bg_paper_tile.webp)`, backgroundRepeat: 'repeat', boxShadow: '0 0 30px rgba(0,0,0,0.5), inset 0 0 30px rgba(0,0,0,0.05)' }}> 
                  <div className="flex gap-[10%] mt-[2%] ml-[10%]">
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
                      <motion.div key={activeIdx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="text-stone-800 font-kaiti">
                        <p style={{ fontSize: '4.8cqw' }} className="leading-[1.8] tracking-[0.2em] whitespace-pre-wrap">{centerContent}</p>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <div className="absolute bottom-[2%] left-[2%] w-[22%] aspect-square flex items-center justify-center pointer-events-none">
                    <img src={`${ASSET_PATH}/ui_seal.webp`} className="absolute inset-0 w-full h-full object-contain opacity-95" alt="seal" />
                    <span style={{ fontSize: '3.8cqw', writingMode: 'vertical-rl' }} className="relative z-12 text-white/90 font-bold font-kaiti mt-[5%]">{stats.name}</span>
                  </div>

                  <div className="absolute bottom-[2%] right-[2%] w-[18%] aspect-square flex items-center justify-center cursor-pointer opacity-40 hover:opacity-80 transition-opacity" onClick={() => setIsSettingsOpen(true)}>
                    <img src={TAIJI_ASSET} className="w-full h-full object-contain animate-spin-slow drop-shadow-md" alt="settings" />
                  </div>
                </div>
              </div>

              {/* --- 底部桌案與導航 --- */}
              <div className="w-full h-[20%] relative z-30 pointer-events-none">
                <div className="absolute inset-0 w-full h-full z-10">
                  <div className="absolute top-[-10%] left-0 right-0 h-[10%] shadow-[0_-25px_50px_-10px_rgba(0,0,0,0.8)]"></div>
                  <img src={`${ASSET_PATH}/bg_desk.webp`} className="w-full h-full object-cover object-top" alt="desk" />
                </div>
                <div className="absolute inset-0 z-20 flex items-center justify-center overflow-visible pointer-events-auto">
                  <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.4} onDragEnd={(e, { offset, velocity }) => { const swipeThreshold = 50; if (offset.x < -swipeThreshold || velocity.x < -400) handleNav(1); else if (offset.x > swipeThreshold || velocity.x > 400) handleNav(-1); }} className="relative w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing pb-[5%]">
                    {NAV_ITEMS.map((item, i) => {
                      const diff = getOffsetIndex(i);
                      const isActive = diff === 0;
                      return (
                        <motion.div key={item.id} animate={{ x: `${diff * 115}%`, scale: isActive ? 1.15 : 0.75, opacity: Math.abs(diff) > 1.5 ? 0 : 1, zIndex: isActive ? 50 : 10, y: isActive ? "-40%" : "-15%" }} transition={{ type: 'spring', stiffness: 260, damping: 30 }} className="absolute w-[36%] aspect-square flex flex-col items-center justify-center" onClick={() => setActiveIdx(i)}>
                          <div className="relative flex flex-col items-center justify-center w-full h-full">
                            {isActive && <div className="absolute -inset-[20%] bg-cyan-400/25 blur-[3cqw] rounded-full z-0" />}
                            <img src={`${ASSET_PATH}/${item.asset}`} className={`w-full h-full object-contain transition-all duration-300 ${isActive ? 'glow-cyan brightness-110' : 'brightness-50 grayscale-[20%]'}`} alt={item.label} />
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </div>
              </div>

              {/* --- 可拖曳的神識通知 --- */}
              <motion.div drag dragConstraints={constraintsRef} dragElastic={0.1} dragMomentum={false} whileTap={{ scale: 0.95 }} onClick={handleOpenMessage} className="absolute z-[40] flex items-center justify-center cursor-pointer" style={{ width: '15cqw', height: '15cqw', right: '5%', bottom: '25%' }}>
                <img src={JADE_ASSET} alt="jade" className="w-full h-full object-contain drop-shadow-[0_5px_15px_rgba(0,0,0,0.6)]" />
                {unreadCount > 0 && (
                  <><span className="absolute top-[5%] right-[5%] w-[3.5cqw] h-[3.5cqw] bg-red-500 rounded-full animate-ping opacity-75" /><span className="absolute top-[5%] right-[5%] w-[3.5cqw] h-[3.5cqw] bg-red-500 rounded-full border border-white/50" /></>
                )}
              </motion.div>

              {/* --- 通知 Modal --- */}
              <AnimatePresence>
                {isMessageOpen && (
                  <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="absolute inset-[6%] z-[60] p-[5cqw] rounded-xl backdrop-blur-md bg-stone-950/85 border border-cyan-500/40 shadow-[0_0_30px_rgba(34,211,238,0.2)] flex flex-col">
                    <div className="flex justify-between items-center mb-[4cqw] pb-[2cqw] border-b border-cyan-800/60">
                      <h2 className="text-cyan-300 font-calligraphy text-[7cqw] tracking-widest drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">飛鴿驛報</h2>
                      <button onClick={() => setIsMessageOpen(false)} className="text-stone-400 hover:text-white text-[6cqw]">✕</button>
                    </div>
                    <div className="flex-grow overflow-y-auto no-scrollbar flex flex-col gap-[3cqw]">
                      {notifications.map(n => (
                        <div key={n.id} className="p-[3.5cqw] rounded-lg bg-stone-900/60 border border-stone-700/50 shadow-inner">
                          <div className="flex justify-between items-center mb-1">
                            <span className={`font-bold text-[4cqw] ${n.type === '天道提示' ? 'text-amber-400' : 'text-cyan-400'}`}>【{n.type}】</span>
                            <span className="text-stone-500 text-[3.5cqw]">{n.time}</span>
                          </div>
                          <p className="text-stone-300 text-[4cqw] leading-relaxed font-kaiti mt-1">{n.text}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* --- 設定 Modal --- */}
              <AnimatePresence>
                {isSettingsOpen && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute inset-[10%] bottom-[20%] z-[60] p-[6cqw] rounded-xl backdrop-blur-md bg-stone-950/85 border border-stone-500/40 shadow-[0_0_30px_rgba(0,0,0,0.8)] flex flex-col items-center">
                    <div className="w-full flex justify-between items-center mb-[6cqw] pb-[3cqw] border-b border-stone-600/50">
                      <h2 className="text-stone-200 font-calligraphy text-[7cqw] tracking-widest">造化設定</h2>
                      <button onClick={() => setIsSettingsOpen(false)} className="text-stone-400 hover:text-white text-[6cqw]">✕</button>
                    </div>
                    <div className="flex-grow w-full flex flex-col gap-[4cqw] justify-center">
                      <button className="py-[3.5cqw] w-full border border-stone-600/50 rounded-lg text-stone-300 bg-stone-800/40 hover:bg-stone-700/60 font-kaiti text-[4.5cqw] transition-colors">【仙音靈籟】 音效開關</button>
                      <button className="py-[3.5cqw] w-full border border-stone-600/50 rounded-lg text-red-400 bg-stone-800/40 hover:bg-stone-700/60 font-kaiti text-[4.5cqw] transition-colors mt-[4cqw]" onClick={() => setGameStage('login')}>【神遊太虛】 登出/返回標題</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
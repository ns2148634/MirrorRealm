// src/App.jsx
import React, { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import useGameStore from './store/gameStore';

// ⚠️ 注意：如果你的檔案位置不同，請調整引入路徑
import LoginStage from './components/LoginStage'; // 或 './views/LoginStage'
import NamingStage from './components/NamingStage'; // 或 './views/NamingStage'
// ✅ 正確的空間座標：
import PlayingStage from './components/PlayingStage';
export default function App() {
  // 從 Zustand store 獲取資料
  const gameStage = useGameStore((state) => state.gameStage);
  const checkAuthAndPlayer = useGameStore((state) => state.checkAuthAndPlayer);
  const startOnlineRecovery = useGameStore((state) => state.startOnlineRecovery);
  const stopOnlineRecovery = useGameStore((state) => state.stopOnlineRecovery);
  const generateInitialTasks = useGameStore((state) => state.generateInitialTasks);
  const fetchPlayerStatus = useGameStore((state) => state.fetchPlayerStatus);

  // 應用啟動時檢查認證狀態
  useEffect(() => {
    checkAuthAndPlayer();
  }, [checkAuthAndPlayer]);

  // 天道時間流逝系統 (保留你原本的完美邏輯)
  useEffect(() => {
    if (gameStage === 'playing') {
      fetchPlayerStatus().then(() => {
        generateInitialTasks();
        startOnlineRecovery();
      });
    }
    return () => {
      stopOnlineRecovery();
    };
  }, [gameStage, fetchPlayerStatus, startOnlineRecovery, stopOnlineRecovery, generateInitialTasks]);

  return (
    <>
      {/* 🌟 第一道封印：鎮壓瀏覽器預設的物理法則 (寫入全域 CSS) */}
      <style>{`
        html, body, #root {
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
          overflow: hidden; /* 鎖死最外層，不准出現滾動條 */
          overscroll-behavior: none; /* 禁用手機的「邊緣回彈」與「下拉重新整理」 */
          -webkit-user-select: none; /* 徹底禁用 iOS 長按反白文字的行為 */
          -webkit-touch-callout: none; /* 禁用長按彈出選單 */
        }
      `}</style>

      {/* 🌟 第二道封印：將 w-screen h-screen 改為 fixed inset-0 */}
      {/* fixed inset-0 會把這個黑底容器死死「釘」在螢幕的四個角落，絕對不會跟著滑動 */}
      <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden font-serif select-none">
        
        {/* 遊戲本體結界 (Mobile Wrapper) */}
        <div className="w-full h-full max-w-[430px] max-h-[932px] relative bg-[#0F1115] sm:rounded-[2rem] sm:border border-white/10 overflow-hidden shadow-[0_0_50px_rgba(0,229,255,0.05)]">
          
          <AnimatePresence mode="wait">
            {/* 階段一：登入/註冊畫面 */}
            {gameStage === 'login' && <LoginStage key="login" />}

            {/* 階段二：輸入姓名 (創角) */}
            {gameStage === 'naming' && <NamingStage key="naming" />}

            {/* 階段三：正式遊戲主畫面 */}
            {gameStage === 'playing' && <PlayingStage key="playing" />}
          </AnimatePresence>

        </div>
      </div>
    </>
  );
}
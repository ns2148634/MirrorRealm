// src/App.jsx
import React, { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import useGameStore from './store/gameStore';

// ⚠️ 注意：如果你的檔案位置不同，請調整引入路徑
import LoginStage from './components/LoginStage'; // 或 './views/LoginStage'
import NamingStage from './components/NamingStage'; // 或 './views/NamingStage'
import PlayingStage from './views/PlayingStage'; // 👈 確保路徑指向你最新的 PlayingStage

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
    // 🌟 第一層：滿版純黑底色，負責在電腦/平板上置中遊戲畫面
    <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden font-serif select-none">
      
      {/* 🌟 第二層：遊戲本體結界 (Mobile Wrapper) */}
      {/* 限制最大寬度 430px (iPhone Pro Max 尺寸)，超出的螢幕會留黑邊 */}
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
  );
}
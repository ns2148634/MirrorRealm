import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import useGameStore from './store/gameStore';
import LoginStage from './components/LoginStage';
import NamingStage from './components/NamingStage';
import PlayingStage from './components/PlayingStage';

const ASSET_PATH = '/assets/mortal';

function App() {
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

  // 天道時間流逝系統
  useEffect(() => {
    // 當進入 playing 階段時，啟動在線恢復
    if (gameStage === 'playing') {
      // 先載入玩家狀態（處理離線收益）
      fetchPlayerStatus().then(() => {
        // 載入完成後生成任務列表並啟動在線恢復
        generateInitialTasks();
        startOnlineRecovery();
      });
    }

    // 清理函式：組件卸載時停止恢復計時器
    return () => {
      stopOnlineRecovery();
    };
  }, [gameStage, fetchPlayerStatus, startOnlineRecovery, stopOnlineRecovery, generateInitialTasks]);

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
        className="relative flex flex-col game-pillar-shadow overflow-hidden bg-transparent"
        style={{
          aspectRatio: '9 / 19',
          width: 'min(100vw, 500px, calc(100dvh * (9 / 19)))',
          height: 'calc(min(100vw, 500px, calc(100dvh * (9 / 19))) * (19 / 9))',
          containerType: 'inline-size'
        }}
      >
        <AnimatePresence mode="wait">
          {/* 階段一：登入/註冊畫面 */}
          {gameStage === 'login' && <LoginStage />}

          {/* 階段二：輸入姓名 (創角) */}
          {gameStage === 'naming' && <NamingStage />}

          {/* 階段三：正式遊戲主畫面 */}
          {gameStage === 'playing' && <PlayingStage />}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
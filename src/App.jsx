// src/App.jsx
import React, { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import useGameStore from './store/gameStore';

import LoginStage from './components/LoginStage'; 
import NamingStage from './components/NamingStage'; 
import PlayingStage from './components/PlayingStage'; 

export default function App() {
  const gameStage = useGameStore((state) => state.gameStage);
  const checkAuthAndPlayer = useGameStore((state) => state.checkAuthAndPlayer);
  const startOnlineRecovery = useGameStore((state) => state.startOnlineRecovery);
  const stopOnlineRecovery = useGameStore((state) => state.stopOnlineRecovery);
  const generateInitialTasks = useGameStore((state) => state.generateInitialTasks);
  const fetchPlayerStatus = useGameStore((state) => state.fetchPlayerStatus);

  useEffect(() => {
    checkAuthAndPlayer();
  }, [checkAuthAndPlayer]);

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
      {/* =========================================
          🌟 核心法陣一：全域 CSS 護盾
          (鎮壓橡皮筋回彈、隱藏醜陋滾動條、保留自訂字型)
          ========================================= */}
      <style>{`
        html, body, #root {
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
          overflow: hidden; 
          overscroll-behavior: none; 
          -webkit-user-select: none; 
          -webkit-touch-callout: none; 
        }
        
        /* 隱藏滾動條，但保留手指/滑鼠滾動功能 */
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        /* 保留你原本的修仙字體設定 */
        @import url('https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&display=swap');
        @font-face { font-family: 'Kaiti'; src: local('Kaiti TC'), local('STKaiti'), local('KaiTi'); }
        .font-kaiti { font-family: 'Kaiti', serif; }
        .font-calligraphy { font-family: 'Ma Shan Zheng', cursive; }
      `}</style>

      <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden font-serif select-none">
        
        {/* =========================================
            🌟 核心法陣二：天地結界 (Mobile Wrapper)
            ========================================= */}
        <div 
          className="w-full h-full max-w-[430px] max-h-[932px] relative bg-[#0F1115] sm:rounded-[2rem] sm:border border-white/10 overflow-hidden shadow-[0_0_50px_rgba(0,229,255,0.05)]"
          // 👇 就是這個陣眼！有了它，裡面的 cqw 單位才會根據這個 430px 的黑框去計算，而不是電腦大螢幕！
          style={{ containerType: 'inline-size' }} 
        >
          <AnimatePresence mode="wait">
            {gameStage === 'login' && <LoginStage key="login" />}
            {gameStage === 'naming' && <NamingStage key="naming" />}
            {gameStage === 'playing' && <PlayingStage key="playing" />}
          </AnimatePresence>
        </div>

      </div>
    </>
  );
}
// src/App.jsx
import { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import useGameStore from './store/gameStore';

import AuthScreen   from './views/AuthScreen';
import PlayingStage from './components/PlayingStage';
// ──────────────────────────────────────────────────────────────────────────────
// 🌟 核心改動：在 App.jsx 中加入開場動畫防護鎖，確保星斗連線動畫一定會播完
export default function App() {
  const gameStage            = useGameStore(s => s.gameStage);
  const checkAuthAndPlayer   = useGameStore(s => s.checkAuthAndPlayer);
  const fetchPlayerStatus    = useGameStore(s => s.fetchPlayerStatus);
  const startOnlineRecovery  = useGameStore(s => s.startOnlineRecovery);
  const stopOnlineRecovery   = useGameStore(s => s.stopOnlineRecovery);
  const generateInitialTasks = useGameStore(s => s.generateInitialTasks);

  // 啟動時檢查 Supabase session
  useEffect(() => {
    checkAuthAndPlayer();
  }, [checkAuthAndPlayer]);

  // gameStage 進入 playing 後，拉一次最新資料並啟動在線回復
  useEffect(() => {
    if (gameStage === 'playing') {
      fetchPlayerStatus().then(() => {
        generateInitialTasks();
        startOnlineRecovery();
      });
    }
    return () => stopOnlineRecovery();
  }, [gameStage, fetchPlayerStatus, startOnlineRecovery, stopOnlineRecovery, generateInitialTasks]);

  const showAuth = gameStage === 'login' || gameStage === 'naming';
  const showPlay = gameStage === 'playing';

  return (
    <>
      <style>{`
        html, body, #root {
          width: 100%; height: 100%;
          margin: 0; padding: 0;
          overflow: hidden;
          overscroll-behavior: none;
          -webkit-user-select: none;
          -webkit-touch-callout: none;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @import url('https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&display=swap');
        @font-face { font-family: 'Kaiti'; src: local('Kaiti TC'), local('STKaiti'), local('KaiTi'); }
        .font-kaiti      { font-family: 'Kaiti', serif; }
        .font-calligraphy { font-family: 'Ma Shan Zheng', cursive; }
      `}</style>

      <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden font-serif select-none">
        <div
          className="w-full h-full max-w-[430px] max-h-[932px] relative bg-[#060810] sm:rounded-[2rem] sm:border border-white/10 overflow-hidden shadow-[0_0_50px_rgba(0,229,255,0.05)]"
          style={{ containerType: 'inline-size' }}
        >
          <AnimatePresence mode="wait">
            {showAuth && (
              <AuthScreen key="auth" />
            )}
            {showPlay && (
              <PlayingStage key="playing" />
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
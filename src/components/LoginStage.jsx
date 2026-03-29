import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from '../store/gameStore';

const ASSET_PATH = '/assets/mortal';

const LoginStage = () => {
  const [isUnrolled, setIsUnrolled] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const loginWithEmail = useGameStore((state) => state.loginWithEmail);
  const registerWithEmail = useGameStore((state) => state.registerWithEmail);
  const loginWithGoogle = useGameStore((state) => state.loginWithGoogle);

  const handleUnroll = () => {
    setIsUnrolled(true);
  };

  const handleEmailLogin = async () => {
    if (!email || !password) {
      alert('請輸入 Email 與密碼');
      return;
    }
    
    setIsLoading(true);
    const result = await loginWithEmail(email, password);
    setIsLoading(false);
    
    if (!result.success) {
      alert(result.error);
    }
  };

  const handleEmailRegister = async () => {
    if (!email || !password) {
      alert('請輸入 Email 與密碼');
      return;
    }
    
    setIsLoading(true);
    const result = await registerWithEmail(email, password);
    setIsLoading(false);
    
    if (!result.success) {
      alert(result.error);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const result = await loginWithGoogle();
    setIsLoading(false);
    
    if (!result.success) {
      alert(result.error);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-[8cqw]">
      {/* 卷軸容器 */}
      <motion.div
        className="relative w-full max-w-[80%] flex flex-col items-center"
        initial={{ height: '30cqw' }}
        animate={{ 
          height: isUnrolled ? 'auto' : '30cqw',
        }}
        transition={{ 
          type: 'spring', 
          damping: 20, 
          stiffness: 100,
          duration: 0.8
        }}
        style={{
          backgroundImage: `url(${ASSET_PATH}/bg_paper_tile.webp)`,
          backgroundRepeat: 'repeat',
          backgroundSize: '256px auto',
          border: '3cqw solid #8B4513',
          borderRadius: '2cqw',
          boxShadow: '0 0 20px rgba(0,0,0,0.8), inset 0 0 20px rgba(139,69,19,0.3)',
          overflow: 'hidden'
        }}
      >
        {/* 未展開狀態：紅繩與印章 */}
        <AnimatePresence>
          {!isUnrolled && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer z-10"
              onClick={handleUnroll}
            >
              {/* 紅繩 */}
              <div 
                className="w-[1cqw] h-[20cqw] bg-red-600 absolute"
                style={{
                  boxShadow: '0 0 10px rgba(220, 38, 38, 0.5)'
                }}
              />
              
              {/* 印章 */}
              <div className="relative z-20 flex flex-col items-center">
                <img 
                  src={`${ASSET_PATH}/ui_seal.webp`} 
                  className="w-[12cqw] h-[12cqw] object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]" 
                  alt="seal" 
                />
                <p 
                  className="text-red-400 font-kaiti mt-[2cqw] text-[3.5cqw] font-bold tracking-wider animate-pulse"
                  style={{ textShadow: '0 0 10px rgba(220, 38, 38, 0.8)' }}
                >
                  ▶ 點擊解開卷軸
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 展開後的內容 */}
        <AnimatePresence>
          {isUnrolled && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ 
                type: 'spring', 
                damping: 20, 
                stiffness: 100,
                delay: 0.3
              }}
              className="flex flex-col items-center p-[8cqw] pt-[12cqw]"
            >
              <h1 className="text-white font-calligraphy text-[15cqw] drop-shadow-lg mb-[4cqw] tracking-widest text-cyan-100">
                鏡界
              </h1>
              <p className="text-stone-300 font-kaiti text-[4.5cqw] mb-[8cqw] tracking-widest">踏入仙途，尋覓長生</p>

              <div className="w-full max-w-[90%] flex flex-col gap-[4cqw]">
                {/* Email 輸入框 */}
                <input
                  type="email"
                  placeholder="道友郵箱"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full py-[3cqw] px-[4cqw] border border-stone-600/50 rounded-lg bg-stone-900/60 text-stone-200 font-kaiti text-[4cqw] placeholder-stone-500 focus:outline-none focus:border-stone-500/70 transition-colors"
                  style={{
                    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(4px)'
                  }}
                />
                
                {/* 密碼輸入框 */}
                <input
                  type="password"
                  placeholder="道友密印"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full py-[3cqw] px-[4cqw] border border-stone-600/50 rounded-lg bg-stone-900/60 text-stone-200 font-kaiti text-[4cqw] placeholder-stone-500 focus:outline-none focus:border-stone-500/70 transition-colors"
                  style={{
                    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(4px)'
                  }}
                />

                {/* Email 登入/註冊按鈕 */}
                <div className="flex gap-[3cqw]">
                  <button 
                    onClick={handleEmailLogin}
                    disabled={isLoading}
                    className="flex-1 py-[3cqw] border border-stone-400/50 rounded-lg text-stone-200 bg-stone-800/80 hover:bg-stone-700 font-kaiti text-[4cqw] transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? '傳印中...' : '▶ 飛劍傳印'}
                  </button>
                  <button 
                    onClick={handleEmailRegister}
                    disabled={isLoading}
                    className="flex-1 py-[3cqw] border border-amber-500/50 rounded-lg text-amber-200 bg-amber-900/60 hover:bg-amber-800/70 font-kaiti text-[4cqw] transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? '凝聚中...' : '▶ 凝聚真靈'}
                  </button>
                </div>

                {/* 分隔線 */}
                <div className="flex items-center gap-[3cqw] my-[2cqw]">
                  <div className="flex-1 h-[0.2cqw] bg-stone-600/50"></div>
                  <span className="text-stone-500 font-kaiti text-[3cqw]">或</span>
                  <div className="flex-1 h-[0.2cqw] bg-stone-600/50"></div>
                </div>

                {/* Google 登入按鈕 */}
                <button 
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="py-[3.5cqw] w-full border border-cyan-500/50 rounded-lg text-cyan-100 bg-cyan-900/40 hover:bg-cyan-800/60 font-kaiti text-[4.5cqw] transition-colors shadow-[0_0_15px_rgba(34,211,238,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? '連接中...' : '【天道之力】 Google 一鍵登入'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default LoginStage;

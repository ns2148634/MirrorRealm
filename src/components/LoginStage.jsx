import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from '../store/gameStore';

// OTP 登入分兩步：先輸入 Email 發送驗證碼，再輸入 6 位數驗證碼
const LoginStage = () => {
  const [isUnrolled, setIsUnrolled] = useState(false);
  const [otpStep,    setOtpStep]    = useState('email');   // 'email' | 'code'
  const [email,      setEmail]      = useState('');
  const [code,       setCode]       = useState('');
  const [isLoading,  setIsLoading]  = useState(false);
  const [message,    setMessage]    = useState('');

  const loginWithGoogle = useGameStore((s) => s.loginWithGoogle);
  const sendOtp         = useGameStore((s) => s.sendOtp);
  const verifyOtp       = useGameStore((s) => s.verifyOtp);

  // ── 發送 OTP ─────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!email.trim()) { setMessage('請輸入 Email'); return; }
    setIsLoading(true);
    setMessage('');
    const result = await sendOtp(email.trim());
    setIsLoading(false);
    if (result.success) {
      setOtpStep('code');
      setMessage('驗證符文已傳送，請查收信件（可能在垃圾信件）');
    } else {
      setMessage(result.error ?? '發送失敗，請稍後再試');
    }
  };

  // ── 驗證 OTP ─────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (!code.trim()) { setMessage('請輸入驗證符文'); return; }
    setIsLoading(true);
    setMessage('');
    const result = await verifyOtp(email.trim(), code.trim());
    setIsLoading(false);
    if (!result.success) {
      setMessage(result.error ?? '符文有誤，請重新確認');
    }
    // 成功後 onAuthStateChange 自動觸發，gameStage 會切換
  };

  // ── Google OAuth ─────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setMessage('');
    const result = await loginWithGoogle();
    setIsLoading(false);
    if (!result.success) {
      setMessage(result.error ?? '連線失敗，請稍後再試');
    }
    // 成功後頁面會跳轉，無需額外處理
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-[8cqw]">
      {/* 卷軸容器 */}
      <motion.div
        className="relative w-full max-w-[80%] flex flex-col items-center"
        initial={{ height: '30cqw' }}
        animate={{ height: isUnrolled ? 'auto' : '30cqw' }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        style={{
          backgroundImage: `url(/assets/mortal/bg_paper_tile.webp)`,
          backgroundRepeat: 'repeat',
          backgroundSize: '256px auto',
          border: '3cqw solid #8B4513',
          borderRadius: '2cqw',
          boxShadow: '0 0 20px rgba(0,0,0,0.8), inset 0 0 20px rgba(139,69,19,0.3)',
          overflow: 'hidden',
        }}
      >
        {/* ── 未展開：紅繩印章 ─────────────────────────────────── */}
        <AnimatePresence>
          {!isUnrolled && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer z-10"
              onClick={() => setIsUnrolled(true)}
            >
              <div
                className="w-[1cqw] h-[20cqw] bg-red-600 absolute"
                style={{ boxShadow: '0 0 10px rgba(220,38,38,0.5)' }}
              />
              <div className="relative z-20 flex flex-col items-center">
                <img
                  src="/assets/mortal/ui_seal.webp"
                  className="w-[12cqw] h-[12cqw] object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]"
                  alt="seal"
                />
                <p
                  className="text-red-400 font-kaiti mt-[2cqw] text-[3.5cqw] font-bold tracking-wider animate-pulse"
                  style={{ textShadow: '0 0 10px rgba(220,38,38,0.8)' }}
                >
                  ▶ 點擊解開卷軸
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── 展開後的登入表單 ─────────────────────────────────── */}
        <AnimatePresence>
          {isUnrolled && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 20, stiffness: 100, delay: 0.3 }}
              className="flex flex-col items-center p-[8cqw] pt-[12cqw] w-full"
            >
              <h1 className="text-cyan-100 font-calligraphy text-[15cqw] drop-shadow-lg mb-[2cqw] tracking-widest">
                鏡界
              </h1>
              <p className="text-stone-300 font-kaiti text-[4.5cqw] mb-[8cqw] tracking-widest">
                踏入仙途，尋覓長生
              </p>

              <div className="w-full max-w-[90%] flex flex-col gap-[4cqw]">

                {/* ──── 步驟一：Email 輸入 ──────────────────── */}
                <AnimatePresence mode="wait">
                  {otpStep === 'email' && (
                    <motion.div
                      key="email-step"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex flex-col gap-[4cqw]"
                    >
                      <input
                        type="email"
                        placeholder="道友郵箱（Email）"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                        className="w-full py-[3cqw] px-[4cqw] border border-stone-600/50 rounded-lg bg-stone-900/60 text-stone-200 font-kaiti text-[4cqw] placeholder-stone-500 focus:outline-none focus:border-stone-500/70 transition-colors"
                        style={{ boxShadow: 'inset 0 0 10px rgba(0,0,0,0.3)' }}
                      />
                      <button
                        onClick={handleSendOtp}
                        disabled={isLoading}
                        className="py-[3cqw] w-full border border-stone-400/50 rounded-lg text-stone-200 bg-stone-800/80 hover:bg-stone-700 font-kaiti text-[4cqw] transition-colors shadow-lg disabled:opacity-50"
                      >
                        {isLoading ? '傳送中...' : '▶ 飛劍傳書（發送驗證符文）'}
                      </button>
                    </motion.div>
                  )}

                  {/* ──── 步驟二：驗證碼輸入 ─────────────────── */}
                  {otpStep === 'code' && (
                    <motion.div
                      key="code-step"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex flex-col gap-[4cqw]"
                    >
                      <p className="text-stone-400 font-kaiti text-[3.5cqw] text-center">
                        符文已傳送至：<br />
                        <span className="text-cyan-300">{email}</span>
                      </p>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="輸入 6 位驗證符文"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                        className="w-full py-[3cqw] px-[4cqw] border border-cyan-600/50 rounded-lg bg-stone-900/60 text-cyan-100 font-kaiti text-[5cqw] text-center placeholder-stone-500 focus:outline-none focus:border-cyan-400/70 tracking-[0.5em] transition-colors"
                        style={{ boxShadow: 'inset 0 0 10px rgba(0,0,0,0.3)' }}
                      />
                      <button
                        onClick={handleVerifyOtp}
                        disabled={isLoading || code.length < 6}
                        className="py-[3cqw] w-full border border-cyan-500/50 rounded-lg text-cyan-100 bg-cyan-900/40 hover:bg-cyan-800/60 font-kaiti text-[4cqw] transition-colors shadow-[0_0_15px_rgba(34,211,238,0.2)] disabled:opacity-50"
                      >
                        {isLoading ? '驗印中...' : '▶ 以符文驗印踏入'}
                      </button>
                      <button
                        onClick={() => { setOtpStep('email'); setCode(''); setMessage(''); }}
                        className="text-stone-500 font-kaiti text-[3cqw] underline text-center"
                      >
                        重新輸入 Email
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ──── 訊息提示 ───────────────────────────── */}
                {message && (
                  <p className="text-amber-300 font-kaiti text-[3.5cqw] text-center leading-relaxed">
                    {message}
                  </p>
                )}

                {/* ──── 分隔線 ─────────────────────────────── */}
                <div className="flex items-center gap-[3cqw] my-[1cqw]">
                  <div className="flex-1 h-[0.2cqw] bg-stone-600/50" />
                  <span className="text-stone-500 font-kaiti text-[3cqw]">或</span>
                  <div className="flex-1 h-[0.2cqw] bg-stone-600/50" />
                </div>

                {/* ──── Google OAuth ───────────────────────── */}
                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="py-[3.5cqw] w-full border border-cyan-500/50 rounded-lg text-cyan-100 bg-cyan-900/40 hover:bg-cyan-800/60 font-kaiti text-[4.5cqw] transition-colors shadow-[0_0_15px_rgba(34,211,238,0.2)] disabled:opacity-50"
                >
                  {isLoading ? '連接天道中...' : '【天道之力】 Google 一鍵踏入仙途'}
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

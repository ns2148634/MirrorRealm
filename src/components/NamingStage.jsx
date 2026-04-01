import React, { useState } from 'react';
import { motion } from 'framer-motion';
import useGameStore from '../store/gameStore';

const GENDER_OPTIONS = [
  { value: '男', label: '乾（男）' },
  { value: '女', label: '坤（女）' },
  { value: '保密', label: '混元（保密）' },
];

const NamingStage = () => {
  const [username,  setUsername]  = useState('');
  const [gender,    setGender]    = useState('保密');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg,  setErrorMsg]  = useState('');

  const createCharacter = useGameStore((s) => s.createCharacter);

  const handleConfirm = async () => {
    const trimmed = username.trim();
    if (trimmed.length < 2 || trimmed.length > 6) {
      setErrorMsg('道號需為 2 至 6 個字');
      return;
    }
    setErrorMsg('');
    setIsLoading(true);
    const result = await createCharacter(trimmed, gender);
    setIsLoading(false);
    if (!result.success) {
      setErrorMsg(result.error ?? '創角失敗，請稍後再試');
    }
  };

  const canSubmit = username.trim().length >= 2 && !isLoading;

  return (
    <motion.div
      key="naming"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center p-[8cqw] backdrop-blur-md bg-stone-900/80"
    >
      <div className="w-full max-w-[85%] p-[8cqw] rounded-xl border border-stone-500/40 shadow-[0_0_30px_rgba(0,0,0,0.8)] flex flex-col items-center bg-stone-950/60">

        <h2 className="text-stone-200 font-calligraphy text-[8cqw] tracking-widest mb-[2cqw]">
          凝聚命格
        </h2>
        <p className="text-stone-500 font-kaiti text-[3.5cqw] mb-[7cqw] tracking-wide">
          此乃凡人初入仙途，設定道號與根骨之時
        </p>

        {/* ── 道號輸入 ──────────────────────────────────────── */}
        <label className="w-full text-stone-400 font-kaiti text-[3.5cqw] mb-[2cqw]">
          道號（2–6 字）
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="請輸入道友名諱..."
          className="w-full bg-stone-800/50 border border-stone-600/50 rounded-lg py-[3cqw] px-[4cqw] text-white font-kaiti text-[5cqw] text-center focus:outline-none focus:border-cyan-500/80 transition-colors mb-[7cqw]"
          maxLength={6}
        />

        {/* ── 性別選擇 ──────────────────────────────────────── */}
        <label className="w-full text-stone-400 font-kaiti text-[3.5cqw] mb-[2cqw]">
          根骨（性別）
        </label>
        <div className="w-full flex gap-[3cqw] mb-[7cqw]">
          {GENDER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setGender(opt.value)}
              className={`flex-1 py-[3cqw] rounded-lg font-kaiti text-[3.5cqw] border transition-colors ${
                gender === opt.value
                  ? 'bg-cyan-800/70 border-cyan-400/70 text-cyan-100 shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                  : 'bg-stone-800/50 border-stone-600/40 text-stone-400 hover:bg-stone-700/50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* ── 錯誤提示 ─────────────────────────────────────── */}
        {errorMsg && (
          <p className="text-red-400 font-kaiti text-[3.5cqw] mb-[4cqw] text-center">
            {errorMsg}
          </p>
        )}

        {/* ── 確認按鈕 ─────────────────────────────────────── */}
        <button
          onClick={handleConfirm}
          disabled={!canSubmit}
          className={`py-[3cqw] w-full rounded-lg font-kaiti text-[5cqw] transition-colors tracking-widest ${
            canSubmit
              ? 'bg-cyan-800/80 text-cyan-100 border border-cyan-500/50 hover:bg-cyan-700 shadow-[0_0_15px_rgba(34,211,238,0.3)]'
              : 'bg-stone-800 text-stone-500 border border-stone-700'
          }`}
        >
          {isLoading ? '凝聚命格中...' : '踏入仙途'}
        </button>

      </div>
    </motion.div>
  );
};

export default NamingStage;

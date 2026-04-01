/**
 * AuthScreen.jsx — 《鏡界》開場法器啟動動畫 + 無密碼登入 + 創角
 *
 * Phase 狀態機：
 *   null / 'waiting'  → 等 document.fonts.ready（避免字體未載入就開始描邊動畫）
 *   'drawing' (0–2.5s) → SVG 文字外框描繪流光
 *   'flash'   (2.5–3s) → 文字填滿，全螢幕白光
 *   'login'   (3s+)    → 陣法網格背景 + 登入 UI
 *   'create'           → 創角 UI (gameStage 變為 'naming' 後切入)
 *
 * 不依賴 Framer Motion；所有動畫皆純 CSS @keyframes。
 * 版面單位：cqw 已全部改為 vw（Container Query 需明確設定 container-type，
 * 改用 vw 在所有瀏覽器更穩定，搭配 clamp() 防止桌機過大）。
 */
import React, { useState, useEffect } from 'react';
import useGameStore from '../store/gameStore';

// ─────────────────────────────────────────────────────────────
// 全域 CSS（只注入一次）
// stroke-dasharray 說明：
//   兩個漢字的字形輪廓路徑長度在此字體、此字號下約 1500–2000。
//   使用 2400 確保能覆蓋整段路徑並呈現「由無到有被描繪出來」的效果。
// ─────────────────────────────────────────────────────────────
const ANIM_CSS = `
  /* ── 字符描繪：dashoffset 從 2400 → 0 ──────────────── */
  @keyframes mir-draw-1 {
    from { stroke-dashoffset: 2400; }
    to   { stroke-dashoffset: 0;    }
  }
  @keyframes mir-draw-2 {
    from { stroke-dashoffset: 2400; }
    to   { stroke-dashoffset: 0;    }
  }

  /* ── 全螢幕白光閃過 ───────────────────────────────── */
  @keyframes mir-flash {
    0%   { opacity: 0;   }
    20%  { opacity: 0.95; }
    100% { opacity: 0;   }
  }

  /* ── 文字填充（描繪完後發光填入）──────────────────── */
  @keyframes mir-fill {
    0%   { fill: transparent; }
    100% { fill: rgba(210, 248, 255, 0.92); }
  }

  /* ── 網格背景淡入 ─────────────────────────────────── */
  @keyframes mir-grid-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  /* ── 登入/創角 UI 淡入上浮 ───────────────────────── */
  @keyframes mir-ui-in {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0);    }
  }

  /* ── 描繪時外框光暈脈動 ───────────────────────────── */
  @keyframes mir-glow-pulse {
    0%, 100% { filter: drop-shadow(0 0  6px rgba(0,229,255,0.55)); }
    50%       { filter: drop-shadow(0 0 18px rgba(0,229,255,0.90)); }
  }

  /* ── 字符 1（鏡）：繪製 0s ~ 1.3s ───────────────── */
  .mir-char-1 {
    fill: transparent;
    stroke: #00E5FF;
    stroke-width: 0.9;
    paint-order: stroke fill;
    stroke-dasharray: 2400;
    stroke-dashoffset: 2400;
  }
  .mir-char-1.drawing {
    animation: mir-draw-1 1.3s cubic-bezier(0.4, 0, 0.5, 1) forwards;
  }
  .mir-char-1.flash {
    stroke-dashoffset: 0;
    animation: mir-fill 0.35s ease forwards;
  }
  .mir-char-1.done {
    stroke-dashoffset: 0;
    fill: rgba(210, 248, 255, 0.92);
  }

  /* ── 字符 2（界）：繪製 1.1s ~ 2.4s ─────────────── */
  .mir-char-2 {
    fill: transparent;
    stroke: #00E5FF;
    stroke-width: 0.9;
    paint-order: stroke fill;
    stroke-dasharray: 2400;
    stroke-dashoffset: 2400;
  }
  .mir-char-2.drawing {
    animation: mir-draw-2 1.3s cubic-bezier(0.4, 0, 0.5, 1) 1.1s forwards;
  }
  .mir-char-2.flash {
    stroke-dashoffset: 0;
    animation: mir-fill 0.35s ease 0.06s forwards;
  }
  .mir-char-2.done {
    stroke-dashoffset: 0;
    fill: rgba(210, 248, 255, 0.92);
  }

  /* ── SVG 外層光暈容器 ─────────────────────────────── */
  .mir-svg-wrap {
    filter: drop-shadow(0 0 8px rgba(0,229,255,0.55));
  }
  .mir-svg-wrap.pulsing {
    animation: mir-glow-pulse 2.5s ease infinite;
  }

  /* ── 網格層 ──────────────────────────────────────── */
  .mir-grid-layer {
    animation: mir-grid-in 1s ease forwards;
  }

  /* ── UI 面板 ─────────────────────────────────────── */
  .mir-ui-panel {
    opacity: 0;
    animation: mir-ui-in 0.7s ease 0.15s forwards;
  }

  /* ── 全螢幕白光遮罩 ──────────────────────────────── */
  .mir-flash-overlay {
    animation: mir-flash 0.5s ease forwards;
  }

  /* ── 輸入框共用 ──────────────────────────────────── */
  .mir-input {
    width: 100%;
    padding: clamp(8px, 3vw, 12px) clamp(10px, 4vw, 16px);
    border-radius: 0.75rem;
    border: 1px solid rgba(100,120,140,0.35);
    background: rgba(10,15,22,0.7);
    color: #e2e8f0;
    font-family: 'Kaiti', serif;
    font-size: clamp(13px, 4vw, 16px);
    outline: none;
    transition: border-color 0.2s;
    backdrop-filter: blur(4px);
  }
  .mir-input:focus {
    border-color: rgba(0,229,255,0.5);
  }
  .mir-input::placeholder {
    color: rgba(120,130,145,0.8);
  }

  /* ── 按鈕共用 ────────────────────────────────────── */
  .mir-btn {
    width: 100%;
    padding: clamp(8px, 3vw, 12px) 0;
    border-radius: 0.75rem;
    font-family: 'Kaiti', serif;
    font-size: clamp(13px, 4vw, 16px);
    letter-spacing: 0.05em;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s, opacity 0.2s;
  }
  .mir-btn:disabled { opacity: 0.45; cursor: default; }

  .mir-btn-primary {
    background: rgba(0,60,80,0.55);
    border: 1px solid rgba(0,229,255,0.4);
    color: rgba(200,245,255,0.92);
    box-shadow: 0 0 18px rgba(0,229,255,0.08);
  }
  .mir-btn-primary:not(:disabled):hover {
    background: rgba(0,80,105,0.7);
    border-color: rgba(0,229,255,0.65);
  }

  .mir-btn-secondary {
    background: rgba(25,30,38,0.75);
    border: 1px solid rgba(90,100,115,0.4);
    color: #cbd5e1;
  }
  .mir-btn-secondary:not(:disabled):hover {
    background: rgba(40,48,60,0.85);
  }
`;

// ─────────────────────────────────────────────────────────────
const GENDERS = [
  { value: '男',  label: '乾（男）' },
  { value: '女',  label: '坤（女）' },
  { value: '保密', label: '混元（保密）' },
];

// ─────────────────────────────────────────────────────────────
export default function AuthScreen() {
  // Phase 狀態機
  // 'waiting' → 等 document.fonts.ready，確保 Ma Shan Zheng 載入後
  // 再開始 stroke-dasharray 動畫，避免 fallback 字體路徑長度偏差
  const [phase,     setPhase]     = useState('waiting');
  // OTP 子步驟
  const [otpStep,   setOtpStep]   = useState('email');  // 'email' | 'code'
  // 表單欄位
  const [email,     setEmail]     = useState('');
  const [code,      setCode]      = useState('');
  const [name,      setName]      = useState('');
  const [gender,    setGender]    = useState('保密');
  // UI 狀態
  const [isLoading, setIsLoading] = useState(false);
  const [message,   setMessage]   = useState('');

  // Store actions
  const gameStage       = useGameStore(s => s.gameStage);
  const loginWithGoogle = useGameStore(s => s.loginWithGoogle);
  const sendOtp         = useGameStore(s => s.sendOtp);
  const verifyOtp       = useGameStore(s => s.verifyOtp);
  const createCharacter = useGameStore(s => s.createCharacter);

  // ── 等字體載入完成後才啟動動畫 ─────────────────────────────
  // document.fonts.ready 在字體完成解析後 resolve，確保 Ma Shan Zheng
  // 的字形輪廓長度與 stroke-dasharray: 2400 的估算值相符
  useEffect(() => {
    document.fonts.ready.then(() => setPhase('drawing'));
  }, []);

  // ── Phase 自動推進 ──────────────────────────────────────────
  useEffect(() => {
    if (phase === 'drawing') {
      const t = setTimeout(() => setPhase('flash'), 2500);
      return () => clearTimeout(t);
    }
    if (phase === 'flash') {
      const t = setTimeout(() => setPhase('login'), 500);
      return () => clearTimeout(t);
    }
  }, [phase]);

  // ── 當 store 通知要創角時，切入 create ─────────────────────
  // 若 _syncPlayerWithBackend 在 drawing/flash 期間就回傳 isNew:true，
  // 等 phase 自然推進到 'login' 時此 effect 會再次觸發並正確切換
  useEffect(() => {
    if (gameStage === 'naming' && phase === 'login') {
      setPhase('create');
    }
  }, [gameStage, phase]);

  // ── Handlers ───────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!email.trim()) { setMessage('請輸入 Email'); return; }
    setIsLoading(true); setMessage('');
    const r = await sendOtp(email.trim());
    setIsLoading(false);
    if (r.success) {
      setOtpStep('code');
      setMessage('驗證符文已傳至信箱（請也檢查垃圾郵件）');
    } else {
      setMessage(r.error ?? '發送失敗，請稍後再試');
    }
  };

  const handleVerifyOtp = async () => {
    if (code.trim().length < 6) { setMessage('請輸入 6 位驗證符文'); return; }
    setIsLoading(true); setMessage('');
    const r = await verifyOtp(email.trim(), code.trim());
    setIsLoading(false);
    if (!r.success) setMessage(r.error ?? '符文有誤，請重新確認');
    // 成功時 onAuthStateChange 觸發，store 自動切換 gameStage
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true); setMessage('');
    const r = await loginWithGoogle();
    // 成功：頁面跳轉至 Google，無需在此處理
    if (!r.success) { setIsLoading(false); setMessage(r.error ?? '連線失敗'); }
  };

  const handleCreateCharacter = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 6) {
      setMessage('道號需為 2 至 6 個字'); return;
    }
    setIsLoading(true); setMessage('');
    const r = await createCharacter(trimmed, gender);
    setIsLoading(false);
    if (!r.success) setMessage(r.error ?? '創角失敗，請稍後再試');
    // 成功時 store 設 gameStage='playing'，App.jsx 卸載此元件
  };

  // ── 字符 class 計算 ────────────────────────────────────────
  // 'waiting' 時不加任何 phase class，保持 stroke-dashoffset:2400（不可見）
  const charCls = (base) => `${base}${
    phase === 'drawing'                        ? ' drawing' :
    phase === 'flash'                          ? ' flash'   :
    (phase === 'login' || phase === 'create')  ? ' done'    : ''
  }`;

  const isLoginOrCreate = phase === 'login' || phase === 'create';

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="absolute inset-0 bg-[#060810] overflow-hidden flex flex-col items-center justify-center">
      <style>{ANIM_CSS}</style>

      {/* ══ 陣法網格背景（login / create 才出現）══════════════ */}
      {isLoginOrCreate && (
        <div
          className="absolute inset-0 pointer-events-none mir-grid-layer"
          style={{
            backgroundImage: [
              'radial-gradient(ellipse 70% 55% at 50% 45%, rgba(0,229,255,0.055) 0%, transparent 70%)',
              'linear-gradient(rgba(0,229,255,0.038) 1px, transparent 1px)',
              'linear-gradient(90deg, rgba(0,229,255,0.038) 1px, transparent 1px)',
            ].join(', '),
            backgroundSize: 'auto, 46px 46px, 46px 46px',
          }}
        />
      )}

      {/* ══ 全螢幕白光（flash phase）════════════════════════════ */}
      {phase === 'flash' && (
        <div className="absolute inset-0 bg-white pointer-events-none z-30 mir-flash-overlay" />
      )}

      {/* ══ SVG 鏡界 LOGO（waiting 時不可見，drawing/flash/login 可見）══ */}
      {phase !== 'create' && (
        <div
          className={`mir-svg-wrap ${phase === 'drawing' ? 'pulsing' : ''}`}
          style={{
            transform:    isLoginOrCreate ? 'scale(0.72) translateY(-8vw)' : 'scale(1)',
            transition:   'transform 0.7s cubic-bezier(0.4,0,0.2,1)',
            marginBottom: isLoginOrCreate ? '-4vw' : '0',
          }}
        >
          <svg
            viewBox="0 0 440 175"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: 'min(76vw, 320px)', display: 'block' }}
            aria-label="鏡界"
          >
            <text
              x="120" y="50%" dominantBaseline="middle" textAnchor="middle"
              fontFamily="'Ma Shan Zheng', serif"
              fontSize="155"
              className={charCls('mir-char-1')}
            >
              鏡
            </text>
            <text
              x="320" y="50%" dominantBaseline="middle" textAnchor="middle"
              fontFamily="'Ma Shan Zheng', serif"
              fontSize="155"
              className={charCls('mir-char-2')}
            >
              界
            </text>
          </svg>
        </div>
      )}

      {/* ══ login phase：副標 + 登入表單 ═══════════════════════ */}
      {phase === 'login' && (
        <div
          className="mir-ui-panel w-full flex flex-col"
          style={{ maxWidth: 420, padding: '0 9vw', gap: '3.5vw' }}
        >
          {/* 副標 */}
          <p
            className="font-kaiti text-center tracking-[0.45em]"
            style={{ color: 'rgba(103,232,249,0.6)', fontSize: 'clamp(12px, 3.8vw, 15px)', marginBottom: '1vw' }}
          >
            踏入仙途，尋覓長生
          </p>

          {/* Google 一鍵登入 */}
          <button className="mir-btn mir-btn-primary" onClick={handleGoogleLogin} disabled={isLoading}>
            {isLoading ? '連接天道中…' : '【天道之力】　Google 一鍵踏入仙途'}
          </button>

          {/* 分隔 */}
          <div className="flex items-center" style={{ gap: '3vw' }}>
            <div className="flex-1 h-px" style={{ background: 'rgba(0,229,255,0.15)' }} />
            <span
              className="font-kaiti tracking-widest"
              style={{ color: 'rgba(120,140,160,0.8)', fontSize: 'clamp(11px, 3vw, 13px)' }}
            >
              飛劍傳書
            </span>
            <div className="flex-1 h-px" style={{ background: 'rgba(0,229,255,0.15)' }} />
          </div>

          {/* OTP 第一步：Email */}
          {otpStep === 'email' && (
            <>
              <input
                className="mir-input"
                type="email"
                placeholder="道友郵箱（Email）"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
              />
              <button className="mir-btn mir-btn-secondary" onClick={handleSendOtp} disabled={isLoading}>
                {isLoading ? '傳送符文中…' : '▶ 發送六位驗證符文'}
              </button>
            </>
          )}

          {/* OTP 第二步：驗證碼 */}
          {otpStep === 'code' && (
            <>
              <p
                className="font-kaiti text-center"
                style={{ color: 'rgba(148,163,184,0.85)', fontSize: 'clamp(12px, 3.4vw, 14px)' }}
              >
                符文已傳至：<span style={{ color: '#67e8f9' }}>{email}</span>
              </p>
              <input
                className="mir-input text-center"
                style={{ fontSize: 'clamp(16px, 5.5vw, 22px)', letterSpacing: '0.55em', color: '#a5f3fc' }}
                type="text"
                inputMode="numeric"
                placeholder="— — — — — —"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
              />
              <button
                className="mir-btn mir-btn-primary"
                onClick={handleVerifyOtp}
                disabled={isLoading || code.length < 6}
              >
                {isLoading ? '驗印中…' : '▶ 以符文踏入仙途'}
              </button>
              <button
                style={{
                  background: 'none', border: 'none', color: 'rgba(100,116,139,0.8)',
                  fontFamily: "'Kaiti', serif", fontSize: 'clamp(11px, 3vw, 13px)',
                  cursor: 'pointer', textDecoration: 'underline',
                }}
                onClick={() => { setOtpStep('email'); setCode(''); setMessage(''); }}
              >
                重新輸入 Email
              </button>
            </>
          )}

          {/* 訊息提示 */}
          {message && (
            <p
              className="font-kaiti text-center leading-relaxed"
              style={{ color: '#fcd34d', fontSize: 'clamp(12px, 3.5vw, 14px)' }}
            >
              {message}
            </p>
          )}
        </div>
      )}

      {/* ══ create phase：創角 UI ════════════════════════════════ */}
      {phase === 'create' && (
        <div
          className="mir-ui-panel w-full flex flex-col"
          style={{ maxWidth: 420, padding: '0 9vw', gap: '4vw' }}
        >
          {/* 標題 */}
          <div className="text-center" style={{ marginBottom: '1vw' }}>
            <h2
              className="font-calligraphy tracking-widest"
              style={{
                color: '#cff2fd',
                fontSize: 'clamp(28px, 9.5vw, 38px)',
                textShadow: '0 0 22px rgba(0,229,255,0.35)',
              }}
            >
              凝聚命格
            </h2>
            <p
              className="font-kaiti tracking-wide"
              style={{ color: 'rgba(120,140,160,0.8)', fontSize: 'clamp(12px, 3.5vw, 14px)', marginTop: '1.5vw' }}
            >
              凡人初入仙途，先定道號與根骨
            </p>
          </div>

          {/* 道號 */}
          <div className="flex flex-col" style={{ gap: '2vw' }}>
            <label className="font-kaiti" style={{ color: 'rgba(148,163,184,0.85)', fontSize: 'clamp(12px, 3.5vw, 14px)' }}>
              道號（2–6 字）
            </label>
            <input
              className="mir-input text-center"
              style={{ fontSize: 'clamp(15px, 5vw, 20px)' }}
              type="text"
              placeholder="請輸入道友名諱…"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={6}
            />
          </div>

          {/* 性別 */}
          <div className="flex flex-col" style={{ gap: '2vw' }}>
            <label className="font-kaiti" style={{ color: 'rgba(148,163,184,0.85)', fontSize: 'clamp(12px, 3.5vw, 14px)' }}>
              根骨（性別）
            </label>
            <div className="flex" style={{ gap: '2.5vw' }}>
              {GENDERS.map(g => (
                <button
                  key={g.value}
                  onClick={() => setGender(g.value)}
                  style={{
                    flex: 1,
                    padding: 'clamp(8px, 3vw, 12px) 0',
                    borderRadius: '0.75rem',
                    fontFamily: "'Kaiti', serif",
                    fontSize: 'clamp(11px, 3.4vw, 14px)',
                    cursor: 'pointer',
                    transition: 'all 0.18s',
                    background: gender === g.value ? 'rgba(0,60,80,0.6)'              : 'rgba(15,20,30,0.7)',
                    border:     gender === g.value ? '1px solid rgba(0,229,255,0.55)' : '1px solid rgba(60,75,95,0.45)',
                    color:      gender === g.value ? '#a5f3fc'                         : 'rgba(100,120,145,0.9)',
                    boxShadow:  gender === g.value ? '0 0 10px rgba(0,229,255,0.15)'  : 'none',
                  }}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* 錯誤 / 訊息 */}
          {message && (
            <p className="font-kaiti text-center" style={{ color: '#f87171', fontSize: 'clamp(12px, 3.5vw, 14px)' }}>
              {message}
            </p>
          )}

          {/* 確認 */}
          <button
            className="mir-btn mir-btn-primary"
            style={{ fontSize: 'clamp(15px, 5vw, 20px)', letterSpacing: '0.2em', marginTop: '1vw' }}
            onClick={handleCreateCharacter}
            disabled={name.trim().length < 2 || isLoading}
          >
            {isLoading ? '凝聚命格中…' : '踏入仙途'}
          </button>
        </div>
      )}
    </div>
  );
}

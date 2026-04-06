/**
 * AuthScreen.jsx
 *
 * Phase 狀態機：
 *   waiting → stars（點先全部出完）→（線統一畫）→ login → [create]
 *
 * Google 登入：GSI One Tap → supabase.signInWithIdToken（via gameStore）
 * Email 登入：OTP → verifyOtp（via gameStore）
 * 創角：createCharacter（via gameStore）
 * 所有 stage 切換由 gameStore.onAuthStateChange 驅動，不需要 onLogin prop。
 */
import { useState, useEffect, useRef } from 'react';
import useGameStore from '../store/gameStore';

// ── 動畫時序 ──────────────────────────────────────────────────────
const STAR_DUR  = 0.45;   // 每顆星出現時長 (s)
const STAR_BEAT = 0.35;   // 星與星之間的間隔 (s)
const LINE_GAP  = 0.3;    // 全部星出完後等多久開始畫線 (s)
const LINE_DUR  = 0.40;   // 每條線的畫線時長 (s)
const LINE_BEAT = 0.25;   // 線與線之間的間隔 (s)

const GENDERS = ['男', '女', '保密'];

export default function AuthScreen() {
  const gameStage             = useGameStore(s => s.gameStage);
  const markIntroFinished     = useGameStore(s => s.markIntroFinished);
  const loginWithGoogleOneTap = useGameStore(s => s.loginWithGoogleOneTap);
  const sendOtp               = useGameStore(s => s.sendOtp);
  const verifyOtp             = useGameStore(s => s.verifyOtp);
  const createCharacter       = useGameStore(s => s.createCharacter);

  const [phase,     setPhase]     = useState('waiting');  // waiting|stars|login|create
  const [flashing,  setFlashing]  = useState(false);
  const [stars,     setStars]     = useState([]);
  const [edges,     setEdges]     = useState([]);
  const [linesReady, setLinesReady] = useState(false); // 全部星出完後才 true

  // 登入表單狀態
  const [message,   setMessage]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [email,     setEmail]     = useState('');
  const [otp,       setOtp]       = useState('');
  const [otpSent,   setOtpSent]   = useState(false);

  // 創角狀態
  const [name,   setName]   = useState('');
  const [gender, setGender] = useState('保密');

  const googleBtnRef = useRef(null);

  // ── gameStage 同步 phase ──────────────────────────────────────
  useEffect(() => {
    if (gameStage === 'naming') {
      setPhase('create');
      markIntroFinished();
    }
  }, [gameStage]);

  // ── 1. 演算星斗 + 動畫時序 ──────────────────────────────────
  useEffect(() => {
    const numStars = 7 + Math.floor(Math.random() * 2); // 7~8 顆
    const newStars = [];
    const newEdges = [];

    const safeW = 240;
    const stepX = safeW / (numStars - 1);
    for (let i = 0; i < numStars; i++) {
      newStars.push({
        x: 40 + i * stepX + (Math.random() * 16 - 8),
        y: 55 + Math.random() * 110,
      });
    }
    for (let i = 0; i < numStars - 1; i++) newEdges.push([i, i + 1]);

    setStars(newStars);
    setEdges(newEdges);

    document.fonts.ready.then(() => {
      setPhase('stars');

      // 全部星出完的時間
      const allStarsDone = (numStars - 1) * STAR_BEAT + STAR_DUR;
      // 全部線畫完的時間
      const allLinesDone = allStarsDone + LINE_GAP + (newEdges.length - 1) * LINE_BEAT + LINE_DUR;

      const t1 = setTimeout(() => setLinesReady(true), allStarsDone * 1000);
      const t2 = setTimeout(() => setFlashing(true),   (allLinesDone + 0.1) * 1000);
      const t3 = setTimeout(() => setPhase('login'),    (allLinesDone + 0.5) * 1000);
      const t4 = setTimeout(() => setFlashing(false),   (allLinesDone + 1.0) * 1000);
      const t5 = setTimeout(() => markIntroFinished(),  (allLinesDone + 0.5) * 1000);

      return () => [t1, t2, t3, t4, t5].forEach(clearTimeout);
    });
  }, []);

  // ── 2. Google One Tap 初始化（phase 進入 login 後）──────────
  useEffect(() => {
    if (phase !== 'login') return;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const initGSI = () => {
      if (!window.google?.accounts?.id) {
        setTimeout(initGSI, 300);
        return;
      }
      window.google.accounts.id.initialize({
        client_id:            clientId,
        auto_select:          true,
        cancel_on_tap_outside: false,
        callback: async ({ credential }) => {
          setLoading(true);
          setMessage('天道認證中…');
          const r = await loginWithGoogleOneTap(credential);
          if (!r.success) {
            setLoading(false);
            setMessage(r.error ?? '連線失敗，請稍後再試');
          }
          // 成功 → onAuthStateChange → gameStage 自動切換
        },
      });

      if (googleBtnRef.current) {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme:          'filled_black',
          size:           'large',
          shape:          'pill',
          width:          260,
          logo_alignment: 'center',
          text:           'signin_with',
          locale:         'zh-TW',
        });
      }
      window.google.accounts.id.prompt();
    };

    // 若 GSI 腳本已由 index.html preconnect，可能已載入；否則動態注入
    if (!document.querySelector('script[src*="accounts.google.com/gsi"]')) {
      const s = document.createElement('script');
      s.src   = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = initGSI;
      document.head.appendChild(s);
    } else {
      initGSI();
    }

    return () => window.google?.accounts?.id?.cancel?.();
  }, [phase]);

  // ── 3. Email OTP ──────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!email.trim()) { setMessage('請輸入信箱'); return; }
    setLoading(true); setMessage('');
    const r = await sendOtp(email.trim());
    setLoading(false);
    if (r.success) { setOtpSent(true); setMessage('驗證符文已傳至信箱'); }
    else setMessage(r.error ?? '發送失敗');
  };

  const handleVerifyOtp = async () => {
    if (otp.trim().length < 6) { setMessage('請輸入 6 位符文'); return; }
    setLoading(true); setMessage('');
    const r = await verifyOtp(email.trim(), otp.trim());
    setLoading(false);
    if (!r.success) setMessage(r.error ?? '符文有誤');
    // 成功 → onAuthStateChange → gameStage 自動切換
  };

  // ── 4. 創角 ──────────────────────────────────────────────────
  const handleCreate = async () => {
    const n = name.trim();
    if (n.length < 2 || n.length > 6) { setMessage('道號需 2–6 字'); return; }
    setLoading(true); setMessage('');
    const r = await createCharacter(n, gender);
    setLoading(false);
    if (!r.success) setMessage(r.error ?? '創角失敗');
    // 成功 → gameStore 設 gameStage='playing'
  };

  // ── 計算動畫 delay ───────────────────────────────────────────
  const starDelay  = (i)   => `${i * STAR_BEAT}s`;
  const lineDelay  = (idx) => `${LINE_GAP + idx * LINE_BEAT}s`;   // 相對於 linesReady

  // ── render ────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-full overflow-hidden flex flex-col items-center justify-center select-none"
      style={{ background: 'linear-gradient(180deg, #030810 0%, #010306 100%)' }}
    >
      <style>{`
        @keyframes star-pop {
          0%   { opacity: 0; transform: scale(0.1); }
          70%  { opacity: 1; transform: scale(1.3); }
          100% { opacity: 1; transform: scale(1);   }
        }
        @keyframes line-draw {
          from { stroke-dashoffset: var(--len); opacity: 0; }
          to   { stroke-dashoffset: 0;          opacity: 0.55; }
        }
        @keyframes ui-in {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>

      {/* 青色閃光 */}
      <div className="absolute inset-0 z-50 pointer-events-none bg-[#00E5FF]"
        style={{ opacity: flashing ? 1 : 0, transition: flashing ? 'opacity 0.06s' : 'opacity 1.4s' }}
      />

      {/* ── 星圖 ── */}
      {(phase === 'stars') && stars.length > 0 && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 320 220"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* 線（等 linesReady 後才渲染，確保點先出完） */}
          {linesReady && edges.map(([a, b], idx) => {
            const p1 = stars[a], p2 = stars[b];
            const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            return (
              <line key={idx}
                x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke="#00E5FF" strokeWidth="0.8"
                strokeDasharray={len} strokeDashoffset={len}
                style={{
                  '--len': `${len}`,
                  animation: `line-draw ${LINE_DUR}s ${lineDelay(idx)} forwards`,
                  opacity: 0,
                }}
              />
            );
          })}

          {/* 點 */}
          {stars.map((p, i) => (
            <g key={i} filter="url(#sg)"
              style={{
                transformOrigin: `${p.x}px ${p.y}px`,
                animation: `star-pop ${STAR_DUR}s ${starDelay(i)} forwards`,
                opacity: 0,
              }}
            >
              <circle cx={p.x} cy={p.y} r={7}   fill="rgba(0,229,255,0.12)" />
              <circle cx={p.x} cy={p.y} r={3.5}  fill="#00E5FF" />
              <circle cx={p.x} cy={p.y} r={1.3}  fill="rgba(255,255,255,0.95)" />
            </g>
          ))}

          <defs>
            <filter id="sg" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
        </svg>
      )}

      {/* ── 登入 UI ── */}
      {phase === 'login' && (
        <div className="z-10 w-full max-w-[360px] px-8 flex flex-col items-center gap-5"
          style={{ animation: 'ui-in 0.9s ease 0.1s both' }}
        >
          {/* 標題 */}
          <div className="text-center mb-2">
            <h1 style={{
              fontFamily: "'Ma Shan Zheng', serif",
              fontSize: 'clamp(42px,13vw,56px)',
              color: 'rgba(210,248,255,0.93)',
              letterSpacing: '0.5em',
              textShadow: '0 0 28px rgba(0,229,255,0.55)',
              margin: 0,
            }}>鏡界</h1>
            <p style={{
              fontFamily: "'Kaiti', serif",
              color: 'rgba(103,232,249,0.55)',
              fontSize: 'clamp(12px,3.8vw,15px)',
              letterSpacing: '0.45em',
              marginTop: 8,
            }}>踏入仙途，尋覓長生</p>
          </div>

          {/* Google 官方按鈕 */}
          <div className="flex flex-col items-center gap-2 w-full">
            <div ref={googleBtnRef} className="flex justify-center" style={{ minHeight: 44 }} />
            {!import.meta.env.VITE_GOOGLE_CLIENT_ID && (
              <p style={{ fontFamily: "'Kaiti', serif", color: 'rgba(100,140,160,0.55)', fontSize: 12, letterSpacing: '0.2em' }}>
                Google 登入未設定
              </p>
            )}
          </div>

          {/* 分隔 */}
          <div className="flex items-center gap-4 w-full opacity-30">
            <div className="flex-1 h-px bg-white" />
            <span style={{ fontFamily: "'Kaiti', serif", fontSize: 11, letterSpacing: '0.3em' }}>飛劍傳書</span>
            <div className="flex-1 h-px bg-white" />
          </div>

          {/* Email OTP */}
          {!otpSent ? (
            <>
              <input
                type="email" placeholder="道友信箱" value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                className="w-full bg-white/5 border border-white/10 py-3 px-4 rounded-lg text-center text-sm outline-none focus:border-cyan-500/50 transition-all"
                style={{ fontFamily: "'Kaiti', serif", color: '#e2e8f0' }}
              />
              <button onClick={handleSendOtp} disabled={loading}
                className="w-full py-3 rounded-lg border border-white/20 text-white/60 text-sm tracking-widest hover:bg-white/5 active:scale-95 transition-all disabled:opacity-40"
                style={{ fontFamily: "'Kaiti', serif" }}
              >
                {loading ? '傳送中…' : '▶ 發送驗證符文'}
              </button>
            </>
          ) : (
            <>
              <p style={{ fontFamily: "'Kaiti', serif", color: 'rgba(148,163,184,0.8)', fontSize: 13, textAlign: 'center' }}>
                符文已傳至 <span style={{ color: '#67e8f9' }}>{email}</span>
              </p>
              <input
                type="text" inputMode="numeric" placeholder="六位符文" value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
                className="w-full bg-white/5 border border-cyan-500/30 py-3 rounded-lg text-center tracking-[0.5em] text-lg outline-none focus:border-cyan-500/60 transition-all"
                style={{ color: '#a5f3fc' }}
              />
              <button onClick={handleVerifyOtp} disabled={loading || otp.length < 6}
                className="w-full py-3 rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 text-sm tracking-widest active:scale-95 transition-all disabled:opacity-40"
                style={{ fontFamily: "'Kaiti', serif" }}
              >
                {loading ? '驗印中…' : '▶ 以符文踏入'}
              </button>
              <button onClick={() => { setOtpSent(false); setOtp(''); setMessage(''); }}
                style={{ background: 'none', border: 'none', color: 'rgba(100,116,139,0.7)', fontFamily: "'Kaiti', serif", fontSize: 12, cursor: 'pointer', letterSpacing: '0.2em' }}
              >
                重新輸入信箱
              </button>
            </>
          )}

          {message && (
            <p style={{ fontFamily: "'Kaiti', serif", color: '#fcd34d', fontSize: 13, textAlign: 'center', letterSpacing: '0.2em' }}>
              {message}
            </p>
          )}
        </div>
      )}

      {/* ── 創角 UI ── */}
      {phase === 'create' && (
        <div className="z-10 w-full max-w-[360px] px-8 flex flex-col items-center gap-5"
          style={{ animation: 'ui-in 0.7s ease both' }}
        >
          <div className="text-center">
            <h2 style={{
              fontFamily: "'Kaiti', serif",
              color: '#cff2fd',
              fontSize: 'clamp(28px,9vw,38px)',
              letterSpacing: '0.3em',
              textShadow: '0 0 22px rgba(0,229,255,0.35)',
              margin: 0,
            }}>凝聚命格</h2>
            <p style={{ fontFamily: "'Kaiti', serif", color: 'rgba(120,140,160,0.75)', fontSize: 13, letterSpacing: '0.15em', marginTop: 8 }}>
              凡人初入仙途，先定道號與根骨
            </p>
          </div>

          <input
            type="text" placeholder="道號（2–6 字）" value={name} maxLength={6}
            onChange={e => setName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 py-3 px-4 rounded-lg text-center text-lg outline-none focus:border-cyan-500/50 transition-all"
            style={{ fontFamily: "'Kaiti', serif", color: '#e2e8f0', letterSpacing: '0.3em' }}
          />

          <div className="flex gap-2 w-full">
            {GENDERS.map(g => (
              <button key={g} onClick={() => setGender(g)}
                className="flex-1 py-2 rounded-lg text-sm transition-all active:scale-95"
                style={{
                  fontFamily: "'Kaiti', serif",
                  background: gender === g ? 'rgba(0,60,80,0.6)' : 'rgba(15,20,30,0.7)',
                  border:     gender === g ? '1px solid rgba(0,229,255,0.55)' : '1px solid rgba(60,75,95,0.4)',
                  color:      gender === g ? '#a5f3fc' : 'rgba(100,120,145,0.85)',
                }}
              >{g}</button>
            ))}
          </div>

          {message && (
            <p style={{ fontFamily: "'Kaiti', serif", color: '#f87171', fontSize: 13, textAlign: 'center' }}>{message}</p>
          )}

          <button onClick={handleCreate} disabled={name.trim().length < 2 || loading}
            className="w-full py-3 rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 tracking-[0.3em] text-lg active:scale-95 transition-all disabled:opacity-40"
            style={{ fontFamily: "'Kaiti', serif" }}
          >
            {loading ? '凝聚命格中…' : '踏入仙途'}
          </button>
        </div>
      )}
    </div>
  );
}

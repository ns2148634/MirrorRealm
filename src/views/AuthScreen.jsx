/**
 * AuthScreen.jsx — 《鏡界》無密碼登入 + 創角
 *
 * Phase 狀態機：
 * 'login'  → 登入 UI
 * 'create' → 創角 UI（gameStage === 'naming' 時切入）
 */
import { useState, useEffect } from 'react';
import useGameStore from '../store/gameStore';
import RealmBackground from '../components/RealmBackground';

const GENDERS = [
  { value: '男',   label: '乾（男）' },
  { value: '女',   label: '坤（女）' },
  { value: '保密', label: '混元（保密）' },
];

// ── CSS ───────────────────────────────────────────────────────────
const ANIM_CSS = `
  /* 登入/創角 UI 淡入上浮 */
  @keyframes ui-in {
    from { opacity: 0; transform: translateY(22px); }
    to   { opacity: 1; transform: translateY(0);    }
  }

  /* 輸入框 */
  .mir-input {
    width: 100%;
    padding: clamp(8px,3vw,12px) clamp(10px,4vw,16px);
    border-radius: .75rem;
    border: 1px solid rgba(100,120,140,.35);
    background: rgba(10,15,22,.70);
    color: #e2e8f0;
    font-family: 'Kaiti', serif;
    font-size: clamp(13px,4vw,16px);
    outline: none;
    transition: border-color .2s;
    backdrop-filter: blur(4px);
  }
  .mir-input:focus { border-color: rgba(0,229,255,.5); }
  .mir-input::placeholder { color: rgba(120,130,145,.8); }

  /* 按鈕基底 */
  .mir-btn {
    width: 100%;
    padding: clamp(8px,3vw,12px) 0;
    border-radius: .75rem;
    font-family: 'Kaiti', serif;
    font-size: clamp(13px,4vw,16px);
    letter-spacing: .05em;
    cursor: pointer;
    transition: background .2s, border-color .2s, opacity .2s;
  }
  .mir-btn:disabled { opacity: .45; cursor: default; }

  .mir-btn-primary {
    background: rgba(0,60,80,.55);
    border: 1px solid rgba(0,229,255,.4);
    color: rgba(200,245,255,.92);
    box-shadow: 0 0 18px rgba(0,229,255,.08);
  }
  .mir-btn-primary:not(:disabled):hover {
    background: rgba(0,80,105,.7);
    border-color: rgba(0,229,255,.65);
  }
  .mir-btn-secondary {
    background: rgba(25,30,38,.75);
    border: 1px solid rgba(90,100,115,.4);
    color: #cbd5e1;
  }
  .mir-btn-secondary:not(:disabled):hover { background: rgba(40,48,60,.85); }
`;

// ─────────────────────────────────────────────────────────────────
export default function AuthScreen() {
  const [phase,        setPhase]        = useState('login');
  const [otpStep,      setOtpStep]      = useState('email');
  const [email,        setEmail]        = useState('');
  const [code,         setCode]         = useState('');
  const [name,         setName]         = useState('');
  const [gender,       setGender]       = useState('保密');
  const [isLoading,    setIsLoading]    = useState(false);
  const [message,      setMessage]      = useState('');
  const [installEvent, setInstallEvent] = useState(null);
  const [showIosHint,  setShowIosHint]  = useState(false);

  const gameStage       = useGameStore(s => s.gameStage);
  const loginWithGoogle = useGameStore(s => s.loginWithGoogle);
  const sendOtp         = useGameStore(s => s.sendOtp);
  const verifyOtp       = useGameStore(s => s.verifyOtp);
  const createCharacter = useGameStore(s => s.createCharacter);

  // ── gameStage 變為 naming 時切入創角介面 ────────────────────────
  useEffect(() => {
    if (gameStage === 'naming') setPhase('create');
  }, [gameStage]);

  // ── PWA 安裝：Android 捕捉 beforeinstallprompt；iOS 偵測 ────────
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallEvent(e); };
    window.addEventListener('beforeinstallprompt', handler);
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone;
    if (isIos && !isStandalone) setShowIosHint(true);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // ── Handlers ────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!email.trim()) { setMessage('請輸入 Email'); return; }
    setIsLoading(true); setMessage('');
    const r = await sendOtp(email.trim());
    setIsLoading(false);
    if (r.success) { setOtpStep('code'); setMessage('驗證符文已傳至信箱（請也檢查垃圾郵件）'); }
    else setMessage(r.error ?? '發送失敗，請稍後再試');
  };

  const handleVerifyOtp = async () => {
    if (code.trim().length < 6) { setMessage('請輸入 6 位驗證符文'); return; }
    setIsLoading(true); setMessage('');
    const r = await verifyOtp(email.trim(), code.trim());
    setIsLoading(false);
    if (!r.success) setMessage(r.error ?? '符文有誤，請重新確認');
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true); setMessage('');
    const r = await loginWithGoogle();
    if (!r.success) { setIsLoading(false); setMessage(r.error ?? '連線失敗'); }
  };

  const handleCreateCharacter = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 6) { setMessage('道號需為 2 至 6 個字'); return; }
    setIsLoading(true); setMessage('');
    const r = await createCharacter(trimmed, gender);
    setIsLoading(false);
    if (!r.success) setMessage(r.error ?? '創角失敗，請稍後再試');
  };

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="absolute inset-0 overflow-hidden flex flex-col items-center justify-center gap-6">
      <style>{ANIM_CSS}</style>

      {/* ── 境界背景 ── */}
      <RealmBackground />

      {/* ── 登入 UI ── */}
      {phase === 'login' && (
        <div
          style={{
            animation: 'ui-in 0.9s ease both',
            width: '100%', maxWidth: 420,
            padding: '0 9vw',
            display: 'flex', flexDirection: 'column', gap: '3.5vw',
            flexShrink: 0,
            position: 'relative', zIndex: 10,
          }}
        >
          {/* 標題 */}
          <div style={{ textAlign: 'center', marginBottom: '1vw' }}>
            <h1 style={{
              fontFamily: "'Ma Shan Zheng', serif",
              fontSize: 'clamp(40px,12.5vw,54px)',
              color: 'rgba(210,248,255,0.92)',
              letterSpacing: '0.5em',
              textShadow: '0 0 28px rgba(0,229,255,0.55), 0 0 60px rgba(0,229,255,0.18)',
              margin: 0,
            }}>
              鏡界
            </h1>
            <p style={{
              fontFamily: "'Kaiti', serif",
              color: 'rgba(103,232,249,0.58)',
              fontSize: 'clamp(12px,3.8vw,15px)',
              letterSpacing: '0.45em',
              marginTop: '1.5vw',
            }}>
              踏入仙途，尋覓長生
            </p>
          </div>

          {/* Google 一鍵 */}
          <button className="mir-btn mir-btn-primary" onClick={handleGoogleLogin} disabled={isLoading}>
            {isLoading ? '連接天道中…' : '【天道之力】　Google 一鍵踏入仙途'}
          </button>

          {/* 分隔線 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3vw' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,229,255,0.15)' }} />
            <span style={{
              fontFamily: "'Kaiti', serif",
              color: 'rgba(120,140,160,0.8)',
              fontSize: 'clamp(11px,3vw,13px)',
              letterSpacing: '0.3em',
            }}>
              飛劍傳書
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,229,255,0.15)' }} />
          </div>

          {/* OTP — Email 步驟 */}
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

          {/* OTP — 驗證碼步驟 */}
          {otpStep === 'code' && (
            <>
              <p style={{
                fontFamily: "'Kaiti', serif", textAlign: 'center',
                color: 'rgba(148,163,184,0.85)', fontSize: 'clamp(12px,3.4vw,14px)',
              }}>
                符文已傳至：<span style={{ color: '#67e8f9' }}>{email}</span>
              </p>
              <input
                className="mir-input"
                style={{ textAlign: 'center', fontSize: 'clamp(16px,5.5vw,22px)', letterSpacing: '0.55em', color: '#a5f3fc' }}
                type="text" inputMode="numeric" placeholder="— — — — — —"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g,'').slice(0,6))}
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
                  background: 'none', border: 'none',
                  color: 'rgba(100,116,139,0.8)',
                  fontFamily: "'Kaiti', serif",
                  fontSize: 'clamp(11px,3vw,13px)',
                  cursor: 'pointer', textDecoration: 'underline',
                }}
                onClick={() => { setOtpStep('email'); setCode(''); setMessage(''); }}
              >
                重新輸入 Email
              </button>
            </>
          )}

          {/* 訊息 */}
          {message && (
            <p style={{
              fontFamily: "'Kaiti', serif", textAlign: 'center',
              color: '#fcd34d', fontSize: 'clamp(12px,3.5vw,14px)',
            }}>
              {message}
            </p>
          )}

          {/* ── PWA 安裝提示 ── */}
          {installEvent && (
            <button
              className="mir-btn mir-btn-secondary"
              style={{ marginTop: '1vw', opacity: 0.75 }}
              onClick={async () => {
                installEvent.prompt();
                await installEvent.userChoice;
                setInstallEvent(null);
              }}
            >
              ⬇ 安裝至主畫面（離線可用）
            </button>
          )}
          {showIosHint && !installEvent && (
            <p style={{
              fontFamily: "'Kaiti', serif", textAlign: 'center',
              color: 'rgba(148,163,184,0.65)', fontSize: 'clamp(11px,3vw,12px)',
              lineHeight: 1.7, marginTop: '1vw',
            }}>
              在 Safari 點選 <span style={{ color: '#67e8f9' }}>「分享」</span>
              {' →'} <span style={{ color: '#67e8f9' }}>「加入主畫面」</span>
              {' '}即可安裝
            </p>
          )}
        </div>
      )}

      {/* ── 創角 UI ── */}
      {phase === 'create' && (
        <div
          style={{
            animation: 'ui-in 0.7s ease both',
            width: '100%', maxWidth: 420,
            padding: '0 9vw',
            display: 'flex', flexDirection: 'column', gap: '4vw',
            flexShrink: 0,
            position: 'relative', zIndex: 10,
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '1vw' }}>
            <h2 style={{
              fontFamily: "'Kaiti', serif",
              color: '#cff2fd',
              fontSize: 'clamp(28px,9.5vw,38px)',
              letterSpacing: '0.3em',
              textShadow: '0 0 22px rgba(0,229,255,0.35)',
              margin: 0,
            }}>
              凝聚命格
            </h2>
            <p style={{
              fontFamily: "'Kaiti', serif",
              color: 'rgba(120,140,160,0.8)',
              fontSize: 'clamp(12px,3.5vw,14px)',
              letterSpacing: '0.15em',
              marginTop: '1.5vw',
            }}>
              凡人初入仙途，先定道號與根骨
            </p>
          </div>

          {/* 道號 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2vw' }}>
            <label style={{ fontFamily: "'Kaiti', serif", color: 'rgba(148,163,184,0.85)', fontSize: 'clamp(12px,3.5vw,14px)' }}>
              道號（2–6 字）
            </label>
            <input
              className="mir-input"
              style={{ textAlign: 'center', fontSize: 'clamp(15px,5vw,20px)' }}
              type="text" placeholder="請輸入道友名諱…"
              value={name} onChange={e => setName(e.target.value)} maxLength={6}
            />
          </div>

          {/* 根骨（性別） */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2vw' }}>
            <label style={{ fontFamily: "'Kaiti', serif", color: 'rgba(148,163,184,0.85)', fontSize: 'clamp(12px,3.5vw,14px)' }}>
              根骨（性別）
            </label>
            <div style={{ display: 'flex', gap: '2.5vw' }}>
              {GENDERS.map(g => (
                <button
                  key={g.value}
                  onClick={() => setGender(g.value)}
                  style={{
                    flex: 1,
                    padding: 'clamp(8px,3vw,12px) 0',
                    borderRadius: '.75rem',
                    fontFamily: "'Kaiti', serif",
                    fontSize: 'clamp(11px,3.4vw,14px)',
                    cursor: 'pointer',
                    transition: 'all .18s',
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

          {message && (
            <p style={{ fontFamily: "'Kaiti', serif", textAlign: 'center', color: '#f87171', fontSize: 'clamp(12px,3.5vw,14px)' }}>
              {message}
            </p>
          )}

          <button
            className="mir-btn mir-btn-primary"
            style={{ fontSize: 'clamp(15px,5vw,20px)', letterSpacing: '0.2em', marginTop: '1vw' }}
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

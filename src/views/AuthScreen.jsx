/**
 * AuthScreen.jsx — 《鏡界》修正版：解決星斗溢出與登入失效
 */
import { useState, useEffect, useRef } from 'react';
import useGameStore from '../store/gameStore';

// ── 時序常數 ──────────────────────────────────────────────────────
const STAR_DUR = 0.50;
const LINE_DUR = 0.42;
const LINE_LAG = 0.20;

export default function AuthScreen({ onLogin }) {
  const { player, signOut } = useGameStore();

  const [phase, setPhase] = useState('waiting');
  const [isFlashing, setIsFlashing] = useState(false);
  const [stars, setStars] = useState([]);
  const [edges, setEdges] = useState([]);
  const [message, setMessage] = useState('');

  // 創角與 Email 登入狀態
  const [name, setName] = useState('');
  const [gender, setGender] = useState('保密');
  const [emailStep, setEmailStep] = useState('input');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const loginFormRef = useRef(null);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // =========================================================================
  // 1. 演算星斗（修復座標與比例）
  // =========================================================================
  useEffect(() => {
    // 縮小產生範圍，確保在 320x220 的視口內有安全邊距
    const numStars = 7 + Math.floor(Math.random() * 2);
    const newStars = [];
    const newEdges = [];

    const safeW = 240; // 安全寬度
    const stepX = safeW / (numStars - 1); 
    for (let i = 0; i < numStars; i++) {
      const x = 40 + (i * stepX); 
      const y = 50 + (Math.random() * 120); // 縮小高度範圍，避免超出
      newStars.push({ x, y });
    }

    for (let i = 0; i < numStars - 1; i++) {
      newEdges.push([i, i + 1]);
    }

    setStars(newStars);
    setEdges(newEdges);

    document.fonts.ready.then(() => {
      setPhase('stars');
      const totalDur = newStars.length * STAR_DUR + newEdges.length * LINE_DUR + LINE_LAG;
      
      const flashTimer = setTimeout(() => setIsFlashing(true), totalDur * 1000 + 200);
      const loginTimer = setTimeout(() => setPhase('login'), totalDur * 1000 + 700);
      const fadeTimer = setTimeout(() => setIsFlashing(false), totalDur * 1000 + 1200);

      return () => {
        clearTimeout(flashTimer);
        clearTimeout(loginTimer);
        clearTimeout(fadeTimer);
      };
    });
  }, []);

  // =========================================================================
  // 2. Google 登入初始化（增加 SDK 檢查與手動觸發）
  // =========================================================================
  const initGoogleLogin = () => {
    if (!googleClientId) {
      console.error("Missing Google Client ID");
      return;
    }

    if (window.google && window.google.accounts) {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: false
      });
      // 嘗試彈出 One Tap，如果被擋下也沒關係，按鈕點擊會再試一次
      window.google.accounts.id.prompt();
    } else {
      // 如果 SDK 還沒載入，等一下再試
      setTimeout(initGoogleLogin, 500);
    }
  };

  useEffect(() => {
    if (phase === 'login') {
      // 顯示 UI 動畫
      if (titleRef.current) titleRef.current.style.opacity = '1';
      if (loginFormRef.current) loginFormRef.current.style.opacity = '1';
      
      initGoogleLogin();
    }
  }, [phase]);

  const handleGoogleBtnClick = () => {
    if (!window.google) {
      setMessage("天道感應延遲中，請稍候...");
      return;
    }
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed()) {
        // 如果 One Tap 被 Google 屏蔽，可以導向傳統按鈕渲染
        setMessage("請重整頁面或檢查瀏覽器權限");
      }
    });
  };

  // =========================================================================
  // 3. 處理後續邏輯 (Google/Sync/Create)
  // =========================================================================
  const handleGoogleCredentialResponse = async (response) => {
    try {
      setMessage('天道認證中...');
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '認證失敗');
      
      localStorage.setItem('mirrorrealm_session', JSON.stringify({ user: data.user, token: data.token }));
      await syncWithServer(data.user.id);
    } catch (err) {
      setMessage(err.message);
    }
  };

  const syncWithServer = async (authId) => {
    try {
      setMessage('讀取命盤...');
      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth_id: authId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      if (data.isNew) {
        setPhase('create');
        setMessage('');
      } else {
        useGameStore.getState().setPlayer(data.player);
        onLogin();
      }
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return setMessage('需定下道號。');
    try {
      setMessage('凝聚命魂中...');
      const session = JSON.parse(localStorage.getItem('mirrorrealm_session'));
      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth_id: session.user.id, name: name.trim(), gender })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      useGameStore.getState().setPlayer(data.player);
      onLogin();
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div className="relative w-full h-full bg-[#0a0a0a] overflow-hidden text-white flex flex-col items-center justify-center">
      
      <style>{`
        @keyframes mir-draw-line { to { stroke-dashoffset: 0; opacity: 0.6; } }
        @keyframes mir-star-pop { to { opacity: 1; transform: scale(1); } }
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* 閃耀圖層 */}
      <div 
        className="absolute inset-0 z-50 bg-[#00E5FF] pointer-events-none"
        style={{ 
          opacity: isFlashing ? 1 : 0, 
          transition: isFlashing ? 'opacity 0.05s' : 'opacity 1.5s' 
        }}
      />

      {/* 星圖渲染 (修復：改為 meet 並增加安全範圍) */}
      {phase === 'stars' && (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 320 220" preserveAspectRatio="xMidYMid meet">
          {edges.map((e, idx) => {
            const p1 = stars[e[0]], p2 = stars[e[1]];
            const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            const delay = (STAR_DUR * (e[0] + 1)) + (idx * LINE_DUR) + LINE_LAG;
            return (
              <line key={idx} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#00E5FF" strokeWidth="0.8" strokeDasharray={len} strokeDashoffset={len}
                style={{ animation: `mir-draw-line ${LINE_DUR}s ${delay}s forwards`, opacity: 0 }} />
            );
          })}
          {stars.map((p, idx) => (
            <circle key={idx} cx={p.x} cy={p.y} r="2.5" fill="#fff" filter="drop-shadow(0 0 6px #00E5FF)"
              style={{ opacity: 0, transform: 'scale(0.5)', transformOrigin: `${p.x}px ${p.y}px`, animation: `mir-star-pop ${STAR_DUR}s ${idx * STAR_DUR}s forwards` }} />
          ))}
        </svg>
      )}

      {/* 標題與登入 UI */}
      {(phase === 'login' || phase === 'create') && (
        <div className="flex flex-col items-center z-10 w-full px-8">
          <div ref={titleRef} style={{ opacity: 0, transition: 'all 1s' }} className="text-center mb-12">
             <h1 className="text-5xl font-bold tracking-[0.5em] text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-300" style={{ fontFamily: "'Kaiti', serif" }}>鏡界</h1>
             <p className="mt-4 text-cyan-400/60 tracking-[0.3em] text-xs">賽博修仙紀元</p>
          </div>

          {phase === 'login' && (
            <div ref={loginFormRef} style={{ opacity: 0, transition: 'all 1s' }} className="w-full flex flex-col gap-6">
              
              {/* Google 登入按鈕 */}
              <button 
                onClick={handleGoogleBtnClick}
                className="w-full py-3.5 border border-cyan-500/50 bg-cyan-500/10 text-cyan-400 rounded-full tracking-[0.4em] font-bold hover:bg-cyan-500/20 active:scale-95 transition-all shadow-[0_0_15px_rgba(0,229,255,0.2)]"
                style={{ fontFamily: "'Kaiti', serif" }}
              >
                神識登入
              </button>

              <div className="flex items-center gap-4 opacity-30 px-4">
                <div className="h-[1px] flex-1 bg-white" />
                <span className="text-[10px] tracking-widest">或以飛劍傳書</span>
                <div className="h-[1px] flex-1 bg-white" />
              </div>

              {/* Email 區塊 */}
              <div className="space-y-3">
                <input 
                  type="email" placeholder="輸入信箱" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 py-3 rounded text-center text-sm outline-none focus:border-cyan-500/50 transition-all" />
                <button className="w-full text-xs text-white/40 tracking-widest hover:text-cyan-400 transition-colors">發送驗證符文</button>
              </div>

              {message && <p className="text-center text-cyan-400 text-xs animate-pulse tracking-widest">{message}</p>}
            </div>
          )}

          {phase === 'create' && (
            <div className="w-full space-y-6 animate-fade-in-up">
               <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md">
                 <p className="text-center text-cyan-400 mb-6 tracking-widest">凝聚命魂</p>
                 <input maxLength={8} value={name} onChange={e => setName(e.target.value)} placeholder="輸入道號"
                   className="w-full bg-black/50 border border-cyan-500/30 py-3 rounded text-center mb-4 outline-none" />
                 <div className="flex gap-2">
                   {['男', '女', '保密'].map(g => (
                     <button key={g} onClick={() => setGender(g)} className={`flex-1 py-2 rounded text-xs transition-all ${gender === g ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400' : 'bg-white/5 text-white/40'}`}>{g}</button>
                   ))}
                 </div>
               </div>
               <button onClick={handleCreate} className="w-full py-4 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 rounded-xl tracking-[0.5em] font-bold">踏入鏡界</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
/**
 * AuthScreen.jsx — 《鏡界》動態星斗演算 + 法器啟動爆發 + 無密碼登入 + 創角
 */
import { useState, useEffect, useRef } from 'react';
import useGameStore from '../store/gameStore';

// ── 時序常數 ──────────────────────────────────────────────────────
const BEAT     = 0.48;
const STAR_DUR = 0.50;
const LINE_DUR = 0.42;
const LINE_LAG = 0.20;

export default function AuthScreen({ onLogin }) {
  const { player } = useGameStore();

  // Phase 狀態機: 'waiting' -> 'stars' -> 'login' -> 'create'
  const [phase, setPhase] = useState('waiting');
  
  // 🌟 控制全螢幕「法器啟動」閃耀的狀態
  const [isFlashing, setIsFlashing] = useState(false);

  // 🌟 動態星斗資料
  const [stars, setStars] = useState([]);
  const [edges, setEdges] = useState([]);

  // 登入/創角相關狀態
  const [name, setName] = useState('');
  const [gender, setGender] = useState('保密');
  const [message, setMessage] = useState('');
  
  // DOM Refs
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const loginFormRef = useRef(null);

  // Google OAuth Client ID 檢查
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // =========================================================================
  // 1. 動態演算星斗與時序控制
  // =========================================================================
  useEffect(() => {
    // 演算隨機星斗座標 (7~9顆星)
    const numStars = 7 + Math.floor(Math.random() * 3);
    const newStars = [];
    const newEdges = [];

    // 計算 X 軸分段，確保星星從左蔓延到右
    const stepX = 260 / (numStars - 1); 
    for (let i = 0; i < numStars; i++) {
      const x = 30 + (i * stepX) + (Math.random() * 20 - 10);
      const y = 40 + (Math.random() * 140);
      newStars.push({ x, y });
    }

    // 計算星軌連線 (基本主線)
    for (let i = 0; i < numStars - 1; i++) {
      newEdges.push([i, i + 1]);
    }

    // 計算分支星軌 (隨機產生 1~2 條跨星連線，更像真實星座)
    const extraEdges = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < extraEdges; i++) {
      const from = Math.floor(Math.random() * (numStars - 2));
      const to = from + 2; 
      if (!newEdges.some(e => e[0] === from && e[1] === to)) {
        newEdges.push([from, to]);
      }
    }

    setStars(newStars);
    setEdges(newEdges);

    // 確認字體載入後開始動畫
    document.fonts.ready.then(() => {
      setPhase('stars');

      // 根據星星與連線數量計算總時長
      const totalDur = newStars.length * STAR_DUR + newEdges.length * LINE_DUR + LINE_LAG;

      // 🌟 時序 1：陣法啟動，全螢幕爆發青藍靈光
      const flashTimer = setTimeout(() => {
        setIsFlashing(true);
      }, totalDur * 1000 + 200);

      // 🌟 時序 2：光芒最盛時，偷偷把背景切換成登入介面
      const loginTimer = setTimeout(() => {
        setPhase('login');
      }, totalDur * 1000 + 700);

      // 🌟 時序 3：靈光褪去，登入大門浮現
      const fadeTimer = setTimeout(() => {
        setIsFlashing(false);
      }, totalDur * 1000 + 1200);

      return () => {
        clearTimeout(flashTimer);
        clearTimeout(loginTimer);
        clearTimeout(fadeTimer);
      };
    });
  }, []);

  // =========================================================================
  // 2. 動畫進場控制 (Phase 切換時觸發)
  // =========================================================================
  useEffect(() => {
    if (phase === 'login' && titleRef.current && subtitleRef.current && loginFormRef.current) {
      // 標題與登入區塊淡入
      titleRef.current.style.opacity = '1';
      titleRef.current.style.transform = 'translateY(0) scale(1)';
      subtitleRef.current.style.opacity = '1';
      subtitleRef.current.style.transform = 'translateY(0)';
      
      setTimeout(() => {
        if (loginFormRef.current) {
          loginFormRef.current.style.opacity = '1';
          loginFormRef.current.style.transform = 'translateY(0)';
        }
      }, 400);

      // 初始化 Google One Tap (如果 Phase 是 login 且有 Client ID)
      if (googleClientId && window.google) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: false
        });
        window.google.accounts.id.prompt(); 
      }
    }
  }, [phase, googleClientId]);

  // =========================================================================
  // 3. 登入邏輯處理
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
      
      const sessionStr = JSON.stringify({ user: data.user, token: data.token });
      localStorage.setItem('mirrorrealm_session', sessionStr);
      await syncWithServer(data.user.id);
    } catch (err) {
      console.error('Google登入錯誤:', err);
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
      console.error(err);
      setMessage(err.message);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return setMessage('需定下道號。');
    if (name.length > 8) return setMessage('道號至多八字。');
    
    try {
      setMessage('凝聚命魂中...');
      const sessionStr = localStorage.getItem('mirrorrealm_session');
      if (!sessionStr) throw new Error('未授權，請重整頁面。');
      const session = JSON.parse(sessionStr);

      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          auth_id: session.user.id, 
          name: name.trim(), 
          gender 
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      useGameStore.getState().setPlayer(data.player);
      onLogin();
    } catch (err) {
      setMessage(err.message);
    }
  };

  // =========================================================================
  // 4. 渲染 UI
  // =========================================================================
  return (
    <div className="relative w-full h-full bg-[#0a0a0a] overflow-hidden text-white flex flex-col items-center justify-center">
      
      {/* 🌟 陣法啟動爆發圖層：青藍色，蓋在最上層 */}
      <div 
        className="absolute inset-0 z-50 bg-[#00E5FF] pointer-events-none ease-in-out"
        style={{ 
          opacity: isFlashing ? 1 : 0,
          transition: isFlashing ? 'opacity 0.1s' : 'opacity 1.2s' // 亮起極快，消散緩慢
        }}
      />

      {/* 🌟 只有在 'stars' 階段才渲染星圖，之後徹底消失 */}
      {phase === 'stars' && stars.length > 0 && (
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" viewBox="0 0 320 220" preserveAspectRatio="xMidYMid slice">
          {/* 連線 */}
          {edges.map((e, idx) => {
            const p1 = stars[e[0]];
            const p2 = stars[e[1]];
            const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            const delay = (STAR_DUR * (e[0] + 1)) + (idx * LINE_DUR) + LINE_LAG;
            return (
              <line
                key={`line-${idx}`}
                x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke="#00E5FF" strokeWidth="0.8" strokeDasharray={len} strokeDashoffset={len}
                style={{
                  animation: `mir-draw-line ${LINE_DUR}s ${delay}s forwards cubic-bezier(0.4,0,0.2,1)`,
                  opacity: 0.6
                }}
              />
            );
          })}
          {/* 星星 */}
          {stars.map((p, idx) => (
            <circle
              key={`star-${idx}`}
              cx={p.x} cy={p.y} r="2.5"
              fill="#fff" filter="drop-shadow(0 0 6px #00E5FF)"
              style={{
                opacity: 0,
                transform: 'scale(0.5)',
                transformOrigin: `${p.x}px ${p.y}px`,
                animation: `mir-star-pop ${STAR_DUR}s ${idx * STAR_DUR}s forwards cubic-bezier(0.34,1.56,0.64,1)`
              }}
            />
          ))}
        </svg>
      )}

      {/* ── 標題區 (login / create 階段顯示) ── */}
      {(phase === 'login' || phase === 'create') && (
        <div className="absolute top-[20%] flex flex-col items-center z-10 w-full px-6">
          <h1
            ref={titleRef}
            className="text-5xl font-bold tracking-[0.4em] ml-[0.2em] mb-4 text-transparent bg-clip-text"
            style={{
              fontFamily: "'Kaiti', serif",
              backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #a5f3fc 100%)',
              filter: 'drop-shadow(0 4px 15px rgba(0, 229, 255, 0.3))',
              opacity: 0,
              transform: 'translateY(-20px) scale(0.95)',
              transition: 'all 1.2s cubic-bezier(0.2, 0.8, 0.2, 1)'
            }}
          >
            鏡界
          </h1>
          <div
            ref={subtitleRef}
            className="flex items-center gap-3 opacity-0 transform translate-y-4 transition-all duration-1000 delay-300"
          >
            <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-[#00E5FF]/50" />
            <p className="text-[#00E5FF]/80 tracking-[0.3em] text-sm font-light" style={{ fontFamily: "'Kaiti', serif" }}>
              賽博修仙紀元
            </p>
            <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-[#00E5FF]/50" />
          </div>
        </div>
      )}

      {/* ── 登入按鈕區 ── */}
      {phase === 'login' && (
        <div
          ref={loginFormRef}
          className="absolute bottom-[25%] flex flex-col items-center gap-6 w-full max-w-sm px-8 z-10 opacity-0 transform translate-y-8 transition-all duration-1000 delay-500"
        >
          {!googleClientId ? (
            <div className="text-center p-4 border border-red-500/30 bg-red-500/10 rounded backdrop-blur">
              <p className="text-red-400 text-sm mb-2" style={{ fontFamily: "'Kaiti', serif" }}>缺乏天道印記</p>
              <p className="text-red-400/70 text-xs">請設定 VITE_GOOGLE_CLIENT_ID</p>
            </div>
          ) : (
            <div className="relative group cursor-pointer" onClick={() => window.google?.accounts.id.prompt()}>
              <div className="absolute inset-0 bg-[#00E5FF]/20 blur-md rounded-full group-hover:bg-[#00E5FF]/40 transition-all duration-500" />
              <button className="relative px-12 py-3 border border-[#00E5FF]/50 text-[#00E5FF] tracking-[0.3em] bg-[#0a0a0a]/80 backdrop-blur rounded-full hover:bg-[#00E5FF]/10 transition-all duration-300 overflow-hidden" style={{ fontFamily: "'Kaiti', serif" }}>
                <span className="relative z-10">神識登入</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00E5FF]/20 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
              </button>
            </div>
          )}
          {message && (
            <p className="text-[#00E5FF] text-sm animate-pulse tracking-widest" style={{ fontFamily: "'Kaiti', serif" }}>
              {message}
            </p>
          )}
        </div>
      )}

      {/* ── 創角區 ── */}
      {phase === 'create' && (
        <div className="absolute bottom-[20%] flex flex-col items-center gap-6 w-full max-w-sm px-8 z-10 animate-fade-in-up">
          <div className="w-full space-y-5 bg-[#0f141e]/80 p-6 rounded-xl border border-[#00E5FF]/20 backdrop-blur shadow-[0_0_30px_rgba(0,229,255,0.05)]">
            <h3 className="text-center text-[#00E5FF] tracking-[0.2em] mb-2" style={{ fontFamily: "'Kaiti', serif" }}>凝聚命魂</h3>
            
            <div className="space-y-2">
              <label className="text-xs text-[#00E5FF]/60 tracking-widest ml-1">道號</label>
              <input
                type="text"
                maxLength={8}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="請輸入道號"
                className="w-full bg-[#0a0a0a]/80 border border-[#00E5FF]/30 text-white px-4 py-3 rounded outline-none focus:border-[#00E5FF] focus:shadow-[0_0_10px_rgba(0,229,255,0.2)] transition-all placeholder:text-white/20 tracking-widest text-center"
                style={{ fontFamily: "'Kaiti', serif" }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-[#00E5FF]/60 tracking-widest ml-1">性別</label>
              <div className="flex gap-3">
                {[{ label: '男修', value: '男' }, { label: '女修', value: '女' }, { label: '天道保密', value: '保密' }].map(g => (
                  <button
                    key={g.value}
                    onClick={() => setGender(g.value)}
                    className="flex-1 py-2 rounded text-sm tracking-widest transition-all"
                    style={{
                      fontFamily: "'Kaiti', serif",
                      background: gender === g.value ? 'rgba(0,229,255,0.15)' : 'rgba(10,10,10,0.8)',
                      border: gender === g.value ? '1px solid rgba(0,229,255,0.6)' : '1px solid rgba(0,229,255,0.2)',
                      color: gender === g.value ? '#00E5FF' : 'rgba(255,255,255,0.5)',
                      boxShadow: gender === g.value ? '0 0 10px rgba(0,229,255,0.2)' : 'none'
                    }}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
            
            {message && <p className="text-red-400 text-xs text-center tracking-widest">{message}</p>}
          </div>

          <button
            onClick={handleCreate}
            className="w-full py-3 bg-[#00E5FF]/20 border border-[#00E5FF]/60 text-[#00E5FF] rounded hover:bg-[#00E5FF]/30 active:scale-95 transition-all tracking-[0.3em] font-bold shadow-[0_0_15px_rgba(0,229,255,0.2)]"
            style={{ fontFamily: "'Kaiti', serif" }}
          >
            踏入鏡界
          </button>
        </div>
      )}
    </div>
  );
}
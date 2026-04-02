// src/views/StatusView.jsx
import { useRef, useEffect, useState } from 'react';
import useGameStore from '../store/gameStore';

export default function StatusView() {
  const player         = useGameStore((s) => s.player);
  const realmTemplates = useGameStore((s) => s.realmTemplates);
  const setPlayer      = useGameStore((s) => s.setPlayer);
  const signOut        = useGameStore((s) => s.signOut);
  const canvasRef      = useRef(null);

  const [isBreaking,    setIsBreaking]    = useState(false);
  const [breakMessage,  setBreakMessage]  = useState('');
  const [showFlash,     setShowFlash]     = useState(false);
  const [showSettings,  setShowSettings]  = useState(false);
  const [settingsMsg,   setSettingsMsg]   = useState('');
  const [confirmAction, setConfirmAction] = useState(null); // 'delete' | 'reborn'

  // ── 境界動態計算（依 realmTemplates）────────────────────────────
  const realmLevel   = player?.realm_level ?? 1;
  // 凡人（realm_level=1）靈根尚未開啟，圖騰全為零
  const rootValues   = realmLevel <= 1 ? [0, 0, 0, 0, 0] : [85, 40, 60, 95, 30];

  // ── 陣盤動畫 ────────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const cx     = canvas.width  / 2;
    const cy     = canvas.height / 2;
    const r      = Math.min(canvas.width, canvas.height) * 0.25;

    const elements = ['金', '木', '水', '火', '土'];

    let animationId;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const pulse = Math.sin(Date.now() / 1200) * 0.25 + 0.75;
      const rot   = Date.now() / 15000;

      // 周天靈氣環
      ctx.beginPath();
      ctx.arc(cx, cy, r + 65, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 229, 255, ${0.5 * pulse})`;
      ctx.lineWidth   = 2;
      ctx.shadowBlur  = 25 * pulse;
      ctx.shadowColor = `rgba(0, 229, 255, ${0.8 * pulse})`;
      ctx.stroke();
      ctx.shadowBlur  = 0;

      // 五角陣紋骨架
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255, 214, 10, ${0.5 * pulse})`;
      ctx.lineWidth   = 1.5;
      for (let i = 0; i < 5; i++) {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI / 5) + rot;
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();

      // 靈根雷達圖（凡人全為零則不填充）
      const hasRoots = rootValues.some(v => v > 0);
      if (hasRoots) {
        ctx.beginPath();
        ctx.fillStyle   = `rgba(255, 214, 10, ${0.15 * pulse})`;
        ctx.strokeStyle = `rgba(255, 214, 10, ${0.8  * pulse})`;
        ctx.lineWidth   = 2;
        for (let i = 0; i < 5; i++) {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI / 5) + rot;
          const dist  = r * (rootValues[i] / 100);
          const px    = cx + Math.cos(angle) * dist;
          const py    = cy + Math.sin(angle) * dist;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // 五行文字
      ctx.font         = 'bold 16px "Noto Serif TC", serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle    = `rgba(255, 214, 10, ${0.9 * pulse})`;
      ctx.shadowBlur   = 8;
      ctx.shadowColor  = 'rgba(255, 214, 10, 0.6)';
      for (let i = 0; i < 5; i++) {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI / 5) + rot;
        const tx = cx + Math.cos(angle) * (r + 22);
        const ty = cy + Math.sin(angle) * (r + 22);
        ctx.fillText(elements[i], tx, ty);
      }
      ctx.shadowBlur = 0;

      animationId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animationId);
  }, [rootValues[0]]); // realmLevel 改變時重新渲染雷達

  if (!player) return null;

  const nextRealm = realmTemplates.find((r) => r.level === realmLevel + 1);
  const realmName    = player.realm_name ?? `境界 ${realmLevel}`;
  const aura    = player.aura     ?? 0;
  const maxAura = player.max_aura ?? 120;

  // 突破條件：需有下一境界，且周天靈氣達到上限
  const canBreak   = !!nextRealm && aura >= maxAura;
  // 已到頂：模板已載入且確實沒有下一境界
  const isMaxRealm = realmTemplates.length > 0 && !nextRealm;

  // ── 境界突破 ────────────────────────────────────────────────────
  const handleBreakthrough = async () => {
    if (!player?.id || isBreaking) return;
    setIsBreaking(true);
    setBreakMessage('');
    try {
      const res    = await fetch('/api/player/breakthrough', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ playerId: player.id }),
      });
      const result = await res.json();

      if (!res.ok) {
        setBreakMessage(result.message);
      } else {
        if (navigator.vibrate) navigator.vibrate([100, 50, 200, 50, 300]);
        setShowFlash(true);
        setTimeout(() => setShowFlash(false), 800);
        setBreakMessage(result.data.message);
        setPlayer(result.data);
      }
    } catch {
      setBreakMessage('突破失敗，天地靈氣紊亂');
    } finally {
      setIsBreaking(false);
    }
  };

  // ── 刪除帳號 ────────────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    setSettingsMsg('');
    try {
      const res    = await fetch('/api/auth/delete', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ playerId: player.id }),
      });
      const result = await res.json();
      if (!res.ok) { setSettingsMsg(result.message ?? '刪除失敗'); return; }
      await signOut();
    } catch {
      setSettingsMsg('刪除失敗，請稍後再試');
    }
  };

  // ── 重生 ────────────────────────────────────────────────────────
  const handleReborn = async () => {
    setSettingsMsg('');
    try {
      const res    = await fetch('/api/player/reborn', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ playerId: player.id }),
      });
      const result = await res.json();
      if (!res.ok) { setSettingsMsg(result.message ?? '重生失敗'); return; }
      // 重生後回到創角畫面（store 需重新 sync）
      await signOut();
    } catch {
      setSettingsMsg('重生失敗，請稍後再試');
    }
  };

  // ── 聲望 / 煞氣 稱號 ────────────────────────────────────────────
  const getGoodTitle = (karma) => {
    if ((karma ?? 0) > 1000) return '名動天下';
    if ((karma ?? 0) > 500)  return '名震一方';
    if ((karma ?? 0) > 100)  return '行俠仗義';
    return '默默無聞';
  };
  const getEvilTitle = (karma) => {
    if ((karma ?? 0) > 500)  return '血債累累';
    if ((karma ?? 0) > 100)  return '殺戮成性';
    if ((karma ?? 0) > 0)    return '略有煞氣';
    return '清淨無垢';
  };

  return (
    <div className="h-full w-full relative bg-transparent overflow-y-auto flex flex-col items-center pt-[8vh] pb-[calc(env(safe-area-inset-bottom,20px)+8vh)]">

      {/* 全螢幕突破閃光 */}
      {showFlash && (
        <div className="fixed inset-0 z-[100] bg-white/30 backdrop-blur-sm pointer-events-none animate-ping" />
      )}

      {/* ── 天機（設定）按鈕 ─────────────────────────────────────── */}
      <button
        onClick={() => { setShowSettings(true); setConfirmAction(null); setSettingsMsg(''); }}
        className="absolute top-4 right-4 z-20 flex flex-col gap-[5px] p-2 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="天機"
      >
        <span className="block w-[22px] h-[2px] bg-white/80 rounded-full" />
        <span className="block w-[22px] h-[2px] bg-white/80 rounded-full" />
        <span className="block w-[22px] h-[2px] bg-white/80 rounded-full" />
      </button>

      {/* ── 靈根陣盤 ─────────────────────────────────────── */}
      <div className="relative w-full max-w-[320px] flex-shrink-0 flex flex-col items-center justify-center" style={{ height: '38vh' }}>
        <canvas ref={canvasRef} width="320" height="320"
          className="absolute inset-0 w-full h-full object-contain z-0 pointer-events-none" />
      </div>

      {/* 周天靈氣 / 突破按鈕 */}
      {canBreak ? (
        <div className="shrink-0 mb-3 w-full max-w-[260px]">
          <button
            onClick={handleBreakthrough}
            disabled={isBreaking}
            className="w-full py-2.5 rounded-lg text-sm tracking-[0.4em] font-serif transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,140,0,0.15))',
              border:     '1px solid rgba(255,215,0,0.6)',
              color:      '#FFD700',
              boxShadow:  '0 0 20px rgba(255,215,0,0.3), inset 0 0 10px rgba(255,215,0,0.05)',
              animation:  isBreaking ? 'none' : 'pulse-gold 2s infinite',
            }}
          >
            {isBreaking ? '突破中...' : '⚡ 衝擊境界'}
          </button>
        </div>
      ) : (
        <div className="text-[clamp(11px,3.5cqw,14px)] text-white/80 tracking-[0.2em] font-serif text-center shrink-0 mb-[3vh]">
          周天靈氣 {aura} / {maxAura}
          {isMaxRealm && <span className="ml-2 text-[#FFD700]/60">（已臻巔峰）</span>}
        </div>
      )}

      {/* ── 命格資訊區 ──────────────────────────────────────────── */}
      <div className="flex flex-row justify-center items-start gap-[8cqw] px-[8cqw] w-full max-w-[360px] shrink-0 z-10 mb-4">

        {/* 左：道號垂排 */}
        <div
          className="text-[clamp(32px,10cqw,42px)] text-white/95 tracking-[0.2em] font-serif leading-tight shrink-0 mt-2"
          style={{ writingMode: 'vertical-rl', textOrientation: 'upright', textShadow: '0 0 10px rgba(255,255,255,0.2)' }}
        >
          {player.name ?? '無名散修'}
        </div>

        {/* 右：數值列表 */}
        <div className="flex flex-col flex-grow text-white/90 tracking-[0.2em] font-serif gap-[1.5vh]">

          {/* 境界名稱 */}
          <div className="text-[clamp(18px,5.5cqw,22px)] mb-1 drop-shadow-md">
            {realmName}
          </div>

          {/* 屬性列 */}
          {[
            { label: '壽元', value: `${player.age ?? 0}/${player.max_age ?? 0}` },
            { label: '靈力', value: `${player.mp ?? 0}/${player.max_mp ?? 0}` },
            { label: '神識', value: `${player.god_sense ?? 0}/${player.max_god_sense ?? 0}` },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-end w-full">
              <span className="opacity-80 text-[clamp(15px,4.5cqw,18px)] tracking-[0.4em]">{label}</span>
              <span className="font-mono text-[clamp(16px,5cqw,20px)] tracking-wider drop-shadow-sm">{value}</span>
            </div>
          ))}

          <div className="w-full h-[1px] bg-white/5 my-1" />

          {/* 聲望 / 煞氣 */}
          <div className="flex justify-between items-end w-full">
            <span className="opacity-80 text-[clamp(15px,4.5cqw,18px)] tracking-[0.4em]">聲望</span>
            <span className="text-[14px] text-white/60 tracking-[0.3em] font-serif drop-shadow-sm">
              {getGoodTitle(player.karma_good)}
            </span>
          </div>
          <div className="flex justify-between items-end w-full">
            <span className="opacity-80 text-[clamp(15px,4.5cqw,18px)] tracking-[0.4em]">煞氣</span>
            <span className="text-[14px] text-white/60 tracking-[0.3em] font-serif drop-shadow-sm">
              {getEvilTitle(player.karma_evil)}
            </span>
          </div>
        </div>
      </div>

      {/* 突破結果訊息 */}
      {breakMessage !== '' && (
        <p className={`shrink-0 text-center text-[13px] tracking-wider leading-relaxed px-6 mt-4
          ${breakMessage.includes('成功') ? 'text-[#FFD700]' : 'text-[#FF3B30]'}`}>
          {breakMessage}
        </p>
      )}

      {/* ── 天機設定 Modal ──────────────────────────────────────────── */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md"
          onClick={(e) => { if (e.target === e.currentTarget) setShowSettings(false); }}
        >
          <div className="w-full max-w-[320px] mx-4 flex flex-col gap-3 px-6 py-8"
            style={{
              background: 'rgba(10,12,18,0.92)',
              border: '1px solid rgba(0,229,255,0.2)',
              borderRadius: '1rem',
              boxShadow: '0 0 40px rgba(0,229,255,0.08)',
            }}
          >
            {/* 標題 */}
            <div className="text-center mb-2">
              <div className="text-[18px] tracking-[0.5em] font-serif text-white/80">天　機</div>
              <div className="w-12 h-[1px] bg-[#00E5FF]/30 mx-auto mt-2" />
            </div>

            {/* 尚未確認狀態 */}
            {!confirmAction && (
              <>
                {/* 登出 */}
                <button
                  onClick={async () => { setShowSettings(false); await signOut(); }}
                  className="w-full py-3 rounded-lg text-[15px] tracking-[0.3em] font-serif transition-all active:scale-95"
                  style={{
                    background: 'rgba(0,229,255,0.06)',
                    border: '1px solid rgba(0,229,255,0.25)',
                    color: 'rgba(200,240,255,0.8)',
                  }}
                >
                  離開仙途（登出）
                </button>

                {/* 重生 */}
                <button
                  onClick={() => setConfirmAction('reborn')}
                  className="w-full py-3 rounded-lg text-[15px] tracking-[0.3em] font-serif transition-all active:scale-95"
                  style={{
                    background: 'rgba(255,140,0,0.06)',
                    border: '1px solid rgba(255,140,0,0.3)',
                    color: 'rgba(255,180,80,0.85)',
                  }}
                >
                  輪迴重生（重置角色）
                </button>

                {/* 刪除帳號 */}
                <button
                  onClick={() => setConfirmAction('delete')}
                  className="w-full py-3 rounded-lg text-[15px] tracking-[0.3em] font-serif transition-all active:scale-95"
                  style={{
                    background: 'rgba(255,59,48,0.06)',
                    border: '1px solid rgba(255,59,48,0.3)',
                    color: 'rgba(255,100,90,0.85)',
                  }}
                >
                  道消形滅（刪除帳號）
                </button>

                {settingsMsg && (
                  <p className="text-center text-[13px] text-red-400 tracking-wider">{settingsMsg}</p>
                )}

                {/* 關閉 */}
                <button
                  onClick={() => setShowSettings(false)}
                  className="mt-2 w-full py-2 text-[13px] tracking-[0.3em] font-serif text-white/30 hover:text-white/60 transition-colors"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  返回
                </button>
              </>
            )}

            {/* 確認：重生 */}
            {confirmAction === 'reborn' && (
              <>
                <p className="text-center text-[14px] tracking-wider font-serif text-white/70 leading-relaxed">
                  輪迴重生將清除所有修為與角色資料，<br/>重新踏上仙途。
                  <br/><span className="text-orange-400/80">此操作無法復原。</span>
                </p>
                <button
                  onClick={handleReborn}
                  className="w-full py-3 rounded-lg text-[15px] tracking-[0.3em] font-serif active:scale-95"
                  style={{ background: 'rgba(255,140,0,0.15)', border: '1px solid rgba(255,140,0,0.5)', color: '#FFAA40' }}
                >
                  確認重生
                </button>
                {settingsMsg && (
                  <p className="text-center text-[13px] text-red-400 tracking-wider">{settingsMsg}</p>
                )}
                <button
                  onClick={() => setConfirmAction(null)}
                  className="w-full py-2 text-[13px] tracking-[0.3em] font-serif text-white/30 hover:text-white/60 transition-colors"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  取消
                </button>
              </>
            )}

            {/* 確認：刪除帳號 */}
            {confirmAction === 'delete' && (
              <>
                <p className="text-center text-[14px] tracking-wider font-serif text-white/70 leading-relaxed">
                  道消形滅將永久刪除帳號與所有資料，<br/>
                  <span className="text-red-400/80">此操作無法復原。</span>
                </p>
                <button
                  onClick={handleDeleteAccount}
                  className="w-full py-3 rounded-lg text-[15px] tracking-[0.3em] font-serif active:scale-95"
                  style={{ background: 'rgba(255,59,48,0.15)', border: '1px solid rgba(255,59,48,0.5)', color: '#FF6B6B' }}
                >
                  確認刪除
                </button>
                {settingsMsg && (
                  <p className="text-center text-[13px] text-red-400 tracking-wider">{settingsMsg}</p>
                )}
                <button
                  onClick={() => setConfirmAction(null)}
                  className="w-full py-2 text-[13px] tracking-[0.3em] font-serif text-white/30 hover:text-white/60 transition-colors"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  取消
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse-gold {
          0%, 100% { box-shadow: 0 0 20px rgba(255,215,0,0.3), inset 0 0 10px rgba(255,215,0,0.05); }
          50%       { box-shadow: 0 0 35px rgba(255,215,0,0.7), inset 0 0 15px rgba(255,215,0,0.1); }
        }
      `}</style>

    </div>
  );
}

// src/views/StatusView.jsx
import React, { useRef, useEffect, useState } from 'react';
import useGameStore from '../store/gameStore';

// 境界等級 → 名稱對照（與 realm_templates 一致）
const REALM_NAMES = {
  1: '凡人',
  2: '練氣一層',
  3: '練氣二層',
  4: '練氣三層',
  5: '築基初期',
};

// 升至下一境界所需的「累計」修為門檻（與 realm_templates.required_exp 一致）
const REALM_EXP_REQUIRED = {
  1: 100,
  2: 300,
  3: 600,
  4: 1200,
  5: null, // 已是最高境界
};

const EQUIP_SLOTS = [
  { slot: 'weapon',  label: '武器' },
  { slot: 'armor',   label: '防具' },
  { slot: 'trinket', label: '飾品' },
];

export default function StatusView() {
  const player    = useGameStore((s) => s.player);
  const setPlayer = useGameStore((s) => s.setPlayer);
  const canvasRef = useRef(null);

  const [isBreaking,    setIsBreaking]    = useState(false);
  const [breakMessage,  setBreakMessage]  = useState('');
  const [showFlash,     setShowFlash]     = useState(false);
  const [equipment,     setEquipment]     = useState([]);
  const [isUnequipping, setIsUnequipping] = useState(false);

  const fetchEquipment = async (id) => {
    if (!id) return;
    try {
      const res    = await fetch(`/api/player/equipment/${id}`);
      const result = await res.json();
      if (result.status === 'success') setEquipment(result.data);
    } catch {}
  };

  useEffect(() => { fetchEquipment(player?.id); }, [player?.id]);

  const handleUnequip = async (slot) => {
    if (!player?.id || isUnequipping) return;
    setIsUnequipping(true);
    try {
      const res    = await fetch('/api/player/unequip', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ playerId: player.id, slot }),
      });
      const result = await res.json();
      if (res.ok) {
        setEquipment((prev) => prev.filter((e) => e.slot !== slot));
        setPlayer({ attack: result.data.attack, defense: result.data.defense });
      }
    } catch {} finally {
      setIsUnequipping(false);
    }
  };

  // ── 陣盤動畫 ────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const cx     = canvas.width  / 2;
    const cy     = canvas.height / 2;
    const r      = Math.min(canvas.width, canvas.height) * 0.25;

    const elements   = ['金', '木', '水', '火', '土'];
    const rootValues = [85, 40, 60, 95, 30];

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

      // 靈根雷達圖
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
  }, []);

  if (!player) return null;

  // ── 境界計算 ────────────────────────────────────────────────
  const realmLevel  = player.realm_level ?? 1;
  const realmName   = REALM_NAMES[realmLevel] ?? `境界 ${realmLevel}`;
  const aura        = player.aura     ?? 0;
  const maxAura     = player.max_aura ?? 120;
  const canBreak    = aura >= maxAura;

  // ── 境界突破 ────────────────────────────────────────────────
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
        setPlayer(result.data); // 同步更新 Zustand store
      }
    } catch {
      setBreakMessage('突破失敗，天地靈氣紊亂');
    } finally {
      setIsBreaking(false);
    }
  };

  const getGoodTitle = (karma) => (karma > 500 ? '名震一方' : '默默無聞');
  const getEvilTitle = (karma) => (karma > 100 ? '殺戮成性' : '心如止水');

  return (
    <div className="h-full w-full relative bg-transparent overflow-y-auto flex flex-col items-center pt-[4vh] pb-[calc(env(safe-area-inset-bottom,20px)+8vh)]">

      {/* 全螢幕突破閃光 */}
      {showFlash && (
        <div className="fixed inset-0 z-[100] bg-white/30 backdrop-blur-sm pointer-events-none animate-ping" />
      )}

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
        <div className="text-[clamp(13px,3.8cqw,16px)] text-white/80 tracking-[0.2em] font-serif text-center shrink-0 mb-3">
          周天靈氣 <span className="text-[#00E5FF] font-mono">{player.aura ?? 0}</span>
          /{player.max_aura ?? 120}
        </div>
      )}

      {/* ── 命格資訊區 ───────────────────────────────────── */}
      <div className="flex flex-row justify-center items-start gap-[8cqw] px-[8cqw] w-full max-w-[400px] shrink-0 z-10 mb-4">

        {/* 左：道號垂排 */}
        <div
          className="text-[clamp(28px,9cqw,40px)] text-white tracking-[0.3em] font-serif leading-none shrink-0"
          style={{ writingMode: 'vertical-rl', textOrientation: 'upright', textShadow: '0 0 10px rgba(255,255,255,0.4)' }}
        >
          {player.name ?? '無名散修'}
        </div>

        {/* 右：數值列表 */}
        <div className="flex flex-col flex-grow text-[clamp(14px,4cqw,18px)] text-white tracking-[0.15em] font-serif pt-1 gap-[2cqw]">

          {/* 境界名稱 */}
          <div className="font-bold text-[#FFD700]" style={{ textShadow: '0 0 8px rgba(255,215,0,0.5)' }}>
            {realmName}
          </div>

          {/* 屬性列 */}
          {[
            { label: '壽元',  value: `${player.age ?? 18} 歲` },
            { label: '氣血',  value: `${player.hp ?? 0} / ${player.max_hp ?? 100}` },
            { label: '體力',  value: `${player.sp ?? 0} / ${player.max_sp ?? 100}` },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-end w-full">
              <span className="opacity-60 text-[13px]">{label}</span>
              <span className="font-mono text-[clamp(14px,4.5cqw,18px)]">{value}</span>
            </div>
          ))}

          {/* 聲望 / 煞氣 */}
          <div className="flex justify-between items-end w-full">
            <span className="opacity-60 text-[13px]">聲望</span>
            <span className="text-[12px] text-[#00E5FF] tracking-[0.3em]">{getGoodTitle(player.karma_good)}</span>
          </div>
          <div className="flex justify-between items-end w-full">
            <span className="opacity-60 text-[13px]">煞氣</span>
            <span className="text-[12px] text-[#FF3B30] tracking-[0.3em]">{getEvilTitle(player.karma_evil)}</span>
          </div>
        </div>
      </div>

      {/* 突破結果訊息 */}
      {breakMessage !== '' && (
        <p className={`shrink-0 text-center text-[13px] tracking-wider leading-relaxed px-6
          ${breakMessage.includes('成功') ? 'text-[#FFD700]' : 'text-[#FF3B30]'}`}>
          {breakMessage}
        </p>
      )}

      {/* 按鈕發光動畫 keyframes */}
      <style>{`
        @keyframes pulse-gold {
          0%, 100% { box-shadow: 0 0 20px rgba(255,215,0,0.3), inset 0 0 10px rgba(255,215,0,0.05); }
          50%       { box-shadow: 0 0 35px rgba(255,215,0,0.7), inset 0 0 15px rgba(255,215,0,0.1); }
        }
      `}</style>

    </div>
  );
}

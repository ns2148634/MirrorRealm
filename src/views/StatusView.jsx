// src/views/StatusView.jsx
import { useRef, useEffect, useState } from 'react';
import useGameStore from '../store/gameStore';

const RARITY_COLOR = { white:'#FFFFFF', green:'#32D74B', blue:'#00E5FF', purple:'#9B5CFF', gold:'#FFD700', red:'#FF3B30' };

const BT_STATES = ['entering-bt','bt','exiting-bt','entering-sub','sub','exiting-sub'];

export default function StatusView() {
  const player         = useGameStore((s) => s.player);
  const realmTemplates = useGameStore((s) => s.realmTemplates);
  const setPlayer      = useGameStore((s) => s.setPlayer);
  const canvasRef      = useRef(null);

  const [isBreaking,   setIsBreaking]   = useState(false);
  const [breakMessage, setBreakMessage] = useState('');
  const [showFlash,    setShowFlash]    = useState(false);

  // ── 子視圖狀態機 ──────────────────────────────────────────────────
  const [bvState,   setBvState]   = useState('overview');
  const [activeSub, setActiveSub] = useState(null); // 'boost'|'formation'|'safety'

  // 突破道具庫存 & 選擇
  const [btInv,        setBtInv]        = useState({ boost:[], formation:[], safety:[] });
  const [selBoost,     setSelBoost]     = useState([]);
  const [selFormation, setSelFormation] = useState(null);
  const [selSafety,    setSelSafety]    = useState(null);

  // ── 境界 / 靈氣計算 ───────────────────────────────────────────────
  const realmLevel = player?.realm_level ?? 1;
  const rootValues = realmLevel <= 1
    ? [0,0,0,0,0]
    : [player?.sr_metal??0, player?.sr_wood??0, player?.sr_water??0, player?.sr_fire??0, player?.sr_earth??0];

  const nextRealm    = realmTemplates.find(r => r.level === realmLevel + 1);
  const currentRealm = realmTemplates.find(r => r.level === realmLevel);
  const realmName    = player?.realm_name  ?? currentRealm?.realm_name  ?? `境界 ${realmLevel}`;
  const realmStage   = player?.realm_stage ?? currentRealm?.realm_stage ?? '';
  const aura    = player?.aura     ?? 0;
  const maxAura = player?.max_aura ?? 120;
  const age     = player?.age      ?? 0;
  const maxAge  = player?.max_age  ?? 80;

  const canBreak         = !!nextRealm && aura >= maxAura;
  const isMaxRealm       = realmTemplates.length > 0 && !nextRealm;
  const baseBreakRate    = nextRealm
    ? Math.min(nextRealm.success_rate ?? 100, nextRealm.success_rate_cap ?? 100)
    : 100;
  const lifeRemain       = maxAge - age;
  const isLifeLow        = maxAge > 0 && (lifeRemain / maxAge) * 100 <= 20 && lifeRemain > 0;

  const boostBonus       = selBoost.reduce((s, i) => s + (i.effect_value ?? 0), 0);
  const effectiveRate    = Math.min(nextRealm?.success_rate_cap ?? 100, baseBreakRate + boostBonus);

  const nameFull         = player?.name ?? '無名';
  const nameTopChar      = nameFull[0] ?? '無';
  const nameBottomChars  = nameFull.slice(1);
  const meditatorImg     = player?.gender === 'female' ? 'meditator_female.svg' : 'meditator_male.svg';

  // ── 進入突破頁時載入可用道具 ──────────────────────────────────────
  useEffect(() => {
    if (bvState !== 'bt' || !player?.id) return;
    fetch(`/api/player/backpack/${player.id}`)
      .then(r => r.json())
      .then(json => {
        if (json.status !== 'success') return;
        const boost=[], formation=[], safety=[];
        for (const item of json.data) {
          const base = {
            id: String(item.item_id), name: item.name,
            desc: item.description ?? '', effect_value: item.effect_value ?? 0,
            color: RARITY_COLOR[item.rarity] ?? '#FFFFFF',
          };
          if (item.item_type === '丹藥')      boost.push(base);
          else if (item.item_type === '陣法') formation.push(base);
          else if (item.item_type === '法器') safety.push(base);
        }
        setBtInv({ boost, formation, safety });
      })
      .catch(console.error);
  }, [bvState, player?.id]);

  // ── Canvas：靈根五角陣 + 周天靈氣進度環 ────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const cx = canvas.width / 2, cy = canvas.height / 2;
    const r     = Math.min(canvas.width, canvas.height) * 0.25;
    const ringR = r + 65;
    const fillRatio = maxAura > 0 ? Math.min(aura / maxAura, 1) : 0;
    const isFull    = fillRatio >= 1;
    const elements  = ['金','木','水','火','土'];
    let animId;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const pulse  = Math.sin(Date.now() / 1200) * 0.25 + 0.75;
      const rPulse = Math.sin(Date.now() / 550)  * 0.30 + 0.70;
      const rot    = Date.now() / 15000;

      // 底環（暗）
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,229,255,0.10)';
      ctx.lineWidth   = 2.5;
      ctx.shadowBlur  = 0;
      ctx.stroke();

      // 靈氣進度弧
      if (fillRatio > 0) {
        const sa = -Math.PI / 2;
        const ea =  sa + fillRatio * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, sa, ea);
        ctx.lineCap = 'round';
        if (isFull) {
          ctx.strokeStyle = `rgba(255,55,0,${0.88 * rPulse})`;
          ctx.shadowBlur  = 30 * rPulse;
          ctx.shadowColor = `rgba(255,80,0,0.95)`;
          ctx.lineWidth   = 4;
        } else {
          ctx.strokeStyle = `rgba(0,229,255,${0.65 * pulse})`;
          ctx.shadowBlur  = 18 * pulse;
          ctx.shadowColor = 'rgba(0,229,255,0.55)';
          ctx.lineWidth   = 2.5;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.lineCap    = 'butt';
      }

      // 五角陣骨架
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255,214,10,${0.5 * pulse})`;
      ctx.lineWidth   = 1.5;
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI/2 + (i*2*Math.PI/5) + rot;
        const px = cx + Math.cos(a)*r, py = cy + Math.sin(a)*r;
        i === 0 ? ctx.moveTo(px,py) : ctx.lineTo(px,py);
      }
      ctx.closePath();
      ctx.stroke();

      // 靈根雷達
      if (rootValues.some(v => v > 0)) {
        ctx.beginPath();
        ctx.fillStyle   = `rgba(255,214,10,${0.15*pulse})`;
        ctx.strokeStyle = `rgba(255,214,10,${0.8*pulse})`;
        ctx.lineWidth   = 2;
        for (let i = 0; i < 5; i++) {
          const a    = -Math.PI/2 + (i*2*Math.PI/5) + rot;
          const dist = r*(rootValues[i]/100);
          const px   = cx+Math.cos(a)*dist, py = cy+Math.sin(a)*dist;
          i === 0 ? ctx.moveTo(px,py) : ctx.lineTo(px,py);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }

      // 五行文字
      ctx.font         = 'bold 16px "Noto Serif TC",serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle    = `rgba(255,214,10,${0.9*pulse})`;
      ctx.shadowBlur   = 8;
      ctx.shadowColor  = 'rgba(255,214,10,0.6)';
      for (let i = 0; i < 5; i++) {
        const a  = -Math.PI/2 + (i*2*Math.PI/5) + rot;
        const tx = cx+Math.cos(a)*(r+22), ty = cy+Math.sin(a)*(r+22);
        ctx.fillText(elements[i], tx, ty);
      }
      ctx.shadowBlur = 0;
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootValues[0], rootValues[1], rootValues[2], rootValues[3], rootValues[4], aura, maxAura]);

  // ── 子視圖導航 ────────────────────────────────────────────────────
  const goToBreakthrough = () => {
    setBvState('entering-bt');
    setTimeout(() => setBvState('bt'), 400);
  };
  const goToSub = (sub) => {
    setActiveSub(sub);
    setBvState('entering-sub');
    setTimeout(() => setBvState('sub'), 400);
  };
  const goBackFromSub = () => {
    setBvState('exiting-sub');
    setTimeout(() => setBvState('bt'), 400);
  };
  const goBackFromBt = () => {
    setBvState('exiting-bt');
    setSelBoost([]); setSelFormation(null); setSelSafety(null);
    setTimeout(() => setBvState('overview'), 400);
  };

  // ── 突破 ──────────────────────────────────────────────────────────
  const handleBreakthrough = async () => {
    if (!player?.id || isBreaking) return;
    setIsBreaking(true); setBreakMessage('');
    try {
      const res    = await fetch('/api/player/breakthrough', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId:    player.id,
          boostItems:  selBoost.map(i => i.id),
          formationId: selFormation?.id ?? null,
          safetyId:    selSafety?.id    ?? null,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        setBreakMessage(result.message);
      } else {
        const data = result.data;
        setBreakMessage(data.message);
        setPlayer(prev => ({ ...prev, ...data }));
        if (data.outcome === 'success') {
          if (navigator.vibrate) navigator.vibrate([100,50,200,50,300]);
          setShowFlash(true);
          setTimeout(() => setShowFlash(false), 800);
          goBackFromBt();
        }
      }
    } catch { setBreakMessage('突破失敗，天地靈氣紊亂'); }
    finally   { setIsBreaking(false); }
  };

  const getGoodTitle = (k) => {
    if ((k??0)>1000) return '名動天下';
    if ((k??0)>500)  return '名震一方';
    if ((k??0)>100)  return '行俠仗義';
    return '默默無聞';
  };
  const getEvilTitle = (k) => {
    if ((k??0)>500) return '血債累累';
    if ((k??0)>100) return '殺戮成性';
    if ((k??0)>0)   return '略有煞氣';
    return '清淨無垢';
  };

  if (!player) return null;

  // ── 動畫 class ────────────────────────────────────────────────────
  const showBt  = BT_STATES.includes(bvState);
  const showSub = ['entering-sub','sub','exiting-sub'].includes(bvState);

  const ovClass = (() => {
    if (bvState === 'overview')    return 'opacity-100';
    if (bvState === 'entering-bt') return 'animate-zoom-out-fade pointer-events-none';
    if (bvState === 'exiting-bt')  return 'animate-shrink-in-fade pointer-events-none';
    return 'opacity-0 pointer-events-none hidden';
  })();

  const btClass = (() => {
    if (bvState === 'entering-bt')  return 'animate-zoom-in-fade pointer-events-none';
    if (bvState === 'bt')           return 'opacity-100';
    if (bvState === 'exiting-bt')   return 'animate-shrink-out-fade pointer-events-none';
    if (bvState === 'entering-sub') return 'animate-zoom-out-fade pointer-events-none';
    if (bvState === 'exiting-sub')  return 'animate-shrink-in-fade pointer-events-none';
    return 'opacity-0 pointer-events-none hidden';
  })();

  const subClass = (() => {
    if (bvState === 'entering-sub') return 'animate-zoom-in-fade pointer-events-none';
    if (bvState === 'sub')          return 'opacity-100';
    if (bvState === 'exiting-sub')  return 'animate-shrink-out-fade pointer-events-none';
    return 'opacity-0 pointer-events-none hidden';
  })();

  const subItems = activeSub === 'boost' ? btInv.boost
                 : activeSub === 'formation' ? btInv.formation
                 : btInv.safety;

  return (
    <div className="h-full w-full relative bg-transparent overflow-hidden">

      {showFlash && (
        <div className="fixed inset-0 z-[100] bg-white/30 backdrop-blur-sm pointer-events-none animate-ping" />
      )}

      <style>{`
        @keyframes pulse-red {
          0%,100%{ box-shadow:0 0 20px rgba(255,50,0,0.3),inset 0 0 10px rgba(255,50,0,0.05); }
          50%    { box-shadow:0 0 38px rgba(255,50,0,0.75),inset 0 0 18px rgba(255,50,0,0.1); }
        }
        @keyframes zoom-out-fade {
          from{ transform:scale(1);   opacity:1; }
          to  { transform:scale(1.5); opacity:0; }
        }
        .animate-zoom-out-fade{ animation:zoom-out-fade 0.4s cubic-bezier(.4,0,.2,1) forwards; }
        @keyframes zoom-in-fade {
          from{ transform:scale(0.8); opacity:0; }
          to  { transform:scale(1);   opacity:1; }
        }
        .animate-zoom-in-fade{ animation:zoom-in-fade 0.4s cubic-bezier(.4,0,.2,1) forwards; }
        @keyframes shrink-out-fade {
          from{ transform:scale(1);   opacity:1; }
          to  { transform:scale(0.8); opacity:0; }
        }
        .animate-shrink-out-fade{ animation:shrink-out-fade 0.4s cubic-bezier(.4,0,.2,1) forwards; }
        @keyframes shrink-in-fade {
          from{ transform:scale(1.5); opacity:0; }
          to  { transform:scale(1);   opacity:1; }
        }
        .animate-shrink-in-fade{ animation:shrink-in-fade 0.4s cubic-bezier(.4,0,.2,1) forwards; }
        @keyframes gentle-float {
          0%,100%{ transform:translateY(0); }
          50%    { transform:translateY(-8px); }
        }
        .animate-float{ animation:gentle-float 4s ease-in-out infinite; }
      `}</style>

      {/* ══════════════════════════════════════
          L1 主本命頁
          ══════════════════════════════════════ */}
      <div className={`absolute inset-0 flex flex-col items-center justify-evenly py-2 ${ovClass}`}>

        {/* 陣盤（含靈氣進度環，永遠可點擊進入靈氣詳情）*/}
        <div
          className="relative shrink-0 flex items-center justify-center cursor-pointer"
          style={{ width:'200px', height:'200px' }}
          onClick={goToBreakthrough}
        >
          <canvas ref={canvasRef} width="320" height="320"
            className="w-full h-full object-contain z-0 pointer-events-none" />
        </div>

        {/* 命格資訊區 */}
        <div className="flex flex-row justify-center items-stretch gap-[5cqw] px-[5cqw] w-full max-w-[360px] shrink-0 z-10">

          {/* 左：道號拆字垂排 */}
          <div className="flex flex-col items-center shrink-0">
            <div className="text-[clamp(28px,9cqw,38px)] text-white/95 font-serif leading-none"
              style={{ writingMode:'vertical-rl', textOrientation:'upright', textShadow:'0 0 10px rgba(255,255,255,0.25)' }}>
              {nameTopChar}
            </div>
            <div className="flex-1 min-h-[8px]" />
            {nameBottomChars && (
              <div className="text-[clamp(28px,9cqw,38px)] text-white/95 font-serif leading-none"
                style={{ writingMode:'vertical-rl', textOrientation:'upright', textShadow:'0 0 10px rgba(255,255,255,0.25)' }}>
                {nameBottomChars}
              </div>
            )}
          </div>

          {/* 右：資訊列表 */}
          <div className="flex flex-col flex-grow font-serif gap-[1.3vh]">

            {/* 定性區 */}
            <div className="flex justify-between items-baseline w-full">
              <span className="text-white/70 text-[clamp(14px,4cqw,17px)] tracking-[0.4em]">境界</span>
              <div className="flex flex-col items-end">
                {realmStage && realmStage !== realmName && (
                  <span className="text-[clamp(9px,2.5cqw,11px)] text-white/45 tracking-[0.3em]">{realmStage}</span>
                )}
                <span className="text-[clamp(14px,4cqw,17px)] text-white/90 drop-shadow-md">{realmName}</span>
              </div>
            </div>
            <div className="flex justify-between items-baseline w-full">
              <span className="text-white/70 text-[clamp(14px,4cqw,17px)] tracking-[0.4em]">聲望</span>
              <span className="text-[12px] text-white/55 tracking-[0.25em]">{getGoodTitle(player.prestige)}</span>
            </div>
            <div className="flex justify-between items-baseline w-full">
              <span className="text-white/70 text-[clamp(14px,4cqw,17px)] tracking-[0.4em]">煞氣</span>
              <span className="text-[12px] text-white/55 tracking-[0.25em]">{getEvilTitle(player.sha_qi)}</span>
            </div>

            <div className="w-full h-[1px] bg-white/10" />

            {/* 定量區 */}
            {[
              { label:'靈力', value:`${player.mp??0} / ${player.max_mp??0}` },
              { label:'神識', value:`${player.god_sense??0} / ${player.max_god_sense??0}` },
              { label:'煉體', value:`${player.body??0} / ${player.max_body??100}` },
              { label:'壽命', value:`${age} / ${maxAge}`, color: isLifeLow ? '#FF3B30' : undefined },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-baseline w-full">
                <span className="text-[clamp(14px,4cqw,17px)] tracking-[0.4em]"
                  style={{ color: color ?? 'rgba(255,255,255,0.7)' }}>{label}</span>
                <span className="font-mono text-[clamp(14px,4cqw,17px)] tracking-wider"
                  style={{ color: color ?? 'rgba(255,255,255,0.9)' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          L2 靈氣 / 突破頁
          ══════════════════════════════════════ */}
      {showBt && (
        <div className={`absolute inset-0 flex flex-col items-center bg-[#03070e] ${btClass}`}>


          {/* 打坐人像 + 三圓圖示（丹藥左、法器右、陣法下）*/}
          <div className="relative flex-1 w-full flex items-center justify-center min-h-0 pt-[14cqw]">
            {/* 光暈 */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[60%] h-[60%] rounded-full animate-pulse opacity-20 blur-[50px]"
                style={{ backgroundColor: canBreak ? '#FF3B30' : '#00E5FF' }} />
            </div>

            {/* Row: [丹藥] [人像＋陣法] [法器] */}
            <div className="relative z-10 flex flex-row items-center justify-center w-full px-[4cqw]">

              {/* 丹藥 */}
              <button onClick={() => goToSub('boost')}
                className="flex-shrink-0 active:scale-90 transition-all animate-float"
                style={{ width: '20%', animationDelay: '0s' }}>
                <div className="relative mx-auto" style={{ width: '52px', height: '52px' }}>
                  <div className="absolute rounded-full pointer-events-none"
                    style={{ inset: '-5px', borderRadius: '50%',
                      border: `1px solid ${selBoost.length > 0 ? 'rgba(50,215,75,0.55)' : 'rgba(255,255,255,0.10)'}`,
                      boxShadow: selBoost.length > 0 ? '0 0 18px rgba(50,215,75,0.30)' : '0 0 12px rgba(0,229,255,0.08)',
                    }} />
                  <div className="w-full h-full rounded-full flex items-center justify-center"
                    style={{
                      background: selBoost.length > 0 ? 'rgba(50,215,75,0.15)' : 'rgba(6,10,20,0.85)',
                      border: `1.5px solid ${selBoost.length > 0 ? 'rgba(50,215,75,0.6)' : 'rgba(255,255,255,0.15)'}`,
                      boxShadow: selBoost.length > 0 ? '0 0 16px rgba(50,215,75,0.35)' : 'none',
                    }}>
                    <span className="font-serif text-[22px]"
                      style={{ color: selBoost.length > 0 ? '#32D74B' : 'rgba(255,255,255,0.5)' }}>丹</span>
                  </div>
                </div>
              </button>

              {/* 人像＋陣法（中間列）*/}
              <div className="flex flex-col items-center flex-1 gap-[3cqw] min-h-0">
                <img src={`/images/status/${meditatorImg}`} alt="打坐"
                  className="w-full flex-1 min-h-0 object-contain animate-float relative z-10"
                  style={{ filter: `drop-shadow(0 0 22px ${canBreak ? 'rgba(255,70,0,0.7)' : 'rgba(0,229,255,0.45)'})` }} />

                {/* 陣法（人像正下方）*/}
                <button onClick={() => goToSub('formation')}
                  className="flex-shrink-0 active:scale-90 transition-all animate-float"
                  style={{ animationDelay: '1.3s' }}>
                  <div className="relative" style={{ width: '52px', height: '52px' }}>
                    <div className="absolute rounded-full pointer-events-none"
                      style={{ inset: '-5px', borderRadius: '50%',
                        border: `1px solid ${selFormation ? 'rgba(0,229,255,0.55)' : 'rgba(255,255,255,0.10)'}`,
                        boxShadow: selFormation ? '0 0 18px rgba(0,229,255,0.30)' : '0 0 12px rgba(0,229,255,0.08)',
                      }} />
                    <div className="w-full h-full rounded-full flex items-center justify-center"
                      style={{
                        background: selFormation ? 'rgba(0,229,255,0.15)' : 'rgba(6,10,20,0.85)',
                        border: `1.5px solid ${selFormation ? 'rgba(0,229,255,0.6)' : 'rgba(255,255,255,0.15)'}`,
                        boxShadow: selFormation ? '0 0 16px rgba(0,229,255,0.35)' : 'none',
                      }}>
                      <span className="font-serif text-[22px]"
                        style={{ color: selFormation ? '#00E5FF' : 'rgba(255,255,255,0.5)' }}>陣</span>
                    </div>
                  </div>
                </button>
              </div>

              {/* 法器 */}
              <button onClick={() => goToSub('safety')}
                className="flex-shrink-0 active:scale-90 transition-all animate-float"
                style={{ width: '20%', animationDelay: '0.7s' }}>
                <div className="relative mx-auto" style={{ width: '52px', height: '52px' }}>
                  <div className="absolute rounded-full pointer-events-none"
                    style={{ inset: '-5px', borderRadius: '50%',
                      border: `1px solid ${selSafety ? 'rgba(155,92,255,0.55)' : 'rgba(255,255,255,0.10)'}`,
                      boxShadow: selSafety ? '0 0 18px rgba(155,92,255,0.30)' : '0 0 12px rgba(0,229,255,0.08)',
                    }} />
                  <div className="w-full h-full rounded-full flex items-center justify-center"
                    style={{
                      background: selSafety ? 'rgba(155,92,255,0.15)' : 'rgba(6,10,20,0.85)',
                      border: `1.5px solid ${selSafety ? 'rgba(155,92,255,0.6)' : 'rgba(255,255,255,0.15)'}`,
                      boxShadow: selSafety ? '0 0 16px rgba(155,92,255,0.35)' : 'none',
                    }}>
                    <span className="font-serif text-[22px]"
                      style={{ color: selSafety ? '#9B5CFF' : 'rgba(255,255,255,0.5)' }}>器</span>
                  </div>
                </div>
              </button>

            </div>
          </div>

          {/* 周天靈氣數值 + 進度條（人像正下方）*/}
          <div className="shrink-0 w-full max-w-[280px] px-[6cqw] pb-[3cqw]">
            <div className="flex justify-between items-baseline mb-2">
              <span className="font-serif tracking-[0.35em] text-[clamp(12px,3.5cqw,14px)] text-white/55">周天靈氣</span>
              <span className="font-mono text-[clamp(14px,4cqw,17px)]"
                style={{ color: canBreak ? '#FF6030' : isMaxRealm ? 'rgba(255,215,0,0.6)' : 'rgba(0,229,255,0.85)' }}>
                {aura} / {maxAura}
                {isMaxRealm && <span className="text-[11px] ml-1 text-[#FFD700]/50">巔峰</span>}
              </span>
            </div>
            {/* 靈氣進度條 */}
            <div className="h-[3px] bg-white/8 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${maxAura > 0 ? Math.min(100, (aura/maxAura)*100) : 0}%`,
                  background:  canBreak ? 'linear-gradient(90deg,#FF6030,#FF3B00)' : 'linear-gradient(90deg,rgba(0,180,255,0.7),rgba(0,229,255,0.9))',
                  boxShadow:   canBreak ? '0 0 8px rgba(255,80,0,0.8)' : '0 0 6px rgba(0,229,255,0.5)',
                }} />
            </div>
            {/* 境界方向提示 */}
            {nextRealm && (
              <p className="text-right text-[10px] font-serif text-white/25 tracking-[0.2em] mt-1.5">
                {realmName} → {nextRealm.realm_name}
              </p>
            )}
          </div>

          {/* ── 靈氣已滿：突破配置區 ── */}
          {canBreak ? (
            <>
              {/* 成功率 */}
              <div className="shrink-0 w-full max-w-[280px] px-[6cqw] pb-[2cqw]">
                <div className="flex justify-between items-baseline border-b border-white/10 pb-2 mb-1.5">
                  <span className="font-serif text-white/55 text-[clamp(12px,3.5cqw,14px)] tracking-[0.35em]">突破成功率</span>
                  <span className="font-mono text-[clamp(18px,5cqw,22px)]"
                    style={{ color: effectiveRate>=80?'#32D74B':effectiveRate>=50?'#FFD700':'#FF3B30' }}>
                    {effectiveRate}%
                  </span>
                </div>
                <div className="flex flex-wrap justify-end gap-x-3 gap-y-0.5">
                  {selBoost.length>0 && <span className="text-[10px] font-serif text-[#32D74B]/75">+{boostBonus}% 提升丹</span>}
                  {selFormation      && <span className="text-[10px] font-serif text-[#00E5FF]/75">陣法・{selFormation.name}</span>}
                  {selSafety         && <span className="text-[10px] font-serif text-[#9B5CFF]/75">護命・{selSafety.name}</span>}
                </div>
              </div>

              {/* 衝擊按鈕 */}
              <div className="shrink-0 w-full max-w-[280px] px-[4cqw] pb-[3cqw] flex flex-col items-center gap-2">
                <button onClick={handleBreakthrough} disabled={isBreaking}
                  className="w-full py-3 rounded-lg font-serif text-[clamp(14px,4.5cqw,17px)] tracking-[0.5em] active:scale-95 transition-all disabled:opacity-40"
                  style={{
                    background: 'linear-gradient(135deg,rgba(255,50,0,0.15),rgba(255,100,0,0.15))',
                    border:     '1px solid rgba(255,80,0,0.6)',
                    color:      '#FF6030',
                    animation:  isBreaking ? 'none' : 'pulse-red 2s infinite',
                  }}>
                  {isBreaking ? '突破中...' : '⚡ 衝擊境界'}
                </button>
                {breakMessage !== '' && (
                  <p className={`text-center text-[13px] tracking-wider font-serif
                    ${breakMessage.includes('成功') ? 'text-[#FFD700]' : 'text-[#FF3B30]'}`}>
                    {breakMessage}
                  </p>
                )}
              </div>
            </>
          ) : (
            /* 靈氣未滿：提示文字 */
            <div className="shrink-0 w-full max-w-[280px] px-[6cqw] pb-[3cqw] text-center">
              <p className="font-serif text-white/30 text-[clamp(12px,3.5cqw,14px)] tracking-[0.3em]">
                {isMaxRealm ? '已達最高境界' : '靈氣充盈後方可衝擊'}
              </p>
            </div>
          )}

          {/* 抽離神識（底部，同修煉頁位置）*/}
          <div className="shrink-0 w-full px-[5cqw] pb-[8cqw] pt-[2cqw]">
            <button onClick={goBackFromBt}
              className="flex items-center gap-2 border border-white/10 bg-black/40 px-4 py-1.5 rounded-full text-gray-400 hover:text-white tracking-widest text-[clamp(13px,3.8cqw,15px)] active:scale-95 transition-all">
              <span className="text-lg leading-none mt-[-2px]">‹</span> 抽離神識
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          L3 道具選擇頁
          ══════════════════════════════════════ */}
      {showSub && (
        <div className={`absolute inset-0 flex flex-col z-50 bg-black/85 backdrop-blur-xl ${subClass}`}>
          <div className="pt-[10cqw] px-[6cqw] shrink-0 mb-[3cqw] text-center">
            <h3 className="font-serif text-[clamp(17px,5cqw,22px)] tracking-[0.45em] text-white">
              {activeSub==='boost' ? '丹藥' : activeSub==='formation' ? '陣法' : '法器'}
            </h3>
            <p className="text-[11px] font-serif text-white/35 tracking-[0.2em] mt-1">
              {activeSub==='boost'     ? '選用丹藥輔助突破，提升成功機率'
             : activeSub==='formation' ? '布置陣法，以天地之力護持突破'
             :                           '攜帶法器護命，以防突破失敗受損'}
            </p>
          </div>

          <div className="flex-grow overflow-y-auto px-[6cqw] flex flex-col gap-[3.5cqw] no-scrollbar pb-[4cqw]">
            {subItems.length === 0 ? (
              <div className="text-center text-white/25 py-16 font-serif tracking-widest text-[14px]">
                暫無可用物品
              </div>
            ) : subItems.map(item => {
              const isSel = activeSub==='boost'
                ? !!selBoost.find(i => i.id===item.id)
                : activeSub==='formation' ? selFormation?.id===item.id
                : selSafety?.id===item.id;

              const toggle = () => {
                if (activeSub==='boost') {
                  setSelBoost(prev => prev.find(i=>i.id===item.id)
                    ? prev.filter(i=>i.id!==item.id)
                    : [...prev, item]);
                } else if (activeSub==='formation') {
                  setSelFormation(isSel ? null : item);
                } else {
                  setSelSafety(isSel ? null : item);
                }
              };

              return (
                <div key={item.id} onClick={toggle}
                  className="flex flex-col p-[4cqw] rounded-xl border cursor-pointer active:scale-[.98] transition-all"
                  style={{
                    background: isSel ? `${item.color||'#00E5FF'}12` : 'rgba(18,23,38,0.85)',
                    border:     `1px solid ${isSel ? (item.color||'#00E5FF')+'55' : 'rgba(255,255,255,0.08)'}`,
                  }}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-serif tracking-widest text-[clamp(14px,4cqw,17px)] font-bold"
                      style={{ color: item.color||'#fff' }}>{item.name}</span>
                    <div className="flex items-center gap-2">
                      {activeSub==='boost' && item.effect_value>0 && (
                        <span className="text-[10px] font-mono text-[#32D74B] bg-[#32D74B]/10 px-1.5 py-0.5 rounded border border-[#32D74B]/20">
                          +{item.effect_value}%
                        </span>
                      )}
                      {isSel && (
                        <span className="text-[11px] font-serif" style={{ color: item.color||'#00E5FF' }}>已選</span>
                      )}
                    </div>
                  </div>
                  {item.desc && (
                    <p className="text-[12px] text-white/40 leading-relaxed tracking-wider">{item.desc}</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="w-full shrink-0 px-[5cqw] pb-[8cqw] pt-[3cqw]">
            <button onClick={goBackFromSub}
              className="flex items-center gap-2 border border-white/10 bg-black/40 px-4 py-1.5 rounded-full text-gray-400 hover:text-white tracking-widest text-[clamp(13px,3.8cqw,15px)] active:scale-95 transition-all">
              <span className="text-lg leading-none mt-[-2px]">‹</span> 抽離神識
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

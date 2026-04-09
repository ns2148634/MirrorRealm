// src/components/CombatModal.jsx
//
// 全螢幕戰鬥畫面。
// 流程：姿態選擇 → 天道推演（文字敘述逐行顯示）→ 戰果
import React, { useState, useEffect, useRef } from 'react';
import useGameStore from '../store/gameStore';

// ── 戰鬥姿態設定 ──────────────────────────────────────────────────
const STANCE_OPTIONS = [
  {
    key:    'aggressive',
    label:  '殺伐之勢',
    hint:   '攻 ×1.2 ／ 防 ×0.8',
    desc:   '以剛克剛，傷敵一千自損八百，適合速戰速決。',
    color:  '#FF3B30',
    glow:   'rgba(255,59,48,0.35)',
    border: 'border-[#FF3B30]',
    bg:     'bg-[#FF3B30]/10',
    text:   'text-[#FF3B30]',
  },
  {
    key:    'balanced',
    label:  '隨機應變',
    hint:   '標準攻防',
    desc:   '見招拆招，順勢而為，不強求亦不退縮。',
    color:  '#00E5FF',
    glow:   'rgba(0,229,255,0.30)',
    border: 'border-[#00E5FF]',
    bg:     'bg-[#00E5FF]/10',
    text:   'text-[#00E5FF]',
  },
  {
    key:    'defensive',
    label:  '固守本心',
    hint:   '防 ×1.3 ／ 閃 +10%',
    desc:   '以守代攻，以靜制動，待敵破綻方才出手。',
    color:  '#32D74B',
    glow:   'rgba(50,215,75,0.30)',
    border: 'border-[#32D74B]',
    bg:     'bg-[#32D74B]/10',
    text:   'text-[#32D74B]',
  },
];

// 戰報行顏色
const LOG_COLOR = {
  'player-atk':   '#FFD700',
  'enemy-atk':    '#FF3B30',
  'miss':         '#9B5CFF',
  'outcome-win':  '#FFD700',
  'outcome-lose': '#FF3B30',
  'reward':       '#32D74B',
  'header':       '#00E5FF',
  'info':         '#9CA3AF',
};

export default function CombatModal() {
  const player      = useGameStore(s => s.player);
  const combatState = useGameStore(s => s.combatState);
  const clearCombat = useGameStore(s => s.clearCombat);
  const setPlayer   = useGameStore(s => s.setPlayer);

  const [stance,       setStance]       = useState('balanced');
  const [step,         setStep]         = useState('select'); // select | loading | narrative | result
  const [result,       setResult]       = useState(null);
  const [visibleLines, setVisibleLines] = useState(0); // 逐行顯示計數
  const logRef    = useRef(null);
  const timerRef  = useRef(null);

  // 每次新戰鬥觸發時重置
  useEffect(() => {
    if (combatState) {
      setStance('balanced');
      setStep('select');
      setResult(null);
      setVisibleLines(0);
    }
    return () => clearTimeout(timerRef.current);
  }, [combatState]);

  // 逐行顯示戰報
  useEffect(() => {
    if (step !== 'narrative' || !result?.battleLog) return;
    const total = result.battleLog.length;
    if (visibleLines >= total) return;
    timerRef.current = setTimeout(() => {
      setVisibleLines(v => v + 1);
    }, 120);
    return () => clearTimeout(timerRef.current);
  }, [step, visibleLines, result]);

  // 戰報自動捲底
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [visibleLines]);

  if (!combatState) return null;

  const handleClose = () => {
    combatState.onComplete?.(result);
    clearCombat();
  };

  const handleStartCombat = async () => {
    if (!player?.id) return;
    setStep('loading');

    try {
      // pvp（道友切磋/掠奪）走 /api/lbs/execute，其餘走 /api/combat/execute
      const isPvp = !!combatState.pvpType;
      const endpoint = isPvp ? '/api/lbs/execute' : '/api/combat/execute';
      const body = isPvp
        ? {
            playerId:         player.id,
            nodeType:         '道友',
            nodeName:         combatState.nodeName,
            stance,
            target_player_id: combatState.targetPlayerId,
            pvp_type:         combatState.pvpType,
          }
        : {
            playerId:      player.id,
            stance,
            enemyOverride: combatState.enemyOverride ?? null,
          };

      const res = await fetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok) {
        setResult({ error: json.message ?? '戰鬥失敗，天地法則紊亂' });
        setStep('result');
        return;
      }

      const data = json.data;
      setResult(data);
      setVisibleLines(0);
      setStep('narrative');

      if (data.hp_remaining != null) setPlayer({ hp: data.hp_remaining });
      if (navigator.vibrate) navigator.vibrate([30, 40, 30]);

    } catch {
      setResult({ error: '網路錯誤，無法完成戰鬥' });
      setStep('result');
    }
  };

  // 敘述看完後進入結果頁
  const handleNarrativeDone = () => {
    setStep('result');
    if (result?.outcome === 'win' && navigator.vibrate) navigator.vibrate([50, 50, 150]);
  };

  const narrativeComplete = result?.battleLog && visibleLines >= result.battleLog.length;
  const activeStance      = STANCE_OPTIONS.find(s => s.key === stance);
  const sourceLabel = combatState.source === 'training'
    ? '演武練功'
    : combatState.pvpType === 'spar'    ? '道友切磋'
    : combatState.pvpType === 'plunder' ? '掠奪道友'
    : '遭遇妖獸';

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-[#06080F] text-white overflow-hidden">

      {/* 頂部裝飾 */}
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#00E5FF]/60 to-transparent shrink-0" />

      {/* ── 姿態選擇 ── */}
      {step === 'select' && (
        <div className="flex-1 flex flex-col px-6 pt-[8vh] pb-[4vh] overflow-hidden">

          {/* 標題 */}
          <div className="text-center mb-[6vh] shrink-0">
            <p className="text-white/30 text-[10px] tracking-[0.6em] mb-2">{sourceLabel}</p>
            <h2 className="text-[#00E5FF] text-2xl font-bold tracking-[0.3em] drop-shadow-[0_0_20px_rgba(0,229,255,0.6)]">
              {combatState.nodeName ?? '未知對手'}
            </h2>
          </div>

          {/* 三種姿態 */}
          <p className="text-white/30 text-[11px] tracking-[0.5em] text-center mb-5 shrink-0">選擇戰鬥姿態</p>
          <div className="flex flex-col gap-4 flex-1">
            {STANCE_OPTIONS.map((s) => {
              const active = stance === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => setStance(s.key)}
                  className={`flex-1 rounded-2xl border-2 px-6 py-4 text-left transition-all duration-300 active:scale-[0.97]
                    ${active ? `${s.border} ${s.bg}` : 'border-white/8 bg-white/3 hover:border-white/20'}`}
                  style={active ? { boxShadow: `0 0 30px ${s.glow}` } : {}}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-lg font-bold tracking-widest ${active ? s.text : 'text-white/50'}`}>
                      {s.label}
                    </span>
                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${active ? `${s.border} ${s.text} bg-black/30` : 'border-white/10 text-white/20'}`}>
                      {s.hint}
                    </span>
                  </div>
                  <p className={`text-[13px] leading-relaxed tracking-wide ${active ? 'text-white/70' : 'text-white/25'}`}>
                    {s.desc}
                  </p>
                </button>
              );
            })}
          </div>

          {/* 操作按鈕 */}
          <div className="flex gap-4 mt-6 shrink-0">
            <button
              onClick={handleClose}
              className="flex-1 py-3 rounded-full border border-white/15 text-gray-400 tracking-widest hover:bg-white/5 active:scale-95 transition-all"
            >
              退避
            </button>
            <button
              onClick={handleStartCombat}
              className="flex-[2] py-3 rounded-full border-2 font-bold tracking-widest active:scale-95 transition-all"
              style={{
                borderColor: activeStance?.color,
                color:       activeStance?.color,
                background:  `${activeStance?.glow}`,
                boxShadow:   `0 0 20px ${activeStance?.glow}`,
              }}
            >
              應戰
            </button>
          </div>
        </div>
      )}

      {/* ── 天道推演中 ── */}
      {step === 'loading' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 border-2 border-[#FF3B30]/30 rounded-full animate-[spin_3s_linear_infinite]" />
            <div className="absolute inset-2 border-2 border-[#FF3B30] border-t-transparent rounded-full animate-[spin_1s_linear_infinite]" />
          </div>
          <p className="text-[#FF3B30] text-sm tracking-[0.6em] animate-pulse">天道推演中...</p>
        </div>
      )}

      {/* ── 戰鬥敘述 ── */}
      {step === 'narrative' && (
        <div className="flex-1 flex flex-col px-5 pt-[6vh] pb-[3vh] overflow-hidden">

          <div className="text-center mb-5 shrink-0">
            <p className="text-white/25 text-[10px] tracking-[0.6em] mb-1">{sourceLabel}</p>
            <h2 className="text-[#00E5FF] text-xl font-bold tracking-widest">
              {combatState.nodeName ?? '未知對手'}
            </h2>
          </div>

          {/* 戰報捲動區 */}
          <div
            ref={logRef}
            className="flex-1 overflow-y-auto no-scrollbar space-y-1 font-mono text-[13px] leading-relaxed bg-black/30 rounded-2xl border border-white/5 p-4"
          >
            {result?.battleLog?.slice(0, visibleLines).map((entry, i) => (
              <p
                key={i}
                className="transition-opacity duration-200"
                style={{ color: LOG_COLOR[entry.type] ?? '#9CA3AF' }}
              >
                {entry.text}
              </p>
            ))}
            {/* 未完成時的閃爍游標 */}
            {!narrativeComplete && (
              <span className="inline-block w-2 h-4 bg-[#00E5FF]/60 animate-pulse ml-1 align-middle rounded-sm" />
            )}
          </div>

          {/* 繼續按鈕（敘述完畢才出現） */}
          <div className={`shrink-0 mt-4 transition-opacity duration-500 ${narrativeComplete ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <button
              onClick={handleNarrativeDone}
              className={`w-full py-3 rounded-full border-2 font-bold tracking-widest active:scale-95 transition-all
                ${result?.outcome === 'win'
                  ? 'border-[#FFD700] text-[#FFD700] bg-[#FFD700]/10 shadow-[0_0_20px_rgba(255,215,0,0.3)]'
                  : 'border-[#FF3B30] text-[#FF3B30] bg-[#FF3B30]/10 shadow-[0_0_20px_rgba(255,59,48,0.3)]'}`}
            >
              {result?.outcome === 'win' ? '查看戰果' : '退出戰場'}
            </button>
          </div>
        </div>
      )}

      {/* ── 戰果頁 ── */}
      {step === 'result' && (
        <div className="flex-1 flex flex-col px-6 pt-[8vh] pb-[4vh] overflow-hidden">

          {result?.error ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[#FF3B30] text-base tracking-widest text-center">{result.error}</p>
            </div>
          ) : (
            <>
              {/* 大標題 */}
              <div className="text-center mb-[5vh] shrink-0">
                <p className="text-white/25 text-[10px] tracking-[0.6em] mb-3">{sourceLabel}</p>
                <h2
                  className={`text-4xl font-bold tracking-[0.2em] mb-1
                    ${result?.outcome === 'win' ? 'text-[#FFD700]' : 'text-[#FF3B30]'}`}
                  style={{
                    textShadow: result?.outcome === 'win'
                      ? '0 0 40px rgba(255,215,0,0.8)'
                      : '0 0 40px rgba(255,59,48,0.8)',
                  }}
                >
                  {result?.outcome === 'win' ? '大獲全勝' : '重傷敗退'}
                </h2>
                <p className="text-white/30 text-sm tracking-widest">
                  {combatState.nodeName ?? '未知對手'}
                </p>
              </div>

              {/* 收獲列表 */}
              <div className="flex-1 flex flex-col gap-3 overflow-y-auto no-scrollbar">
                {result?.exp_gained > 0 && (
                  <RewardRow color="#32D74B" label="修為" value={`+${result.exp_gained}`} />
                )}
                {result?.item_dropped && (
                  <RewardRow color="#FFD700" label="獲得" value={`【${result.item_dropped}】×1`} />
                )}
                {result?.prestige_delta > 0 && (
                  <RewardRow color="#C084FC" label="聲望" value={`+${result.prestige_delta}`} />
                )}
                {result?.sha_qi_delta > 0 && (
                  <RewardRow color="#FF9500" label="煞氣" value={`+${result.sha_qi_delta}`} />
                )}
                {result?.sha_qi_delta < 0 && (
                  <RewardRow color="#9CA3AF" label="煞氣" value={`${result.sha_qi_delta}`} />
                )}
                {result?.item_lost && (
                  <RewardRow color="#FF3B30" label="損失" value={`【${result.item_lost}】×1`} />
                )}
                {result?.duration_sec != null && (
                  <RewardRow color="#9CA3AF" label="歷時" value={`${result.duration_sec} 秒`} />
                )}
                {!result?.exp_gained && !result?.item_dropped && result?.outcome === 'win' && (
                  <p className="text-white/20 text-sm tracking-widest text-center py-4">此番未有掉落</p>
                )}
              </div>
            </>
          )}

          <div className="flex gap-4 mt-6 shrink-0">
            {/* 回看戰報 */}
            {result?.battleLog && !result?.error && (
              <button
                onClick={() => { setVisibleLines(result.battleLog.length); setStep('narrative'); }}
                className="flex-1 py-3 rounded-full border border-white/15 text-white/40 text-sm tracking-widest hover:bg-white/5 active:scale-95 transition-all"
              >
                回看戰報
              </button>
            )}
            <button
              onClick={handleClose}
              className={`py-3 rounded-full border-2 font-bold tracking-widest active:scale-95 transition-all
                ${result?.error ? 'flex-1' : 'flex-[2]'}
                ${result?.outcome === 'win'
                  ? 'border-[#00E5FF] text-[#00E5FF] bg-[#00E5FF]/10'
                  : 'border-white/30 text-white/60 bg-white/5'}`}
            >
              收下
            </button>
          </div>
        </div>
      )}

      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent shrink-0" />
    </div>
  );
}

// 收獲行元件
function RewardRow({ color, label, value }) {
  return (
    <div
      className="flex items-center justify-between px-5 py-3 rounded-xl border"
      style={{
        borderColor:     `${color}30`,
        backgroundColor: `${color}08`,
      }}
    >
      <span className="text-white/40 text-sm tracking-widest">{label}</span>
      <span className="font-bold tracking-widest" style={{ color }}>{value}</span>
    </div>
  );
}

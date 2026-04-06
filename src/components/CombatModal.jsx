// src/components/CombatModal.jsx
//
// 全域戰鬥 Modal。
// 由 App.jsx 在頂層渲染，任何頁面呼叫 gameStore.triggerCombat() 即可觸發。
// 負責：姿態選擇 → API 呼叫 → 戰報顯示。
import React, { useState, useEffect, useRef } from 'react';
import useGameStore from '../store/gameStore';

// ── 戰鬥姿態設定 ──────────────────────────────────────────────────
const STANCE_OPTIONS = [
  {
    key:   'aggressive',
    label: '殺伐之勢',
    hint:  '攻 ×1.2 ／ 防 ×0.8',
    color: '#FF3B30',
    border: 'border-[#FF3B30]',
    bg:     'bg-[#FF3B30]/15',
    text:   'text-[#FF3B30]',
  },
  {
    key:   'balanced',
    label: '隨機應變',
    hint:  '標準',
    color: '#00E5FF',
    border: 'border-[#00E5FF]',
    bg:     'bg-[#00E5FF]/15',
    text:   'text-[#00E5FF]',
  },
  {
    key:   'defensive',
    label: '固守本心',
    hint:  '防 ×1.3 ／ 閃 +10% ／ 攻 ×0.8',
    color: '#32D74B',
    border: 'border-[#32D74B]',
    bg:     'bg-[#32D74B]/15',
    text:   'text-[#32D74B]',
  },
];

// 戰報行顏色（type 由後端 combatService 決定）
const LOG_COLOR = {
  'player-atk':  '#FFD700',
  'enemy-atk':   '#FF3B30',
  'miss':        '#9B5CFF',
  'outcome-win': '#FFD700',
  'outcome-lose':'#FF3B30',
  'reward':      '#32D74B',
  'header':      '#00E5FF',
  'info':        '#9CA3AF',
};

export default function CombatModal() {
  const player       = useGameStore(s => s.player);
  const combatState  = useGameStore(s => s.combatState);
  const clearCombat  = useGameStore(s => s.clearCombat);
  const setPlayer    = useGameStore(s => s.setPlayer);

  // 本地 UI 狀態
  const [stance, setStance]   = useState('balanced');
  const [step,   setStep]     = useState('select'); // 'select' | 'loading' | 'result'
  const [result, setResult]   = useState(null);
  const logRef = useRef(null);

  // 每次 combatState 變化（新戰鬥觸發）時重置本地狀態
  useEffect(() => {
    if (combatState) {
      setStance('balanced');
      setStep('select');
      setResult(null);
    }
  }, [combatState]);

  // 戰報自動捲到底
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [result?.battleLog]);

  // combatState 為 null 時不渲染任何東西
  if (!combatState) return null;

  const handleClose = () => {
    // 通知觸發方戰鬥已結束（例如 ExploreView 移除節點）
    combatState.onComplete?.(result);
    clearCombat();
  };

  const handleStartCombat = async () => {
    if (!player?.id) return;
    setStep('loading');

    try {
      const res = await fetch('/api/combat/execute', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId:      player.id,
          stance,
          enemyOverride: combatState.enemyOverride ?? null,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        // 顯示錯誤但不 crash
        setResult({ error: json.message ?? '戰鬥失敗，天地法則紊亂' });
        setStep('result');
        return;
      }

      const data = json.data;
      setResult(data);
      setStep('result');

      // 用後端回傳的 authoritative 數值更新 store
      if (data.hp_remaining != null) {
        setPlayer({ hp: data.hp_remaining });
      }
      if (navigator.vibrate) navigator.vibrate([50, 50, 100]);

    } catch {
      setResult({ error: '網路錯誤，無法完成戰鬥' });
      setStep('result');
    }
  };

  const sourceLabel = combatState.source === 'training' ? '演武練功' : '遭遇妖獸';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
      <div className="bg-[#0D0F18] border border-[#00E5FF]/25 rounded-xl w-full max-w-[340px] shadow-[0_0_50px_rgba(0,229,255,0.12)] flex flex-col overflow-hidden">

        {/* 頂部裝飾線 */}
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#00E5FF] to-transparent opacity-40" />

        <div className="p-5">

          {/* ── 姿態選擇步驟 ── */}
          {step === 'select' && (
            <>
              <p className="text-white/30 text-[10px] tracking-[0.5em] text-center mb-1">{sourceLabel}</p>
              <h3 className="text-[#00E5FF] text-lg font-bold tracking-widest text-center mb-5">
                {combatState.nodeName ?? '未知對手'}
              </h3>

              <p className="text-white/40 text-[10px] tracking-[0.4em] mb-3 text-center">選擇戰鬥姿態</p>
              <div className="flex gap-2 mb-5">
                {STANCE_OPTIONS.map((s) => {
                  const active = stance === s.key;
                  return (
                    <button
                      key={s.key}
                      onClick={() => setStance(s.key)}
                      className={`flex-1 py-2.5 px-1 rounded-lg border text-center transition-all active:scale-95
                        ${active
                          ? `${s.border} ${s.bg} ${s.text}`
                          : 'border-white/10 text-white/25 hover:border-white/20 hover:text-white/40'
                        }`}
                    >
                      <div className="text-[11px] font-semibold tracking-wider mb-0.5">{s.label}</div>
                      <div className="text-[9px] opacity-60 leading-tight">{s.hint}</div>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 py-2 rounded-lg border border-white/15 text-gray-400 text-sm tracking-widest hover:bg-white/5 active:scale-95 transition-all"
                >
                  退避
                </button>
                <button
                  onClick={handleStartCombat}
                  className="flex-1 py-2 rounded-lg bg-[#FF3B30]/10 border border-[#FF3B30]/50 text-[#FF3B30] text-sm tracking-widest shadow-[0_0_10px_rgba(255,59,48,0.2)] hover:bg-[#FF3B30]/20 active:scale-95 transition-all"
                >
                  應戰
                </button>
              </div>
            </>
          )}

          {/* ── 推演中 ── */}
          {step === 'loading' && (
            <div className="py-10 flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-[#FF3B30] border-t-transparent rounded-full animate-spin" />
              <p className="text-[#FF3B30] text-sm tracking-[0.4em] animate-pulse">天道推演中...</p>
            </div>
          )}

          {/* ── 戰報結果 ── */}
          {step === 'result' && (
            <>
              {result?.error ? (
                <p className="text-[#FF3B30] text-sm tracking-widest text-center my-6">{result.error}</p>
              ) : (
                <>
                  <h3 className={`text-xl font-bold tracking-widest text-center mb-3
                    ${result?.outcome === 'win' ? 'text-[#FFD700]' : 'text-[#FF3B30]'}`}>
                    {result?.outcome === 'win' ? '⚔ 勝利' : '💀 重傷'}
                  </h3>

                  {/* 戰報捲動區 */}
                  <div
                    ref={logRef}
                    className="bg-black/60 border border-white/10 rounded-lg p-3 mb-3 max-h-[230px] overflow-y-auto no-scrollbar text-left space-y-0.5 font-mono text-[10.5px] leading-relaxed"
                  >
                    {result?.battleLog?.map((entry, i) => (
                      <p key={i} style={{ color: LOG_COLOR[entry.type] ?? '#9CA3AF' }}>
                        {entry.text}
                      </p>
                    ))}
                  </div>

                  {/* 獎勵摘要 */}
                  <div className="bg-black/40 rounded-lg px-3 py-2 mb-4 border border-white/5 text-[11px] space-y-0.5">
                    {result?.exp_gained > 0 && (
                      <p className="text-[#32D74B] tracking-widest">修為 +{result.exp_gained}</p>
                    )}
                    {result?.item_dropped && (
                      <p className="text-[#FFD700] tracking-widest">獲得【{result.item_dropped}】×1</p>
                    )}
                    {!result?.item_dropped && result?.outcome === 'win' && (
                      <p className="text-white/25 tracking-widest">此番未有掉落</p>
                    )}
                    {result?.duration_sec != null && (
                      <p className="text-white/25 tracking-widest">歷時 {result.duration_sec}s</p>
                    )}
                  </div>
                </>
              )}

              <button
                onClick={handleClose}
                className="w-full py-2 rounded-lg bg-[#00E5FF]/10 border border-[#00E5FF]/40 text-[#00E5FF] text-sm tracking-widest hover:bg-[#00E5FF]/20 active:scale-95 transition-all"
              >
                收下
              </button>
            </>
          )}
        </div>

        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#00E5FF] to-transparent opacity-20" />
      </div>
    </div>
  );
}

// src/components/TutorialOverlay.jsx
//
// 開場流程：
//   Step 0  → 開場詩文動畫 + 輸入道號
//   Step 1  → 探索按鈕高亮引導（按下後由 ExploreView 呼叫 completeTutorial）
import React, { useState, useEffect, useRef } from 'react';
import useGameStore from '../store/gameStore';

// ── 開場詩文（Step 0）──────────────────────────────────────────
const PROLOGUE_LINES = [
  '凡人一生，不過眼前之事。',
  '你或許也曾如此認為。',
  '直到某一刻——',
  '你忽然察覺，天地之間，似有氣在流動。',
  '有人終其一生不曾看見，',
  '有人只需一念，便踏入另一個世界。',
  '修行無門，萬法未明。',
  '機緣、造化，皆藏於未知之中。',
  '在這裡，沒有指引，沒有既定之路。',
  '你唯一能做的，只有一件事：',
  '探索。',
  '——道，將在你的腳下展開。',
];

// ── 步驟1 高亮目標（探索按鈕，位於底部導航中央）──────────────
// navOrder: 本命10% 造化28% 探索50% 芥子72% 仙網90%
const STEP_CONFIG = {
  1: {
    navPct: 50,
    color:  '#00E5FF',
    glow:   'rgba(0,229,255,0.5)',
    text:   '道，將在你的腳下展開。',
    hint:   '按下探索，踏出第一步',
  },
};

const GENDERS = ['男', '女', '保密'];

export default function TutorialOverlay() {
  const tutorialStep      = useGameStore((s) => s.tutorialStep);
  const isTutorial        = useGameStore((s) => s.isTutorial);
  const setTutorialStep   = useGameStore((s) => s.setTutorialStep);
  const createCharacter   = useGameStore((s) => s.createCharacter);
  const markIntroFinished = useGameStore((s) => s.markIntroFinished);

  // ── Step 0：序幕 ──────────────────────────────────────────────
  const [prologuePhase, setProloguePhase] = useState('playing'); // 'playing' | 'dark' | 'naming'
  const [lineIdx,       setLineIdx]       = useState(0);
  const [lineFade,      setLineFade]      = useState('in');      // 'in' | 'out'

  // ── Step 0：命名表單 ──────────────────────────────────────────
  const [name,       setName]       = useState('');
  const [gender,     setGender]     = useState('保密');
  const [nameError,  setNameError]  = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const timerRef = useRef(null);
  const clearTimer = () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } };

  // ── 序幕動畫（僅 step0 prologue 觸發一次）────────────────────
  useEffect(() => {
    if (!isTutorial || tutorialStep !== 0 || prologuePhase !== 'playing') return;

    const showLine = (idx) => {
      if (idx >= PROLOGUE_LINES.length) {
        setLineFade('out');
        timerRef.current = setTimeout(() => setProloguePhase('dark'), 600);
        return;
      }
      setLineIdx(idx);
      setLineFade('in');
      timerRef.current = setTimeout(() => {
        setLineFade('out');
        timerRef.current = setTimeout(() => showLine(idx + 1), 600);
      }, 2500);
    };

    timerRef.current = setTimeout(() => showLine(0), 500);
    return clearTimer;
  }, [isTutorial, tutorialStep, prologuePhase]);

  // ── 黑屏 2 秒後進入命名表單 ──────────────────────────────────
  useEffect(() => {
    if (prologuePhase !== 'dark') return;
    const t = setTimeout(() => setProloguePhase('naming'), 2000);
    return () => clearTimeout(t);
  }, [prologuePhase]);

  // ── 命名提交 ──────────────────────────────────────────────────
  const handleCreateCharacter = async () => {
    const trimmed = name.trim();
    if (!trimmed)            { setNameError('請輸入道號'); return; }
    if (trimmed.length > 10) { setNameError('道號不可超過十字'); return; }

    setIsCreating(true);
    setNameError('');
    const result = await createCharacter(trimmed, gender);
    setIsCreating(false);

    if (!result.success) {
      setNameError(result.error || '創角失敗，請稍後再試');
      return;
    }

    markIntroFinished();
    setTutorialStep(1);
  };

  // ── 不渲染條件 ────────────────────────────────────────────────
  if (!isTutorial) return null;

  // ═══════════════════════════════════════════════════════════════
  // Step 0：開場詩文 + 命名
  // ═══════════════════════════════════════════════════════════════
  if (tutorialStep === 0) {
    if (prologuePhase === 'dark') {
      return <div className="absolute inset-0 z-[200] bg-black" />;
    }

    if (prologuePhase === 'naming') {
      return (
        <div className="absolute inset-0 z-[200] bg-black flex flex-col items-center justify-center px-8">
          <style>{`
            @keyframes tut-fade-in { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
            .tut-appear { animation: tut-fade-in 0.8s ease forwards; }
          `}</style>

          <div className="w-full max-w-[300px] h-px bg-gradient-to-r from-transparent via-[#FFD700]/60 to-transparent mb-8 tut-appear" />

          <p className="text-[#FFD700] tracking-[0.4em] text-sm mb-2 tut-appear" style={{ animationDelay: '0.2s', opacity: 0 }}>
            魂體凝聚
          </p>
          <p className="text-white/60 tracking-[0.2em] text-xs mb-10 tut-appear" style={{ animationDelay: '0.4s', opacity: 0 }}>
            定下你這一世的道號
          </p>

          <div className="w-full max-w-[300px] tut-appear" style={{ animationDelay: '0.6s', opacity: 0 }}>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(''); }}
              placeholder="輸入道號（最多十字）"
              maxLength={10}
              className="w-full bg-transparent border-b border-[#FFD700]/40 text-white text-center tracking-[0.3em] text-lg py-3 outline-none placeholder:text-white/20 placeholder:tracking-wider focus:border-[#FFD700]/80 transition-colors"
            />
            {nameError && (
              <p className="text-[#FF3B30] text-xs text-center mt-2 tracking-widest">{nameError}</p>
            )}
          </div>

          <div className="flex gap-3 mt-8 tut-appear" style={{ animationDelay: '0.8s', opacity: 0 }}>
            {GENDERS.map((g) => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className={`px-5 py-2 rounded-full border tracking-widest text-sm transition-all active:scale-95 ${
                  gender === g
                    ? 'border-[#FFD700] bg-[#FFD700]/15 text-[#FFD700]'
                    : 'border-white/20 text-white/40'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          <button
            onClick={handleCreateCharacter}
            disabled={isCreating}
            className="mt-10 w-full max-w-[300px] py-4 rounded-2xl border border-[#FFD700]/50 bg-[#FFD700]/10 text-[#FFD700] tracking-[0.5em] text-base active:scale-95 transition-all tut-appear disabled:opacity-50"
            style={{ animationDelay: '1s', opacity: 0 }}
          >
            {isCreating ? '凝聚中...' : '踏入修仙之路'}
          </button>

          <div className="w-full max-w-[300px] h-px bg-gradient-to-r from-transparent via-[#FFD700]/40 to-transparent mt-8 tut-appear" style={{ animationDelay: '1.2s', opacity: 0 }} />
        </div>
      );
    }

    // 詩文播放
    return (
      <div className="absolute inset-0 z-[200] bg-black flex items-center justify-center px-10">
        <p
          key={lineIdx}
          style={{
            opacity: lineFade === 'in' ? 1 : 0,
            transition: 'opacity 0.6s ease',
            color: '#E8E0D0',
            textAlign: 'center',
            letterSpacing: '0.3em',
            lineHeight: '2',
            fontSize: 'clamp(14px, 4cqw, 18px)',
            fontFamily: 'serif',
            textShadow: '0 0 20px rgba(255,215,0,0.3)',
          }}
        >
          {PROLOGUE_LINES[lineIdx] ?? ''}
        </p>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // Step 1：高亮探索按鈕
  // ═══════════════════════════════════════════════════════════════
  const cfg = STEP_CONFIG[tutorialStep];
  if (!cfg) return null;

  return (
    <div className="absolute inset-0 z-[150] pointer-events-none select-none">
      <style>{`
        @keyframes tut-pulse-ring {
          0%   { box-shadow: 0 0 0 0 ${cfg.glow}, 0 0 0 9999px rgba(0,0,0,0.72); }
          70%  { box-shadow: 0 0 0 16px transparent, 0 0 0 9999px rgba(0,0,0,0.72); }
          100% { box-shadow: 0 0 0 0 transparent, 0 0 0 9999px rgba(0,0,0,0.72); }
        }
        @keyframes tut-text-in {
          from { opacity:0; transform:translateY(8px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .tut-spotlight  { animation: tut-pulse-ring 2s ease-out infinite; }
        .tut-text-appear { animation: tut-text-in 0.5s ease forwards; }
      `}</style>

      {/* 聚光燈：定位在底部探索按鈕上 */}
      <div
        className="tut-spotlight absolute rounded-full"
        style={{
          width:  64,
          height: 64,
          left:   `calc(${cfg.navPct}% - 32px)`,
          bottom: 'calc(env(safe-area-inset-bottom, 20px) + 22px)',
          border: `1.5px solid ${cfg.color}`,
          background: 'transparent',
        }}
      />

      {/* 引導文字 */}
      <div
        className="tut-text-appear absolute"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 20px) + 100px)',
          left:   '50%',
          transform: 'translateX(-50%)',
          width: '80%',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            color: cfg.color,
            fontSize: 'clamp(13px, 3.8cqw, 16px)',
            letterSpacing: '0.15em',
            lineHeight: '1.8',
            fontFamily: 'serif',
            textShadow: `0 0 12px ${cfg.glow}`,
          }}
        >
          {cfg.text}
        </p>
        <p
          style={{
            color: 'rgba(255,255,255,0.35)',
            fontSize: 'clamp(11px, 3cqw, 13px)',
            letterSpacing: '0.1em',
            marginTop: 8,
            fontFamily: 'serif',
          }}
        >
          ↓ {cfg.hint}
        </p>
      </div>
    </div>
  );
}

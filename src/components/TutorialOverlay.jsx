// src/components/TutorialOverlay.jsx
//
// 新手教學全流程元件：
//   Step 0  → 序幕動畫 + 輸入道號
//   Step 1  → 探索高亮引導
//   Step 2  → 坊市高亮引導
//   Step 3  → 熔爐高亮引導
//   Step 4  → 配置高亮引導
//   Step 5  → 戰鬥演出 + 結尾 + completeTutorial()
import React, { useState, useEffect, useRef } from 'react';
import useGameStore from '../store/gameStore';

// ── 序幕文字（Step 0）──────────────────────────────────────────
const PROLOGUE_LINES = [
  '靈紀三千年，妖魔亂世——',
  '你祭出【混沌天羅陣】——妖獸受到重創！',
  '十級大妖【混沌魔君】狂吼，靈壓席捲萬里！',
  '你燃燒最後一絲壽元——',
  '【混沌魔君】轟然倒下！',
  '天地靈氣驟散，你感到魂體不穩......',
  '三千年修為，化為虛無。',
  '壽元將盡——',
];

// ── 步驟5 戰鬥演出文字 ────────────────────────────────────────
const STEP5_INTRO = [
  '你正準備離去——',
  '一股煞氣驟然湧來！',
  '【野狗靈 Lv.1】感應到你的神識，主動發起攻擊！',
];
const STEP5_OUTRO = [
  '你盯著手中的靈氣碎片——',
  '上輩子，這對你來說連塵埃都不如。',
  '但這一世，一切從這裡開始。',
];

// ── 各步驟高亮目標（底部導航位置）──────────────────────────────
// navPct = 按鈕中心在容器寬度的百分比（5 個等距按鈕）
// navOrder: 本命10% 造化28% 探索50% 芥子72% 仙網90%
const STEP_CONFIG = {
  1: {
    navPct:  50,
    color:   '#00E5FF',
    glow:    'rgba(0,229,255,0.5)',
    label:   '探索',
    text:    '你隱約感覺到周遭有靈氣波動——試著外放神識。',
    hint:    '點擊探索，輕觸陣盤發動神識掃描',
  },
  2: {
    navPct:  90,
    color:   '#32D74B',
    glow:    'rgba(50,215,75,0.5)',
    label:   '仙網',
    text:    '你需要一件趁手的兵器——前往坊市購買劍體。',
    hint:    '進入仙網 → 坊市 → 官方珍寶',
  },
  3: {
    navPct:  72,
    color:   '#B8860B',
    glow:    'rgba(184,134,11,0.5)',
    label:   '芥子',
    text:    '將破銅爛鐵與劍體投入天地熔爐，鑄造你的第一件法器。',
    hint:    '進入芥子 → 天地熔爐，選材煉製',
  },
  4: {
    navPct:  72,
    color:   '#B8860B',
    glow:    'rgba(184,134,11,0.5)',
    label:   '芥子',
    text:    '將鐵劍裝備上去——感受靈力流入兵器的感覺。',
    hint:    '在芥子 → 法器頁面，選中鐵劍後裝備',
  },
};

const GENDERS = ['男', '女', '保密'];

export default function TutorialOverlay() {
  const tutorialStep     = useGameStore((s) => s.tutorialStep);
  const isTutorial       = useGameStore((s) => s.isTutorial);
  const setTutorialStep  = useGameStore((s) => s.setTutorialStep);
  const completeTutorial = useGameStore((s) => s.completeTutorial);
  const createCharacter  = useGameStore((s) => s.createCharacter);
  const triggerCombat    = useGameStore((s) => s.triggerCombat);
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

  // ── Step 5：戰鬥演出 ─────────────────────────────────────────
  const [step5Phase,   setStep5Phase]   = useState('intro');  // 'intro' | 'waiting' | 'outro' | 'done'
  const [step5LineIdx, setStep5LineIdx] = useState(0);

  const timerRef = useRef(null);

  const clearTimer = () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } };

  // ── 序幕動畫（僅 step0 prologue 觸發一次）────────────────────
  useEffect(() => {
    if (!isTutorial || tutorialStep !== 0 || prologuePhase !== 'playing') return;

    const showLine = (idx) => {
      if (idx >= PROLOGUE_LINES.length) {
        // 全部播完 → 淡出最後一行 → 切黑屏（dark→naming 交由下方獨立 effect 處理）
        setLineFade('out');
        timerRef.current = setTimeout(() => setProloguePhase('dark'), 600);
        return;
      }
      setLineIdx(idx);
      setLineFade('in');
      // 淡入 0.6s → 停留 1.9s → 淡出 0.6s → 下一行
      timerRef.current = setTimeout(() => {
        setLineFade('out');
        timerRef.current = setTimeout(() => showLine(idx + 1), 600);
      }, 2500);
    };

    timerRef.current = setTimeout(() => showLine(0), 500);
    return clearTimer;
  }, [isTutorial, tutorialStep, prologuePhase]);

  // ── 黑屏 2 秒後進入命名表單（獨立 effect 避免被上方 cleanup 取消）──
  useEffect(() => {
    if (prologuePhase !== 'dark') return;
    const t = setTimeout(() => setProloguePhase('naming'), 2000);
    return () => clearTimeout(t);
  }, [prologuePhase]);

  // ── Step 5 演出 ────────────────────────────────────────────────
  useEffect(() => {
    if (!isTutorial || tutorialStep !== 5) return;

    // 逐行顯示 intro 文字，結束後觸發戰鬥
    const showIntroLine = (idx) => {
      if (idx >= STEP5_INTRO.length) {
        timerRef.current = setTimeout(() => {
          setStep5Phase('waiting');
          // 觸發戰鬥
          triggerCombat({
            source:      'tutorial',
            nodeName:    '野狗靈',
            enemyOverride: { name: '野狗靈', level: 1, hp: 30, attack: 5, defense: 2 },
            onComplete:  () => {
              setStep5Phase('outro');
              setStep5LineIdx(0);
            },
          });
        }, 800);
        return;
      }
      setStep5LineIdx(idx);
      timerRef.current = setTimeout(() => showIntroLine(idx + 1), 1600);
    };

    setStep5Phase('intro');
    setStep5LineIdx(0);
    timerRef.current = setTimeout(() => showIntroLine(0), 500);
    return clearTimer;
  }, [isTutorial, tutorialStep]);

  // ── Step 5 outro：顯示完自動完成教學 ─────────────────────────
  useEffect(() => {
    if (step5Phase !== 'outro') return;
    timerRef.current = setTimeout(() => {
      setStep5Phase('done');
      completeTutorial();
    }, STEP5_OUTRO.length * 1600 + 1200);
    return clearTimer;
  }, [step5Phase, completeTutorial]);

  // ── 命名提交 ──────────────────────────────────────────────────
  const handleCreateCharacter = async () => {
    const trimmed = name.trim();
    if (!trimmed)       { setNameError('請輸入道號'); return; }
    if (trimmed.length > 10) { setNameError('道號不可超過十字'); return; }

    setIsCreating(true);
    setNameError('');
    const result = await createCharacter(trimmed, gender);
    setIsCreating(false);

    if (!result.success) {
      setNameError(result.error || '創角失敗，請稍後再試');
      return;
    }

    // 標記開場完成（讓 App.jsx 從 AuthScreen 切換到 PlayingStage）
    markIntroFinished();
    // 前進到步驟1（setup API 在 step1 掃描後由 ExploreView 呼叫）
    setTutorialStep(1);
  };

  // ── 不渲染條件 ────────────────────────────────────────────────
  if (!isTutorial) return null;

  // ═══════════════════════════════════════════════════════════════
  // Step 0：序幕 + 命名
  // ═══════════════════════════════════════════════════════════════
  if (tutorialStep === 0) {
    // 黑屏過渡期
    if (prologuePhase === 'dark') {
      return (
        <div className="absolute inset-0 z-[200] bg-black" />
      );
    }

    // 命名表單
    if (prologuePhase === 'naming') {
      return (
        <div className="absolute inset-0 z-[200] bg-black flex flex-col items-center justify-center px-8">
          <style>{`
            @keyframes tut-fade-in { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
            .tut-appear { animation: tut-fade-in 0.8s ease forwards; }
          `}</style>

          {/* 裝飾線 */}
          <div className="w-full max-w-[300px] h-px bg-gradient-to-r from-transparent via-[#FFD700]/60 to-transparent mb-8 tut-appear" />

          <p className="text-[#FFD700] tracking-[0.4em] text-sm mb-2 tut-appear" style={{ animationDelay: '0.2s', opacity: 0 }}>
            魂體凝聚
          </p>
          <p className="text-white/60 tracking-[0.2em] text-xs mb-10 tut-appear" style={{ animationDelay: '0.4s', opacity: 0 }}>
            定下你這一世的道號
          </p>

          {/* 道號輸入 */}
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

          {/* 性別選擇 */}
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

          {/* 確認按鈕 */}
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

    // 序幕播放
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
  // Step 5：戰鬥演出
  // ═══════════════════════════════════════════════════════════════
  if (tutorialStep === 5) {
    // 等待戰鬥中（CombatModal 已接管），不顯示遮罩
    if (step5Phase === 'waiting') return null;
    if (step5Phase === 'done')   return null;

    const lines = step5Phase === 'outro' ? STEP5_OUTRO : STEP5_INTRO;

    return (
      <div className="absolute inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center px-10 gap-6">
        {lines.slice(0, step5LineIdx + 1).map((line, i) => (
          <p
            key={i}
            style={{
              color: i === step5LineIdx ? '#E8E0D0' : '#E8E0D0',
              opacity: i === step5LineIdx ? 1 : 0.5,
              textAlign: 'center',
              letterSpacing: '0.25em',
              lineHeight: '1.8',
              fontSize: 'clamp(14px, 3.8cqw, 17px)',
              fontFamily: 'serif',
              transition: 'opacity 0.5s ease',
            }}
          >
            {line}
          </p>
        ))}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // Step 1–4：高亮底部導航引導
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
        .tut-spotlight {
          animation: tut-pulse-ring 2s ease-out infinite;
        }
        .tut-text-appear {
          animation: tut-text-in 0.5s ease forwards;
        }
      `}</style>

      {/* 聚光燈：定位在底部導航按鈕上 */}
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

      {/* 步驟標題 */}
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

      {/* 步驟進度圓點 */}
      <div
        className="absolute flex gap-2"
        style={{
          top:  'calc(env(safe-area-inset-top, 0px) + 16px)',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            style={{
              width:  s === tutorialStep ? 20 : 6,
              height: 6,
              borderRadius: 3,
              background: s === tutorialStep ? cfg.color : 'rgba(255,255,255,0.2)',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>
    </div>
  );
}

import { create } from 'zustand';
import { supabase } from '../lib/supabase.js';

// interval 存在 store 外部，避免被 Zustand 序列化
let recoveryInterval = null;

// 每種屬性每分鐘回復量（可集中調整）
// aura（周天靈氣）= 1/8 per min（即每 8 分鐘 +1，需習得引氣入體功法後生效）
const REGEN_PER_MIN = { hp: 1, sp: 1, ep: 1, aura: 1 / 8 };

// 累加器：追蹤不足 1 的小數部分
const acc = { hp: 0, sp: 0, ep: 0, aura: 0 };

const useGameStore = create((set, get) => ({
  gameStage:      'login',   // 'login' | 'naming' | 'playing'
  player:         null,
  isLoading:      false,
  realmTemplates: [],
  introFinished:  false,     // 開場動畫是否播完
  isMeditating:   false,     // 定神調息狀態

  markIntroFinished: () => set({ introFinished: true }),
  setMeditating:    (v) => set({ isMeditating: v }),

  // ── 啟動時：以 onAuthStateChange 為唯一狀態驅動來源 ──────────
  // 不再呼叫 getSession()，避免 PKCE code exchange 未完成就
  // 得到 null session，覆蓋掉 SIGNED_IN 已設好的 'playing' 狀態。
  checkAuthAndPlayer: () => {
    supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        // 已有 session（既有登入 or OAuth 回調完成）→ 同步玩家
        get()._syncPlayerWithBackend(session.user.id);
      } else if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
        // 明確登出，或初始化時確認無 session → 回登入畫面
        set({ gameStage: 'login', player: null });
      }
    });
  },

  // ── 內部：呼叫後端 /api/auth/sync，決定進入哪個 stage ────────
  _syncPlayerWithBackend: async (authId) => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/auth/sync', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ auth_id: authId }),
      });
      const result = await res.json();

      if (result.isNew) {
        // 尚未創角 → 進入命格凝聚畫面
        set({ gameStage: 'naming', isLoading: false });
      } else {
        // 已有角色 → 直接進入遊戲
        set({ player: result.player, gameStage: 'playing', isLoading: false });
        get().fetchGameConfigs();
      }
    } catch (err) {
      console.error('[store] syncPlayerWithBackend 失敗:', err);
      set({ gameStage: 'login', isLoading: false });
    }
  },

  // ── Google One Tap 登入（接收 GSI 回傳的 id_token）──────────
  loginWithGoogleOneTap: async (idToken) => {
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    if (error) return { success: false, error: error.message };
    // 成功後 onAuthStateChange 觸發 SIGNED_IN，自動走後續同步流程
    return { success: true };
  },

  // ── Email OTP：發送驗證碼 ───────────────────────────────────
  sendOtp: async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  // ── Email OTP：驗證碼確認 ───────────────────────────────────
  verifyOtp: async (email, token) => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    if (error) return { success: false, error: error.message };
    // 成功後 onAuthStateChange 會觸發 SIGNED_IN，自動走後續流程
    return { success: true };
  },

  // ── 創角：傳道號與性別，呼叫後端建立角色 ────────────────────
  createCharacter: async (name, gender) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { success: false, error: '請先登入' };

    set({ isLoading: true });
    try {
      const res = await fetch('/api/auth/sync', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          auth_id: session.user.id,
          name,
          gender,
        }),
      });
      const result = await res.json();

      if (!res.ok) {
        set({ isLoading: false });
        return { success: false, error: result.message ?? '創角失敗' };
      }

      set({ player: result.player, gameStage: 'playing', isLoading: false });
      get().fetchGameConfigs();
      return { success: true };
    } catch (err) {
      set({ isLoading: false });
      return { success: false, error: err.message };
    }
  },

  // ── 讀取遊戲設定（境界模板等）───────────────────────────────
  fetchGameConfigs: async () => {
    try {
      const res    = await fetch('/api/config/realms');
      const result = await res.json();
      if (res.ok) set({ realmTemplates: result.data });
    } catch (err) {
      console.error('[store] fetchGameConfigs 失敗:', err);
    }
  },

  // ── 讀取玩家資料（觸發離線回復計算）────────────────────────
  fetchPlayerStatus: async () => {
    const playerId = get().player?.id;
    if (!playerId) return;

    set({ isLoading: true });
    try {
      const res    = await fetch(`/api/player/${playerId}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.message ?? '讀取失敗');
      set({ player: result.data, isLoading: false });
    } catch (error) {
      console.error('讀取失敗:', error.message);
      set({ isLoading: false });
    }
  },

  // ── 在線回復（純 UI 動畫計時器）──────────────────────────────────
  // 為什麼移除 5 分鐘自動 sync：
  //   原本每 5 分鐘會主動呼叫 GET /api/player/:id，而那個 GET 會觸發 DB WRITE
  //   （計算 offline recovery 後 UPDATE）。這在 serverless 環境產生大量不必要的
  //   DB 寫入，且 GET 有副作用違反 REST 語義。
  //
  //   新設計：
  //   - setInterval 只負責讓畫面上的數字每秒增加（純 UI 動畫）
  //   - DB 的 flush 只發生在玩家做事時（調息/突破/探索），那些 POST 回傳
  //     authoritative 數值，client 用回傳值更新 store
  //   - 玩家做任何動作後收到的 response 才是 source of truth
  startOnlineRecovery: () => {
    if (recoveryInterval) clearInterval(recoveryInterval);
    acc.hp = acc.sp = acc.ep = acc.aura = 0;

    recoveryInterval = setInterval(() => {
      set((state) => {
        if (!state.player) return {};
        const p    = state.player;
        const mult = state.isMeditating ? 3 : 1; // 定神調息時 hp/sp/ep 動畫加速 3x

        // 每秒累加（純顯示用，不寫 DB）
        acc.hp   += REGEN_PER_MIN.hp   / 60 * mult;
        acc.sp   += REGEN_PER_MIN.sp   / 60 * mult;
        acc.ep   += REGEN_PER_MIN.ep   / 60 * mult;
        const maxAura = p.max_aura ?? 120;
        if ((p.aura ?? 0) < maxAura) {
          acc.aura += REGEN_PER_MIN.aura / 60;
        } else {
          acc.aura = 0;
        }

        const hpGain   = Math.floor(acc.hp);
        const spGain   = Math.floor(acc.sp);
        const epGain   = Math.floor(acc.ep);
        const auraGain = Math.floor(acc.aura);

        acc.hp   -= hpGain;
        acc.sp   -= spGain;
        acc.ep   -= epGain;
        acc.aura -= auraGain;

        return {
          player: {
            ...p,
            hp:   Math.min(p.max_hp   ?? 100, (p.hp   ?? 0) + hpGain),
            sp:   Math.min(p.max_sp   ?? 100, (p.sp   ?? 0) + spGain),
            ep:   Math.min(p.max_ep   ?? 100, (p.ep   ?? 0) + epGain),
            aura: Math.min(p.max_aura ?? 120, (p.aura ?? 0) + auraGain),
          },
        };
      });
    }, 1000);
  },

  // ── 停止在線回復 ─────────────────────────────────────────────
  stopOnlineRecovery: () => {
    if (recoveryInterval) {
      clearInterval(recoveryInterval);
      recoveryInterval = null;
    }
  },

  // ── 登出 ─────────────────────────────────────────────────────
  signOut: async () => {
    get().stopOnlineRecovery();
    await supabase.auth.signOut();
    set({ gameStage: 'login', player: null });
  },

  // ── 局部更新玩家狀態（突破/裝備後呼叫）──────────────────────
  setPlayer: (patch) => set((state) => ({
    player: state.player ? { ...state.player, ...patch } : state.player,
  })),

  // ── 全域戰鬥狀態 ─────────────────────────────────────────────
  // combatState 格式：
  //   { source: 'explore'|'training', nodeName, enemyOverride?, onComplete? }
  // 設計原則：任何場景（探索、修煉法器練功）都呼叫 triggerCombat，
  // CombatModal 從 store 讀取後統一處理姿態選擇、API 呼叫、戰報顯示。
  combatState: null,
  triggerCombat: (target) => set({ combatState: target }),
  clearCombat:   ()       => set({ combatState: null }),

  generateInitialTasks: () => {},
}));

export default useGameStore;

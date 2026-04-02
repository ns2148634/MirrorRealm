import { create } from 'zustand';
import { supabase } from '../lib/supabase.js';

// interval 存在 store 外部，避免被 Zustand 序列化
let recoveryInterval  = null;
let recoverySeconds   = 0;

// 每種屬性每分鐘回復量（可集中調整）
const REGEN_PER_MIN = { hp: 1, sp: 1, ep: 1, aura: 1 };

// 累加器：追蹤不足 1 的小數部分
const acc = { hp: 0, sp: 0, ep: 0, aura: 0 };

const useGameStore = create((set, get) => ({
  gameStage: 'login',   // 'login' | 'naming' | 'playing'
  player:    null,
  isLoading: false,

  // ── 啟動時：檢查 Supabase session，並監聽 Auth 事件 ──────────
  checkAuthAndPlayer: () => {
    // 先檢查是否已有 session（例如 OAuth 重定向回來後）
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        get()._syncPlayerWithBackend(session.user.id);
      } else {
        set({ gameStage: 'login' });
      }
    });

    // 監聽後續的登入 / 登出事件（OTP 驗證成功、Google OAuth 回調等）
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        get()._syncPlayerWithBackend(session.user.id);
      } else if (event === 'SIGNED_OUT') {
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
      }
    } catch (err) {
      console.error('[store] syncPlayerWithBackend 失敗:', err);
      set({ gameStage: 'login', isLoading: false });
    }
  },

  // ── Google OAuth 登入 ────────────────────────────────────────
  loginWithGoogle: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options:  { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) return { success: false, error: error.message };
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
      return { success: true };
    } catch (err) {
      set({ isLoading: false });
      return { success: false, error: err.message };
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

  // ── 在線回復（每秒 tick，用累加器平滑顯示，每 5 分鐘同步伺服器）──
  startOnlineRecovery: () => {
    if (recoveryInterval) clearInterval(recoveryInterval);
    recoverySeconds = 0;
    acc.hp = acc.sp = acc.ep = acc.aura = 0;

    recoveryInterval = setInterval(() => {
      recoverySeconds++;

      set((state) => {
        if (!state.player) return {};
        const p = state.player;

        // 每秒累加 1/60（即每分鐘 +1）
        acc.hp   += REGEN_PER_MIN.hp   / 60;
        acc.sp   += REGEN_PER_MIN.sp   / 60;
        acc.ep   += REGEN_PER_MIN.ep   / 60;
        acc.aura += REGEN_PER_MIN.aura / 60;

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

      // 每 5 分鐘（300 秒）與伺服器同步一次
      if (recoverySeconds % 300 === 0) {
        get().fetchPlayerStatus();
      }
    }, 1000);
  },

  // ── 停止在線回復 ─────────────────────────────────────────────
  stopOnlineRecovery: () => {
    if (recoveryInterval) {
      clearInterval(recoveryInterval);
      recoveryInterval = null;
    }
    recoverySeconds = 0;
  },

  // ── 局部更新玩家狀態（突破/裝備後呼叫）──────────────────────
  setPlayer: (patch) => set((state) => ({
    player: state.player ? { ...state.player, ...patch } : state.player,
  })),

  generateInitialTasks: () => {},
}));

export default useGameStore;

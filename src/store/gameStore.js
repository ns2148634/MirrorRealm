import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const useGameStore = create((set, get) => ({
  gameStage: 'playing', // 目前直接預設進入遊戲畫面
  player: null,         // 存放玩家數值
  isLoading: false,

  // 1. 抓取玩家資料的函式
  fetchPlayerStatus: async () => {
    set({ isLoading: true });
    try {
      // ⚠️ 測試期寫死：把剛剛在 Supabase 建立的玩家 ID 貼到下面單引號裡
      const testUserId = '0c8e0c4d-40f0-496b-b2c9-6c72e48e7be7'; 

      const { data: playerData, error } = await supabase
        .from('players')
        .select('*')
        .eq('id', testUserId)
        .single();

      if (error) throw error;

      // 把資料存進狀態裡
      set({ player: playerData, isLoading: false });
      console.log("🔥 讀取成功！玩家資料：", playerData);
    } catch (error) {
      console.error('讀取失敗:', error.message);
      set({ isLoading: false });
    }
  },

  // 保留你原本的空函式，避免 App.jsx 報錯
  checkAuthAndPlayer: () => {},
  generateInitialTasks: () => {}, 
  startOnlineRecovery: () => {}, 
  stopOnlineRecovery: () => {}, 
}));

export default useGameStore;
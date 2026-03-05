import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const useGameStore = create((set, get) => ({
  // 玩家基本屬性
  stats: {
    name: '創辦人',
    age: 16,
    maxAge: 76,
    stamina: 80,
    energy: 80,
    physique: 20.5,
    silver: 50, // 新增銀兩屬性
    spirit_stones: 0, // 新增靈石屬性
  },

  // 載入狀態
  isLoading: false,
  error: null,

  // 神識通知
  notifications: [
    { id: 1, type: '天道提示', text: '天降甘霖，獲得每日登入機緣：下品靈石 x50。', time: '剛剛', unread: true },
    { id: 2, type: '神識傳音', text: '道友「清風劍客」向你發來一道傳音符：『今晚一起探索秘境嗎？』', time: '1小時前', unread: true },
  ],

  // 更新玩家屬性
  updateStats: (newStats) => set((state) => ({
    stats: { ...state.stats, ...newStats }
  })),

  // 凡塵歷練打工
  doMortalWork: async () => {
    const { stats, addNotification } = get();
    
    // 檢查體力是否足夠
    if (stats.stamina < 10) {
      addNotification({
        type: '天道提示',
        text: '體力不足，無法進行歷練。',
        time: '剛剛'
      });
      return false;
    }

    // 樂觀更新前端狀態
    const newStats = {
      stamina: stats.stamina - 10,
      silver: stats.silver + 50
    };
    
    set((state) => ({
      stats: { ...state.stats, ...newStats }
    }));

    // 新增成功通知
    addNotification({
      type: '神識傳音',
      text: '你在街角協助商行搬運貨物。消耗 10 體力，獲得 50 凡塵銀兩。',
      time: '剛剛'
    });

    try {
      // 更新資料庫
      const { error } = await supabase
        .from('players')
        .update({
          stamina: newStats.stamina,
          silver: newStats.silver,
          updated_at: new Date().toISOString()
        })
        .eq('name', stats.name); // 使用 name 作為識別，實際應用應該用 id

      if (error) {
        console.error('Supabase update error:', error);
        // 如果資料庫更新失敗，回滾前端狀態
        set((state) => ({
          stats: { ...state.stats, stamina: stats.stamina, silver: stats.silver }
        }));
        
        addNotification({
          type: '天道提示',
          text: '歷練資料同步失敗，請重試。',
          time: '剛剛'
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in doMortalWork:', error);
      // 回滾前端狀態
      set((state) => ({
        stats: { ...state.stats, stamina: stats.stamina, silver: stats.silver }
      }));
      
      addNotification({
        type: '天道提示',
        text: '歷練過程中發生錯誤，請重試。',
        time: '剛剛'
      });
      return false;
    }
  },

  // 添加新通知
  addNotification: (notification) => set((state) => ({
    notifications: [...state.notifications, { ...notification, id: Date.now() }]
  })),

  // 標記所有通知為已讀
  markAllNotificationsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, unread: false }))
  })),

  // 刪除通知
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id)
  })),

  // 獲取未讀通知數量
  getUnreadCount: () => {
    const { notifications } = get();
    return notifications.filter(n => n.unread).length;
  },

  // 從 Supabase 撈取玩家狀態
  fetchPlayerStatus: async (playerId = null) => {
    set({ isLoading: true, error: null });
    
    try {
      // 如果沒有傳入 playerId，使用預設的測試 UUID
      const targetPlayerId = playerId || '00000000-0000-0000-0000-000000000000';
      
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('id', targetPlayerId)
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      if (data) {
        // 將資料庫欄位名稱對應到前端狀態
        const mappedStats = {
          name: data.name,
          age: data.age,
          maxAge: data.max_age,
          stamina: data.stamina,
          energy: data.energy,
          physique: data.physique,
        };

        set({ 
          stats: mappedStats,
          isLoading: false,
          error: null 
        });

        return mappedStats;
      } else {
        throw new Error('Player not found');
      }
    } catch (error) {
      console.error('Error fetching player status:', error);
      set({ 
        error: error.message,
        isLoading: false 
      });
      return null;
    }
  },
}));

export default useGameStore;

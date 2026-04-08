// src/views/WorldView.jsx
import React, { useState, useEffect } from 'react';
import useGameStore from '../store/gameStore';

// ── L1：五大主節點 ────────────────────────────────────────────────
const TABS = [
  { id: 'market',   label: '仙坊', color: '#FFD700', pos: { top: '25%', left: '25%' }, delay: '0s'   },
  { id: 'bounty',   label: '懸賞', color: '#FF3B30', pos: { top: '20%', left: '75%' }, delay: '1.2s' },
  { id: 'friend',   label: '道友', color: '#32D74B', pos: { top: '50%', left: '50%' }, delay: '2.5s' },
  { id: 'sect',     label: '宗門', color: '#00E5FF', pos: { top: '75%', left: '25%' }, delay: '0.8s' },
  { id: 'settings', label: '天機', color: '#9B5CFF', pos: { top: '80%', left: '75%' }, delay: '1.7s' },
];

// ── L2：子類別節點（仙坊、懸賞、天機走子類 icon；道友/宗門走數據列表）
const SUB_NODES = {
  market: [
    { id: 'store_official',  label: '官方珍寶', icon: 'icon_store_official.svg',  color: '#FFD700', pos: { top: '30%', left: '20%' }, delay: '0s'   },
    { id: 'store_player',    label: '散修市集', icon: 'icon_store_player.svg',    color: '#00E5FF', pos: { top: '55%', left: '50%' }, delay: '0.4s' },
    { id: 'store_recharge',  label: '靈石注資', icon: 'icon_store_recharge.svg',  color: '#32D74B', pos: { top: '30%', left: '80%' }, delay: '0.8s' },
  ],
  bounty: [
    { id: 'bounty_kill',    label: '誅殺',  icon: 'icon_bounty_kill.svg',    color: '#FF3B30', pos: { top: '28%', left: '20%' }, delay: '0s'   },
    { id: 'bounty_collect', label: '採集',  icon: 'icon_bounty_collect.svg', color: '#32D74B', pos: { top: '55%', left: '50%' }, delay: '0.4s' },
    { id: 'bounty_info',    label: '情報',  icon: 'icon_bounty_info.svg',    color: '#00E5FF', pos: { top: '28%', left: '80%' }, delay: '0.8s' },
  ],
  settings: [
    { id: 'set_logout', label: '離開仙途', icon: 'icon_set_logout.svg', color: '#00E5FF', pos: { top: '28%', left: '20%' }, delay: '0s',   action: 'logout' },
    { id: 'set_reborn', label: '輪迴重生', icon: 'icon_set_reborn.svg', color: '#FF9500', pos: { top: '55%', left: '50%' }, delay: '0.4s', action: 'reborn' },
    { id: 'set_delete', label: '道消形滅', icon: 'icon_set_delete.svg', color: '#FF3B30', pos: { top: '28%', left: '80%' }, delay: '0.8s', action: 'delete' },
  ],
};

const RARITY_COLORS = {
  white:  { border: '#FFFFFF', bg: 'rgba(255,255,255,0.05)', shadow: 'rgba(255,255,255,0.2)' },
  green:  { border: '#32D74B', bg: 'rgba(50,215,75,0.05)',   shadow: 'rgba(50,215,75,0.3)'   },
  blue:   { border: '#00E5FF', bg: 'rgba(0,229,255,0.05)',   shadow: 'rgba(0,229,255,0.3)'   },
  purple: { border: '#9B5CFF', bg: 'rgba(155,92,255,0.05)',  shadow: 'rgba(155,92,255,0.4)'  },
  gold:   { border: '#FFD700', bg: 'rgba(255,215,0,0.05)',   shadow: 'rgba(255,215,0,0.4)'   },
  red:    { border: '#FF3B30', bg: 'rgba(255,59,48,0.05)',   shadow: 'rgba(255,59,48,0.4)'   },
};

// ── 統一「收回神識」底部返回列 ────────────────────────────────────
function ReturnBar({ onClick, label = '收回神識' }) {
  return (
    <div className="w-full shrink-0 bg-gradient-to-t from-black via-black/80 to-transparent pt-[8cqw]">
      <div className="px-[6cqw] pb-[6cqw]">
        <button
          onClick={onClick}
          className="flex items-center gap-2 border border-white/10 bg-black/40 px-4 py-1.5 rounded-full text-gray-400 hover:text-white tracking-widest text-[clamp(13px,3.8cqw,15px)] active:scale-95 transition-all"
        >
          <span className="text-lg leading-none mt-[-2px]">‹</span> {label}
        </button>
      </div>
    </div>
  );
}

export default function WorldView() {
  const player  = useGameStore((s) => s.player);
  const signOut = useGameStore((s) => s.signOut);

  // viewState: 'overview' | 'sub' | 'list' | 'item-detail'
  const [viewState,     setViewState]     = useState('overview');
  const [activeTab,     setActiveTab]     = useState(null);
  const [selectedItem,  setSelectedItem]  = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // 'logout'|'reborn'|'delete'
  const [confirmMsg,    setConfirmMsg]    = useState('');

  // 動態數據
  const [friends, setFriends] = useState(null);  // null=loading, []=empty
  const [sect,    setSect]    = useState(null);

  const triggerHaptic = (pattern) => navigator.vibrate?.(pattern);

  // ── 進入主節點 ────────────────────────────────────────────────
  const handleEnterTab = (tabId) => {
    triggerHaptic([20, 30]);
    setActiveTab(tabId);
    setConfirmAction(null); setConfirmMsg('');

    if (SUB_NODES[tabId]) {
      // 有子節點的（仙坊、懸賞、天機）→ 進入 sub 視圖
      setViewState('entering-sub');
      setTimeout(() => setViewState('sub'), 400);
    } else {
      // 道友、宗門 → 進入數據列表
      setViewState('entering-list');
      setTimeout(() => setViewState('list'), 400);
      if (tabId === 'friend')  fetchFriends();
      if (tabId === 'sect')    fetchSect();
    }
  };

  // ── 返回總覽 ─────────────────────────────────────────────────
  const handleReturnOverview = () => {
    triggerHaptic(15);
    const from = ['sub', 'list'].includes(viewState) ? viewState : 'sub';
    setViewState(`exiting-${from}`);
    setTimeout(() => { setViewState('overview'); setActiveTab(null); }, 400);
  };

  // ── 返回 Sub 層 ───────────────────────────────────────────────
  const handleReturnSub = () => {
    triggerHaptic(15);
    setViewState('exiting-item');
    setTimeout(() => setViewState('sub'), 400);
  };

  // ── 點擊子節點 ────────────────────────────────────────────────
  const handleSubNodeClick = (node) => {
    triggerHaptic([20, 30]);
    if (node.action) {
      setConfirmAction(node.action);
      return;
    }
    // 一般子節點 → 未來可進入詳情
    alert(`【${node.label}】尚未開放，敬請期待。`);
  };

  // ── 確認動作 ─────────────────────────────────────────────────
  const handleConfirmAction = async () => {
    setConfirmMsg('');
    try {
      if (confirmAction === 'logout') {
        await signOut(); return;
      }
      const url = confirmAction === 'reborn' ? '/api/player/reborn' : '/api/auth/delete';
      const res = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id }),
      });
      const data = await res.json();
      if (!res.ok) { setConfirmMsg(data.message ?? '操作失敗'); return; }
      await signOut();
    } catch { setConfirmMsg('操作失敗，請稍後再試'); }
  };

  // ── 進入列表項目 ──────────────────────────────────────────────
  const handleEnterItem = (item) => {
    if (!item) return;
    triggerHaptic([20, 30]);
    setSelectedItem(item);
    setViewState('entering-item');
    setTimeout(() => setViewState('item-detail'), 400);
  };

  const handleReturnList = () => {
    triggerHaptic(15);
    setViewState('exiting-item');
    setTimeout(() => setViewState('list'), 400);
  };

  // ── Supabase 數據拉取 ─────────────────────────────────────────
  const fetchFriends = async () => {
    setFriends(null);
    try {
      const res  = await fetch(`/api/player/friends?playerId=${player.id}`);
      const data = await res.json();
      setFriends(res.ok ? (data.friends ?? []) : []);
    } catch { setFriends([]); }
  };

  const fetchSect = async () => {
    setSect(null);
    try {
      const res  = await fetch(`/api/player/sect?playerId=${player.id}`);
      const data = await res.json();
      setSect(res.ok ? (data.sect ?? null) : null);
    } catch { setSect(null); }
  };

  // ── 視圖可見性 ────────────────────────────────────────────────
  const showOverview   = ['overview', 'entering-sub', 'entering-list', 'exiting-sub', 'exiting-list'].includes(viewState);
  const showSub        = ['sub', 'entering-sub', 'exiting-sub'].includes(viewState);
  const showList       = ['list', 'entering-list', 'exiting-list', 'entering-item', 'exiting-item'].includes(viewState);
  const showItemDetail = ['item-detail', 'entering-item', 'exiting-item'].includes(viewState);

  const subNodes       = activeTab ? (SUB_NODES[activeTab] ?? []) : [];

  // confirm 對話文字
  const CONFIRM_TEXT = {
    logout: { title: '離開仙途', body: '確定要登出嗎？', btnLabel: '確認登出',  btnColor: 'rgba(0,229,255,0.4)'  },
    reborn: { title: '輪迴重生', body: '將清除所有修為與角色資料，此操作無法復原。', btnLabel: '確認重生', btnColor: 'rgba(255,140,0,0.5)'  },
    delete: { title: '道消形滅', body: '將永久刪除帳號與所有資料，此操作無法復原。', btnLabel: '確認刪除', btnColor: 'rgba(255,59,48,0.5)'   },
  };

  return (
    <div className="h-full w-full relative flex flex-col bg-transparent overflow-hidden text-white font-serif z-10 pt-[5cqw]">

      <style>{`
        @keyframes gentle-float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-14px); }
        }
        .animate-float { animation: gentle-float 5s ease-in-out infinite; }
        @keyframes zoom-out-fade  { from { transform:scale(1);   opacity:1; } to { transform:scale(2);   opacity:0; } }
        @keyframes zoom-in-fade   { from { transform:scale(0.5); opacity:0; } to { transform:scale(1);   opacity:1; } }
        @keyframes shrink-out-fade{ from { transform:scale(1);   opacity:1; } to { transform:scale(0.5); opacity:0; } }
        @keyframes shrink-in-fade { from { transform:scale(2);   opacity:0; } to { transform:scale(1);   opacity:1; } }
        .anim-zoom-out   { animation: zoom-out-fade   0.4s cubic-bezier(0.4,0,0.2,1) forwards; }
        .anim-zoom-in    { animation: zoom-in-fade    0.4s cubic-bezier(0.4,0,0.2,1) forwards; }
        .anim-shrink-out { animation: shrink-out-fade 0.4s cubic-bezier(0.4,0,0.2,1) forwards; }
        .anim-shrink-in  { animation: shrink-in-fade  0.4s cubic-bezier(0.4,0,0.2,1) forwards; }
      `}</style>

      {/* =====================================================================
          L1：大千世界總覽
          ===================================================================== */}
      {showOverview && (
        <div className={`absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none
          ${viewState === 'overview' ? 'opacity-100 pointer-events-auto' : ''}
          ${(viewState === 'entering-sub' || viewState === 'entering-list') ? 'anim-zoom-out' : ''}
          ${(viewState === 'exiting-sub'  || viewState === 'exiting-list')  ? 'anim-shrink-in pointer-events-none' : ''}
        `}>
          <div className="relative w-full h-[65vh] max-w-[400px] mx-auto">
            {TABS.map((tab) => (
              <div key={tab.id} className="absolute z-10"
                style={{ top: tab.pos.top, left: tab.pos.left, transform: 'translate(-50%, -50%)' }}
              >
                <div
                  onClick={() => viewState === 'overview' && handleEnterTab(tab.id)}
                  className="relative flex items-center justify-center cursor-pointer group active:scale-95 transition-all duration-300 animate-float"
                  style={{ animationDelay: tab.delay }}
                >
                  <div className="w-[20cqw] h-[20cqw] max-w-[85px] max-h-[85px] flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                    <img src={`/images/icons/icon_${tab.id}.svg`} alt={tab.label}
                      className="w-full h-full object-contain opacity-90"
                      style={{ filter: `drop-shadow(0 0 15px ${tab.color})` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="absolute bottom-[calc(env(safe-area-inset-bottom,20px)+10cqw)] text-[#FFD700] tracking-[0.5em] text-[12px] opacity-40 pointer-events-none">
            神識探查大千世界
          </div>
        </div>
      )}

      {/* =====================================================================
          L2-A：子節點視圖（仙坊 / 懸賞 / 天機）
          ===================================================================== */}
      {showSub && (
        <div className={`absolute inset-0 flex flex-col z-30
          ${viewState === 'sub' ? 'opacity-100' : ''}
          ${viewState === 'entering-sub' ? 'anim-zoom-in pointer-events-none' : ''}
          ${viewState === 'exiting-sub'  ? 'anim-shrink-out pointer-events-none' : ''}
        `}>

          {/* 天機：上中下垂直置中排列 */}
          {activeTab === 'settings' ? (
            // 稍微加大圖標之間的間距 (gap-[8cqw] -> gap-[10cqw])
            <div className="flex-1 flex flex-col items-center justify-center gap-[10cqw] px-[8cqw]">
              {subNodes.map((node) => (
                <div
                  key={node.id}
                  onClick={() => viewState === 'sub' && handleSubNodeClick(node)}
                  className="flex flex-col items-center cursor-pointer group active:scale-95 transition-all duration-300 animate-float"
                  style={{ animationDelay: node.delay }}
                >
                  {/* 放大圖標尺寸：將原本的 18cqw/75px 加大為 28cqw/110px */}
                  <div className="w-[28cqw] h-[28cqw] max-w-[110px] max-h-[110px] flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                    <img src={`/images/icons/${node.icon}`} alt={node.label}
                      className="w-full h-full object-contain opacity-95"
                      // 光暈也隨著圖標放大而增強
                      style={{ filter: `drop-shadow(0 0 25px ${node.color}) drop-shadow(0 0 45px ${node.color}66)` }}
                    />
                  </div>
                  {/* 已經將下方原本顯示 node.label 的 <span> 標籤刪除 */}
                </div>
              ))}
            </div>
          ) : (
            /* 仙坊 / 懸賞：星圖散點排列 */
            <div className="relative flex-1 w-full">
              {subNodes.map((node) => (
                <div key={node.id} className="absolute z-10"
                  style={{ top: node.pos.top, left: node.pos.left, transform: 'translate(-50%, -50%)' }}
                >
                  <div
                    onClick={() => viewState === 'sub' && handleSubNodeClick(node)}
                    className="flex flex-col items-center gap-2 cursor-pointer group active:scale-95 transition-all duration-300 animate-float"
                    style={{ animationDelay: node.delay }}
                  >
                    <div className="w-[18cqw] h-[18cqw] max-w-[75px] max-h-[75px] flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                      <img src={`/images/icons/${node.icon}`} alt={node.label}
                        className="w-full h-full object-contain opacity-90"
                        style={{ filter: `drop-shadow(0 0 18px ${node.color}) drop-shadow(0 0 35px ${node.color}55)` }}
                      />
                    </div>
                    <span className="text-[11px] tracking-[0.3em] opacity-70" style={{ color: node.color }}>
                      {node.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 確認對話框（天機子節點動作） */}
          {confirmAction && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
              <div className="w-full max-w-[290px] mx-6 flex flex-col gap-3 px-6 py-7 rounded-2xl"
                style={{ background: 'rgba(8,10,16,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <p className="text-center text-[16px] tracking-[0.4em] text-white/80 mb-1">
                  {CONFIRM_TEXT[confirmAction]?.title}
                </p>
                <p className="text-center text-[13px] text-white/50 leading-relaxed">
                  {CONFIRM_TEXT[confirmAction]?.body}
                </p>
                {confirmMsg && <p className="text-center text-[12px] text-red-400">{confirmMsg}</p>}
                <button onClick={handleConfirmAction}
                  className="w-full py-2.5 rounded-xl text-[14px] tracking-[0.3em] active:scale-95 transition-all mt-1"
                  style={{ border: `1px solid ${CONFIRM_TEXT[confirmAction]?.btnColor}`, color: '#fff', background: 'transparent' }}
                >
                  {CONFIRM_TEXT[confirmAction]?.btnLabel}
                </button>
                <button onClick={() => { setConfirmAction(null); setConfirmMsg(''); }}
                  className="w-full py-2 text-[12px] tracking-[0.3em] text-white/30 active:scale-95 transition-all"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  取消
                </button>
              </div>
            </div>
          )}

          <ReturnBar onClick={handleReturnOverview} />
        </div>
      )}

      {/* =====================================================================
          L2-B：數據列表視圖（道友 / 宗門）
          ===================================================================== */}
      {showList && (
        <div className={`absolute inset-0 flex flex-col z-30
          ${viewState === 'list' ? 'opacity-100' : ''}
          ${viewState === 'entering-list'  ? 'anim-zoom-in pointer-events-none' : ''}
          ${viewState === 'exiting-list'   ? 'anim-shrink-out pointer-events-none' : ''}
          ${viewState === 'entering-item'  ? 'anim-zoom-out pointer-events-none' : ''}
          ${viewState === 'exiting-item'   ? 'anim-shrink-in pointer-events-none' : ''}
        `}>
          <div className="px-[5cqw] flex-grow overflow-y-auto no-scrollbar pb-[4cqw] pt-[12cqw]">
            {/* 道友列表 */}
            {activeTab === 'friend' && (
              friends === null
                ? <p className="text-center text-white/30 tracking-widest mt-20">神識探查中…</p>
                : friends.length === 0
                  ? <p className="text-center text-white/30 tracking-widest mt-20">此處尚無因果聯繫</p>
                  : <div className="grid grid-cols-4 gap-[3cqw]">
                      {friends.map((f, i) => {
                        const rc = RARITY_COLORS[f.rarity ?? 'blue'];
                        return (
                          <div key={f.id ?? i}
                            onClick={() => handleEnterItem({ name: f.name, rarity: f.rarity ?? 'blue', desc: f.note ?? '萍水相逢的道友' })}
                            className="aspect-square rounded-xl flex items-center justify-center cursor-pointer active:scale-95 transition-all animate-float"
                            style={{ backgroundColor: rc.bg, border: `1px solid ${rc.border}44`, boxShadow: `0 5px 15px rgba(0,0,0,0.5)`, animationDelay: `${(i * 0.3) % 2}s` }}
                          >
                            <span className="text-[clamp(14px,4cqw,18px)] font-bold" style={{ color: rc.border }}>
                              {(f.name ?? '?').charAt(0)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
            )}

            {/* 宗門資訊 */}
            {activeTab === 'sect' && (
              sect === null && friends === null
                ? <p className="text-center text-white/30 tracking-widest mt-20">神識探查中…</p>
                : !sect
                  ? <p className="text-center text-white/30 tracking-widest mt-20">此處尚無因果聯繫</p>
                  : <div className="flex flex-col gap-3">
                      <p className="text-center text-[#00E5FF] tracking-[0.4em] text-[16px] mb-2">{sect.name}</p>
                      {(sect.buildings ?? []).map((b, i) => {
                        const rc = RARITY_COLORS[b.rarity ?? 'blue'];
                        return (
                          <div key={i}
                            onClick={() => handleEnterItem({ name: b.name, rarity: b.rarity ?? 'blue', desc: b.description ?? '' })}
                            className="flex items-center gap-3 p-3 rounded-xl cursor-pointer active:scale-95 transition-all"
                            style={{ backgroundColor: rc.bg, border: `1px solid ${rc.border}44` }}
                          >
                            <span className="text-[20px] font-bold" style={{ color: rc.border }}>{b.name.charAt(0)}</span>
                            <div>
                              <p className="text-[14px] tracking-wider" style={{ color: rc.border }}>{b.name}</p>
                              <p className="text-[11px] text-white/40">{b.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
            )}
          </div>

          <ReturnBar onClick={handleReturnOverview} />
        </div>
      )}

      {/* =====================================================================
          L3：項目詳情
          ===================================================================== */}
      {showItemDetail && selectedItem && (
        <div className={`absolute inset-0 flex flex-col z-40 bg-black/40 backdrop-blur-sm
          ${viewState === 'item-detail'   ? 'opacity-100' : ''}
          ${viewState === 'entering-item' ? 'anim-zoom-in pointer-events-none' : ''}
          ${viewState === 'exiting-item'  ? 'anim-shrink-out pointer-events-none' : ''}
        `}>
          <div className="flex-grow flex flex-col items-center justify-center px-[8cqw]">
            <div className="relative w-[35cqw] h-[35cqw] rounded-full flex items-center justify-center mb-[8cqw] animate-float"
              style={{
                backgroundColor: RARITY_COLORS[selectedItem.rarity].bg,
                border:    `2px solid ${RARITY_COLORS[selectedItem.rarity].border}`,
                boxShadow: `inset 0 0 30px ${RARITY_COLORS[selectedItem.rarity].shadow}, 0 0 40px ${RARITY_COLORS[selectedItem.rarity].shadow}`,
              }}
            >
              <span className="text-[clamp(32px,9cqw,44px)] font-bold" style={{ color: RARITY_COLORS[selectedItem.rarity].border }}>
                {selectedItem.name.charAt(0)}
              </span>
            </div>
            <h3 className="text-[clamp(22px,6.5cqw,30px)] font-bold tracking-[0.3em] mb-4 text-center"
              style={{ color: RARITY_COLORS[selectedItem.rarity].border }}
            >
              {selectedItem.name}
            </h3>
            <p className="text-gray-300 text-[clamp(13px,3.8cqw,15px)] tracking-wider leading-relaxed text-center px-[4cqw] bg-black/30 border border-white/5 p-4 rounded-xl backdrop-blur-md">
              {selectedItem.desc}
            </p>
          </div>

          <ReturnBar onClick={handleReturnList} label="返回" />
        </div>
      )}
    </div>
  );
}

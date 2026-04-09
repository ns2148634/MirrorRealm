// src/views/BagView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import useGameStore from '../store/gameStore';

// ==========================================
// 設定
// ==========================================
// 天地熔爐置中，六個功能空間以六邊形分布在外圍
const TABS = [
  { id: 'furnace',  label: '天地熔爐', color: '#FF9500', pos: { top: '50%', left: '50%' }, delay: '0s',   center: true },
  { id: 'material', label: '素材',     color: '#E2E8F0', pos: { top: '12%', left: '50%' }, delay: '0.3s'  },
  { id: 'artifact', label: '法器',     color: '#00E5FF', pos: { top: '28%', left: '83%' }, delay: '0.6s'  },
  { id: 'talisman', label: '符籙',     color: '#9B5CFF', pos: { top: '68%', left: '83%' }, delay: '0.9s'  },
  { id: 'pet',      label: '靈獸',     color: '#FFD700', pos: { top: '85%', left: '50%' }, delay: '1.2s'  },
  { id: 'puppet',   label: '傀儡',     color: '#FF3B30', pos: { top: '68%', left: '17%' }, delay: '1.5s'  },
  { id: 'pill',     label: '丹藥',     color: '#32D74B', pos: { top: '28%', left: '17%' }, delay: '1.8s'  },
];

const RARITY_COLORS = {
  white:  { border: '#FFFFFF', bg: 'rgba(255,255,255,0.05)', shadow: 'rgba(255,255,255,0.2)' },
  green:  { border: '#32D74B', bg: 'rgba(50,215,75,0.05)',   shadow: 'rgba(50,215,75,0.3)' },
  blue:   { border: '#00E5FF', bg: 'rgba(0,229,255,0.05)',   shadow: 'rgba(0,229,255,0.3)' },
  purple: { border: '#9B5CFF', bg: 'rgba(155,92,255,0.05)',  shadow: 'rgba(155,92,255,0.4)' },
  gold:   { border: '#FFD700', bg: 'rgba(255,215,0,0.05)',   shadow: 'rgba(255,215,0,0.4)' },
  red:    { border: '#FF3B30', bg: 'rgba(255,59,48,0.05)',   shadow: 'rgba(255,59,48,0.4)' },
};

// ── 天地熔爐輔助 ────────────────────────────────────────
const RARITY_LABEL_CRAFT = { white: '普通', green: '精良', blue: '稀有', purple: '珍稀', gold: '傳說' };
const RARITY_GLOW = {
  white: '#CCCCCC', green: '#32D74B', blue: '#00E5FF', purple: '#9B5CFF', gold: '#FFD700',
};

function detectCategoryClient(name) {
  if (!name) return null;
  if (/妖丹|靈丹|丹核|天材|地寶/.test(name))               return 'pill';
  if (/胚|素胚|毛坯|胚體|劍胚|刀胚|盾胚|甲胚|杖胚/.test(name)) return 'artifact';
  if (/符紙|靈符紙|符箓|符料/.test(name))                   return 'talisman';
  if (/骨架|木偶|機關|素體|軀殼|傀儡素材/.test(name))        return 'puppet';
  return null;
}

const SPEC_LABEL      = { pill: '丹藥', artifact: '器物', talisman: '符籙', puppet: '傀儡' };
const SPEC_COL_CLIENT = {
  pill: 'prof_pill', artifact: 'prof_artifact',
  talisman: 'prof_talisman', puppet: 'prof_puppet',
};

function calcSuccessRate(mainItem, sub1, sub2, prof) {
  if (!mainItem) return null;
  const cat = detectCategoryClient(mainItem.name);
  if (!cat) return null;
  const genProf  = prof.prof_general ?? 0;
  const specProf = prof[SPEC_COL_CLIENT[cat]] ?? 0;
  const subCount = [sub1, sub2].filter(Boolean).length;
  const baseSR   = 0.40 + subCount * 0.05;
  const rate     = Math.min(0.95, baseSR + genProf * 0.003 + specProf * 0.007);
  return { rate, cat, specProf, genProf };
}

const ITEM_TYPE_TO_TAB = {
  '材料':  'material',
  '消耗品': 'material',
  '法器':  'artifact',
  '武器':  'artifact',
  '防具':  'artifact',
  '飾品':  'artifact',
  '丹藥':  'pill',
  '符籙':  'talisman',
  '傀儡':  'puppet',
  '靈獸':  'pet',
};

const EMPTY_INVENTORY = { material: [], artifact: [], pill: [], talisman: [], puppet: [], pet: [], furnace: [] };
const TOTAL_SLOTS = 24;

function transformInventory(apiItems) {
  const result = { material: [], artifact: [], pill: [], talisman: [], puppet: [], pet: [], furnace: [] };
  for (const item of apiItems) {
    const tabId = ITEM_TYPE_TO_TAB[item.item_type] ?? 'material';
    result[tabId].push({
      id:          String(item.item_id),
      name:        item.name,
      count:       item.quantity,
      rarity:      item.rarity ?? 'white',
      desc:        item.description ?? '',
      item_type:   item.item_type,
      effect_type: item.effect_type  ?? null,
      equip_slot:  item.equip_slot   ?? null,
      stat_bonus:  item.stat_bonus   ?? {},
    });
  }
  return result;
}

// ==========================================
// 主元件
// ==========================================
export default function BagView() {
  const player    = useGameStore((s) => s.player);
  const setPlayer = useGameStore((s) => s.setPlayer);

  const [viewState,      setViewState]      = useState('overview');
  const [activeTab,      setActiveTab]      = useState('material');
  const [selectedItem,   setSelectedItem]   = useState(null);
  const [inventory,      setInventory]      = useState(EMPTY_INVENTORY);
  const [isLoading,      setIsLoading]      = useState(false);
  const [isUsingItem,    setIsUsingItem]    = useState(false);
  const [useItemMessage, setUseItemMessage] = useState('');
  const [isEquipping,    setIsEquipping]    = useState(false);
  const [equipMessage,   setEquipMessage]   = useState('');

  // 天地熔爐狀態
  const [craftSlots,    setCraftSlots]    = useState({ main: null, sub1: null, sub2: null });
  const [craftStep,     setCraftStep]     = useState('setup'); // setup | selecting | crafting | result
  const [selectingSlot, setSelectingSlot] = useState(null);   // 'main' | 'sub1' | 'sub2'
  const [craftResult,   setCraftResult]   = useState(null);
  const [proficiency,   setProficiency]   = useState({
    prof_general: 0, prof_pill: 0, prof_artifact: 0, prof_talisman: 0, prof_puppet: 0,
  });

  // ── 資料載入 ───────────────────────────────────────────
  const fetchInventory = async (id) => {
    if (!id) return;
    setIsLoading(true);
    try {
      const r    = await fetch(`/api/player/backpack/${id}`);
      const json = await r.json();
      if (json.status === 'success') setInventory(transformInventory(json.data));
    } catch (err) {
      console.error('背包載入失敗:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchInventory(player?.id); }, [player?.id]);

  useEffect(() => {
    if (activeTab !== 'furnace' || !player?.id) return;
    fetch(`/api/player/proficiency/${player.id}`)
      .then(r => r.json())
      .then(json => { if (json.status === 'success') setProficiency(json.data); })
      .catch(err => console.error('熟練度載入失敗:', err));
  }, [activeTab, player?.id]);

  // ── 天地熔爐煉製 ───────────────────────────────────────
  const handleCraftItem = async () => {
    if (!craftSlots.main || !player?.id) return;
    setCraftStep('crafting');
    const t0 = Date.now();
    try {
      const res  = await fetch('/api/player/craft', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          playerId:   player.id,
          mainItemId: craftSlots.main.id,
          sub1ItemId: craftSlots.sub1?.id ?? null,
          sub2ItemId: craftSlots.sub2?.id ?? null,
        }),
      });
      const json = await res.json();
      const delay = Math.max(0, 1800 - (Date.now() - t0));
      setTimeout(() => {
        const data = json.status === 'success' ? json.data : { success: false, message: json.message };
        setCraftResult(data);
        // 更新前端熟練度顯示
        if (data.prof_general !== undefined) {
          setProficiency(prev => ({
            ...prev,
            prof_general: data.prof_general,
            ...(data.category && SPEC_COL_CLIENT[data.category]
              ? { [SPEC_COL_CLIENT[data.category]]: data.spec_prof }
              : {}),
          }));
        }
        setCraftStep('result');
        fetchInventory(player.id);
      }, delay);
    } catch {
      setTimeout(() => {
        setCraftResult({ success: false, message: '天地法則紊亂，煉製中斷' });
        setCraftStep('result');
      }, 1800);
    }
  };

  const resetFurnace = () => {
    setCraftSlots({ main: null, sub1: null, sub2: null });
    setCraftStep('setup');
    setCraftResult(null);
    setSelectingSlot(null);
  };

  // ── 物品操作 ───────────────────────────────────────────
  const handleUseItem = async () => {
    if (!selectedItem || !player?.id) return;
    setIsUsingItem(true);
    setUseItemMessage('');
    try {
      const res    = await fetch('/api/player/use-item', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ playerId: player.id, itemId: selectedItem.id }),
      });
      const result = await res.json();
      if (!res.ok) {
        setUseItemMessage(result.message || '使用失敗');
      } else {
        setUseItemMessage(result.data.message);
        const newCount = selectedItem.count - 1;
        setSelectedItem((prev) => ({ ...prev, count: newCount }));
        fetchInventory(player.id);
        if (newCount <= 0) {
          setTimeout(() => {
            setUseItemMessage('');
            handleReturnDetail();
          }, 1500);
        }
      }
    } catch {
      setUseItemMessage('使用失敗，天地法則紊亂');
    } finally {
      setIsUsingItem(false);
    }
  };

  const handleEquipItem = async () => {
    if (!selectedItem || !player?.id || isEquipping) return;
    setIsEquipping(true);
    setEquipMessage('');
    try {
      const res    = await fetch('/api/player/equip', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ playerId: player.id, itemId: selectedItem.id }),
      });
      const result = await res.json();
      if (!res.ok) {
        setEquipMessage(result.message || '裝備失敗');
      } else {
        setEquipMessage(result.data.message);
        setPlayer({ attack: result.data.attack, defense: result.data.defense });
        if (navigator.vibrate) navigator.vibrate([30, 50, 100]);
      }
    } catch {
      setEquipMessage('裝備失敗，天地法則紊亂');
    } finally {
      setIsEquipping(false);
    }
  };

  // ── 導航 ───────────────────────────────────────────────
  const triggerHaptic = (pattern) => {
    if (navigator.vibrate) navigator.vibrate(pattern);
  };

  const handleEnterCategory = (tabId) => {
    triggerHaptic([20, 30]);
    if (tabId === 'furnace') resetFurnace();
    setActiveTab(tabId);
    setViewState('entering');
    setTimeout(() => setViewState('detail'), 400);
  };

  const handleReturnOverview = () => {
    triggerHaptic(15);
    setViewState('exiting');
    setTimeout(() => setViewState('overview'), 400);
  };

  const handleEnterItem = (item) => {
    if (!item) return;
    triggerHaptic([20, 30]);
    setSelectedItem(item);
    setViewState('entering-item');
    setTimeout(() => setViewState('item-detail'), 400);
  };

  const handleReturnDetail = () => {
    triggerHaptic(15);
    setViewState('exiting-item');
    setTimeout(() => setViewState('detail'), 400);
  };

  const handleAction = (action) => {
    if (!selectedItem) return;
    triggerHaptic([30, 50, 30]);
    alert(`對 [${selectedItem.name}] 執行了：${action}`);
  };

  // ── 計算 ───────────────────────────────────────────────
  const currentItems  = inventory[activeTab] ?? [];
  const displayGrid   = Array.from({ length: TOTAL_SLOTS }).map((_, i) => currentItems[i] ?? null);

  const craftCalc = useMemo(
    () => calcSuccessRate(craftSlots.main, craftSlots.sub1, craftSlots.sub2, proficiency),
    [craftSlots, proficiency],
  );

  // 供選料 overlay 使用的完整物品清單
  const allItemsForPicker = useMemo(() => [
    ...inventory.material,
    ...inventory.artifact,
    ...inventory.pill,
    ...inventory.talisman,
    ...inventory.puppet,
    ...inventory.pet,
  ], [inventory]);

  const showL1 = ['overview', 'entering', 'exiting'].includes(viewState);
  const showL2 = ['detail', 'entering', 'exiting', 'entering-item', 'exiting-item'].includes(viewState);
  const showL3 = ['item-detail', 'entering-item', 'exiting-item'].includes(viewState);

  const isFurnace   = activeTab === 'furnace';
  const isCrafting  = craftStep === 'crafting';

  return (
    <div className="h-full w-full relative flex flex-col bg-transparent overflow-hidden text-white font-serif z-10 pt-[5cqw]">

      {/* 動畫 */}
      <style>{`
        @keyframes gentle-float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-15px); }
        }
        .animate-float { animation: gentle-float 5s ease-in-out infinite; }

        @keyframes zoom-out-fade {
          from { transform: scale(1); opacity: 1; }
          to   { transform: scale(2); opacity: 0; }
        }
        .animate-zoom-out-fade { animation: zoom-out-fade 0.4s cubic-bezier(0.4,0,0.2,1) forwards; }

        @keyframes zoom-in-fade {
          from { transform: scale(0.5); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        .animate-zoom-in-fade { animation: zoom-in-fade 0.4s cubic-bezier(0.4,0,0.2,1) forwards; }

        @keyframes shrink-out-fade {
          from { transform: scale(1);   opacity: 1; }
          to   { transform: scale(0.5); opacity: 0; }
        }
        .animate-shrink-out-fade { animation: shrink-out-fade 0.4s cubic-bezier(0.4,0,0.2,1) forwards; }

        @keyframes shrink-in-fade {
          from { transform: scale(2); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        .animate-shrink-in-fade { animation: shrink-in-fade 0.4s cubic-bezier(0.4,0,0.2,1) forwards; }

        @keyframes furnace-spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes furnace-spin-rev {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        @keyframes furnace-glow-idle {
          0%,100% { box-shadow: 0 0 30px rgba(255,149,0,0.25), 0 0 60px rgba(255,149,0,0.08); }
          50%     { box-shadow: 0 0 50px rgba(255,149,0,0.50), 0 0 100px rgba(255,149,0,0.18); }
        }
        @keyframes furnace-spin-fast {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes furnace-spin-fast-rev {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        @keyframes furnace-glow-intense {
          0%,100% { box-shadow: 0 0 60px rgba(255,149,0,0.80), 0 0 120px rgba(255,149,0,0.40); }
          50%     { box-shadow: 0 0 100px rgba(255,149,0,1.00), 0 0 200px rgba(255,149,0,0.70); }
        }
        @keyframes result-emerge {
          from { transform: scale(0.4) translateY(20px); opacity: 0; }
          to   { transform: scale(1)   translateY(0);    opacity: 1; }
        }
        @keyframes sparkle {
          0%,100% { opacity: 0; transform: scale(0); }
          50%     { opacity: 1; transform: scale(1); }
        }
        .furnace-ring-outer  { animation: furnace-spin-slow 10s linear infinite; }
        .furnace-ring-inner  { animation: furnace-spin-rev  6s linear infinite; }
        .furnace-glow-idle   { animation: furnace-glow-idle 3s ease-in-out infinite; }
        .furnace-ring-outer-fast { animation: furnace-spin-fast 1.2s linear infinite; }
        .furnace-ring-inner-fast { animation: furnace-spin-fast-rev 0.8s linear infinite; }
        .furnace-glow-intense    { animation: furnace-glow-intense 0.4s ease-in-out infinite; }
        .result-emerge           { animation: result-emerge 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards; }
      `}</style>

      {/* =========================================
          L1：芥子總覽
          ========================================= */}
      {showL1 && (
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center px-[4cqw] pt-[5cqw] z-20
            ${viewState === 'overview' ? 'opacity-100' : ''}
            ${viewState === 'entering' ? 'animate-zoom-out-fade pointer-events-none' : ''}
            ${viewState === 'exiting'  ? 'animate-shrink-in-fade pointer-events-none' : ''}
          `}
        >
          <div className="relative w-full h-[65vh] max-w-[400px] mx-auto">
            {TABS.map((tab) => (
              <div
                key={tab.id}
                className="absolute z-10"
                style={{ top: tab.pos.top, left: tab.pos.left, transform: 'translate(-50%, -50%)' }}
              >
                <div
                  onClick={() => viewState === 'overview' && handleEnterCategory(tab.id)}
                  className={`relative flex items-center justify-center cursor-pointer group active:scale-95 transition-all duration-300
                    ${viewState === 'overview' ? 'animate-float' : ''}`}
                  style={{ animationDelay: tab.delay }}
                >
                  <div className={`flex items-center justify-center transition-transform duration-500 group-hover:scale-110
                    ${tab.center
                      ? 'w-[26cqw] h-[26cqw] max-w-[110px] max-h-[110px]'
                      : 'w-[16cqw] h-[16cqw] max-w-[68px] max-h-[68px]'}`}>
                    <img
                      src={`/images/icons/icon_${tab.id}.svg`}
                      alt={tab.label}
                      className="w-full h-full object-contain opacity-90"
                      style={{ filter: `drop-shadow(0 0 ${tab.center ? '22px' : '12px'} ${tab.color})` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="absolute bottom-[calc(env(safe-area-inset-bottom,20px)+10cqw)] text-[#00E5FF] tracking-[0.5em] text-[12px] opacity-40 pointer-events-none">
            探入神識以檢視
          </div>
        </div>
      )}

      {/* =========================================
          L2：空間內部
          ========================================= */}
      {showL2 && (
        <div
          className={`absolute inset-0 flex flex-col z-30
            ${viewState === 'detail'        ? 'opacity-100' : ''}
            ${viewState === 'entering'      ? 'animate-zoom-in-fade pointer-events-none' : ''}
            ${viewState === 'exiting'       ? 'animate-shrink-out-fade pointer-events-none' : ''}
            ${viewState === 'entering-item' ? 'animate-zoom-out-fade pointer-events-none' : ''}
            ${viewState === 'exiting-item'  ? 'animate-shrink-in-fade pointer-events-none' : ''}
          `}
        >
          {/* ── 天地熔爐 UI ── */}
          {isFurnace ? (
            <div className="flex-grow flex flex-col overflow-hidden">

              {/* ── 煉製中畫面 ── */}
              {craftStep === 'crafting' && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#06080F]">
                  <div className="relative flex items-center justify-center mb-8">
                    {/* 外符文環 */}
                    <div className="absolute rounded-full border border-dashed border-[#FF9500]/60 furnace-ring-outer-fast"
                         style={{ width: '180px', height: '180px' }} />
                    {/* 內符文環 */}
                    <div className="absolute rounded-full border border-[#FF9500]/40 furnace-ring-inner-fast"
                         style={{ width: '140px', height: '140px', borderStyle: 'dotted' }} />
                    {/* 熔爐圖示 */}
                    <div className="w-[100px] h-[100px] rounded-full flex items-center justify-center furnace-glow-intense"
                         style={{ background: 'radial-gradient(circle, rgba(255,149,0,0.15) 0%, transparent 70%)' }}>
                      <img src="/images/icons/icon_furnace.svg" alt="熔爐"
                           className="w-[80px] h-[80px] object-contain"
                           style={{ filter: 'drop-shadow(0 0 20px #FF9500)' }} />
                    </div>
                  </div>
                  <p className="text-[#FF9500] tracking-[0.5em] text-lg animate-pulse">天地熔煉中</p>
                  <p className="text-white/30 tracking-widest text-sm mt-3">天道運轉，稍候片刻…</p>
                </div>
              )}

              {/* ── 煉製結果畫面 ── */}
              {craftStep === 'result' && craftResult && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#06080F] px-[8cqw]">
                  {craftResult.success ? (
                    <div className="flex flex-col items-center result-emerge">
                      {/* 品質光環 */}
                      <div className="relative w-[140px] h-[140px] flex items-center justify-center mb-6">
                        <div className="absolute inset-0 rounded-full"
                             style={{
                               background: `radial-gradient(circle, ${RARITY_GLOW[craftResult.result_rarity] ?? '#FF9500'}22 0%, transparent 70%)`,
                               boxShadow: `0 0 60px ${RARITY_GLOW[craftResult.result_rarity] ?? '#FF9500'}55`,
                             }} />
                        <div className="w-[90px] h-[90px] rounded-full flex items-center justify-center border-2"
                             style={{ borderColor: RARITY_GLOW[craftResult.result_rarity] ?? '#FF9500' }}>
                          <span className="text-4xl font-bold"
                                style={{ color: RARITY_GLOW[craftResult.result_rarity] ?? '#FF9500' }}>
                            {craftResult.result_name?.charAt(0) ?? '丹'}
                          </span>
                        </div>
                      </div>

                      {/* 品質標籤 */}
                      <div className="px-4 py-1 rounded-full text-xs tracking-[0.4em] mb-3 border"
                           style={{
                             color: RARITY_GLOW[craftResult.result_rarity] ?? '#FF9500',
                             borderColor: `${RARITY_GLOW[craftResult.result_rarity] ?? '#FF9500'}66`,
                             background: `${RARITY_GLOW[craftResult.result_rarity] ?? '#FF9500'}11`,
                           }}>
                        {RARITY_LABEL_CRAFT[craftResult.result_rarity] ?? ''}品質
                      </div>

                      <h2 className="text-2xl font-bold tracking-[0.3em] mb-2 text-center"
                          style={{ color: RARITY_GLOW[craftResult.result_rarity] ?? '#FF9500',
                                   textShadow: `0 0 20px ${RARITY_GLOW[craftResult.result_rarity] ?? '#FF9500'}88` }}>
                        {craftResult.result_name}
                      </h2>
                      <p className="text-white/60 text-sm tracking-wider mb-6">煉製成功</p>

                      {/* 熟練度增益 */}
                      <div className="flex gap-4 mb-8">
                        <div className="flex flex-col items-center px-4 py-2 rounded-xl border border-white/10 bg-white/5">
                          <span className="text-white/40 text-xs tracking-wider mb-1">百藝總綱</span>
                          <span className="text-[#FF9500] font-bold">+2</span>
                        </div>
                        {craftResult.category && (
                          <div className="flex flex-col items-center px-4 py-2 rounded-xl border border-white/10 bg-white/5">
                            <span className="text-white/40 text-xs tracking-wider mb-1">{SPEC_LABEL[craftResult.category] ?? ''}熟練</span>
                            <span className="text-[#FFD700] font-bold">+3</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center result-emerge">
                      <div className="w-[100px] h-[100px] rounded-full flex items-center justify-center mb-6 border border-red-500/30"
                           style={{ boxShadow: '0 0 40px rgba(255,59,48,0.3)' }}>
                        <span className="text-4xl">煙</span>
                      </div>
                      <p className="text-red-400 text-xl tracking-[0.3em] mb-2">煉製失敗</p>
                      <p className="text-white/40 text-sm tracking-wider text-center mb-6 px-4">
                        {craftResult.message ?? '天道不佑，素材已損耗'}
                      </p>
                      {craftResult.prof_general !== undefined && (
                        <div className="flex flex-col items-center px-4 py-2 rounded-xl border border-white/10 bg-white/5 mb-6">
                          <span className="text-white/40 text-xs tracking-wider mb-1">百藝總綱</span>
                          <span className="text-[#FF9500] font-bold">+1</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-4 w-full max-w-[300px]">
                    <button
                      onClick={resetFurnace}
                      className="flex-1 py-3 rounded-full tracking-[0.4em] text-sm border border-[#FF9500] text-[#FF9500] bg-[#FF9500]/10 active:scale-95 transition-all"
                    >
                      再煉一次
                    </button>
                    <button
                      onClick={handleReturnOverview}
                      className="flex-1 py-3 rounded-full tracking-[0.4em] text-sm border border-white/20 text-white/60 bg-white/5 active:scale-95 transition-all"
                    >
                      離開熔爐
                    </button>
                  </div>
                </div>
              )}

              {/* ── 煉製主介面 (setup / selecting) ── */}
              {(craftStep === 'setup' || craftStep === 'selecting') && (
                <div className="flex flex-col h-full px-[5cqw] pt-[3cqw]">

                  {/* 熟練度列 */}
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                      <span className="text-white/40 text-[11px] tracking-wider">百藝</span>
                      <span className="text-[#FF9500] text-sm font-bold">{proficiency.prof_general}</span>
                    </div>
                    {craftCalc && (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                        <span className="text-white/40 text-[11px] tracking-wider">{SPEC_LABEL[craftCalc.cat]}</span>
                        <span className="text-[#FFD700] text-sm font-bold">{craftCalc.specProf}</span>
                      </div>
                    )}
                  </div>

                  {/* 熔爐圖示區 */}
                  <div className="flex items-center justify-center mb-5">
                    <div className="relative flex items-center justify-center">
                      {/* 外符文環 */}
                      <div className="absolute rounded-full border border-dashed border-[#FF9500]/40 furnace-ring-outer"
                           style={{ width: '130px', height: '130px' }} />
                      {/* 內符文環 */}
                      <div className="absolute rounded-full border border-[#FF9500]/25 furnace-ring-inner"
                           style={{ width: '100px', height: '100px', borderStyle: 'dotted' }} />
                      {/* 熔爐本體 */}
                      <div className="w-[72px] h-[72px] rounded-full flex items-center justify-center furnace-glow-idle"
                           style={{ background: 'radial-gradient(circle, rgba(255,149,0,0.08) 0%, transparent 70%)' }}>
                        <img src="/images/icons/icon_furnace.svg" alt="天地熔爐"
                             className="w-[58px] h-[58px] object-contain"
                             style={{ filter: 'drop-shadow(0 0 10px #FF9500)' }} />
                      </div>
                    </div>
                  </div>

                  {/* 素材槽 */}
                  <div className="flex items-center justify-center gap-3 mb-4">
                    {/* 副素材1 */}
                    <MaterialSlot
                      label="副素材"
                      item={craftSlots.sub1}
                      onSelect={() => { setSelectingSlot('sub1'); setCraftStep('selecting'); }}
                      onClear={() => setCraftSlots(prev => ({ ...prev, sub1: null }))}
                      small
                    />
                    {/* 主素材 */}
                    <MaterialSlot
                      label="主素材"
                      item={craftSlots.main}
                      onSelect={() => { setSelectingSlot('main'); setCraftStep('selecting'); }}
                      onClear={() => setCraftSlots(prev => ({ ...prev, main: null }))}
                    />
                    {/* 副素材2 */}
                    <MaterialSlot
                      label="副素材"
                      item={craftSlots.sub2}
                      onSelect={() => { setSelectingSlot('sub2'); setCraftStep('selecting'); }}
                      onClear={() => setCraftSlots(prev => ({ ...prev, sub2: null }))}
                      small
                    />
                  </div>

                  {/* 類別與成功率 */}
                  <div className="flex items-center justify-center gap-4 mb-5 min-h-[24px]">
                    {craftCalc ? (
                      <>
                        <span className="text-white/40 text-xs tracking-wider">
                          {SPEC_LABEL[craftCalc.cat]}煉製
                        </span>
                        <span className="text-[#FF9500] font-bold text-sm tracking-wider">
                          成功率 {Math.round(craftCalc.rate * 100)}%
                        </span>
                      </>
                    ) : craftSlots.main ? (
                      <span className="text-red-400/70 text-xs tracking-wider">素材類別無法識別</span>
                    ) : (
                      <span className="text-white/20 text-xs tracking-wider">放入主素材以開始煉製</span>
                    )}
                  </div>

                  {/* 成功率進度條 */}
                  {craftCalc && (
                    <div className="w-full max-w-[260px] mx-auto h-1.5 rounded-full bg-white/10 mb-5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.round(craftCalc.rate * 100)}%`,
                          background: craftCalc.rate >= 0.7
                            ? 'linear-gradient(90deg,#FF9500,#FFD700)'
                            : craftCalc.rate >= 0.5
                            ? 'linear-gradient(90deg,#FF9500,#FF6B00)'
                            : 'linear-gradient(90deg,#FF3B30,#FF9500)',
                        }}
                      />
                    </div>
                  )}

                  {/* 開始煉製按鈕 */}
                  <div className="flex justify-center">
                    <button
                      onClick={handleCraftItem}
                      disabled={!craftSlots.main || !craftCalc}
                      className="px-10 py-3 rounded-full tracking-[0.5em] text-base transition-all duration-300 border active:scale-95
                        disabled:opacity-30 disabled:cursor-not-allowed"
                      style={craftSlots.main && craftCalc ? {
                        borderColor: '#FF9500',
                        color: '#FF9500',
                        background: 'rgba(255,149,0,0.12)',
                        boxShadow: '0 0 20px rgba(255,149,0,0.25)',
                      } : {
                        borderColor: 'rgba(255,255,255,0.2)',
                        color: 'rgba(255,255,255,0.3)',
                        background: 'transparent',
                      }}
                    >
                      開始煉製
                    </button>
                  </div>
                </div>
              )}

              {/* ── 選料 Overlay ── */}
              {craftStep === 'selecting' && selectingSlot && (
                <div className="absolute inset-0 z-50 flex flex-col bg-[#06080F]/95 backdrop-blur-md">
                  {/* 標題列 */}
                  <div className="flex items-center justify-between px-[5cqw] pt-[5cqw] pb-3 border-b border-white/10">
                    <button
                      onClick={() => { setSelectingSlot(null); setCraftStep('setup'); }}
                      className="text-white/50 text-sm tracking-wider flex items-center gap-1"
                    >
                      <span className="text-lg leading-none">‹</span> 取消
                    </button>
                    <span className="text-[#FF9500] tracking-[0.4em] text-sm">
                      選擇 {selectingSlot === 'main' ? '主素材' : '副素材'}
                    </span>
                    <div className="w-12" />
                  </div>

                  {/* 物品清單 */}
                  <div className="flex-grow overflow-y-auto px-[4cqw] py-3">
                    {allItemsForPicker.length === 0 ? (
                      <p className="text-center text-white/20 tracking-widest text-sm mt-8">背包空空如也</p>
                    ) : (
                      <div className="space-y-2 max-w-[500px] mx-auto">
                        {allItemsForPicker.map((item) => {
                          const usedInOther =
                            (selectingSlot !== 'main'  && craftSlots.main?.id  === item.id) ||
                            (selectingSlot !== 'sub1'  && craftSlots.sub1?.id  === item.id) ||
                            (selectingSlot !== 'sub2'  && craftSlots.sub2?.id  === item.id);
                          const rc = RARITY_COLORS[item.rarity] ?? RARITY_COLORS.white;
                          return (
                            <button
                              key={item.id}
                              disabled={usedInOther}
                              onClick={() => {
                                setCraftSlots(prev => ({ ...prev, [selectingSlot]: item }));
                                setSelectingSlot(null);
                                setCraftStep('setup');
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all active:scale-[0.98] disabled:opacity-30"
                              style={{
                                background: rc.bg,
                                border: `1px solid ${rc.border}33`,
                              }}
                            >
                              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                                   style={{ border: `1px solid ${rc.border}66` }}>
                                <span className="text-lg font-bold" style={{ color: rc.border }}>
                                  {item.name.charAt(0)}
                                </span>
                              </div>
                              <div className="flex-grow text-left">
                                <p className="text-sm tracking-wider" style={{ color: rc.border }}>{item.name}</p>
                                <p className="text-white/30 text-xs">{item.item_type}</p>
                              </div>
                              <span className="text-white/50 text-xs font-mono shrink-0">×{item.count}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── 一般物品網格 ── */
            <div className="px-[5cqw] flex-grow overflow-y-auto no-scrollbar pb-[4cqw] pt-[5cqw]">
              <div className="grid grid-cols-4 gap-[3cqw] w-full max-w-[500px] mx-auto">
                {displayGrid.map((item, index) => {
                  const isSelected  = selectedItem?.id === item?.id;
                  const rarityStyle = item ? RARITY_COLORS[item.rarity] ?? RARITY_COLORS.white : null;

                  return (
                    <div
                      key={item ? item.id : `empty-${index}`}
                      onClick={() => viewState === 'detail' && handleEnterItem(item)}
                      className={`relative aspect-square rounded-xl transition-all duration-300 flex items-center justify-center overflow-hidden
                        ${item
                          ? `cursor-pointer active:scale-95 ${viewState === 'detail' ? 'animate-float' : ''}`
                          : 'border border-dashed border-white/5 bg-transparent'}
                      `}
                      style={item ? {
                        backgroundColor: rarityStyle.bg,
                        border:    `1px solid ${isSelected ? rarityStyle.border : rarityStyle.border + '44'}`,
                        boxShadow: isSelected
                          ? `inset 0 0 20px ${rarityStyle.shadow}, 0 0 15px ${rarityStyle.shadow}`
                          : '0 5px 15px rgba(0,0,0,0.5)',
                        animationDelay: viewState === 'detail' ? `${(index * 0.2) % 3}s` : '0s',
                        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                      } : {}}
                    >
                      {item && (
                        <>
                          <span
                            className="text-[clamp(16px,4.5cqw,22px)] font-bold drop-shadow-lg"
                            style={{ color: rarityStyle.border }}
                          >
                            {item.name.charAt(0)}
                          </span>
                          {item.count > 1 && (
                            <div className="absolute bottom-1 right-1.5 text-[10px] font-mono text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,1)] bg-black/40 px-1 rounded">
                              x{item.count}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {currentItems.length === 0 && !isLoading && (
                <p className="text-center text-white/20 tracking-widest text-sm mt-8">此空間尚無藏物</p>
              )}
            </div>
          )}

          {/* 底部導航 */}
          {craftStep !== 'crafting' && craftStep !== 'result' && craftStep !== 'selecting' && (
            <div className="w-full shrink-0 bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col pt-[8cqw]">
              <div className="px-[6cqw] pb-[6cqw] flex justify-between items-center w-full max-w-[500px] mx-auto">
                <button
                  onClick={() => viewState === 'detail' && handleReturnOverview()}
                  className="text-gray-400 hover:text-white tracking-widest text-[clamp(14px,4cqw,16px)] flex items-center gap-2 border border-white/10 bg-black/40 px-4 py-1.5 rounded-full active:scale-95 transition-all"
                >
                  <span className="text-lg leading-none mt-[-2px]">‹</span> 抽離空間
                </button>
                <span className="text-[#FF9500] tracking-[0.4em] text-[clamp(16px,4.5cqw,20px)] drop-shadow-[0_0_8px_rgba(255,149,0,0.5)]"
                      style={{ display: isFurnace ? 'block' : 'none' }}>
                  天地熔爐
                </span>
                <span className="text-[#00E5FF] tracking-[0.4em] text-[clamp(16px,4.5cqw,20px)] drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]"
                      style={{ display: !isFurnace ? 'block' : 'none' }}>
                  {TABS.find((t) => t.id === activeTab)?.label}空間
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================
          L3：物品詳情
          ========================================= */}
      {showL3 && selectedItem && (
        <div
          className={`absolute inset-0 flex flex-col z-40 bg-black/40 backdrop-blur-sm
            ${viewState === 'item-detail'   ? 'opacity-100' : ''}
            ${viewState === 'entering-item' ? 'animate-zoom-in-fade pointer-events-none' : ''}
            ${viewState === 'exiting-item'  ? 'animate-shrink-out-fade pointer-events-none' : ''}
          `}
        >
          <div className="flex-grow flex flex-col items-center justify-center px-[8cqw]">
            <div
              className={`relative w-[35cqw] h-[35cqw] rounded-full flex items-center justify-center mb-[8cqw]
                ${viewState === 'item-detail' ? 'animate-float' : ''}`}
              style={{
                backgroundColor: RARITY_COLORS[selectedItem.rarity]?.bg,
                border:    `2px solid ${RARITY_COLORS[selectedItem.rarity]?.border}`,
                boxShadow: `inset 0 0 30px ${RARITY_COLORS[selectedItem.rarity]?.shadow}, 0 0 40px ${RARITY_COLORS[selectedItem.rarity]?.shadow}`,
              }}
            >
              <span
                className="text-[clamp(36px,10cqw,48px)] font-bold drop-shadow-lg"
                style={{ color: RARITY_COLORS[selectedItem.rarity]?.border }}
              >
                {selectedItem.name.charAt(0)}
              </span>
              <div className="absolute -bottom-2 px-3 py-1 text-[12px] font-mono text-white tracking-widest bg-black/80 border border-white/20 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.8)]">
                數量: {selectedItem.count}
              </div>
            </div>

            <h3
              className="text-[clamp(24px,7cqw,32px)] font-bold tracking-[0.3em] mb-4 drop-shadow-md text-center"
              style={{ color: RARITY_COLORS[selectedItem.rarity]?.border }}
            >
              {selectedItem.name}
            </h3>

            <p className="text-gray-300 text-[clamp(14px,4cqw,16px)] tracking-wider leading-relaxed text-center px-[4cqw] bg-black/30 border border-white/5 p-4 rounded-xl backdrop-blur-md">
              {selectedItem.desc || '一件散發著微弱靈氣的修仙物品。'}
            </p>
          </div>

          <div className="w-full shrink-0 bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col pt-[8cqw]">
            {(useItemMessage !== '' || equipMessage !== '') && (
              <p className="text-center text-[#32D74B] text-[13px] tracking-wider px-6 pb-3 animate-pulse">
                {equipMessage || useItemMessage}
              </p>
            )}

            <div className="px-[5cqw] flex gap-[4cqw] pb-[4cqw] w-full max-w-[500px] mx-auto">
              <button
                onClick={() => handleAction('銷毀')}
                className="flex-1 py-3 rounded-full text-[clamp(16px,4.5cqw,20px)] tracking-[0.5em] transition-all duration-300 border backdrop-blur-sm border-[#FF3B30] text-[#FF3B30] bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 shadow-[0_0_15px_rgba(255,59,48,0.2)] active:scale-95"
              >
                銷毀
              </button>

              {selectedItem?.equip_slot ? (
                <button
                  onClick={handleEquipItem}
                  disabled={isEquipping}
                  className="flex-1 py-3 rounded-full text-[clamp(16px,4.5cqw,20px)] tracking-[0.5em] transition-all duration-300 border backdrop-blur-sm border-[#FFD700] text-[#FFD700] bg-[#FFD700]/10 hover:bg-[#FFD700]/20 shadow-[0_0_15px_rgba(255,215,0,0.3)] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isEquipping ? '...' : '裝備'}
                </button>
              ) : selectedItem?.effect_type ? (
                <button
                  onClick={handleUseItem}
                  disabled={isUsingItem}
                  className="flex-1 py-3 rounded-full text-[clamp(16px,4.5cqw,20px)] tracking-[0.5em] transition-all duration-300 border backdrop-blur-sm border-[#32D74B] text-[#32D74B] bg-[#32D74B]/10 hover:bg-[#32D74B]/20 shadow-[0_0_15px_rgba(50,215,75,0.2)] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isUsingItem ? '...' : '使用'}
                </button>
              ) : (
                <button
                  onClick={() => handleAction('合成')}
                  className="flex-1 py-3 rounded-full text-[clamp(16px,4.5cqw,20px)] tracking-[0.5em] transition-all duration-300 border backdrop-blur-sm border-[#00E5FF] text-[#00E5FF] bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 shadow-[0_0_15px_rgba(0,229,255,0.2)] active:scale-95"
                >
                  合成
                </button>
              )}
            </div>

            <div className="px-[6cqw] pb-[6cqw] flex justify-between items-center w-full max-w-[500px] mx-auto">
              <button
                onClick={() => viewState === 'item-detail' && handleReturnDetail()}
                className="text-gray-400 hover:text-white tracking-widest text-[clamp(14px,4cqw,16px)] flex items-center gap-2 border border-white/10 bg-black/40 px-4 py-1.5 rounded-full active:scale-95 transition-all"
              >
                <span className="text-lg leading-none mt-[-2px]">‹</span> 返回空間
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ==========================================
// 素材槽元件
// ==========================================
function MaterialSlot({ label, item, onSelect, onClear, small = false }) {
  const rc = item ? (RARITY_COLORS[item.rarity] ?? RARITY_COLORS.white) : null;
  const size = small
    ? 'w-[22cqw] h-[22cqw] max-w-[88px] max-h-[88px]'
    : 'w-[28cqw] h-[28cqw] max-w-[112px] max-h-[112px]';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        onClick={item ? undefined : onSelect}
        className={`${size} rounded-2xl flex flex-col items-center justify-center cursor-pointer relative
          transition-all duration-200 active:scale-95 overflow-hidden`}
        style={item ? {
          background: rc.bg,
          border: `1.5px solid ${rc.border}88`,
          boxShadow: `0 0 16px ${rc.shadow}`,
        } : {
          border: '1.5px dashed rgba(255,149,0,0.35)',
          background: 'rgba(255,149,0,0.04)',
        }}
      >
        {item ? (
          <>
            <span className={`font-bold ${small ? 'text-2xl' : 'text-3xl'}`} style={{ color: rc.border }}>
              {item.name.charAt(0)}
            </span>
            <span className="text-[9px] text-white/40 mt-0.5 px-1 text-center leading-tight line-clamp-2">
              {item.name}
            </span>
            {/* 清除按鈕 */}
            <button
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-[8px] text-white/60 leading-none"
            >
              ×
            </button>
          </>
        ) : (
          <>
            <span className="text-[#FF9500]/50 text-2xl leading-none">＋</span>
          </>
        )}
      </div>
      <span className="text-[10px] text-white/25 tracking-wider">{label}</span>
    </div>
  );
}

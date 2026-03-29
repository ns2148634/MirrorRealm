// src/views/CultivateView.jsx
import React, { useState } from 'react';
// import useGameStore from '../store/gameStore';

// 模擬玩家擁有的功法與法寶庫 (玉簡資料)
const MOCK_INVENTORY = {
  mainMethod: [
    { id: 'm1', name: '青木長春訣', desc: '【主功法】靈力生生不息，戰鬥中每回合恢復 5% 最大靈力', level: '第三層' },
    { id: 'm2', name: '大日如來真解', desc: '【主功法】陽剛之氣熾盛，所有火屬性與陽屬性法術威力提升 30%', level: '第一層' }
  ],
  subMethod: [
    { id: 's1', name: '游龍步', desc: '【副功法】身形如龍，增加 15% 閃避機率', level: '小成' },
    { id: 's2', name: '斂息術', desc: '【副功法】降低神識波動，被高階妖獸發現機率降低', level: '大成' },
    { id: 's3', name: '聚靈陣解', desc: '【副功法】常駐提升 10% 靈氣吸收速度', level: '初學' }
  ],
  talisman: [
    { id: 't1', name: '烈火符', cost: 2, desc: '【消耗品】擲出爆發 150 點火屬性傷害' },
    { id: 't2', name: '神行符', cost: 1, desc: '【消耗品】短暫提升極高閃避，持續 1 回合' },
    { id: 't3', name: '金剛符', cost: 3, desc: '【消耗品】抵擋一次致命傷害或 500 點以下攻擊' }
  ],
  artifact: [
    { id: 'a1', name: '青木劍', cost: 10, drain: 20, desc: '【法器】每次攻擊消耗 20 靈力，造成 80 傷害' },
    { id: 'a2', name: '玄鐵重印', cost: 15, drain: 40, desc: '【法器】每次攻擊消耗 40 靈力，造成 180 傷害，具備破甲' },
    { id: 'a3', name: '子母飛針', cost: 8, drain: 10, desc: '【法器】每次攻擊消耗 10 靈力，造成 30 傷害 (高連擊率)' },
    { id: 'a4', name: '引魂鈴', cost: 12, drain: 15, desc: '【法器】機率造成敵方神識混亂，中斷施法' },
    { id: 'a5', name: '玄武盾', cost: 20, drain: 30, desc: '【法器】防禦型法器，大幅降低受到的物理傷害' },
  ]
};

export default function CultivateView() {
  // const player = useGameStore((state) => state.player);
  
  // 🌟 視圖切換：功法 vs 法器
  const [activeTab, setActiveTab] = useState('methods'); // 'methods' | 'artifacts'
  
  // 🌟 本地狀態 (Local State) - 用於編輯
  const [methods, setMethods] = useState({ main: null, sub1: null, sub2: null });
  const [equippedArtifacts, setEquippedArtifacts] = useState([]); // 陣列，隨意增加
  const [equippedTalisman, setEquippedTalisman] = useState({ item: null, count: 0 });
  
  // 紀錄是否有未儲存的變更
  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 控制底部玉簡彈窗狀態
  const [activeSlot, setActiveSlot] = useState(null); // 'main', 'sub1', 'sub2', 'artifact', 'talisman'

  // =========================================
  // 神識計算邏輯
  // =========================================
  const maxGodSense = 50; 
  
  // 計算法器佔用的神識
  const artifactsLoad = equippedArtifacts.reduce((sum, item) => sum + item.cost, 0);
  // 計算符籙佔用的神識 (單張 cost * 數量)
  const talismanLoad = equippedTalisman.item ? equippedTalisman.item.cost * equippedTalisman.count : 0;
  
  const currentGodSenseLoad = artifactsLoad + talismanLoad;
  const isOverloaded = currentGodSenseLoad > maxGodSense;

  // =========================================
  // 互動處理邏輯
  // =========================================
  const handleOpenSheet = (slotType) => {
    if (navigator.vibrate) navigator.vibrate(10);
    setActiveSlot(slotType);
  };

  const handleEquip = (item) => {
    if (navigator.vibrate) navigator.vibrate([20, 30, 20]);
    setIsModified(true);

    if (activeSlot === 'main' || activeSlot === 'sub1' || activeSlot === 'sub2') {
      setMethods(prev => ({ ...prev, [activeSlot]: item }));
    } else if (activeSlot === 'artifact') {
      setEquippedArtifacts(prev => [...prev, item]);
    } else if (activeSlot === 'talisman') {
      setEquippedTalisman({ item, count: 1 });
    }
    setActiveSlot(null);
  };

  const handleUnequipMethod = (slotKey) => {
    if (navigator.vibrate) navigator.vibrate(10);
    setIsModified(true);
    setMethods(prev => ({ ...prev, [slotKey]: null }));
  };

  const handleRemoveArtifact = (index) => {
    if (navigator.vibrate) navigator.vibrate(10);
    setIsModified(true);
    setEquippedArtifacts(prev => prev.filter((_, i) => i !== index));
  };

  const updateTalismanCount = (delta) => {
    if (!equippedTalisman.item) return;
    setIsModified(true);
    if (navigator.vibrate) navigator.vibrate(5);
    setEquippedTalisman(prev => {
      const newCount = prev.count + delta;
      if (newCount <= 0) return { item: null, count: 0 }; // 數量歸零則卸下
      return { ...prev, count: newCount };
    });
  };

  const handleSaveConfiguration = () => {
    if (isOverloaded) {
      alert("神識超載，無法銘記此法陣！請減少法器或符籙數量。");
      return;
    }
    if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
    setIsSaving(true);
    
    setTimeout(() => {
      setIsSaving(false);
      setIsModified(false);
      console.log("法陣已銘記", { methods, equippedArtifacts, equippedTalisman });
    }, 800);
  };

  const getAvailableItems = () => {
    switch(activeSlot) {
      case 'main': return MOCK_INVENTORY.mainMethod;
      case 'sub1': 
      case 'sub2': return MOCK_INVENTORY.subMethod;
      case 'artifact': return MOCK_INVENTORY.artifact;
      case 'talisman': return MOCK_INVENTORY.talisman;
      default: return [];
    }
  };

  return (
    // 🌟 修改：外層改成 bg-transparent，直接繼承 PlayingStage 的天地背景
    <div className="h-full w-full relative flex flex-col bg-transparent overflow-hidden text-white font-serif z-10">
      
      {/* =========================================
          1. 頂部導航與狀態 (加上 shrink-0 確保它不會被壓縮)
          ========================================= */}
      <div className="pt-[2cqw] px-[6cqw] pb-[2cqw] shrink-0 flex flex-col">
        {/* 儲存按鈕 */}
        <div className="flex justify-between items-center mb-[4cqw]">
          <h2 className="text-[clamp(18px,5cqw,24px)] tracking-[0.4em] text-[#00E5FF] drop-shadow-[0_0_8px_rgba(0,229,255,0.3)]">
            造化配置
          </h2>
          <button 
            onClick={handleSaveConfiguration}
            disabled={!isModified || isSaving}
            className={`px-4 py-1.5 rounded-lg text-sm tracking-widest transition-all duration-300 border ${
              isSaving ? 'bg-white/20 border-white/40 text-white animate-pulse' :
              isModified && !isOverloaded
                ? 'bg-[#00E5FF]/20 border-[#00E5FF] text-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.4)] hover:bg-[#00E5FF]/30 active:scale-95' 
                : 'bg-black/50 border-white/10 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSaving ? '銘記中...' : '銘記配置'}
          </button>
        </div>

        {/* 標籤切換 */}
        <div className="flex bg-[#11141D]/80 backdrop-blur-sm rounded-xl p-1 border border-white/5 mb-2 relative z-10">
          <button
            onClick={() => { if (navigator.vibrate) navigator.vibrate(10); setActiveTab('methods'); }}
            className={`flex-1 py-2 text-[clamp(14px,4cqw,16px)] tracking-widest rounded-lg transition-all duration-300 ${
              activeTab === 'methods' ? 'bg-[#1A1F2E] text-white shadow-md border border-white/10' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            功法傳承
          </button>
          <button
            onClick={() => { if (navigator.vibrate) navigator.vibrate(10); setActiveTab('artifacts'); }}
            className={`flex-1 py-2 text-[clamp(14px,4cqw,16px)] tracking-widest rounded-lg transition-all duration-300 ${
              activeTab === 'artifacts' ? 'bg-[#1A1F2E] text-white shadow-md border border-white/10' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            法器武裝
          </button>
        </div>
      </div>

      {/* =========================================
          2. 主要內容區 (加上 flex-grow 填滿剩下的所有空間)
          ========================================= */}
      <div className="flex-grow overflow-y-auto no-scrollbar px-[6cqw] pb-[30cqw]">
        
        {/* 視圖 A：功法傳承 */}
        {activeTab === 'methods' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            {/* 主功法 */}
            <div>
              <h3 className="text-[#FFD700]/80 text-[12px] tracking-[0.5em] mb-3 flex items-center gap-2">
                <span className="w-8 h-[1px] bg-[#FFD700]/30"></span> 丹田主修 <span className="flex-grow h-[1px] bg-[#FFD700]/30"></span>
              </h3>
              <MethodCard 
                type="主功法" 
                item={methods.main} 
                onClick={() => handleOpenSheet('main')} 
                onRemove={(e) => { e.stopPropagation(); handleUnequipMethod('main'); }} 
                theme="gold"
              />
            </div>

            {/* 副功法 */}
            <div>
              <h3 className="text-[#00E5FF]/80 text-[12px] tracking-[0.5em] mb-3 flex items-center gap-2">
                <span className="w-8 h-[1px] bg-[#00E5FF]/30"></span> 輔助副修 <span className="flex-grow h-[1px] bg-[#00E5FF]/30"></span>
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <MethodCard 
                  type="副功法 壹" 
                  item={methods.sub1} 
                  onClick={() => handleOpenSheet('sub1')} 
                  onRemove={(e) => { e.stopPropagation(); handleUnequipMethod('sub1'); }} 
                  theme="cyan"
                />
                <MethodCard 
                  type="副功法 貳" 
                  item={methods.sub2} 
                  onClick={() => handleOpenSheet('sub2')} 
                  onRemove={(e) => { e.stopPropagation(); handleUnequipMethod('sub2'); }} 
                  theme="cyan"
                />
              </div>
            </div>
          </div>
        )}

        {/* 視圖 B：法器武裝 */}
        {activeTab === 'artifacts' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            
            {/* 神識負載監控 */}
            <div className="bg-black/60 backdrop-blur-md border border-white/5 p-4 rounded-xl shadow-lg">
              <div className="flex justify-between items-end mb-2">
                <span className="text-[clamp(12px,3.5cqw,16px)] text-[#FFD700] tracking-widest opacity-90">識海承載</span>
                <span className={`font-mono text-[clamp(16px,4.5cqw,20px)] ${isOverloaded ? 'text-[#FF3B30] animate-pulse drop-shadow-[0_0_5px_#FF3B30]' : 'text-[#FFD700] drop-shadow-[0_0_5px_rgba(255,215,0,0.5)]'}`}>
                  {currentGodSenseLoad} <span className="text-sm text-gray-400">/ {maxGodSense}</span>
                </span>
              </div>
              <div className="h-[8px] bg-[#1C1F2A] rounded-full overflow-hidden border border-white/5">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${isOverloaded ? 'bg-[#FF3B30] shadow-[0_0_10px_#FF3B30]' : 'bg-gradient-to-r from-[#FFD700]/50 to-[#FFD700] shadow-[0_0_10px_#FFD700]'}`}
                  style={{ width: `${Math.min(100, (currentGodSenseLoad / maxGodSense) * 100)}%` }}
                ></div>
              </div>
              {isOverloaded && <p className="text-[#FF3B30] text-[10px] mt-2 tracking-widest text-center">神識不濟，恐遭反噬，請卸下部分法器！</p>}
            </div>

            {/* 符籙配置區 */}
            <div>
              <h3 className="text-purple-400/80 text-[12px] tracking-[0.5em] mb-3 flex items-center gap-2">
                <span className="w-8 h-[1px] bg-purple-500/30"></span> 符籙儲備 <span className="flex-grow h-[1px] bg-purple-500/30"></span>
              </h3>
              
              {!equippedTalisman.item ? (
                <div 
                  onClick={() => handleOpenSheet('talisman')}
                  className="w-full py-4 rounded-xl border border-dashed border-purple-500/30 text-purple-400/50 flex flex-col items-center justify-center cursor-pointer hover:bg-purple-500/10 hover:border-purple-500/60 active:scale-95 transition-all backdrop-blur-sm bg-black/20"
                >
                  <span className="text-2xl mb-1">+</span>
                  <span className="text-[12px] tracking-widest">挑選出戰符籙</span>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-[#1C1F2A]/90 to-[#151821]/90 backdrop-blur-sm border border-purple-500/30 rounded-xl p-4 shadow-[inset_0_0_15px_rgba(168,85,247,0.05)] relative overflow-hidden">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 text-lg">符</div>
                      <div>
                        <h4 className="text-[16px] text-white tracking-widest font-bold">{equippedTalisman.item.name}</h4>
                        <span className="text-[10px] text-[#FFD700] font-mono tracking-widest bg-[#FFD700]/10 px-1.5 rounded border border-[#FFD700]/20">
                          單張消耗神識 {equippedTalisman.item.cost}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* 數量控制器 */}
                  <div className="flex items-center justify-between bg-black/60 rounded-lg p-2 border border-white/5">
                    <span className="text-gray-400 text-[12px] tracking-widest ml-2">攜帶數量</span>
                    <div className="flex items-center gap-4 bg-[#11141D] rounded-lg px-2 py-1 border border-white/10">
                      <button onClick={() => updateTalismanCount(-1)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white active:scale-90 bg-white/5 rounded">-</button>
                      <span className="font-mono text-white text-[16px] w-6 text-center">{equippedTalisman.count}</span>
                      <button onClick={() => updateTalismanCount(1)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white active:scale-90 bg-white/5 rounded">+</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 法器配置區 (動態陣列) */}
            <div>
              <h3 className="text-[#00E5FF]/80 text-[12px] tracking-[0.5em] mb-3 flex items-center gap-2">
                <span className="w-8 h-[1px] bg-[#00E5FF]/30"></span> 蘊養法器 <span className="flex-grow h-[1px] bg-[#00E5FF]/30"></span>
              </h3>
              
              <div className="flex flex-col gap-3">
                {equippedArtifacts.map((artifact, index) => (
                  <ArtifactListItem key={`${artifact.id}-${index}`} item={artifact} onRemove={() => handleRemoveArtifact(index)} />
                ))}
                
                {/* 隨意新增按鈕 */}
                <div 
                  onClick={() => handleOpenSheet('artifact')}
                  className="w-full py-4 rounded-xl border border-dashed border-[#00E5FF]/30 text-[#00E5FF]/50 flex items-center justify-center gap-2 cursor-pointer hover:bg-[#00E5FF]/10 hover:border-[#00E5FF]/60 active:scale-95 transition-all backdrop-blur-sm bg-black/20"
                >
                  <span className="text-xl">+</span>
                  <span className="text-[13px] tracking-widest">祭出法器</span>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* =========================================
          3. 底部玉簡彈窗 (藏經閣/法寶庫資料閱覽)
          ========================================= */}
      <div 
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity duration-300 ${activeSlot ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setActiveSlot(null)}
      ></div>

      <div 
        className={`absolute bottom-0 left-0 right-0 bg-[#11141D] rounded-t-3xl border-t border-white/10 shadow-[0_-10px_50px_rgba(0,0,0,0.8)] z-50 transition-transform duration-500 cubic-bezier(0.2, 0.8, 0.2, 1) flex flex-col max-h-[80vh] min-h-[50vh] ${activeSlot ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="w-full flex justify-center pt-4 pb-3 shrink-0 cursor-pointer" onClick={() => setActiveSlot(null)}>
          <div className="w-12 h-1.5 bg-gray-600 rounded-full"></div>
        </div>

        <div className="px-6 pb-4 border-b border-white/5 shrink-0 text-center">
          <h3 className="text-[18px] tracking-[0.3em] text-white font-bold">
            閱覽玉簡
          </h3>
        </div>

        <div className="flex-grow overflow-y-auto px-6 py-4 flex flex-col gap-4 no-scrollbar pb-[calc(env(safe-area-inset-bottom,20px)+20px)]">
          {getAvailableItems().length === 0 ? (
            <div className="text-center text-gray-500 py-10 tracking-widest">空空如也</div>
          ) : (
            getAvailableItems().map(item => {
              let isEquipped = false;
              if (activeSlot === 'main') isEquipped = methods.main?.id === item.id;
              if (activeSlot === 'sub1') isEquipped = methods.sub1?.id === item.id;
              if (activeSlot === 'sub2') isEquipped = methods.sub2?.id === item.id;
              if (activeSlot === 'talisman') isEquipped = equippedTalisman.item?.id === item.id;

              return (
                <div 
                  key={item.id}
                  onClick={() => handleEquip(item)}
                  className={`relative flex flex-col p-4 rounded-xl border cursor-pointer active:scale-95 transition-all bg-[#1A1F2E] hover:bg-[#252A38] ${isEquipped ? 'border-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.2)]' : 'border-white/5'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[16px] tracking-widest font-bold text-gray-200">{item.name}</span>
                    <div className="flex flex-col items-end gap-1">
                      {item.level && <span className="text-[10px] text-[#00E5FF] border border-[#00E5FF]/30 bg-[#00E5FF]/10 px-1.5 rounded">{item.level}</span>}
                      {item.cost > 0 && <span className="text-[12px] text-[#FFD700] font-mono tracking-widest bg-[#FFD700]/10 px-1.5 rounded border border-[#FFD700]/20">神識 {item.cost}</span>}
                    </div>
                  </div>
                  
                  <div className="bg-black/30 p-3 rounded-lg border border-white/5 mb-2">
                    <p className="text-[13px] text-gray-300 leading-relaxed tracking-wider">
                      {item.desc}
                    </p>
                  </div>

                  {item.drain && (
                    <div className="text-[11px] text-[#00E5FF] tracking-widest inline-block self-start">
                      ⚡ 每次發動消耗 {item.drain} 靈力
                    </div>
                  )}
                  
                  {isEquipped && activeSlot !== 'artifact' && (
                    <div className="absolute top-0 right-0 w-0 h-0 border-t-[36px] border-t-[#00E5FF] border-l-[36px] border-l-transparent rounded-tr-xl">
                      <span className="absolute -top-[30px] -left-[14px] text-[12px] text-black font-bold rotate-45">✓</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      
    </div>
  );
}

// =========================================
// 共用元件：功法卡片 (大尺寸/中等尺寸)
// ==========================================
function MethodCard({ type, item, onClick, onRemove, theme }) {
  const isMain = type === '主功法';
  const color = theme === 'gold' ? '#FFD700' : '#00E5FF';
  const shadowColor = theme === 'gold' ? 'rgba(255,215,0,0.3)' : 'rgba(0,229,255,0.2)';

  return (
    <div 
      onClick={onClick}
      // 🌟 修復 Tailwind 動態 Class 無法讀取的問題，改用 style 注入邊框顏色
      className={`relative flex flex-col p-4 rounded-xl border cursor-pointer active:scale-95 transition-all overflow-hidden group 
        ${item ? `bg-[#1A1F2E]/90 backdrop-blur-sm` : 'bg-black/20 backdrop-blur-sm border-dashed border-white/20 hover:border-white/40'}
        ${isMain ? 'min-h-[120px]' : 'min-h-[100px]'}
      `}
      style={item ? { borderColor: `${color}66`, boxShadow: `inset 0 0 20px ${shadowColor}` } : {}}
    >
      <span className="text-[10px] text-gray-500 tracking-[0.3em] absolute top-3 left-4">{type}</span>
      
      {item ? (
        <div className="mt-5 w-full flex flex-col h-full justify-between">
          <div className="flex justify-between items-start">
            <span className={`text-[clamp(16px,4.5cqw,20px)] tracking-widest font-bold`} style={{ color, textShadow: `0 0 8px ${shadowColor}` }}>
              {item.name}
            </span>
            {item.level && <span className="text-[10px] text-gray-400 bg-black/40 px-1.5 py-0.5 rounded border border-white/10">{item.level}</span>}
          </div>
          {isMain && (
            <p className="text-[12px] text-gray-400 mt-2 line-clamp-2 tracking-wider leading-relaxed bg-black/30 p-2 rounded-lg border border-white/5">
              {item.desc}
            </p>
          )}
          
          {/* 卸下按鈕 */}
          <button 
            onClick={onRemove}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/40 text-gray-500 flex items-center justify-center border border-transparent hover:border-[#FF3B30] hover:text-[#FF3B30] transition-colors z-10"
          >
            ×
          </button>
        </div>
      ) : (
        <div className="flex-grow flex items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity mt-2">
          <span className="text-3xl font-thin mb-1 mr-2">+</span>
          <span className="text-[12px] tracking-widest text-gray-300">參悟{type}</span>
        </div>
      )}
    </div>
  );
}

// =========================================
// 共用元件：法器列表項目 (動態陣列用)
// ==========================================
function ArtifactListItem({ item, onRemove }) {
  return (
    <div className="relative flex items-center p-3 rounded-xl border border-[#00E5FF]/20 bg-gradient-to-r from-[#1A1F2E]/90 to-[#11141D]/90 backdrop-blur-sm shadow-[inset_0_0_10px_rgba(0,229,255,0.05)] group">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center mr-3 shrink-0 bg-[#00E5FF]/10 border border-[#00E5FF]/30 shadow-[0_0_8px_rgba(0,229,255,0.2)]">
        <span className="text-white text-lg">法</span>
      </div>
      
      <div className="flex-grow flex flex-col justify-center overflow-hidden">
        <div className="flex justify-between items-center w-full mb-1">
          <span className="text-[15px] text-white tracking-widest font-bold truncate">{item.name}</span>
          <span className="text-[11px] text-[#FFD700] font-mono shrink-0 ml-2">神識 {item.cost}</span>
        </div>
        <div className="text-[10px] text-[#00E5FF] tracking-widest opacity-80 truncate">
          {item.desc}
        </div>
      </div>

      <button 
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="ml-3 w-8 h-8 rounded-full bg-[#FF3B30]/10 text-[#FF3B30] flex items-center justify-center border border-[#FF3B30]/30 hover:bg-[#FF3B30]/20 hover:scale-110 active:scale-90 transition-all shrink-0"
      >
        ×
      </button>
    </div>
  );
}
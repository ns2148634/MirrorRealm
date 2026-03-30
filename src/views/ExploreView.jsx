// src/views/ExploreView.jsx
import React, { useState, useRef } from 'react';
import useGameStore from '../store/gameStore';

// ==========================================
// 1. 實體機緣字典 (可互動的事件點)
// ==========================================
const POI_MAPPING = {
  'convenience': { name: '修真坊市', color: '#FFD700', glow: 'rgba(255,215,0,0.6)', type: 'shop' }, 
  'place_of_worship': { name: '前輩遺物', color: '#9B5CFF', glow: 'rgba(155,92,255,0.6)', type: 'ruin' }, 
  'default': { name: '低階妖獸', color: '#FF3B30', glow: 'rgba(255,59,48,0.6)', type: 'beast' }     
};

// ==========================================
// 2. 風水靈脈字典 (背景地形光暈)
// ==========================================
const TERRAIN_MAPPING = {
  'water': { type: '水脈', color: '#00E5FF', size: 'w-[40cqw] h-[40cqw]', animation: 'animate-[pulse_4s_infinite]' },
  'forest': { type: '靈林', color: '#32D74B', size: 'w-[50cqw] h-[50cqw]', animation: 'animate-[pulse_6s_infinite]' },
  'peak': { type: '龍脈', color: '#B8860B', size: 'w-[30cqw] h-[30cqw]', animation: 'animate-[pulse_8s_infinite]' },
  'station': { type: '金脈', color: '#E2E8F0', size: 'w-[45cqw] h-[45cqw]', animation: 'animate-[pulse_3s_infinite]' },
  'commercial': { type: '業火', color: '#FF3B30', size: 'w-[55cqw] h-[55cqw]', animation: 'animate-[pulse_5s_infinite]' }
};

export default function ExploreView() {
  const player = useGameStore((state) => state.player);
  const reduceEp = useGameStore((state) => state.reduceEp); 
  
  // 🌟 狀態機
  const [isScanning, setIsScanning] = useState(false);
  const [isTuning, setIsTuning] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  
  const [events, setEvents] = useState([]); 
  const [terrains, setTerrains] = useState([]); 
  const [message, setMessage] = useState('凝神聚氣，外放神識');

  // 🌟 長按法訣所需的神識指針
  const pressTimer = useRef(null);
  const pressStartTime = useRef(null);

  // ==========================================
  // 3. 長按與點擊互動邏輯 (按一下探索，長按調息)
  // ==========================================
  const handlePointerDown = (e) => {
    e.preventDefault();
    if (isScanning) return; // 探靈中不可干擾
    
    pressStartTime.current = Date.now();
    setIsPressing(true);
    if (navigator.vibrate) navigator.vibrate(10); // 輕微觸發震動
    
    // 啟動三秒入定倒數
    pressTimer.current = setTimeout(() => {
      setIsTuning((prev) => {
        const nextState = !prev; // 切換調息狀態
        setMessage(nextState ? '凝神入定，滙集天地靈氣' : '凝神聚氣，外放神識');
        return nextState;
      });
      setIsPressing(false);
      if (navigator.vibrate) navigator.vibrate([50, 50, 150]); // 入定成功長震動
    }, 3000);
  };

  const handlePointerUp = (e) => {
    e.preventDefault();
    if (!pressStartTime.current) return;
    
    const duration = Date.now() - pressStartTime.current;
    
    // 中斷長按計時
    clearTimeout(pressTimer.current);
    pressTimer.current = null;
    pressStartTime.current = null;
    setIsPressing(false);
    
    // 判斷為短按 (小於 500ms)
    if (duration < 500) {
      if (isTuning) {
        // 如果正在調息，短按則中斷調息
        setIsTuning(false);
        setMessage('凝神聚氣，外放神識');
        if (navigator.vibrate) navigator.vibrate(15);
      } else {
        // 如果未在調息，短按則發動探靈
        handleScan();
      }
    }
  };

  // ==========================================
  // 4. 尋龍探靈邏輯 (真實地圖抓取)
  // ==========================================
  const handleScan = () => {
    if (player.ep < 10) {
      setMessage('精力不足，無法外放神識');
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]); 
      return;
    }

    if (reduceEp) reduceEp(10);
    setIsScanning(true);
    setEvents([]); 
    setTerrains([]); 
    setMessage('神識牽引天地，搜尋周遭...');
    if (navigator.vibrate) navigator.vibrate(15); 

    if (!navigator.geolocation) {
      fallbackScan();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const query = `
            [out:json];
            (
              node["shop"="convenience"](around:600, ${latitude}, ${longitude});
              node["amenity"="place_of_worship"](around:600, ${latitude}, ${longitude});
              
              way["natural"="water"](around:800, ${latitude}, ${longitude});
              way["waterway"](around:800, ${latitude}, ${longitude});
              way["landuse"="forest"](around:800, ${latitude}, ${longitude});
              way["leisure"="park"](around:800, ${latitude}, ${longitude});
              node["natural"="peak"](around:800, ${latitude}, ${longitude});
              way["railway"="station"](around:800, ${latitude}, ${longitude});
              way["landuse"="commercial"](around:800, ${latitude}, ${longitude});
            );
            out center; 
          `;
          
          const res = await fetch(`https://overpass-api.de/api/interpreter`, { method: 'POST', body: query });
          const data = await res.json();
          const maxDegreeRadius = 0.0055; 

          let newEvents = [];
          let newTerrains = [];

          data.elements.forEach(el => {
            const tags = el.tags || {};
            const objLat = el.lat || el.center?.lat;
            const objLon = el.lon || el.center?.lon;
            if (!objLat || !objLon) return;

            let topPct = 50 + ((latitude - objLat) / maxDegreeRadius) * 40;
            let leftPct = 50 + ((objLon - longitude) / maxDegreeRadius) * 40;

            if (tags.natural === 'water' || tags.waterway) newTerrains.push({ id: el.id, ...TERRAIN_MAPPING['water'], top: `${topPct}%`, left: `${leftPct}%` });
            else if (tags.landuse === 'forest' || tags.leisure === 'park') newTerrains.push({ id: el.id, ...TERRAIN_MAPPING['forest'], top: `${topPct}%`, left: `${leftPct}%` });
            else if (tags.natural === 'peak') newTerrains.push({ id: el.id, ...TERRAIN_MAPPING['peak'], top: `${topPct}%`, left: `${leftPct}%` });
            else if (tags.railway === 'station') newTerrains.push({ id: el.id, ...TERRAIN_MAPPING['station'], top: `${topPct}%`, left: `${leftPct}%` });
            else if (tags.landuse === 'commercial') newTerrains.push({ id: el.id, ...TERRAIN_MAPPING['commercial'], top: `${topPct}%`, left: `${leftPct}%` });
            else {
              if (topPct < 5 || topPct > 95 || leftPct < 5 || leftPct > 95) return;
              let mapping = POI_MAPPING['default'];
              if (tags.shop === 'convenience') mapping = POI_MAPPING['convenience'];
              else if (tags.amenity === 'place_of_worship') mapping = POI_MAPPING['place_of_worship'];
              newEvents.push({ id: el.id, name: tags.name ? `${mapping.name}(${tags.name.substring(0,2)})` : mapping.name, ...mapping, top: `${topPct}%`, left: `${leftPct}%` });
            }
          });

          if (newEvents.length === 0) newEvents = fallbackEvents();

          setEvents(newEvents.slice(0, 8));
          setTerrains(newTerrains.slice(0, 5)); 
          
          setIsScanning(false);
          setMessage('探尋完畢，風水盡收眼底');
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]); 

        } catch (error) {
          console.error('API 錯誤', error);
          fallbackScan(); 
        }
      },
      (error) => {
        console.error('GPS 錯誤', error);
        fallbackScan(); 
      },
      { timeout: 10000 }
    );
  };

  const fallbackScan = () => {
    setMessage('天地法則混亂，以模擬神識探索...');
    setTimeout(() => {
      setEvents(fallbackEvents());
      setTerrains([
        { id: 't1', ...TERRAIN_MAPPING['water'], top: '30%', left: '70%' },
        { id: 't2', ...TERRAIN_MAPPING['forest'], top: '70%', left: '20%' },
      ]);
      setIsScanning(false);
      setMessage('探尋完畢，風水盡收眼底');
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]); 
    }, 2000);
  };

  const fallbackEvents = () => {
    return Array.from({ length: Math.floor(Math.random() * 3) + 2 }).map((_, i) => ({
      id: `mock-${i}`,
      ...Object.values(POI_MAPPING)[Math.floor(Math.random() * 3)],
      top: `${Math.floor(Math.random() * 70 + 15)}%`, left: `${Math.floor(Math.random() * 70 + 15)}%`,
    }));
  };

  return (
    <div className="h-full w-full relative flex items-center justify-center overflow-hidden bg-transparent">      
      
      {/* 🌟 CSS 動畫法則 */}
      <style>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translate(-50%, -50%) translateY(0); }
          50% { transform: translate(-50%, -50%) translateY(-10px); }
        }
        .animate-[bounce-subtle_2s_infinite] { animation: bounce-subtle 2s ease-in-out infinite; }

        /* 🌟 新增：向內收(Converging)的聚氣動畫 */
        @keyframes converge-glow {
          0% { transform: scale(1.8); opacity: 0; filter: blur(10px); }
          30% { opacity: 0.8; }
          100% { transform: scale(0.3); opacity: 0; filter: blur(2px); }
        }
        .animate-converge { animation: converge-glow 2s cubic-bezier(0.4, 0, 0.2, 1) infinite; }

        /* 長按的進度條動畫 */
        @keyframes charge-up {
          from { width: 0%; }
          to { width: 100%; }
        }
        .animate-charge { animation: charge-up 3s linear forwards; }
      `}</style>

      {/* 1. 底層風水地形光暈 */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {terrains.map((terrain) => (
          <div 
            key={terrain.id}
            className={`absolute rounded-[40%] blur-[30px] opacity-20 mix-blend-screen transition-all duration-1000 ${terrain.size} ${terrain.animation}`}
            style={{ top: terrain.top, left: terrain.left, backgroundColor: terrain.color, transform: 'translate(-50%, -50%) rotate(15deg)' }}
          ></div>
        ))}
      </div>

      {/* 2. 掃描到的事件節點 */}
      {events.map((ev) => (
        <div 
          key={ev.id} 
          className="absolute flex flex-col items-center justify-center cursor-pointer group z-20 transition-all duration-700 ease-out animate-[bounce-subtle_2s_infinite]"
          style={{ top: ev.top, left: ev.left }}
          onClick={(e) => { e.stopPropagation(); if (navigator.vibrate) navigator.vibrate(10); alert(`你靠近了：${ev.name}`); }}
        >
          <div className="relative flex items-center justify-center translate-y-[-50%]">
            <div className="absolute w-8 h-8 rounded-full animate-ping opacity-40" style={{ backgroundColor: ev.color }}></div>
            <div className="w-4 h-4 rounded-full relative z-10" style={{ backgroundColor: ev.color, boxShadow: `0 0 15px ${ev.glow}, 0 0 30px ${ev.glow}` }}></div>
          </div>
          <span className="mt-2 text-[10px] sm:text-[12px] tracking-widest text-white/90 drop-shadow-[0_0_8px_rgba(0,0,0,1)] bg-black/40 px-2 py-0.5 rounded border border-white/10 group-hover:scale-110 transition-transform">
            {ev.name}
          </span>
        </div>
      ))}

      {/* =========================================
          3. 中央探靈陣盤 (長按/點擊交互核心)
          ========================================= */}
      <div 
        className={`relative flex flex-col items-center justify-center cursor-pointer transition-transform duration-500 z-30 
          ${isScanning ? 'scale-110' : isPressing ? 'scale-90' : isTuning ? 'scale-100' : 'hover:scale-105 active:scale-95'}
        `}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()} // 防止手機長按跳出選單
      >
        
        {/* 🌟 探靈向外擴散的光暈 */}
        {isScanning && (
          <div className="absolute w-[350px] h-[350px] border-[2px] border-[#00E5FF] rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-30 pointer-events-none"></div>
        )}

        {/* 🌟 調息向內收縮的光暈 (Converging) */}
        {isTuning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute w-[300px] h-[300px] border-[2px] border-[#00E5FF] rounded-full animate-converge opacity-60"></div>
            <div className="absolute w-[300px] h-[300px] border-[1px] border-[#00E5FF] rounded-full animate-converge opacity-30" style={{ animationDelay: '1s' }}></div>
          </div>
        )}
        
        {/* 外圍雙層陣紋環 */}
        <div className={`absolute w-[240px] h-[240px] border-[1px] border-dashed rounded-full transition-colors duration-500 pointer-events-none ${isScanning || isTuning ? 'border-[#00E5FF] animate-[spin_8s_linear_infinite_reverse]' : 'border-[#00E5FF]/20 animate-[spin_40s_linear_infinite_reverse]'}`}></div>
        <div className={`absolute w-[180px] h-[180px] border-[0.5px] rounded-full transition-all duration-500 pointer-events-none ${isScanning || isTuning ? 'border-[#00E5FF] opacity-60 animate-[spin_4s_linear_infinite]' : 'border-[#00E5FF] opacity-20 animate-[spin_60s_linear_infinite]'}`}>
          <div className="absolute top-[-2px] left-1/2 w-1 h-2 bg-[#00E5FF] -translate-x-1/2 drop-shadow-[0_0_5px_rgba(0,229,255,1)]"></div>
          <div className="absolute bottom-[-2px] left-1/2 w-1 h-2 bg-[#00E5FF] -translate-x-1/2 opacity-50"></div>
          <div className="absolute left-[-2px] top-1/2 w-2 h-1 bg-[#00E5FF] -translate-y-1/2 opacity-50"></div>
          <div className="absolute right-[-2px] top-1/2 w-2 h-1 bg-[#00E5FF] -translate-y-1/2 opacity-50"></div>
        </div>

        {/* 核心菱形陣眼 */}
        <div className={`w-[80px] h-[80px] rounded-full flex flex-col items-center justify-center transition-all duration-1000 ${isScanning || isTuning ? 'shadow-[0_0_50px_rgba(0,229,255,0.8)] bg-[#00E5FF]/30 backdrop-blur-md' : 'shadow-[0_0_20px_rgba(0,229,255,0.15)] bg-[#0A0C10]/80 backdrop-blur-sm'}`}>
          <div className={`w-[40px] h-[40px] border-[2px] rounded-sm rotate-45 transition-colors duration-500 ${(isScanning || isTuning) ? 'border-white animate-[spin_1s_linear_infinite]' : 'border-[#00E5FF] opacity-80 animate-[pulse_3s_ease-in-out_infinite]'}`}></div>
        </div>

        {/* 🌟 說明文字 (放置於菱形圓的下方) */}
        <div className="absolute top-[90px] flex flex-col items-center pointer-events-none whitespace-nowrap z-40">
          {isTuning ? (
             <span className="text-[14px] text-white tracking-[0.3em] font-bold drop-shadow-[0_0_8px_#00E5FF]">調息中</span>
          ) : isScanning ? (
             <span className="text-[12px] text-[#00E5FF] tracking-[0.3em] font-bold drop-shadow-[0_0_5px_currentColor]">神識外放中</span>
          ) : (
             <>
               <span className="text-[11px] text-[#00E5FF] tracking-widest drop-shadow-md">點擊探靈 <span className="text-[9px] opacity-80">(-10精力)</span></span>
               <span className="text-[10px] text-gray-400 tracking-widest opacity-70 mt-1">長按三秒調息</span>
               
               {/* 長按期間的充能進度條 */}
               {isPressing && (
                 <div className="w-16 h-1 bg-black/50 border border-white/20 rounded-full mt-2 overflow-hidden">
                   <div className="h-full bg-[#00E5FF] animate-charge shadow-[0_0_5px_#00E5FF]"></div>
                 </div>
               )}
             </>
          )}
        </div>

      </div>

      {/* 底部狀態提示文字 */}
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom,20px)+40px)] bg-black/60 backdrop-blur-sm px-6 py-2 rounded-full border border-[#00E5FF]/20 text-[#00E5FF] text-[clamp(12px,4cqw,16px)] tracking-[8px] opacity-90 font-light shadow-[0_0_15px_rgba(0,229,255,0.1)] transition-all duration-300 z-30 pointer-events-none">
        {message}
      </div>
    </div>
  );
}
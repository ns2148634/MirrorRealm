// src/views/ExploreView.jsx
import React, { useState } from 'react';
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
  'water': { type: '水脈', color: '#00E5FF', size: 'w-[40cqw] h-[40cqw]', animation: 'animate-[pulse_4s_infinite]' }, // 水
  'forest': { type: '靈林', color: '#32D74B', size: 'w-[50cqw] h-[50cqw]', animation: 'animate-[pulse_6s_infinite]' }, // 木
  'peak': { type: '龍脈', color: '#B8860B', size: 'w-[30cqw] h-[30cqw]', animation: 'animate-[pulse_8s_infinite]' },   // 土
  'station': { type: '金脈', color: '#E2E8F0', size: 'w-[45cqw] h-[45cqw]', animation: 'animate-[pulse_3s_infinite]' }, // 金 (車站/鐵路，銀白色)
  'commercial': { type: '業火', color: '#FF3B30', size: 'w-[55cqw] h-[55cqw]', animation: 'animate-[pulse_5s_infinite]' } // 火 (商業區，赤紅色)
};

export default function ExploreView() {
  const player = useGameStore((state) => state.player);
  const reduceEp = useGameStore((state) => state.reduceEp); 
  
  const [isScanning, setIsScanning] = useState(false);
  const [events, setEvents] = useState([]); 
  const [terrains, setTerrains] = useState([]); // 🌟 新增：存放地形靈脈資料
  const [message, setMessage] = useState('凝神聚氣，外放神識');

  // ==========================================
  // 3. 尋龍探靈邏輯 (GPS + Overpass API)
  // ==========================================
  const handleScan = () => {
    if (isScanning) return;
    
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
          // 🌟 陣法升級：同時尋找節點(node)與區域(way)，並使用 out center 獲取中心點
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
              
              /* 🌟 新增：掃描車站與商業區 */
              way["railway"="station"](around:800, ${latitude}, ${longitude});
              way["landuse"="commercial"](around:800, ${latitude}, ${longitude});
            );
            out center; 
          `;
          
          const res = await fetch(`https://overpass-api.de/api/interpreter`, {
            method: 'POST',
            body: query
          });
          
          const data = await res.json();
          const maxDegreeRadius = 0.0055; 

          let newEvents = [];
          let newTerrains = [];

          data.elements.forEach(el => {
            const tags = el.tags || {};
            
            // 🌟 提取座標 (如果是 way 區域，Overpass 會把座標放在 center 屬性裡)
            const objLat = el.lat || el.center?.lat;
            const objLon = el.lon || el.center?.lon;
            if (!objLat || !objLon) return;

            // 計算螢幕百分比座標
            let topPct = 50 + ((latitude - objLat) / maxDegreeRadius) * 40;
            let leftPct = 50 + ((objLon - longitude) / maxDegreeRadius) * 40;

            // 判斷是地形還是互動事件
            if (tags.natural === 'water' || tags.waterway) {
              newTerrains.push({ id: el.id, ...TERRAIN_MAPPING['water'], top: `${topPct}%`, left: `${leftPct}%` });
            } 
            else if (tags.landuse === 'forest' || tags.leisure === 'park') {
              newTerrains.push({ id: el.id, ...TERRAIN_MAPPING['forest'], top: `${topPct}%`, left: `${leftPct}%` });
            } 
            else if (tags.natural === 'peak') {
              newTerrains.push({ id: el.id, ...TERRAIN_MAPPING['peak'], top: `${topPct}%`, left: `${leftPct}%` });
            }
            // 🌟 新增：金脈與火脈的判斷
            else if (tags.railway === 'station') {
              newTerrains.push({ id: el.id, ...TERRAIN_MAPPING['station'], top: `${topPct}%`, left: `${leftPct}%` });
            }
            else if (tags.landuse === 'commercial') {
              newTerrains.push({ id: el.id, ...TERRAIN_MAPPING['commercial'], top: `${topPct}%`, left: `${leftPct}%` });
            } 
            else {
              // 處理實體事件點 (過濾掉跑出畫面的點)
              if (topPct < 5 || topPct > 95 || leftPct < 5 || leftPct > 95) return;

              let mapping = POI_MAPPING['default'];
              if (tags.shop === 'convenience') mapping = POI_MAPPING['convenience'];
              else if (tags.amenity === 'place_of_worship') mapping = POI_MAPPING['place_of_worship'];

              newEvents.push({
                id: el.id,
                name: tags.name ? `${mapping.name}(${tags.name.substring(0,2)})` : mapping.name, 
                ...mapping,
                top: `${topPct}%`,
                left: `${leftPct}%`,
              });
            }
          });

          if (newEvents.length === 0) newEvents = fallbackEvents();

          // 限制數量避免效能問題
          setEvents(newEvents.slice(0, 8));
          setTerrains(newTerrains.slice(0, 5)); // 地形最多顯示 5 塊避免畫面太混亂
          
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
      top: `${Math.floor(Math.random() * 70 + 15)}%`, 
      left: `${Math.floor(Math.random() * 70 + 15)}%`,
    }));
  };

  return (
    <div className="h-full w-full relative flex items-center justify-center overflow-hidden bg-transparent">      
      
      {/* =========================================
          🌟 新增：底層風水地形光暈 (Z-Index: 0)
          這會在地圖的最底層渲染出一塊塊的五行靈氣區
          ========================================= */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {terrains.map((terrain) => (
          <div 
            key={terrain.id}
            className={`absolute rounded-[40%] blur-[30px] opacity-20 mix-blend-screen transition-all duration-1000 ${terrain.size} ${terrain.animation}`}
            style={{ 
              top: terrain.top, 
              left: terrain.left, 
              backgroundColor: terrain.color,
              transform: 'translate(-50%, -50%) rotate(15deg)' 
            }}
          ></div>
        ))}
      </div>

      {/* =========================================
          2. 掃描到的事件節點 (Z-Index: 20)
          ========================================= */}
      {events.map((ev) => (
        <div 
          key={ev.id} 
          className="absolute flex flex-col items-center justify-center cursor-pointer group z-20 transition-all duration-700 ease-out animate-[bounce_2s_infinite]"
          style={{ top: ev.top, left: ev.left, transform: 'translate(-50%, -50%)' }}
          onClick={(e) => { 
            e.stopPropagation(); 
            if (navigator.vibrate) navigator.vibrate(10);
            alert(`你靠近了：${ev.name}`); 
          }}
        >
          {/* 事件光點 */}
          <div className="relative flex items-center justify-center">
            <div className="absolute w-8 h-8 rounded-full animate-ping opacity-40" style={{ backgroundColor: ev.color }}></div>
            <div className="w-4 h-4 rounded-full relative z-10" style={{ backgroundColor: ev.color, boxShadow: `0 0 15px ${ev.glow}, 0 0 30px ${ev.glow}` }}></div>
          </div>
          {/* 事件文字標籤 */}
          <span className="mt-2 text-[10px] sm:text-[12px] tracking-widest text-white/90 drop-shadow-[0_0_8px_rgba(0,0,0,1)] bg-black/40 px-2 py-0.5 rounded border border-white/10 group-hover:scale-110 transition-transform">
            {ev.name}
          </span>
        </div>
      ))}

      {/* =========================================
          3. 中央探靈陣盤 (Z-Index: 30)
          ========================================= */}
      <div 
        className={`relative flex items-center justify-center cursor-pointer transition-transform duration-500 z-30 ${isScanning ? 'scale-110' : 'active:scale-95'}`}
        onClick={handleScan}
      >
        {isScanning && (
          <div className="absolute w-[350px] h-[350px] border-[2px] border-[#00E5FF] rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-30 pointer-events-none"></div>
        )}
        
        <div className={`absolute w-[240px] h-[240px] border-[1px] border-dashed rounded-full transition-colors duration-500 pointer-events-none ${isScanning ? 'border-[#00E5FF] animate-[spin_8s_linear_infinite_reverse]' : 'border-[#00E5FF]/20 animate-[spin_40s_linear_infinite_reverse]'}`}></div>
        
        <div className={`absolute w-[180px] h-[180px] border-[0.5px] rounded-full transition-all duration-500 pointer-events-none ${isScanning ? 'border-[#00E5FF] opacity-60 animate-[spin_4s_linear_infinite]' : 'border-[#00E5FF] opacity-20 animate-[spin_60s_linear_infinite]'}`}>
          <div className="absolute top-[-2px] left-1/2 w-1 h-2 bg-[#00E5FF] -translate-x-1/2 drop-shadow-[0_0_5px_rgba(0,229,255,1)]"></div>
          <div className="absolute bottom-[-2px] left-1/2 w-1 h-2 bg-[#00E5FF] -translate-x-1/2 opacity-50"></div>
          <div className="absolute left-[-2px] top-1/2 w-2 h-1 bg-[#00E5FF] -translate-y-1/2 opacity-50"></div>
          <div className="absolute right-[-2px] top-1/2 w-2 h-1 bg-[#00E5FF] -translate-y-1/2 opacity-50"></div>
        </div>

        <div className={`w-[80px] h-[80px] rounded-full flex flex-col items-center justify-center transition-all duration-1000 ${isScanning ? 'shadow-[0_0_50px_rgba(0,229,255,0.8)] bg-[#00E5FF]/30 backdrop-blur-md' : 'shadow-[0_0_20px_rgba(0,229,255,0.15)] bg-[#0A0C10]/80 backdrop-blur-sm hover:bg-[#151821]/90'}`}>
          <div className={`w-[40px] h-[40px] border-[2px] rounded-sm rotate-45 transition-colors duration-500 ${isScanning ? 'border-white animate-[spin_1s_linear_infinite]' : 'border-[#00E5FF] opacity-80 animate-[pulse_3s_ease-in-out_infinite]'}`}></div>
          {!isScanning && <span className="absolute mt-12 text-[10px] text-[#00E5FF] tracking-widest opacity-80 drop-shadow-[0_0_3px_black]">-10 精力</span>}
        </div>
      </div>

      {/* 狀態提示文字 */}
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom,20px)+40px)] bg-black/60 backdrop-blur-sm px-6 py-2 rounded-full border border-[#00E5FF]/20 text-[#00E5FF] text-[clamp(12px,4cqw,16px)] tracking-[8px] opacity-90 font-light shadow-[0_0_15px_rgba(0,229,255,0.1)] transition-all duration-300 z-30 pointer-events-none">
        {message}
      </div>
    </div>
  );
}
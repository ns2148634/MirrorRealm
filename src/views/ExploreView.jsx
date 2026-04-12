// src/views/ExploreView.jsx
import { useState, useRef, useEffect } from 'react';
import useGameStore from '../store/gameStore';
import 'maplibre-gl/dist/maplibre-gl.css';

// 非戰鬥節點探索結果顏色（戰鬥結果由全域 CombatModal 顯示）
const LOG_LINE_COLOR = {
  'reward': '#32D74B',
  'header': '#00E5FF',
  'info':   '#9CA3AF',
};

// 節點類型 → 顯示配色（凡人期 + 修仙期統一）
const NODE_TYPE_MAPPING = {
  // ── 凡人期 ────────────────────────────────────────────────────────
  '勞作': { color: '#A0855B', glow: 'rgba(160,133,91,0.6)',   type: 'labor'    },
  '見聞': { color: '#7EC8E3', glow: 'rgba(126,200,227,0.6)',  type: 'observe'  },
  '衝突': { color: '#FF9500', glow: 'rgba(255,149,0,0.6)',    type: 'conflict' },
  // ── 修仙期 ────────────────────────────────────────────────────────
  '妖獸': { color: '#FF3B30', glow: 'rgba(255,59,48,0.6)',    type: 'beast'    },
  '機緣': { color: '#9B5CFF', glow: 'rgba(155,92,255,0.6)',   type: 'chance'   },
  // ── 通用 ──────────────────────────────────────────────────────────
  '拾荒': { color: '#FFD700', glow: 'rgba(255,215,0,0.6)',    type: 'scavenge' },
  '勞動': { color: '#FFD700', glow: 'rgba(255,215,0,0.6)',    type: 'labor2'   },
  '戰鬥': { color: '#FF3B30', glow: 'rgba(255,59,48,0.6)',    type: 'combat'   },
  '靈泉': { color: '#00E5FF', glow: 'rgba(0,229,255,0.7)',    type: 'spring'   },
  '道友': { color: '#C084FC', glow: 'rgba(192,132,252,0.6)',  type: 'player'   },
};


// 危險等級對應全畫面氣氛底色
const ZONE_ATMOSPHERE = {
  safe:    'rgba(0, 229, 255, 0.06)',
  mid:     'rgba(255, 200, 0, 0.10)',
  danger:  'rgba(255, 80, 0, 0.14)',
  extreme: 'rgba(200, 0, 0, 0.20)',
};

// 地圖底層樣式（純街道形狀，不含標籤）
// 地圖底層樣式（純街道形狀，不含標籤）
// 地圖底層樣式（CartoDB 暗黑無字版街景）
const MAP_STYLE = {
  version: 8,
  sources: {
    carto: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
        'https://d.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors © CARTO',
    },
  },
  layers: [
    {
      // 🌟 新增：純黑底色層。確保就算網路慢，也能立刻遮蔽底下的青色網格
      id: 'bg',
      type: 'background',
      paint: { 'background-color': '#05070a' } 
    },
    { 
      id: 'carto', 
      type: 'raster', 
      source: 'carto', 
      paint: { 'raster-opacity': 0.8 } // 0.8 微透，讓它完美融入賽博氛圍
    }
  ],
};


// ── 教學第1步：固定 mock 節點 ─────────────────────────────────
const TUTORIAL_MOCK_NODES = [
  {
    id:          'tut-node-1',
    name:        '破銅爛鐵',
    description: '廢棄的金屬碎片，散發微弱靈氣，可用於鑄煉法器。',
    nodeType:    '拾荒',
    cost:        { sp: 5, hp: 0 },
    isAmbush:    false,
    top:         '38%',
    left:        '42%',
    ...NODE_TYPE_MAPPING['拾荒'],
  },
  {
    id:          'tut-node-2',
    name:        '散碎銀兩',
    description: '遺落在地的零散銀錢，雖不多，但聊勝於無。',
    nodeType:    '拾荒',
    cost:        { sp: 3, hp: 0 },
    isAmbush:    false,
    top:         '62%',
    left:        '60%',
    ...NODE_TYPE_MAPPING['拾荒'],
  },
];

export default function ExploreView() {
  const player          = useGameStore((state) => state.player);
  const reduceEp        = useGameStore((state) => state.reduceEp);
  const isMeditating    = useGameStore((state) => state.isMeditating);
  const setMeditating   = useGameStore((state) => state.setMeditating);
  const triggerCombat   = useGameStore((state) => state.triggerCombat);
  const isTutorial      = useGameStore((state) => state.isTutorial);
  const tutorialStep    = useGameStore((state) => state.tutorialStep);
  const advanceTutorial = useGameStore((state) => state.advanceTutorial);

  const [isScanning, setIsScanning] = useState(false);
  const [isTuning,   setIsTuning]   = useState(false);
  const [isPressing, setIsPressing] = useState(false);

  const [events,      setEvents]      = useState([]);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [message,     setMessage]     = useState('凝神聚氣，外放神識');
  const [zoneTier, setZoneTier] = useState(null); // safe | mid | danger | extreme

  const [activeModal, setActiveModal] = useState(null);

  const pressTimer     = useRef(null);
  const pressStartTime = useRef(null);
  const mapRef         = useRef(null);
  const mapContainerRef = useRef(null);
  const playerPosRef   = useRef(null); // { lat, lng }

  // 頁面掛載/重新進入時，同步全局調息狀態到局部動畫狀態
  useEffect(() => {
    setIsTuning(isMeditating);
  }, [isMeditating]);

  // ── MapLibre 初始化（動態 import，避免手機 WebGL2 失敗崩潰）──────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    let cancelled = false;

    import('maplibre-gl').then(({ default: maplibregl }) => {
      if (cancelled || !mapContainerRef.current) return;

      const map = new maplibregl.Map({
        container:        mapContainerRef.current,
        style:            MAP_STYLE,
        center:           [121.5654, 25.0330],
        zoom:             17,
        interactive:      false,
        attributionControl: false,
      });

      map.on('load', () => {
        // CartoDB Dark Matter 本身為深色底，不需額外 filter
      });

      map.on('error', (e) => {
        console.warn('[MapLibre] 地圖錯誤:', e.error?.message ?? e);
      });

      mapRef.current = map;
    }).catch((err) => {
      console.warn('[ExploreView] MapLibre 載入失敗，略過地圖底圖:', err.message);
    });

    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  // GPS 到後置中地圖
  const centerMapOnPlayer = (lat, lng) => {
    playerPosRef.current = { lat, lng };
    mapRef.current?.setCenter([lng, lat]);
  };

  // ── 從兩點座標計算方位角（0=北，順時針）──────────────────────────
  const getBearing = (lat1, lng1, lat2, lng2) => {
    const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  };

  // ── 計算節點螢幕位置（方位角+距離 → top/left %）────────────────────
  // 最大顯示距離動態來自後端 scan_range_m，預設 300m
  const computeNodePositions = (nodes, playerLat, playerLng, scanRangeM = 300) => {
    const MAX_DIST   = scanRangeM;
    const MAX_RADIUS = 38;
    const hasGPS = playerLat != null && playerLng != null;

    return nodes.map((node, i) => {
      let angle, dist;

      if (hasGPS && node.node_lat != null && node.node_lng != null) {
        // 真實方位：從玩家座標到節點座標
        angle = getBearing(playerLat, playerLng, node.node_lat, node.node_lng);
        // Haversine 距離（直接用 getDistance 邏輯在前端計算）
        const R    = 6371000;
        const dLat = (node.node_lat - playerLat) * Math.PI / 180;
        const dLng = (node.node_lng - playerLng) * Math.PI / 180;
        const a    = Math.sin(dLat/2) ** 2 + Math.cos(playerLat * Math.PI/180) * Math.cos(node.node_lat * Math.PI/180) * Math.sin(dLng/2) ** 2;
        dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      } else {
        // Fallback：平均分散在圓周上
        angle = (i * (360 / nodes.length) + Math.random() * 40 - 20 + 360) % 360;
        dist  = 60 + Math.random() * 200;
      }

      const r   = Math.min(dist / MAX_DIST, 1) * MAX_RADIUS;
      const rad = angle * Math.PI / 180;
      const dx  =  Math.sin(rad) * r;
      const dy  = -Math.cos(rad) * r;
      const leftPct = Math.min(88, Math.max(12, 50 + dx));
      const topPct  = Math.min(82, Math.max(12, 50 + dy));
      return { ...node, top: `${topPct.toFixed(1)}%`, left: `${leftPct.toFixed(1)}%` };
    });
  };

  // ── 互動處理 ────────────────────────────────────────────────────────
  const handlePointerDown = (e) => {
    e.preventDefault();
    if (isScanning || activeModal) return;
    pressStartTime.current = Date.now();
    setIsPressing(true);
    if (navigator.vibrate) navigator.vibrate(10);
    if (isMeditating) return;

    pressTimer.current = setTimeout(() => {
      setIsPressing(false);
      if (navigator.vibrate) navigator.vibrate([50, 50, 150]);
      setIsTuning(true);
      setMeditating(true);
      setMessage('凝神入定，體力・精力・氣血回復加速...');
    }, 3000);
  };

  const handlePointerUp = (e) => {
    e.preventDefault();
    if (!pressStartTime.current) return;
    const duration = Date.now() - pressStartTime.current;
    clearTimeout(pressTimer.current);
    pressTimer.current    = null;
    pressStartTime.current = null;
    setIsPressing(false);

    if (duration < 500) {
      if (!isMeditating) handleScan();
      // 調息中短按由 PlayingStage 遮罩攔截，這裡不處理
    }
  };

  const openNodeModal = (clickedNode) => {
    // 戰鬥類節點（突襲 or 妖獸/戰鬥類型）直接進全螢幕戰鬥
    const isCombatType = clickedNode.isAmbush
      || clickedNode.nodeType === '妖獸'
      || clickedNode.nodeType === '戰鬥';
    if (isCombatType) {
      triggerCombat({
        source:   'explore',
        nodeName: clickedNode.name,
        onComplete: () => setEvents(prev => prev.filter(e => e.id !== clickedNode.id)),
      });
      return;
    }
    setActiveModal({ step: 'info', node: clickedNode });
  };

  const confirmExecuteNode = async () => {
    if (!player?.id || !activeModal?.node) return;
    try {
      setActiveModal(prev => ({ ...prev, step: 'loading' }));

      const node = activeModal.node;
      const extraOptions = {};
      if (node.nodeType === '靈泉') extraOptions.aura_amount = node.aura_amount;
      if (node.nodeType === '道友') {
        extraOptions.target_player_id = node.target_player_id;
        extraOptions.pvp_type         = activeModal.pvpType ?? 'spar';
      }

      const res = await fetch('/api/lbs/execute', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          playerId: player.id,
          nodeType: node.nodeType || '拾荒',
          nodeName: node.name,
          stance:   activeModal.stance ?? 'balanced',
          ...extraOptions,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        setMessage(result.message || '互動失敗，天地法則紊亂');
        setActiveModal(null);
        return;
      }

      setActiveModal(prev => ({
        ...prev,
        step:           'result',
        resultMessage:  result.data.message,
        battleLog:      result.data.battleLog      ?? null,
        outcome:        result.data.outcome        ?? null,
        itemDropped:    result.data.item_dropped   ?? null,
        expGained:      result.data.exp_gained     ?? 0,
        prestigeDelta:  result.data.prestige_delta ?? 0,
        shaqiDelta:     result.data.sha_qi_delta   ?? 0,
        itemLost:       result.data.item_lost      ?? null,
      }));

      setEvents(prevEvents => prevEvents.filter(e => e.id !== activeModal.node.id));
      if (navigator.vibrate) navigator.vibrate([50, 50, 100]);
    } catch {
      setMessage('天地法則紊亂，無法互動');
      setActiveModal(null);
    }
  };

  const closeModal = () => setActiveModal(null);

  // ── 掃描 ────────────────────────────────────────────────────────────
  const handleScan = () => {
    if (!player?.id)    { setMessage('尚未感知到道友的命格'); return; }

    // ── 教學第1步：略過 EP 消耗與 GPS，直接回傳固定節點 ──────────
    if (isTutorial && tutorialStep === 1) {
      setIsScanning(true);
      setEvents([]);
      setBreadcrumbs([]);
      setMessage('神識初展，感應到靈氣波動...');
      setTimeout(() => {
        setEvents(TUTORIAL_MOCK_NODES);
        setZoneTier('safe');
        setMessage('探尋完畢，發現 2 處靈力波動');
        setIsScanning(false);
        // 呼叫後端初始化教學道具（破銅爛鐵加入背包）
        fetch('/api/tutorial/setup', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ playerId: player.id }),
        }).catch(console.error);
        // 步驟1完成 → 前進步驟2
        advanceTutorial();
      }, 1800);
      return;
    }

    if (player.ep < 10) {
      setMessage('精力不足，無法外放神識');
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
      return;
    }

    setIsScanning(true);
    setEvents([]);
    setBreadcrumbs([]);
    setMessage('神識牽引天地，搜尋周遭...');

    if (!navigator.geolocation) { fallbackScan(false); return; }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        centerMapOnPlayer(lat, lng);

        try {
          const res = await fetch('/api/lbs/scan', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ playerId: player.id, lat, lng }),
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            setMessage(err.message || '天地法則紊亂，探靈失敗');
            setIsScanning(false);
            return;
          }

          const result = await res.json();
          const { nodes: backendNodes, zone_tier, nearest_event, repeat_message } = result.data;

          // 更新危險等級
          setZoneTier(zone_tier ?? 'safe');

          const zoneMessage = {
            safe:    '探尋完畢',
            mid:     '天地法則異動',
            danger:  '煞氣瀰漫，強敵環伺',
            extreme: '此地凶險至極，慎行！',
          };
          setMessage(
            repeat_message
              ? repeat_message
              : nearest_event
                ? `${zoneMessage[zone_tier]}——${nearest_event.name}距此 ${nearest_event.distance} 公尺`
                : `${zoneMessage[zone_tier]}，發現 ${backendNodes.length} 處靈力波動`
          );

          // 映射後端節點 → 前端事件（含虛擬 GPS 定位）
          const FALLBACK_STYLE = { color: '#9CA3AF', glow: 'rgba(156,163,175,0.5)', type: 'unknown' };
          const mapped = backendNodes.map((node) => {
            let style = NODE_TYPE_MAPPING[node.type] ?? FALLBACK_STYLE;
            if (node.is_ambush) style = { ...style, color: '#FF3B30', glow: 'rgba(255,59,48,0.8)' };

            return {
              id:                   node.instance_id,
              name:                 node.name,
              description:          node.description,
              cost:                 { sp: node.cost_sp, hp: node.cost_hp },
              nodeType:             node.type,
              isAmbush:             node.is_ambush,
              node_lat:             node.node_lat,
              node_lng:             node.node_lng,
              // 靈泉
              aura_amount:          node.aura_amount ?? null,
              // 道友
              target_player_id:     node.target_player_id ?? null,
              target_prestige:      node.target_prestige ?? 0,
              target_prestige_level: node.target_prestige_level ?? 0,
              target_realm_level:   node.target_realm_level ?? 1,
              ...style,
            };
          });

          // 純數學定位，不依賴地圖載入狀態，直接計算
          const withPos = computeNodePositions(mapped, lat, lng, result.data.scan_range_m ?? 300);
          setEvents(withPos);
          setBreadcrumbs(result.data.breadcrumbs ?? []);
          setIsScanning(false);
          if (reduceEp) reduceEp(10);
          // 地圖置中（非同步，不阻塞節點顯示）
          centerMapOnPlayer(lat, lng);

        } catch (err) {
          console.error('[探靈] 後端錯誤:', err);
          setMessage(`探靈失敗：${err?.message ?? '天地法則紊亂'}`);
          setIsScanning(false);
        }
      },
      (err) => {
        // GPS 拒絕或逾時
        const isDenied = err.code === 1; // PERMISSION_DENIED
        setMessage(isDenied ? '定位未授權，改用模擬探靈（可於瀏覽器授予位置權限）' : '定位逾時，改用模擬探靈');
        fallbackScan(false);
      },
      { timeout: 10000 }
    );
  };

  const fallbackScan = (shouldDeductEp = false) => {
    setTimeout(() => {
      setZoneTier('safe');
      setEvents(
        Array.from({ length: Math.floor(Math.random() * 3) + 2 }).map((_, i) => {
          const angle = (i * (360 / 5) + Math.random() * 40 - 20 + 360) % 360;
          const dist  = 60 + Math.random() * 200;
          const MAX_DIST = 300, MAX_RADIUS = 38;
          const r   = Math.min(dist / MAX_DIST, 1) * MAX_RADIUS;
          const rad = angle * Math.PI / 180;
          const leftPct = Math.min(88, Math.max(12, 50 + Math.sin(rad) * r));
          const topPct  = Math.min(82, Math.max(12, 50 - Math.cos(rad) * r));
          return {
            id:          `mock-${i}`,
            nodeType:    '拾荒',
            name:        '未知遺落物',
            description: '似乎散發著微弱的靈氣',
            cost:        { sp: 10, hp: 0 },
            isAmbush:    false,
            ...NODE_TYPE_MAPPING['拾荒'],
            top:  `${topPct.toFixed(1)}%`,
            left: `${leftPct.toFixed(1)}%`,
          };
        })
      );
      setIsScanning(false);
      setMessage('探尋完畢');
      if (shouldDeductEp && reduceEp) reduceEp(10);
    }, 1500);
  };

  // ── 渲染 ────────────────────────────────────────────────────────────
  const atmosphereColor = zoneTier ? ZONE_ATMOSPHERE[zoneTier] : 'transparent';

  return (
    <div className="h-full w-full relative flex items-center justify-center overflow-hidden bg-transparent">
      <style>{`
        @keyframes ripple-out {
          0%   { transform: scale(0.5); opacity: 0.8; }
          100% { transform: scale(3.5); opacity: 0;   }
        }
        @keyframes ripple-in {
          0%   { transform: scale(3.5); opacity: 0;   }
          100% { transform: scale(0.5); opacity: 0.8; }
        }
        @keyframes ping-fast {
          0%, 100% { transform: scale(1);   opacity: 0.8; }
          50%       { transform: scale(2.2); opacity: 0;   }
        }
        /* 隱藏 MapLibre 自帶 UI */
        .maplibregl-ctrl-bottom-right,
        .maplibregl-ctrl-bottom-left,
        .maplibregl-ctrl-top-right,
        .maplibregl-ctrl-top-left { display: none !important; }
      `}</style>

      {/* 0. MapLibre 地圖底層（最底層） */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ width: '100%', height: '100%' }}
      />

      {/* 1. 危險等級氣氛光暈（疊在地圖上） */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none transition-all duration-[2000ms]"
        style={{ backgroundColor: atmosphereColor }}
      />

      {/* 2. 麵包屑方向指示（沿邊緣的箭頭） */}
      {breadcrumbs.map((bc, i) => {
        // 將角度轉換成邊緣座標（讓箭頭貼著螢幕邊框）
        const rad   = bc.angle * Math.PI / 180;
        const sin   = Math.sin(rad);
        const cos   = -Math.cos(rad); // 北=上，cos 反向
        const scale = 1 / Math.max(Math.abs(sin), Math.abs(cos));
        const ex    = Math.min(Math.max(50 + sin * scale * 44, 5), 95);
        const ey    = Math.min(Math.max(50 + cos * scale * 44, 5), 95);
        return (
          <div
            key={i}
            className="absolute z-[15] pointer-events-none flex flex-col items-center gap-[2px]"
            style={{ left: `${ex}%`, top: `${ey}%`, transform: 'translate(-50%,-50%)' }}
          >
            <div
              className="w-3 h-3 border-r-2 border-t-2 border-[#FFD700] opacity-70"
              style={{ transform: `rotate(${bc.angle + 45}deg)` }}
            />
            <span className="text-[9px] text-[#FFD700]/60 tracking-wider leading-none">{bc.dist_desc}</span>
          </div>
        );
      })}

      {/* 3. 掃描到的事件節點 */}
      {events.map((ev) => {
        const isAmbush = ev.isAmbush;
        const dotSize   = isAmbush ? 'w-6 h-6' : 'w-4 h-4';
        const pingSize  = isAmbush ? 'w-12 h-12' : 'w-8 h-8';
        const pingAnim  = isAmbush ? 'animate-[ping-fast_0.7s_infinite]' : 'animate-ping';
        const glowStyle = isAmbush
          ? { backgroundColor: ev.color, boxShadow: `0 0 20px ${ev.glow}, 0 0 45px ${ev.glow}, 0 0 70px ${ev.glow}` }
          : { backgroundColor: ev.color, boxShadow: `0 0 15px ${ev.glow}, 0 0 30px ${ev.glow}` };

        return (
          <div
            key={ev.id}
            className="absolute flex flex-col items-center justify-center cursor-pointer z-20"
            style={{ top: ev.top, left: ev.left, transform: 'translate(-50%, -50%)' }}
            onClick={(e) => { e.stopPropagation(); openNodeModal(ev); }}
          >
            <div className="relative flex items-center justify-center">
              <div
                className={`absolute ${pingSize} rounded-full opacity-40 ${pingAnim}`}
                style={{ backgroundColor: ev.color }}
              />
              <div className={`${dotSize} rounded-full relative z-10`} style={glowStyle} />
            </div>
            <span className={`mt-2 text-[12px] tracking-widest drop-shadow-[0_0_8px_rgba(0,0,0,1)] bg-black/50 px-2 py-0.5 rounded border ${isAmbush ? 'text-[#FF3B30] border-[#FF3B30]/40' : 'text-white/90 border-white/10'}`}>
              {isAmbush ? `⚠ ${ev.name}` : ev.name}
            </span>
          </div>
        );
      })}

      {/* 4. 中央玩家靈球（絕對置中） */}
      <div
        className={`absolute z-30 cursor-pointer transition-transform duration-500
          ${isScanning ? 'scale-110' : isPressing ? 'scale-90' : isTuning ? 'scale-100' : 'active:scale-95'}`}
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* 探測時：向外擴散的青色波紋 */}
        {isScanning && (
          <>
            <div className="absolute rounded-full border border-[#00E5FF]/60 animate-[ripple-out_2s_infinite_ease-out]" style={{ inset: '-4px', animationDelay: '0s' }} />
            <div className="absolute rounded-full border border-[#00E5FF]/40 animate-[ripple-out_2s_infinite_ease-out]" style={{ inset: '-4px', animationDelay: '0.7s' }} />
            <div className="absolute rounded-full border border-[#00E5FF]/20 animate-[ripple-out_2s_infinite_ease-out]" style={{ inset: '-4px', animationDelay: '1.4s' }} />
          </>
        )}

        {/* 長按調息時：向內聚攏的金色波紋 */}
        {(isPressing || isTuning) && (
          <>
            <div className="absolute rounded-full border border-[#FFD700]/60 animate-[ripple-in_1.5s_infinite_ease-in]" style={{ inset: '-4px', animationDelay: '0s' }} />
            <div className="absolute rounded-full border border-[#FFD700]/40 animate-[ripple-in_1.5s_infinite_ease-in]" style={{ inset: '-4px', animationDelay: '0.5s' }} />
            <div className="absolute rounded-full border border-[#FFD700]/20 animate-[ripple-in_1.5s_infinite_ease-in]" style={{ inset: '-4px', animationDelay: '1.0s' }} />
          </>
        )}

        {/* 靈球本體 */}
        <div
          className="relative w-[52px] h-[52px] rounded-full flex items-center justify-center transition-all duration-700"
          style={isScanning ? {
            background: 'radial-gradient(circle at 35% 35%, rgba(180,240,255,0.9), rgba(0,229,255,0.5) 50%, rgba(0,100,160,0.3))',
            boxShadow: '0 0 20px rgba(0,229,255,0.9), 0 0 50px rgba(0,229,255,0.5), 0 0 90px rgba(0,229,255,0.2)',
          } : (isPressing || isTuning) ? {
            background: 'radial-gradient(circle at 35% 35%, rgba(255,240,160,0.9), rgba(255,215,0,0.5) 50%, rgba(160,100,0,0.3))',
            boxShadow: '0 0 20px rgba(255,215,0,0.9), 0 0 50px rgba(255,215,0,0.5), 0 0 90px rgba(255,215,0,0.2)',
          } : {
            background: 'radial-gradient(circle at 35% 35%, rgba(180,240,255,0.7), rgba(0,200,220,0.35) 50%, rgba(0,60,100,0.2))',
            boxShadow: '0 0 12px rgba(0,229,255,0.6), 0 0 30px rgba(0,229,255,0.25)',
          }}
        >
          {/* 內部高光點 */}
          <div className="absolute top-[18%] left-[22%] w-[28%] h-[18%] rounded-full bg-white/60 blur-[2px]" />
          {/* 靈氣旋紋（細環） */}
          <div
            className="absolute inset-[6px] rounded-full border border-white/20 animate-[spin_8s_linear_infinite]"
            style={{ borderStyle: 'dashed' }}
          />
        </div>
      </div>

      {/* 5. 底部狀態提示文字 */}
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom,20px)+40px)] bg-black/60 backdrop-blur-sm px-6 py-2 rounded-full border border-[#00E5FF]/20 text-[#00E5FF] text-[14px] tracking-[8px] opacity-90 font-light shadow-[0_0_15px_rgba(0,229,255,0.1)] z-30 pointer-events-none">
        {message}
      </div>

      {/* 6. 互動彈出視窗 */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-[#12141A] border border-[#00E5FF]/30 rounded-2xl w-full max-w-[360px] shadow-[0_0_40px_rgba(0,229,255,0.15)] flex flex-col overflow-hidden text-center transform transition-all">
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#00E5FF] to-transparent opacity-50" />

            <div className="p-7">
              {activeModal.step === 'info' && (() => {
                const nd = activeModal.node;
                const isSpring  = nd.nodeType === '靈泉';
                const isPlayer  = nd.nodeType === '道友';
                const accentColor = isSpring ? '#00E5FF' : isPlayer ? '#C084FC' : '#00E5FF';
                return (
                  <>
                    <h3 className="text-2xl mb-3 font-bold tracking-widest" style={{ color: accentColor }}>
                      {isPlayer ? `道友：${nd.name}` : nd.name}
                    </h3>
                    <p className="text-gray-300 text-base mb-5 min-h-[44px] leading-relaxed tracking-wider">
                      {nd.description || '此地似乎隱藏著某種機緣...'}
                    </p>

                    {isSpring && (
                      <div className="bg-black/40 rounded-lg p-4 mb-5 border border-[#00E5FF]/20">
                        <p className="text-[#00E5FF] text-base tracking-widest">靈氣 +{nd.aura_amount}</p>
                      </div>
                    )}

                    {isPlayer && (
                      <div className="bg-black/40 rounded-lg p-4 mb-5 border border-[#C084FC]/20 space-y-2">
                        <p className="text-[#C084FC] text-sm tracking-wider">切磋：贏得聲望（對方等級 ≥ 自己才加）</p>
                        <p className="text-[#FF9500] text-sm tracking-wider">掠奪：贏得煞氣 +30 及素材，輸則掉落素材</p>
                      </div>
                    )}

                    {!isSpring && !isPlayer && (
                      <div className="bg-black/40 rounded-lg p-4 mb-5 border border-white/5">
                        <p className="text-[#FF3B30] text-sm tracking-widest">
                          預計消耗：{nd.cost?.sp || 0} 體力
                        </p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button onClick={closeModal} className="flex-1 py-3 rounded-xl border border-white/20 text-gray-400 text-base tracking-widest hover:bg-white/5 active:scale-95 transition-all">
                        離去
                      </button>
                      {isPlayer ? (
                        <>
                          <button
                            onClick={() => {
                              const node = activeModal.node;
                              closeModal();
                              triggerCombat({
                                source:         'explore',
                                pvpType:        'spar',
                                nodeName:       node.name,
                                targetPlayerId: node.target_player_id,
                                onComplete: () => setEvents(prev => prev.filter(e => e.id !== node.id)),
                              });
                            }}
                            className="flex-1 py-3 rounded-xl bg-[#C084FC]/10 border border-[#C084FC]/50 text-[#C084FC] text-base tracking-widest hover:bg-[#C084FC]/20 active:scale-95 transition-all"
                          >切磋</button>
                          <button
                            onClick={() => {
                              const node = activeModal.node;
                              closeModal();
                              triggerCombat({
                                source:         'explore',
                                pvpType:        'plunder',
                                nodeName:       node.name,
                                targetPlayerId: node.target_player_id,
                                onComplete: () => setEvents(prev => prev.filter(e => e.id !== node.id)),
                              });
                            }}
                            className="flex-1 py-3 rounded-xl bg-[#FF9500]/10 border border-[#FF9500]/50 text-[#FF9500] text-base tracking-widest hover:bg-[#FF9500]/20 active:scale-95 transition-all"
                          >掠奪</button>
                        </>
                      ) : (
                        <button onClick={confirmExecuteNode} className="flex-1 py-3 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/50 text-[#00E5FF] text-base tracking-widest hover:bg-[#00E5FF]/20 active:scale-95 transition-all">
                          {isSpring ? '汲取' : '探索'}
                        </button>
                      )}
                    </div>
                  </>
                );
              })()}

              {activeModal.step === 'loading' && (
                <div className="py-8 flex flex-col items-center justify-center">
                  <div className="w-10 h-10 border-2 border-[#00E5FF] border-t-transparent rounded-full animate-spin mb-5" />
                  <p className="text-[#00E5FF] text-base tracking-widest animate-pulse">神識交匯中...</p>
                </div>
              )}

              {activeModal.step === 'result' && (
                <>
                  {activeModal.battleLog ? (
                    <>
                      <h3 className={`text-2xl mb-4 font-bold tracking-widest ${activeModal.outcome === 'win' ? 'text-[#FFD700]' : 'text-[#FF3B30]'}`}>
                        {activeModal.outcome === 'win' ? '⚔ 勝利' : '💀 重傷'}
                      </h3>
                      <div className="bg-black/60 border border-white/10 rounded-xl p-4 mb-4 max-h-[240px] overflow-y-auto text-left space-y-1.5 font-mono text-[13px] leading-relaxed">
                        {activeModal.battleLog.map((entry, i) => (
                          <p key={i} style={{ color: LOG_LINE_COLOR[entry.type] ?? '#9CA3AF' }}>{entry.text}</p>
                        ))}
                      </div>
                      <div className="bg-black/40 rounded-xl p-4 mb-4 border border-white/5 text-sm space-y-2">
                        {activeModal.expGained > 0 && <p className="text-[#32D74B] tracking-widest">靈氣 +{activeModal.expGained}</p>}
                        {activeModal.itemDropped && <p className="text-[#FFD700] tracking-widest">獲得【{activeModal.itemDropped}】×1</p>}
                        {activeModal.prestigeDelta > 0 && <p className="text-[#C084FC] tracking-widest">聲望 +{activeModal.prestigeDelta}</p>}
                        {activeModal.shaqiDelta > 0 && <p className="text-[#FF9500] tracking-widest">煞氣 +{activeModal.shaqiDelta}</p>}
                        {activeModal.shaqiDelta < 0 && <p className="text-gray-400 tracking-widest">煞氣 {activeModal.shaqiDelta}</p>}
                        {activeModal.itemLost && <p className="text-[#FF3B30] tracking-widest">損失【{activeModal.itemLost}】×1</p>}
                        {!activeModal.itemDropped && !activeModal.prestigeDelta && !activeModal.shaqiDelta && activeModal.outcome === 'win' && <p className="text-white/30 tracking-widest">此番未有掉落</p>}
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="text-[#FFD700] text-2xl mb-4 font-bold tracking-widest">探索結果</h3>
                      <p className="text-white/90 text-base mb-8 leading-relaxed tracking-wider">{activeModal.resultMessage}</p>
                    </>
                  )}
                  <button onClick={closeModal} className="w-full py-3 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/50 text-[#00E5FF] text-base tracking-widest hover:bg-[#00E5FF]/20 active:scale-95 transition-all">
                    收下
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

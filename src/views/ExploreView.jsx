// src/views/ExploreView.jsx
import { useState, useRef, useEffect } from 'react';
import useGameStore from '../store/gameStore';
import 'maplibre-gl/dist/maplibre-gl.css';

// ── Display helpers ───────────────────────────────────────────────

const LOG_LINE_COLOR = {
  'reward': '#32D74B',
  'header': '#00E5FF',
  'info':   '#9CA3AF',
};

const NODE_TYPE_MAPPING = {
  '勞作': { color: '#A0855B', glow: 'rgba(160,133,91,0.6)',   type: 'labor'    },
  '見聞': { color: '#7EC8E3', glow: 'rgba(126,200,227,0.6)',  type: 'observe'  },
  '衝突': { color: '#FF9500', glow: 'rgba(255,149,0,0.6)',    type: 'conflict' },
  '妖獸': { color: '#FF3B30', glow: 'rgba(255,59,48,0.6)',    type: 'beast'    },
  '機緣': { color: '#9B5CFF', glow: 'rgba(155,92,255,0.6)',   type: 'chance'   },
  '拾荒': { color: '#FFD700', glow: 'rgba(255,215,0,0.6)',    type: 'scavenge' },
  '勞動': { color: '#FFD700', glow: 'rgba(255,215,0,0.6)',    type: 'labor2'   },
  '戰鬥': { color: '#FF3B30', glow: 'rgba(255,59,48,0.6)',    type: 'combat'   },
  '靈泉': { color: '#00E5FF', glow: 'rgba(0,229,255,0.7)',    type: 'spring'   },
  '道友': { color: '#C084FC', glow: 'rgba(192,132,252,0.6)',  type: 'player'   },
};

const ZONE_ATMOSPHERE = {
  safe:    'rgba(0, 229, 255, 0.06)',
  mid:     'rgba(255, 200, 0, 0.10)',
  danger:  'rgba(255, 80, 0, 0.14)',
  extreme: 'rgba(200, 0, 0, 0.20)',
};

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
    { id: 'bg',    type: 'background', paint: { 'background-color': '#05070a' } },
    { id: 'carto', type: 'raster',     source: 'carto', paint: { 'raster-opacity': 0.8 } },
  ],
};

const TUTORIAL_MOCK_NODES = [
  {
    id: 'tut-node-1', name: '破銅爛鐵',
    description: '廢棄的金屬碎片，散發微弱靈氣，可用於鑄煉法器。',
    nodeType: '拾荒', cost: { sp: 5, hp: 0 }, isAmbush: false,
    top: '38%', left: '42%', ...NODE_TYPE_MAPPING['拾荒'],
  },
  {
    id: 'tut-node-2', name: '散碎銀兩',
    description: '遺落在地的零散銀錢，雖不多，但聊勝於無。',
    nodeType: '拾荒', cost: { sp: 3, hp: 0 }, isAmbush: false,
    top: '62%', left: '60%', ...NODE_TYPE_MAPPING['拾荒'],
  },
];

// ── Event system constants ────────────────────────────────────────

const TIER_LABEL = { 1: '凡', 2: '黃', 3: '玄', 4: '地', 5: '天' };
const TIER_COLOR = {
  1: { text: '#9CA3AF', border: 'rgba(156,163,175,0.35)', bg: 'rgba(156,163,175,0.08)' },
  2: { text: '#FFD700', border: 'rgba(255,215,0,0.35)',   bg: 'rgba(255,215,0,0.08)'   },
  3: { text: '#00E5FF', border: 'rgba(0,229,255,0.35)',   bg: 'rgba(0,229,255,0.08)'   },
  4: { text: '#C084FC', border: 'rgba(192,132,252,0.35)', bg: 'rgba(192,132,252,0.08)' },
  5: { text: '#FF9500', border: 'rgba(255,149,0,0.35)',   bg: 'rgba(255,149,0,0.08)'   },
};
const ATTR_LABEL = { fire: '火', water: '水', wood: '木', metal: '金', earth: '土' };
const ATTR_COLOR = { fire: '#FF6B6B', water: '#4D9EFF', wood: '#66BB6A', metal: '#FFD700', earth: '#A1887F' };
const ATTR_ICON  = { fire: '🔥', water: '💧', wood: '🌿', metal: '⚔', earth: '⛰' };

const ACTIONS = [
  { code: 'search', label: '深入探查', icon: '🔍', cost: '精力 -5',   costColor: '#FF6B6B' },
  { code: 'wait',   label: '靜觀其變', icon: '👁',  cost: '精力 -2',   costColor: '#FF9500' },
  { code: 'stone',  label: '靈石試探', icon: '💎',  cost: '靈石 -10',  costColor: '#FFD700' },
  { code: 'retreat',label: '撤退',     icon: '🚶',  cost: '無',        costColor: '#9CA3AF' },
  { code: 'jade',   label: '刻入玉簡', icon: '📜',  cost: '空白玉簡',  costColor: '#C084FC' },
];

const alertColor = (level) => {
  if (level >= 100) return '#FF3B30';
  if (level >= 60)  return '#FF6B35';
  if (level >= 30)  return '#FFD700';
  return '#32D74B';
};

const resultDisplay = (result, rareTriggered) => {
  if (result === 'good' || result === 'good_drop' || result === 'good_trade' || result === 'full_clear') {
    return { title: '收穫豐厚', color: '#FFD700', icon: '✨' };
  }
  if (result === 'rare_drop') {
    return { title: '奇遇！', color: '#C084FC', icon: '💜' };
  }
  if (result === 'nothing') {
    return { title: '空手而歸', color: '#9CA3AF', icon: '🌫' };
  }
  if (result === 'failure' || result === 'trap') {
    return { title: '遭遇危險', color: '#FF3B30', icon: '⚠' };
  }
  if (result === 'downgrade') {
    return { title: '機緣已散', color: '#FF9500', icon: '💨' };
  }
  if (result === 'retreat') {
    return { title: '安全撤退', color: '#9CA3AF', icon: '🚶' };
  }
  if (rareTriggered) {
    return { title: '普通收穫', color: '#00E5FF', icon: '◈' };
  }
  return { title: '普通收穫', color: '#00E5FF', icon: '◈' };
};

// ── Main component ────────────────────────────────────────────────

export default function ExploreView() {
  const player           = useGameStore((state) => state.player);
  const reduceEp         = useGameStore((state) => state.reduceEp);
  const isMeditating     = useGameStore((state) => state.isMeditating);
  const setMeditating    = useGameStore((state) => state.setMeditating);
  const triggerCombat    = useGameStore((state) => state.triggerCombat);
  const isTutorial       = useGameStore((state) => state.isTutorial);
  const tutorialStep     = useGameStore((state) => state.tutorialStep);
  const completeTutorial = useGameStore((state) => state.completeTutorial);

  // Map / scan state (unchanged)
  const [isScanning,   setIsScanning]   = useState(false);
  const [isTuning,     setIsTuning]     = useState(false);
  const [isPressing,   setIsPressing]   = useState(false);
  const [events,       setEvents]       = useState([]);
  const [breadcrumbs,  setBreadcrumbs]  = useState([]);
  const [message,      setMessage]      = useState('凝神聚氣，外放神識');
  const [zoneTier,     setZoneTier]     = useState(null);
  const [activeModal,  setActiveModal]  = useState(null);

  const pressTimer      = useRef(null);
  const pressStartTime  = useRef(null);
  const mapRef          = useRef(null);
  const mapContainerRef = useRef(null);
  const playerPosRef    = useRef(null);

  // ── Event system state ──────────────────────────────────────────
  // 'map' | 'scanning' | 'inference' | 'interaction' | 'result' | 'jade'
  const [eventPhase,    setEventPhase]    = useState('map');
  const [eventData,     setEventData]     = useState(null);
  const [eventText,     setEventText]     = useState('');   // target text
  const [typedText,     setTypedText]     = useState('');   // animated typed text
  const [pendingNodeId, setPendingNodeId] = useState(null);
  const [resolveResult, setResolveResult] = useState(null);
  const [jadeNote,      setJadeNote]      = useState('');
  const [eventLoading,  setEventLoading]  = useState(false);
  const [alertFeedback,   setAlertFeedback]   = useState(null);
  const [visibleLogLines, setVisibleLogLines] = useState(0);
  const battleLogScrollRef = useRef(null);

  // Battle log: reveal one line every 600ms, then auto-scroll
  useEffect(() => {
    if (!activeModal?.battleLog?.length) return;
    setVisibleLogLines(0);
    let i = 0;
    const total = activeModal.battleLog.length;
    const id = setInterval(() => {
      i++;
      setVisibleLogLines(i);
      if (i >= total) clearInterval(id);
    }, 600);
    return () => clearInterval(id);
  }, [activeModal?.battleLog]);

  useEffect(() => {
    if (!battleLogScrollRef.current) return;
    battleLogScrollRef.current.scrollTo({ top: battleLogScrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [visibleLogLines]);

  // Typewriter animation — re-triggers whenever eventText changes
  useEffect(() => {
    if (!eventText) { setTypedText(''); return; }
    let idx = 0;
    setTypedText('');
    const id = setInterval(() => {
      idx++;
      setTypedText(eventText.slice(0, idx));
      if (idx >= eventText.length) clearInterval(id);
    }, 38);
    return () => clearInterval(id);
  }, [eventText]);

  // ── Sync meditation state ───────────────────────────────────────
  useEffect(() => { setIsTuning(isMeditating); }, [isMeditating]);

  // ── MapLibre init ───────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    let cancelled = false;

    import('maplibre-gl').then(({ default: maplibregl }) => {
      if (cancelled || !mapContainerRef.current) return;
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: MAP_STYLE,
        center: [121.5654, 25.0330],
        zoom: 17,
        interactive: false,
        attributionControl: false,
      });
      map.on('error', (e) => console.warn('[MapLibre]', e.error?.message ?? e));
      mapRef.current = map;
    }).catch((err) => console.warn('[ExploreView] MapLibre 載入失敗:', err.message));

    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  const centerMapOnPlayer = (lat, lng) => {
    playerPosRef.current = { lat, lng };
    mapRef.current?.setCenter([lng, lat]);
  };

  const getBearing = (lat1, lng1, lat2, lng2) => {
    const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  };

  const computeNodePositions = (nodes, playerLat, playerLng, scanRangeM = 300) => {
    const MAX_DIST = scanRangeM, MAX_RADIUS = 38;
    const hasGPS = playerLat != null && playerLng != null;
    return nodes.map((node, i) => {
      let angle, dist;
      if (hasGPS && node.node_lat != null && node.node_lng != null) {
        angle = getBearing(playerLat, playerLng, node.node_lat, node.node_lng);
        const R = 6371000, dLat = (node.node_lat - playerLat) * Math.PI / 180, dLng = (node.node_lng - playerLng) * Math.PI / 180;
        const a = Math.sin(dLat/2) ** 2 + Math.cos(playerLat * Math.PI/180) * Math.cos(node.node_lat * Math.PI/180) * Math.sin(dLng/2) ** 2;
        dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      } else {
        angle = (i * (360 / nodes.length) + Math.random() * 40 - 20 + 360) % 360;
        dist  = 60 + Math.random() * 200;
      }
      const r = Math.min(dist / MAX_DIST, 1) * MAX_RADIUS;
      const rad = angle * Math.PI / 180;
      const leftPct = Math.min(88, Math.max(12, 50 + Math.sin(rad) * r));
      const topPct  = Math.min(82, Math.max(12, 50 - Math.cos(rad) * r));
      return { ...node, top: `${topPct.toFixed(1)}%`, left: `${leftPct.toFixed(1)}%` };
    });
  };

  // ── Press / scan handlers (unchanged) ──────────────────────────
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
      setMessage('凝神入定，精力・氣血回復加速...');
    }, 3000);
  };

  const handlePointerUp = (e) => {
    e.preventDefault();
    if (!pressStartTime.current) return;
    const duration = Date.now() - pressStartTime.current;
    clearTimeout(pressTimer.current);
    pressTimer.current = null;
    pressStartTime.current = null;
    setIsPressing(false);
    if (duration < 500 && !isMeditating) handleScan();
  };

  const openNodeModal = (clickedNode) => {
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
    // Spring / player nodes keep the info modal; all other nodes go straight to event scan
    if (clickedNode.nodeType === '靈泉' || clickedNode.nodeType === '道友') {
      setActiveModal({ step: 'info', node: clickedNode });
    } else {
      startEventScan(clickedNode);
    }
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id, nodeType: node.nodeType || '拾荒', nodeName: node.name, stance: activeModal.stance ?? 'balanced', ...extraOptions }),
      });
      const result = await res.json();
      if (!res.ok) { setMessage(result.message || '互動失敗'); setActiveModal(null); return; }
      setActiveModal(prev => ({
        ...prev, step: 'result',
        resultMessage: result.data.message,
        battleLog:     result.data.battleLog      ?? null,
        outcome:       result.data.outcome        ?? null,
        itemDropped:   result.data.item_dropped   ?? null,
        expGained:     result.data.exp_gained     ?? 0,
        prestigeDelta: result.data.prestige_delta ?? 0,
        shaqiDelta:    result.data.sha_qi_delta   ?? 0,
        itemLost:      result.data.item_lost      ?? null,
      }));
      setEvents(prev => prev.filter(e => e.id !== activeModal.node.id));
      if (navigator.vibrate) navigator.vibrate([50, 50, 100]);
    } catch {
      setMessage('天地法則紊亂，無法互動');
      setActiveModal(null);
    }
  };

  const closeModal = () => setActiveModal(null);

  const handleScan = () => {
    if (!player?.id) { setMessage('尚未感知到道友的命格'); return; }
    if (isTutorial && tutorialStep === 1) {
      setIsScanning(true); setEvents([]); setBreadcrumbs([]);
      setMessage('神識初展，感應到靈氣波動...');
      setTimeout(() => {
        setEvents(TUTORIAL_MOCK_NODES); setZoneTier('safe');
        setMessage('探尋完畢，發現 2 處靈力波動'); setIsScanning(false);
        fetch('/api/tutorial/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: player.id }) }).catch(console.error);
        completeTutorial();
      }, 1800);
      return;
    }
    if (player.ep < 10) { setMessage('精力不足，無法外放神識'); if (navigator.vibrate) navigator.vibrate([50, 50, 50]); return; }
    setIsScanning(true); setEvents([]); setBreadcrumbs([]); setMessage('神識牽引天地，搜尋周遭...');
    if (!navigator.geolocation) { fallbackScan(false); return; }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        centerMapOnPlayer(lat, lng);
        try {
          const res = await fetch('/api/lbs/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: player.id, lat, lng }) });
          if (!res.ok) { const err = await res.json().catch(() => ({})); setMessage(err.message || '天地法則紊亂，探靈失敗'); setIsScanning(false); return; }
          const result = await res.json();
          const { nodes: backendNodes, zone_tier, nearest_event, repeat_message } = result.data;
          setZoneTier(zone_tier ?? 'safe');
          const zoneMessage = { safe: '探尋完畢', mid: '天地法則異動', danger: '煞氣瀰漫，強敵環伺', extreme: '此地凶險至極，慎行！' };
          setMessage(repeat_message ? repeat_message : nearest_event ? `${zoneMessage[zone_tier]}——${nearest_event.name}距此 ${nearest_event.distance} 公尺` : `${zoneMessage[zone_tier]}，發現 ${backendNodes.length} 處靈力波動`);
          const FALLBACK_STYLE = { color: '#9CA3AF', glow: 'rgba(156,163,175,0.5)', type: 'unknown' };
          const mapped = backendNodes.map((node) => {
            let style = NODE_TYPE_MAPPING[node.type] ?? FALLBACK_STYLE;
            if (node.is_ambush) style = { ...style, color: '#FF3B30', glow: 'rgba(255,59,48,0.8)' };
            return { id: node.instance_id, name: node.name, description: node.description, cost: { sp: node.cost_sp, hp: node.cost_hp }, nodeType: node.type, isAmbush: node.is_ambush, node_lat: node.node_lat, node_lng: node.node_lng, aura_amount: node.aura_amount ?? null, target_player_id: node.target_player_id ?? null, target_prestige: node.target_prestige ?? 0, target_prestige_level: node.target_prestige_level ?? 0, target_realm_level: node.target_realm_level ?? 1, ...style };
          });
          const withPos = computeNodePositions(mapped, lat, lng, result.data.scan_range_m ?? 300);
          setEvents(withPos); setBreadcrumbs(result.data.breadcrumbs ?? []); setIsScanning(false);
          if (reduceEp) reduceEp(10);
          centerMapOnPlayer(lat, lng);
        } catch (err) { console.error('[探靈] 後端錯誤:', err); setMessage(`探靈失敗：${err?.message ?? '天地法則紊亂'}`); setIsScanning(false); }
      },
      (err) => {
        const isDenied = err.code === 1;
        setMessage(isDenied ? '定位未授權，改用模擬探靈（可於瀏覽器授予位置權限）' : '定位逾時，改用模擬探靈');
        fallbackScan(false);
      },
      { timeout: 10000 }
    );
  };

  const fallbackScan = (shouldDeductEp = false) => {
    setTimeout(() => {
      setZoneTier('safe');
      setEvents(Array.from({ length: Math.floor(Math.random() * 3) + 2 }).map((_, i) => {
        const angle = (i * (360 / 5) + Math.random() * 40 - 20 + 360) % 360;
        const dist  = 60 + Math.random() * 200;
        const r = Math.min(dist / 300, 1) * 38;
        const rad = angle * Math.PI / 180;
        return { id: `mock-${i}`, nodeType: '拾荒', name: '未知遺落物', description: '似乎散發著微弱的靈氣', cost: { sp: 10, hp: 0 }, isAmbush: false, ...NODE_TYPE_MAPPING['拾荒'], top: `${Math.min(82, Math.max(12, 50 - Math.cos(rad) * r)).toFixed(1)}%`, left: `${Math.min(88, Math.max(12, 50 + Math.sin(rad) * r)).toFixed(1)}%` };
      }));
      setIsScanning(false); setMessage('探尋完畢');
      if (shouldDeductEp && reduceEp) reduceEp(10);
    }, 1500);
  };

  // ── Event system functions ──────────────────────────────────────

  const startEventScan = async (node) => {
    if (!player?.id) return;
    setActiveModal(null);
    setPendingNodeId(node.id);
    setEventPhase('scanning');
    setEventLoading(true);

    const minDelay = new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const scanPromise = fetch('/api/explore/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: player.id, poi_type: 'unknown', weather: 'cloudy' }),
      }).then(async r => {
        const text = await r.text();
        try { return JSON.parse(text); }
        catch { throw new Error(`伺服器回應異常 (${r.status})`); }
      });

      const [, json] = await Promise.all([minDelay, scanPromise]);

      if (json.status !== 'success') {
        setMessage(json.message || '事件感應失敗');
        setEventPhase('map');
        setEventLoading(false);
        return;
      }

      const data = json.data;
      setEventData(data);
      const firstLayer = data.layers?.find(l => l.layer === data.current_layer);
      setEventText(firstLayer?.text || '感應到異常靈氣波動');
      setEventLoading(false);
      setEventPhase('inference');
    } catch (err) {
      console.error('[事件掃描] 失敗:', err);
      const msg = err?.message || '天地法則紊亂，感應失敗';
      setMessage(msg.length <= 20 ? msg : '天地法則紊亂，感應失敗');
      console.warn('[事件掃描] 原始錯誤:', msg);
      setEventPhase('map');
      setEventLoading(false);
    }
  };

  const handleEventAction = async (action) => {
    if (!eventData?.player_event_id || eventLoading) return;

    if (action === 'jade') {
      setJadeNote('');
      setEventPhase('jade');
      return;
    }

    setEventLoading(true);

    try {
      const res = await fetch('/api/explore/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_event_id: eventData.player_event_id, player_id: player.id, action }),
      });
      const json = await res.json();

      if (json.status !== 'success') {
        setAlertFeedback({ text: json.message || '動作失敗', positive: false });
        setTimeout(() => setAlertFeedback(null), 2000);
        setEventLoading(false);
        return;
      }

      const d = json.data;

      if (d.phase === 'completed') {
        closeEvent();
        return;
      }

      setEventData(prev => ({
        ...prev,
        current_layer: d.current_layer,
        alert_level:   d.alert_level,
        phase:         d.phase,
      }));

      if (!d.was_correct) {
        setAlertFeedback({ text: `驚動值 +${d.alert_level - (eventData.alert_level ?? 0)}`, positive: false });
        setTimeout(() => setAlertFeedback(null), 1800);
      } else {
        setAlertFeedback({ text: '此舉甚妙', positive: true });
        setTimeout(() => setAlertFeedback(null), 1400);
      }

      if (d.phase === 'interaction') {
        setEventText('推演完畢，天機已明——');
        setEventPhase('interaction');
      } else if (d.next_layer_text) {
        setEventText(d.next_layer_text);
      }
    } catch (err) {
      console.error('[事件動作] 失敗:', err);
      setAlertFeedback({ text: '天地法則紊亂', positive: false });
      setTimeout(() => setAlertFeedback(null), 2000);
    }

    setEventLoading(false);
  };

  const handleResolve = async () => {
    if (!eventData?.player_event_id || eventLoading) return;
    setEventLoading(true);
    try {
      const res = await fetch('/api/explore/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_event_id: eventData.player_event_id, player_id: player.id }),
      });
      const json = await res.json();
      if (json.status !== 'success') {
        setAlertFeedback({ text: json.message || '結算失敗', positive: false });
        setTimeout(() => setAlertFeedback(null), 2000);
        setEventLoading(false);
        return;
      }
      setResolveResult(json.data);
      setEventPhase('result');
    } catch (err) {
      console.error('[事件結算] 失敗:', err);
    }
    setEventLoading(false);
  };

  const handleJadeConfirm = async () => {
    if (!eventData?.player_event_id || eventLoading) return;
    setEventLoading(true);
    try {
      const res = await fetch('/api/explore/jade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_event_id: eventData.player_event_id, player_id: player.id, player_note: jadeNote || null }),
      });
      const json = await res.json();
      if (json.status !== 'success') {
        setAlertFeedback({ text: json.message || '刻入失敗', positive: false });
        setTimeout(() => setAlertFeedback(null), 2000);
        setEventPhase(eventData.phase === 'interaction' ? 'interaction' : 'inference');
        setEventLoading(false);
        return;
      }
      setResolveResult({ jade: true, message: json.data.message, tier: eventData.event_tier, attribute: eventData.event_attribute });
      setEventPhase('result');
    } catch (err) {
      console.error('[玉簡刻入] 失敗:', err);
    }
    setEventLoading(false);
  };

  const closeEvent = () => {
    if (pendingNodeId) setEvents(prev => prev.filter(e => e.id !== pendingNodeId));
    setPendingNodeId(null);
    setEventPhase('map');
    setEventData(null);
    setEventText('');
    setTypedText('');
    setResolveResult(null);
    setJadeNote('');
    setAlertFeedback(null);
    setEventLoading(false);
  };

  // ── Render ──────────────────────────────────────────────────────
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
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        .maplibregl-ctrl-bottom-right,
        .maplibregl-ctrl-bottom-left,
        .maplibregl-ctrl-top-right,
        .maplibregl-ctrl-top-left { display: none !important; }
      `}</style>

      {/* 0. MapLibre map */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0 pointer-events-none" style={{ width: '100%', height: '100%' }} />

      {/* 1. Zone atmosphere */}
      <div className="absolute inset-0 z-[1] pointer-events-none transition-all duration-[2000ms]" style={{ backgroundColor: atmosphereColor }} />

      {/* 2. Breadcrumb arrows */}
      {breadcrumbs.map((bc, i) => {
        const rad = bc.angle * Math.PI / 180, sin = Math.sin(rad), cos = -Math.cos(rad);
        const scale = 1 / Math.max(Math.abs(sin), Math.abs(cos));
        const ex = Math.min(Math.max(50 + sin * scale * 44, 5), 95);
        const ey = Math.min(Math.max(50 + cos * scale * 44, 5), 95);
        return (
          <div key={i} className="absolute z-[15] pointer-events-none flex flex-col items-center gap-[2px]" style={{ left: `${ex}%`, top: `${ey}%`, transform: 'translate(-50%,-50%)' }}>
            <div className="w-3 h-3 border-r-2 border-t-2 border-[#FFD700] opacity-70" style={{ transform: `rotate(${bc.angle + 45}deg)` }} />
            <span className="text-[9px] text-[#FFD700]/60 tracking-wider leading-none">{bc.dist_desc}</span>
          </div>
        );
      })}

      {/* 3. LBS nodes */}
      {events.map((ev) => {
        const isAmbush = ev.isAmbush;
        const dotSize  = isAmbush ? 'w-6 h-6' : 'w-4 h-4';
        const pingSize = isAmbush ? 'w-12 h-12' : 'w-8 h-8';
        const glowStyle = isAmbush
          ? { backgroundColor: ev.color, boxShadow: `0 0 20px ${ev.glow}, 0 0 45px ${ev.glow}, 0 0 70px ${ev.glow}` }
          : { backgroundColor: ev.color, boxShadow: `0 0 15px ${ev.glow}, 0 0 30px ${ev.glow}` };
        return (
          <div key={ev.id} className="absolute flex flex-col items-center justify-center cursor-pointer z-20" style={{ top: ev.top, left: ev.left, transform: 'translate(-50%, -50%)' }} onClick={(e) => { e.stopPropagation(); openNodeModal(ev); }}>
            <div className="relative flex items-center justify-center">
              <div className={`absolute ${pingSize} rounded-full opacity-40 ${isAmbush ? 'animate-[ping-fast_0.7s_infinite]' : 'animate-ping'}`} style={{ backgroundColor: ev.color }} />
              <div className={`${dotSize} rounded-full relative z-10`} style={glowStyle} />
            </div>
            <span className={`mt-2 text-[12px] tracking-widest drop-shadow-[0_0_8px_rgba(0,0,0,1)] bg-black/50 px-2 py-0.5 rounded border ${isAmbush ? 'text-[#FF3B30] border-[#FF3B30]/40' : 'text-white/90 border-white/10'}`}>
              {isAmbush ? `⚠ ${ev.name}` : ev.name}
            </span>
          </div>
        );
      })}

      {/* 4. Player orb */}
      <div
        className={`absolute z-30 cursor-pointer transition-transform duration-500 ${isScanning ? 'scale-110' : isPressing ? 'scale-90' : isTuning ? 'scale-100' : 'active:scale-95'}`}
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
        onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        {isScanning && (
          <>
            <div className="absolute rounded-full border border-[#00E5FF]/60 animate-[ripple-out_2s_infinite_ease-out]" style={{ inset: '-4px', animationDelay: '0s' }} />
            <div className="absolute rounded-full border border-[#00E5FF]/40 animate-[ripple-out_2s_infinite_ease-out]" style={{ inset: '-4px', animationDelay: '0.7s' }} />
            <div className="absolute rounded-full border border-[#00E5FF]/20 animate-[ripple-out_2s_infinite_ease-out]" style={{ inset: '-4px', animationDelay: '1.4s' }} />
          </>
        )}
        {(isPressing || isTuning) && (
          <>
            <div className="absolute rounded-full border border-[#FFD700]/60 animate-[ripple-in_1.5s_infinite_ease-in]" style={{ inset: '-4px', animationDelay: '0s' }} />
            <div className="absolute rounded-full border border-[#FFD700]/40 animate-[ripple-in_1.5s_infinite_ease-in]" style={{ inset: '-4px', animationDelay: '0.5s' }} />
            <div className="absolute rounded-full border border-[#FFD700]/20 animate-[ripple-in_1.5s_infinite_ease-in]" style={{ inset: '-4px', animationDelay: '1.0s' }} />
          </>
        )}
        <div
          className="relative w-[52px] h-[52px] rounded-full flex items-center justify-center transition-all duration-700"
          style={isScanning ? { background: 'radial-gradient(circle at 35% 35%, rgba(180,240,255,0.9), rgba(0,229,255,0.5) 50%, rgba(0,100,160,0.3))', boxShadow: '0 0 20px rgba(0,229,255,0.9), 0 0 50px rgba(0,229,255,0.5)' }
            : (isPressing || isTuning) ? { background: 'radial-gradient(circle at 35% 35%, rgba(255,240,160,0.9), rgba(255,215,0,0.5) 50%, rgba(160,100,0,0.3))', boxShadow: '0 0 20px rgba(255,215,0,0.9), 0 0 50px rgba(255,215,0,0.5)' }
            : { background: 'radial-gradient(circle at 35% 35%, rgba(180,240,255,0.7), rgba(0,200,220,0.35) 50%, rgba(0,60,100,0.2))', boxShadow: '0 0 12px rgba(0,229,255,0.6), 0 0 30px rgba(0,229,255,0.25)' }}
        >
          <div className="absolute top-[18%] left-[22%] w-[28%] h-[18%] rounded-full bg-white/60 blur-[2px]" />
          <div className="absolute inset-[6px] rounded-full border border-white/20 animate-[spin_8s_linear_infinite]" style={{ borderStyle: 'dashed' }} />
        </div>
      </div>

      {/* 5. Status message */}
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom,20px)+40px)] bg-black/60 backdrop-blur-sm px-6 py-2 rounded-full border border-[#00E5FF]/20 text-[#00E5FF] text-[14px] tracking-[8px] opacity-90 font-light shadow-[0_0_15px_rgba(0,229,255,0.1)] z-30 pointer-events-none">
        {message}
      </div>

      {/* 6. Legacy node modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-[#12141A] border border-[#00E5FF]/30 rounded-2xl w-full max-w-[360px] shadow-[0_0_40px_rgba(0,229,255,0.15)] flex flex-col overflow-hidden text-center">
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#00E5FF] to-transparent opacity-50" />
            <div className="p-7">
              {activeModal.step === 'info' && (() => {
                const nd = activeModal.node;
                const isSpring = nd.nodeType === '靈泉';
                const isPlayer = nd.nodeType === '道友';
                const accentColor = isPlayer ? '#C084FC' : '#00E5FF';
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
                        <p className="text-[#00E5FF]/60 text-sm tracking-widest">神識感應天地異象，觸發探索事件</p>
                      </div>
                    )}
                    <div className="flex gap-3">
                      <button onClick={closeModal} className="flex-1 py-3 rounded-xl border border-white/20 text-gray-400 text-base tracking-widest hover:bg-white/5 active:scale-95 transition-all">
                        離去
                      </button>
                      {isPlayer ? (
                        <>
                          <button onClick={() => { const node = activeModal.node; closeModal(); triggerCombat({ source: 'explore', pvpType: 'spar', nodeName: node.name, targetPlayerId: node.target_player_id, onComplete: () => setEvents(prev => prev.filter(e => e.id !== node.id)) }); }} className="flex-1 py-3 rounded-xl bg-[#C084FC]/10 border border-[#C084FC]/50 text-[#C084FC] text-base tracking-widest hover:bg-[#C084FC]/20 active:scale-95 transition-all">切磋</button>
                          <button onClick={() => { const node = activeModal.node; closeModal(); triggerCombat({ source: 'explore', pvpType: 'plunder', nodeName: node.name, targetPlayerId: node.target_player_id, onComplete: () => setEvents(prev => prev.filter(e => e.id !== node.id)) }); }} className="flex-1 py-3 rounded-xl bg-[#FF9500]/10 border border-[#FF9500]/50 text-[#FF9500] text-base tracking-widest hover:bg-[#FF9500]/20 active:scale-95 transition-all">掠奪</button>
                        </>
                      ) : (
                        <button
                          onClick={isSpring ? confirmExecuteNode : () => startEventScan(nd)}
                          className="flex-1 py-3 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/50 text-[#00E5FF] text-base tracking-widest hover:bg-[#00E5FF]/20 active:scale-95 transition-all"
                        >
                          {isSpring ? '汲取' : '探索'}
                        </button>
                      )}
                    </div>
                  </>
                );
              })()}
              {activeModal.step === 'loading' && (
                <div className="py-8 flex flex-col items-center">
                  <div className="w-10 h-10 border-2 border-[#00E5FF] border-t-transparent rounded-full animate-spin mb-5" />
                  <p className="text-[#00E5FF] text-base tracking-widest animate-pulse">神識交匯中...</p>
                </div>
              )}
              {activeModal.step === 'result' && (
                <>
                  {activeModal.battleLog ? (
                    <>
                      <h3 className={`text-2xl mb-4 font-bold tracking-widest ${activeModal.outcome === 'win' ? 'text-[#FFD700]' : 'text-[#FF3B30]'}`}>{activeModal.outcome === 'win' ? '⚔ 勝利' : '💀 重傷'}</h3>
                      <div ref={battleLogScrollRef} className="bg-black/60 border border-white/10 rounded-xl p-4 mb-4 max-h-[240px] overflow-y-auto text-left space-y-1.5 font-mono text-[13px] leading-relaxed">
                        {activeModal.battleLog.slice(0, visibleLogLines).map((entry, i) => <p key={i} style={{ color: LOG_LINE_COLOR[entry.type] ?? '#9CA3AF' }}>{entry.text}</p>)}
                      </div>
                      <div className="bg-black/40 rounded-xl p-4 mb-4 border border-white/5 text-sm space-y-2">
                        {activeModal.expGained > 0 && <p className="text-[#32D74B] tracking-widest">靈氣 +{activeModal.expGained}</p>}
                        {activeModal.itemDropped && <p className="text-[#FFD700] tracking-widest">獲得【{activeModal.itemDropped}】×1</p>}
                        {activeModal.prestigeDelta > 0 && <p className="text-[#C084FC] tracking-widest">聲望 +{activeModal.prestigeDelta}</p>}
                        {activeModal.shaqiDelta > 0 && <p className="text-[#FF9500] tracking-widest">煞氣 +{activeModal.shaqiDelta}</p>}
                        {activeModal.itemLost && <p className="text-[#FF3B30] tracking-widest">損失【{activeModal.itemLost}】×1</p>}
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="text-[#FFD700] text-2xl mb-4 font-bold tracking-widest">探索結果</h3>
                      <p className="text-white/90 text-base mb-8 leading-relaxed tracking-wider">{activeModal.resultMessage}</p>
                    </>
                  )}
                  <button onClick={closeModal} className="w-full py-3 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/50 text-[#00E5FF] text-base tracking-widest hover:bg-[#00E5FF]/20 active:scale-95 transition-all">收下</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          7. Event system overlay (全螢幕，z-[60])
         ══════════════════════════════════════════════════════════ */}

      {/* 7a. Scanning animation */}
      {eventPhase === 'scanning' && (
        <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-black/92">
          <div className="relative flex items-center justify-center mb-10">
            <div className="absolute w-32 h-32 rounded-full border border-[#00E5FF]/30 animate-[ripple-out_2s_0.0s_infinite_ease-out]" />
            <div className="absolute w-32 h-32 rounded-full border border-[#00E5FF]/20 animate-[ripple-out_2s_0.7s_infinite_ease-out]" />
            <div className="absolute w-32 h-32 rounded-full border border-[#00E5FF]/10 animate-[ripple-out_2s_1.4s_infinite_ease-out]" />
            <div className="w-16 h-16 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/40 flex items-center justify-center" style={{ boxShadow: '0 0 20px rgba(0,229,255,0.3)' }}>
              <span className="text-2xl">🔮</span>
            </div>
          </div>
          <p className="text-[#00E5FF] text-base tracking-[6px] animate-pulse">神識感應天地…</p>
        </div>
      )}

      {/* 7b. Inference phase */}
      {eventPhase === 'inference' && eventData && (
        <div className="absolute inset-0 z-[60] flex flex-col bg-[#070A0F]/96" style={{ paddingTop: 'env(safe-area-inset-top, 16px)' }}>

          {/* Top bar */}
          <div className="flex items-center justify-between px-5 pt-3 pb-3 border-b border-white/5 shrink-0">
            <div className="px-3 py-1 rounded-full text-[13px] font-bold tracking-[3px]"
              style={{ color: TIER_COLOR[eventData.event_tier]?.text, border: `1px solid ${TIER_COLOR[eventData.event_tier]?.border}`, background: TIER_COLOR[eventData.event_tier]?.bg }}>
              {TIER_LABEL[eventData.event_tier] ?? 'T?'}品
            </div>

            <div className="flex items-center gap-1.5">
              {Array.from({ length: eventData.total_layers }, (_, i) => {
                const layerNum = i + 1;
                const isCurrent = layerNum === eventData.current_layer;
                const isPast    = layerNum < eventData.current_layer;
                return (
                  <div key={i} className={`rounded-full transition-all duration-300 ${isCurrent ? 'w-2.5 h-2.5 bg-[#00E5FF]' : isPast ? 'w-2 h-2 bg-[#00E5FF]/40' : 'w-1.5 h-1.5 bg-white/15'}`}
                    style={isCurrent ? { boxShadow: '0 0 5px rgba(0,229,255,0.8)' } : {}} />
                );
              })}
              <span className="text-white/35 text-[11px] ml-1 tabular-nums">{eventData.current_layer}/{eventData.total_layers}</span>
            </div>

            <div className="px-3 py-1 rounded-full text-[13px] tracking-[3px]"
              style={{ color: ATTR_COLOR[eventData.event_attribute], border: `1px solid ${ATTR_COLOR[eventData.event_attribute]}55`, background: `${ATTR_COLOR[eventData.event_attribute]}11` }}>
              {ATTR_ICON[eventData.event_attribute]} {ATTR_LABEL[eventData.event_attribute]}
            </div>
          </div>

          {/* Alert bar */}
          <div className="px-5 pt-2 pb-1 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-white/35 tracking-[2px] shrink-0">驚動</span>
              <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${eventData.alert_level ?? 0}%`, backgroundColor: alertColor(eventData.alert_level ?? 0), boxShadow: `0 0 5px ${alertColor(eventData.alert_level ?? 0)}80` }} />
              </div>
              <span className="text-[12px] font-mono tabular-nums shrink-0" style={{ color: alertColor(eventData.alert_level ?? 0) }}>
                {eventData.alert_level >= 100 ? '！' : `${eventData.alert_level ?? 0}`}
              </span>
            </div>
          </div>

          {/* Layer text — scrollable */}
          <div className="flex-1 overflow-y-auto px-5 py-3 min-h-0">
            {alertFeedback && (
              <div className="mb-2 text-center animate-[fade-up_0.2s_ease-out]"
                style={{ color: alertFeedback.positive ? '#32D74B' : '#FF6B35' }}>
                <span className="text-[13px] tracking-widest">{alertFeedback.text}</span>
              </div>
            )}

            <div className="bg-black/40 border border-[#00E5FF]/15 rounded-2xl p-4">
              <p className="text-white/85 text-[15px] leading-[1.8] tracking-wider">
                {typedText}
                {typedText.length < eventText.length && (
                  <span className="opacity-60 animate-pulse">▌</span>
                )}
              </p>
            </div>

            {eventData.layers?.filter(l => l.layer > eventData.current_layer).map(l => (
              <div key={l.layer} className="mt-3 bg-black/20 border border-white/5 rounded-xl p-4">
                <div className="text-[10px] text-white/20 tracking-[3px] mb-1.5">第 {l.layer} 層</div>
                <p className="text-white/20 text-[13px] leading-relaxed tracking-wider italic">此地尚有變化，神識無法穿透…</p>
              </div>
            ))}
          </div>

          {/* Action buttons — 3 + 2 layout */}
          <div className="px-4 pb-[calc(env(safe-area-inset-bottom,12px)+4px)] pt-2 border-t border-white/5 shrink-0">
            {/* Primary actions */}
            <div className="grid grid-cols-3 gap-2 mb-2">
              {ACTIONS.filter(a => ['search','wait','stone'].includes(a.code)).map(({ code, label, icon, cost, costColor }) => (
                <button
                  key={code}
                  disabled={eventLoading}
                  onClick={() => handleEventAction(code)}
                  className="flex flex-col items-center py-3 rounded-xl border border-white/10 active:scale-95 transition-all duration-150 disabled:opacity-40"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                >
                  <span className="text-lg mb-1">{icon}</span>
                  <span className="text-[12px] text-white/80 tracking-wide leading-tight">{label}</span>
                  <span className="text-[10px] mt-1 leading-none" style={{ color: costColor }}>{cost}</span>
                </button>
              ))}
            </div>
            {/* Exit actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={eventLoading}
                onClick={() => handleEventAction('retreat')}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 active:scale-95 transition-all duration-150 disabled:opacity-40"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <span className="text-base">🚶</span>
                <div className="text-left">
                  <div className="text-[12px] text-white/50 tracking-wide leading-none">撤退</div>
                  <div className="text-[10px] text-white/25 mt-0.5">無消耗</div>
                </div>
              </button>
              <button
                disabled={eventLoading}
                onClick={() => { setJadeNote(''); setEventPhase('jade'); }}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#C084FC]/25 active:scale-95 transition-all duration-150 disabled:opacity-40"
                style={{ background: 'rgba(192,132,252,0.06)' }}
              >
                <span className="text-base">📜</span>
                <div className="text-left">
                  <div className="text-[12px] text-[#C084FC]/80 tracking-wide leading-none">刻入玉簡</div>
                  <div className="text-[10px] text-[#C084FC]/40 mt-0.5">空白玉簡×1</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7c. Interaction phase */}
      {eventPhase === 'interaction' && eventData && (
        <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-[#070A0F]/96 px-6" style={{ paddingTop: 'env(safe-area-inset-top, 16px)', paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>

          {/* Tier + attribute row */}
          <div className="flex items-center gap-3 mb-8">
            <div className="px-3 py-1 rounded-full text-sm font-bold tracking-[4px]"
              style={{ color: TIER_COLOR[eventData.event_tier]?.text, border: `1px solid ${TIER_COLOR[eventData.event_tier]?.border}`, background: TIER_COLOR[eventData.event_tier]?.bg }}>
              {TIER_LABEL[eventData.event_tier] ?? 'T?'}品
            </div>
            <div className="px-3 py-1 rounded-full text-sm tracking-[4px]"
              style={{ color: ATTR_COLOR[eventData.event_attribute], border: `1px solid ${ATTR_COLOR[eventData.event_attribute]}55`, background: `${ATTR_COLOR[eventData.event_attribute]}11` }}>
              {ATTR_ICON[eventData.event_attribute]} {ATTR_LABEL[eventData.event_attribute]}
            </div>
          </div>

          {/* Text */}
          <div className="w-full bg-black/40 border border-[#FFD700]/15 rounded-2xl p-6 mb-8">
            <p className="text-white/80 text-[15px] leading-[1.9] tracking-wider text-center">
              {typedText}
              {typedText.length < eventText.length && <span className="opacity-60 animate-pulse">▌</span>}
            </p>
            {/* Alert summary */}
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[12px]">
              <span className="text-white/30 tracking-[3px]">驚動值</span>
              <span className="font-mono" style={{ color: alertColor(eventData.alert_level ?? 0) }}>{eventData.alert_level ?? 0}</span>
            </div>
          </div>

          {/* Feedback flash */}
          {alertFeedback && (
            <div className="mb-4 animate-[fade-up_0.2s_ease-out]" style={{ color: alertFeedback.positive ? '#32D74B' : '#FF6B35' }}>
              <span className="text-sm tracking-widest">{alertFeedback.text}</span>
            </div>
          )}

          {/* Buttons */}
          <div className="w-full space-y-3">
            <button
              disabled={eventLoading}
              onClick={handleResolve}
              className="w-full py-4 rounded-xl bg-[#FFD700]/12 border border-[#FFD700]/40 text-[#FFD700] text-base tracking-[6px] hover:bg-[#FFD700]/20 active:scale-95 transition-all disabled:opacity-40"
            >
              {eventLoading ? '施為中…' : '⚡ 施展手段'}
            </button>
            <div className="flex gap-3">
              <button
                disabled={eventLoading}
                onClick={() => { setJadeNote(''); setEventPhase('jade'); }}
                className="flex-1 py-3 rounded-xl bg-[#C084FC]/8 border border-[#C084FC]/30 text-[#C084FC] text-sm tracking-[4px] hover:bg-[#C084FC]/15 active:scale-95 transition-all disabled:opacity-40"
              >
                📜 刻入玉簡
              </button>
              <button
                disabled={eventLoading}
                onClick={() => handleEventAction('retreat')}
                className="flex-1 py-3 rounded-xl border border-white/15 text-white/40 text-sm tracking-[4px] hover:bg-white/5 active:scale-95 transition-all disabled:opacity-40"
              >
                🚶 撤退
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7d. Result phase */}
      {eventPhase === 'result' && resolveResult && (() => {
        const isJade = resolveResult.jade;
        const display = isJade
          ? { title: '玉簡刻成', color: '#C084FC', icon: '📜' }
          : resultDisplay(resolveResult.result, resolveResult.rare_triggered);
        const stones = resolveResult.stones_gained ?? 0;
        return (
          <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-[#070A0F]/96 px-6" style={{ paddingTop: 'env(safe-area-inset-top, 16px)', paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
            {/* Result icon */}
            <div className="text-6xl mb-5 animate-[fade-up_0.4s_ease-out]">{display.icon}</div>
            <h2 className="text-3xl font-bold tracking-[6px] mb-10 animate-[fade-up_0.4s_0.1s_ease-out_both]" style={{ color: display.color }}>{display.title}</h2>

            {/* Rewards card */}
            <div className="w-full rounded-2xl border p-6 mb-8 animate-[fade-up_0.4s_0.2s_ease-out_both]"
              style={{ borderColor: `${display.color}30`, background: `${display.color}08` }}>
              {isJade ? (
                <p className="text-white/70 text-sm leading-relaxed tracking-wider text-center">{resolveResult.message}</p>
              ) : (
                <div className="space-y-3 text-sm">
                  {stones > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-white/50 tracking-widest">靈石</span>
                      <span className="text-[#FFD700] font-mono tracking-wider">+{stones}</span>
                    </div>
                  )}
                  {resolveResult.rare_triggered && (
                    <div className="flex items-center justify-between border border-[#C084FC]/30 rounded-lg px-3 py-2 bg-[#C084FC]/8">
                      <span className="text-[#C084FC] tracking-widest">稀有追加</span>
                      <span className="text-[#C084FC]">✦</span>
                    </div>
                  )}
                  {(resolveResult.items ?? []).length > 0 && resolveResult.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-white/50 tracking-widest">{item.name}</span>
                      <span className="text-[#32D74B]">×1</span>
                    </div>
                  ))}
                  {stones === 0 && !resolveResult.rare_triggered && !(resolveResult.items?.length) && (
                    <p className="text-white/30 text-center tracking-widest py-2">此番空手而歸</p>
                  )}
                  {resolveResult.result === 'nothing' && (
                    <p className="text-white/40 text-center tracking-widest text-xs mt-1">此地靈機已散</p>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={closeEvent}
              className="w-full py-4 rounded-xl border border-white/20 text-white/60 text-base tracking-[6px] hover:bg-white/5 active:scale-95 transition-all animate-[fade-up_0.4s_0.3s_ease-out_both]"
            >
              返回地圖
            </button>
          </div>
        );
      })()}

      {/* 7e. Jade confirm */}
      {eventPhase === 'jade' && eventData && (
        <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-[#070A0F]/96 px-6" style={{ paddingTop: 'env(safe-area-inset-top, 16px)', paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
          <div className="text-4xl mb-5">📜</div>
          <h3 className="text-xl font-bold tracking-[6px] text-[#C084FC] mb-3">刻入玉簡</h3>
          <p className="text-white/40 text-sm tracking-wider text-center mb-8 leading-relaxed">
            將此 <span style={{ color: TIER_COLOR[eventData.event_tier]?.text }}>{TIER_LABEL[eventData.event_tier]}品</span>
            {' '}<span style={{ color: ATTR_COLOR[eventData.event_attribute] }}>{ATTR_LABEL[eventData.event_attribute]}屬</span> 事件刻入玉簡，<br />
            可於天機閣出售或留存備用。
          </p>

          {/* Note input */}
          <div className="w-full mb-8">
            <textarea
              value={jadeNote}
              onChange={e => setJadeNote(e.target.value)}
              placeholder="備注（選填）— 例：火屬強烈，可能有妖獸"
              maxLength={60}
              rows={3}
              className="w-full bg-black/40 border border-[#C084FC]/25 rounded-xl px-4 py-3 text-white/70 text-sm tracking-wider placeholder-white/20 resize-none focus:outline-none focus:border-[#C084FC]/50"
            />
            <div className="text-right text-[11px] text-white/20 mt-1">{jadeNote.length}/60</div>
          </div>

          <div className="w-full space-y-3">
            <button
              disabled={eventLoading}
              onClick={handleJadeConfirm}
              className="w-full py-4 rounded-xl bg-[#C084FC]/12 border border-[#C084FC]/40 text-[#C084FC] text-base tracking-[6px] hover:bg-[#C084FC]/20 active:scale-95 transition-all disabled:opacity-40"
            >
              {eventLoading ? '刻入中…' : '確認刻入'}
            </button>
            <button
              disabled={eventLoading}
              onClick={() => setEventPhase(eventData.phase === 'interaction' ? 'interaction' : 'inference')}
              className="w-full py-3 rounded-xl border border-white/15 text-white/40 text-sm tracking-[4px] hover:bg-white/5 active:scale-95 transition-all disabled:opacity-40"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

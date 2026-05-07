// server/services/exploreService.js
import * as db from '../config/db.js';
import { calculateOfflineDelta } from '../lib/recovery.js';

// ── Constants ────────────────────────────────────────────────────

const ATTRIBUTE_WEIGHTS = {
  financial: { metal: 40, wood:  5, water: 25, fire: 10, earth: 20 },
  park:      { metal:  5, wood: 40, water: 15, fire: 10, earth: 30 },
  food:      { metal: 10, wood: 10, water: 25, fire: 40, earth: 15 },
  workshop:  { metal: 35, wood:  5, water: 10, fire: 15, earth: 35 },
  unknown:   { metal: 20, wood: 20, water: 20, fire: 20, earth: 20 },
};

const TIER_WEIGHTS = { 1: 35, 2: 30, 3: 20, 4: 10, 5: 5 };

// alert increment per tier when player picks wrong action (§4.3)
const TIER_ALERT_INCREMENT = { 1: 15, 2: 20, 3: 30, 4: 40, 5: 50 };

// spirit stone cost for the stone action (design doc §12.5 specifies "靈石" but no number;
// using tier×5 as a cost that's breakeven against normal reward floor)
const STONE_COST_BY_TIER = { 1: 5, 2: 10, 3: 15, 4: 20, 5: 25 };

// EP cost per action (design doc §12.5 + line 68: "每次動作選擇 → 消耗 3（深入探查消耗 5）")
const EP_COST = { search: 5, wait: 3, stone: 0, retreat: 0 };

const STONE_RANGE = {
  good:   { 1: [10, 30],  2: [25, 60],  3: [50, 120],  4: [100, 250], 5: [200, 500] },
  normal: { 1: [5,  15],  2: [10, 30],  3: [20, 60],   4: [40,  120], 5: [80,  200] },
};

const GOOD_OUTCOMES   = new Set(['good_drop', 'rare_drop', 'good_trade', 'full_clear', 'good']);
const BAD_OUTCOMES    = new Set(['failure', 'nothing', 'trap', 'downgrade', 'bad']);

// ── Pure helpers ─────────────────────────────────────────────────

function weightedRandom(weights) {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  if (entries.length === 0) return Object.keys(weights)[0];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let rand = Math.random() * total;
  for (const [key, w] of entries) {
    rand -= w;
    if (rand <= 0) return key;
  }
  return entries[0][0];
}

function rollAttribute(poiType, weather) {
  const base = { ...(ATTRIBUTE_WEIGHTS[poiType] ?? ATTRIBUTE_WEIGHTS.unknown) };
  if (weather === 'sunny') base.fire  = Math.round(base.fire  * 1.3);
  if (weather === 'rainy') { base.water = Math.round(base.water * 1.5); base.fire = Math.round(base.fire * 0.6); }
  if (weather === 'windy') base.metal = Math.round(base.metal * 1.2);
  return weightedRandom(base);
}

function rollTier() {
  return parseInt(weightedRandom(TIER_WEIGHTS), 10);
}

// spec §3.1
function calcStartLayer(si, hiddenLevel, totalLayers) {
  const delta = si - hiddenLevel;
  return Math.min(Math.max(1, 1 + Math.floor(delta / 25)), totalLayers);
}

// spec §5.2 action_mod table
function calcActionMod(correctCount, totalVisited) {
  const rate = totalVisited === 0 ? 0.5 : correctCount / totalVisited;
  const good = rate >= 1.0 ? 2.0 : rate >= 0.75 ? 1.5 : rate >= 0.5 ? 1.0 : rate >= 0.25 ? 0.6 : 0.3;
  const bad  = rate >= 1.0 ? 0.3 : rate >= 0.75 ? 0.6 : rate >= 0.5 ? 1.0 : rate >= 0.25 ? 1.5 : 2.0;
  return { good, bad };
}

// spec §5 full outcome calculation
function calcOutcome(event, pe) {
  const { outcome_weights, base_rare_rate } = event;
  const { correct_count, total_visited, alert_level, start_layer } = pe;

  if (alert_level >= 100) {
    return { result: outcome_weights.worst_result ?? 'failure', rare_triggered: false };
  }

  const { good: good_mod, bad: bad_mod } = calcActionMod(correct_count, total_visited);
  const layer_mod = 1.0 + (start_layer - 1) * 0.2;

  let alert_good = 1.0, alert_normal = 1.0;
  if (alert_level >= 60)      { alert_good = 0.0; alert_normal = 0.5; }
  else if (alert_level >= 30) { alert_good = 0.5; alert_normal = 0.8; }

  const rand = () => 0.85 + Math.random() * 0.30;

  const final_weights = {};
  for (const [outcome, base_w] of Object.entries(outcome_weights)) {
    if (outcome === 'worst_result') continue;
    let w = base_w;
    if (GOOD_OUTCOMES.has(outcome))      w = w * good_mod * layer_mod * alert_good  * rand();
    else if (BAD_OUTCOMES.has(outcome))  w = w * bad_mod               * rand();
    else                                 w = w * alert_normal           * rand();
    final_weights[outcome] = Math.max(0, w);
  }

  const result = weightedRandom(final_weights);

  const rate = total_visited === 0 ? 0.5 : correct_count / total_visited;
  const rare_rate = base_rare_rate * (1 + rate) * layer_mod;
  const rare_triggered = Math.random() < rare_rate;

  return { result, rare_triggered };
}

function calcStonesReward(tier, result, attribute) {
  const bucket = GOOD_OUTCOMES.has(result) ? 'good' : GOOD_OUTCOMES.has(result) || BAD_OUTCOMES.has(result) ? null : 'normal';
  if (!bucket) return 0;
  const [min, max] = (STONE_RANGE[bucket]?.[tier]) ?? [0, 0];
  let amount = Math.floor(min + Math.random() * (max - min + 1));
  if (attribute === 'metal') amount = Math.round(amount * 1.5);
  return amount;
}

function resultMessage(result, stones) {
  if (result === 'good_drop' || result === 'good' || result === 'good_trade' || result === 'full_clear') {
    return `收穫頗豐！獲得 ${stones} 靈石。`;
  }
  if (result === 'rare_drop') return `意外之喜！獲得稀有掉落，另獲 ${stones} 靈石。`;
  if (result === 'nothing')   return '此地已無靈機，空手而歸。';
  if (result === 'failure')   return '行動失敗，有所損傷。';
  if (result === 'trap')      return '中計了！受到些許損傷。';
  if (result === 'downgrade') return '機緣已散，事件降階。';
  if (stones > 0)             return `事件結束，獲得 ${stones} 靈石。`;
  return `事件結束（${result}）。`;
}

// ── Exported service functions ────────────────────────────────────

export async function scanForEvent(playerId, poiType, weather) {
  const pr = await db.query(
    `SELECT ep, max_ep, hp, max_hp, sp, max_sp, aura, god_sense, last_sync_time
     FROM players WHERE id = $1`,
    [playerId]
  );
  if (!pr.rows.length) throw new Error('找不到道友的命格');
  const player = pr.rows[0];

  const now = new Date();
  const after = calculateOfflineDelta(player, now);

  if (after.ep < 5) {
    await db.query(
      `UPDATE players SET hp=$1, sp=$2, ep=$3, last_sync_time=$4 WHERE id=$5`,
      [after.hp, after.sp, after.ep, now, playerId]
    );
    throw new Error('精力不足');
  }

  const attribute = rollAttribute(poiType, weather);
  const tier = rollTier();

  let er = await db.query(
    `SELECT * FROM events WHERE attribute=$1 AND tier=$2 ORDER BY used_count ASC, RANDOM() LIMIT 1`,
    [attribute, tier]
  );
  if (!er.rows.length) {
    er = await db.query(`SELECT * FROM events WHERE tier=$1 ORDER BY RANDOM() LIMIT 1`, [tier]);
  }
  if (!er.rows.length) {
    er = await db.query(`SELECT * FROM events ORDER BY RANDOM() LIMIT 1`);
  }
  if (!er.rows.length) throw new Error('事件池尚無資料，請稍後再試');

  const event = er.rows[0];
  const startLayer = calcStartLayer(player.god_sense, event.hidden_level, event.total_layers);

  // 清除舊的未完成 inference 事件（避免殘留累積）
  await db.query(
    `DELETE FROM player_events WHERE player_id=$1 AND phase='inference'`,
    [playerId]
  );

  const per = await db.query(
    `INSERT INTO player_events
       (player_id, event_id, current_layer, start_layer, correct_count,
        total_visited, alert_level, phase, action_log)
     VALUES ($1, $2, $3, $3, 0, 0, 0, 'inference', '[]'::jsonb)
     RETURNING *`,
    [playerId, event.id, startLayer]
  );
  const playerEvent = per.rows[0];

  const newEp = Math.min(after.ep - 5, player.max_ep);
  await db.query(
    `UPDATE players SET hp=$1, sp=$2, ep=$3, last_sync_time=$4 WHERE id=$5`,
    [after.hp, after.sp, newEp, now, playerId]
  );
  await db.query(`UPDATE events SET used_count = used_count + 1 WHERE id=$1`, [event.id]);

  const progression = event.progression ?? {};
  const layers = [];
  for (let L = startLayer; L <= event.total_layers; L++) {
    const ld = progression[`L${L}`] ?? {};
    layers.push({
      layer:   L,
      text:    L === startLayer ? (ld.text ?? '感應到異常靈氣波動') : (ld.blur_text ?? '你隱約感覺此地有更深的變化，但神識無法穿透'),
      visible: L === startLayer,
    });
  }

  return {
    player_event_id: playerEvent.id,
    event_tier:     event.tier,
    event_attribute: attribute,
    start_layer:    startLayer,
    total_layers:   event.total_layers,
    current_layer:  startLayer,
    alert_level:    0,
    phase:          'inference',
    layers,
    ep_remaining:   newEp,
  };
}

export async function takeAction(playerEventId, playerId, action) {
  if (!['search', 'wait', 'stone', 'retreat'].includes(action)) {
    throw new Error('無效動作，可選：search / wait / stone / retreat');
  }

  const per = await db.query(
    `SELECT pe.*, e.progression, e.tier, e.total_layers, e.attribute
     FROM player_events pe
     JOIN events e ON e.id = pe.event_id
     WHERE pe.id=$1 AND pe.player_id=$2`,
    [playerEventId, playerId]
  );
  if (!per.rows.length) throw new Error('找不到進行中的事件');
  const pe = per.rows[0];

  if (pe.phase === 'completed') throw new Error('事件已結算');
  if (pe.phase === 'interaction') {
    if (action === 'retreat') {
      await db.query(
        `UPDATE player_events SET phase='completed', updated_at=NOW() WHERE id=$1`,
        [playerEventId]
      );
      return { result: 'retreat', message: '道友選擇撤退，安全離開此地。', phase: 'completed' };
    }
    throw new Error('互動期請使用結算介面（POST /api/explore/resolve）');
  }

  // retreat during inference
  if (action === 'retreat') {
    await db.query(
      `UPDATE player_events SET phase='completed', updated_at=NOW() WHERE id=$1`,
      [playerEventId]
    );
    return { result: 'retreat', message: '道友選擇撤退，安全離開此地。', phase: 'completed' };
  }

  // resource checks
  const pr = await db.query(
    `SELECT ep, max_ep, hp, max_hp, sp, max_sp, aura, spirit_stones, last_sync_time
     FROM players WHERE id=$1`,
    [playerId]
  );
  if (!pr.rows.length) throw new Error('找不到道友的命格');
  const player = pr.rows[0];

  const now = new Date();
  const after = calculateOfflineDelta(player, now);
  const epCost = EP_COST[action] ?? 3;

  if (epCost > 0 && after.ep < epCost) {
    await db.query(
      `UPDATE players SET hp=$1, sp=$2, ep=$3, last_sync_time=$4 WHERE id=$5`,
      [after.hp, after.sp, after.ep, now, playerId]
    );
    throw new Error('精力不足');
  }

  if (action === 'stone') {
    const cost = STONE_COST_BY_TIER[pe.tier] ?? 5;
    if (player.spirit_stones < cost) throw new Error(`需要 ${cost} 靈石方可試探`);
    await db.query(
      `UPDATE players SET spirit_stones = spirit_stones - $1 WHERE id=$2`,
      [cost, playerId]
    );
  }

  if (epCost > 0) {
    const newEp = Math.min(after.ep - epCost, player.max_ep);
    await db.query(
      `UPDATE players SET hp=$1, sp=$2, ep=$3, last_sync_time=$4 WHERE id=$5`,
      [after.hp, after.sp, newEp, now, playerId]
    );
  }

  // process layer action
  const layerData  = (pe.progression ?? {})[`L${pe.current_layer}`] ?? {};
  const isCorrect  = action === layerData.best_action;
  const alertAdd   = isCorrect ? 0 : (layerData.wrong_alert_add ?? TIER_ALERT_INCREMENT[pe.tier] ?? 15);

  const newAlert       = Math.min(100, pe.alert_level + alertAdd);
  const newCorrect     = pe.correct_count + (isCorrect ? 1 : 0);
  const newVisited     = pe.total_visited + 1;
  const newCurrentLayer = pe.current_layer + 1;
  const newPhase       = newCurrentLayer > pe.total_layers ? 'interaction' : 'inference';

  await db.query(
    `UPDATE player_events SET
       current_layer=$1, correct_count=$2, total_visited=$3,
       alert_level=$4, phase=$5,
       action_log = action_log || $6::jsonb,
       updated_at=NOW()
     WHERE id=$7`,
    [
      newCurrentLayer, newCorrect, newVisited, newAlert, newPhase,
      JSON.stringify({ layer: pe.current_layer, action, best_action: layerData.best_action, correct: isCorrect, alert_after: newAlert }),
      playerEventId,
    ]
  );

  let nextText = null;
  if (newPhase === 'inference') {
    const nd = (pe.progression ?? {})[`L${newCurrentLayer}`] ?? {};
    nextText = nd.text ?? '你繼續深入，感應到更強烈的靈氣波動。';
  }

  return {
    action_taken:      action,
    was_correct:       isCorrect,
    alert_level:       newAlert,
    correct_count:     newCorrect,
    total_visited:     newVisited,
    current_layer:     newCurrentLayer,
    phase:             newPhase,
    next_layer_text:   nextText,
    message: isCorrect
      ? '此舉甚妙，靈氣感應清晰了幾分。'
      : `動作有些不妥，驚動了此地靈氣。（驚動值 +${alertAdd}）`,
  };
}

export async function resolveEvent(playerEventId, playerId) {
  const per = await db.query(
    `SELECT pe.*, e.tier, e.attribute, e.total_layers, e.outcome_weights, e.base_rare_rate
     FROM player_events pe
     JOIN events e ON e.id = pe.event_id
     WHERE pe.id=$1 AND pe.player_id=$2`,
    [playerEventId, playerId]
  );
  if (!per.rows.length) throw new Error('找不到進行中的事件');
  const pe = per.rows[0];

  if (pe.phase !== 'interaction') throw new Error('事件尚未進入互動期');

  const { result, rare_triggered } = calcOutcome(
    { outcome_weights: pe.outcome_weights, base_rare_rate: pe.base_rare_rate },
    { correct_count: pe.correct_count, total_visited: pe.total_visited, alert_level: pe.alert_level, start_layer: pe.start_layer }
  );

  let stonesGained = 0;
  if (!BAD_OUTCOMES.has(result)) {
    stonesGained = calcStonesReward(pe.tier, result, pe.attribute);
  }

  if (stonesGained > 0) {
    await db.query(
      `UPDATE players SET spirit_stones = spirit_stones + $1 WHERE id=$2`,
      [stonesGained, playerId]
    );
  }

  await db.query(
    `UPDATE player_events SET phase='completed', updated_at=NOW() WHERE id=$1`,
    [playerEventId]
  );

  return {
    result,
    rare_triggered,
    stones_gained: stonesGained,
    message: resultMessage(result, stonesGained),
    phase: 'completed',
  };
}

export async function jadeEvent(playerEventId, playerId, playerNote) {
  const per = await db.query(
    `SELECT pe.*, e.tier, e.attribute, e.total_layers
     FROM player_events pe
     JOIN events e ON e.id = pe.event_id
     WHERE pe.id=$1 AND pe.player_id=$2`,
    [playerEventId, playerId]
  );
  if (!per.rows.length) throw new Error('找不到進行中的事件');
  const pe = per.rows[0];

  if (pe.phase === 'completed') throw new Error('事件已結算');

  // check & consume 空白玉簡
  const ir = await db.query(
    `SELECT pi.item_id, pi.quantity
     FROM player_inventory pi
     JOIN items i ON i.id = pi.item_id
     WHERE pi.player_id=$1 AND i.name='空白玉簡' AND pi.quantity > 0`,
    [playerId]
  );
  if (!ir.rows.length) throw new Error('需要空白玉簡方可刻錄，可前往坊市購買');

  const { item_id, quantity } = ir.rows[0];
  if (quantity <= 1) {
    await db.query(`DELETE FROM player_inventory WHERE player_id=$1 AND item_id=$2`, [playerId, item_id]);
  } else {
    await db.query(
      `UPDATE player_inventory SET quantity = quantity - 1 WHERE player_id=$1 AND item_id=$2`,
      [playerId, item_id]
    );
  }

  const snapshotLayer = Math.max(pe.start_layer, pe.current_layer - 1);
  const expires = new Date(Date.now() + 72 * 3600 * 1000);

  const jr = await db.query(
    `INSERT INTO jade_items
       (owner_id, event_id, event_tier, event_attribute, snapshot_layer,
        seller_correct_count, seller_total_layers, player_note, status, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'held', $9)
     RETURNING id`,
    [
      playerId, pe.event_id, pe.tier, pe.attribute, snapshotLayer,
      pe.correct_count, pe.total_visited, playerNote ?? null, expires,
    ]
  );

  await db.query(`DELETE FROM player_events WHERE id=$1`, [playerEventId]);

  return {
    jade_item_id:    jr.rows[0].id,
    event_tier:      pe.tier,
    event_attribute: pe.attribute,
    snapshot_layer:  snapshotLayer,
    message:         '事件已刻入玉簡，可至天機閣查閱或交易。',
  };
}

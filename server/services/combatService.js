// server/services/combatService.js
import * as db from '../config/db.js';
import { calculateOfflineDelta } from '../lib/recovery.js';

// ═══════════════════════════════════════════════════════════════════
// 【常數與預設值】
// ═══════════════════════════════════════════════════════════════════

const MAX_BATTLE_TIME = 60;   // 虛擬時間軸上限（秒）
const PLAYER_WEAPON_CD = 1.5; // 玩家預設攻擊冷卻（秒）

// 五行相剋關係表：attacker_element → [剋制的元素列表]
const ELEMENT_BEATS = {
    metal: ['wood'],
    wood:  ['earth'],
    earth: ['water'],
    water: ['fire'],
    fire:  ['metal'],
};

// 戰鬥姿態設定：name → { atkMult, defMult, bonusDodge }
const STANCE_CONFIG = {
    aggressive: { atkMult: 1.2, defMult: 0.8, bonusDodge: 0 },   // 殺伐之勢
    defensive:  { atkMult: 0.8, defMult: 1.3, bonusDodge: 0.1 }, // 固守本心
    balanced:   { atkMult: 1.0, defMult: 1.0, bonusDodge: 0 },   // 隨機應變
};

// 妖獸預設技能池（當 DB 未設定 skills 時的後備）
const DEFAULT_ENEMY_SKILLS = [
    { name: '普通攻擊', mult: 1.0, rate: 0.6, cast_time: 2.0 },
    { name: '猛撲',     mult: 1.3, rate: 0.3, cast_time: 3.0 },
    { name: '嚎叫衝撞', mult: 1.6, rate: 0.1, cast_time: 4.5 },
];

// ═══════════════════════════════════════════════════════════════════
// 【法則三】神識命中判定
// ═══════════════════════════════════════════════════════════════════

/**
 * 計算攻擊方命中率。
 *
 * 公式：0.80 + (攻擊方 mind - 防守方 mind) * 0.002
 * 若防守方為玩家且姿態為 defensive，命中率額外 -0.10。
 * 命中率夾在 [0.15, 1.0] 之間。
 *
 * @param {number} atkMind        - 攻擊方神識
 * @param {number} defMind        - 防守方神識
 * @param {boolean} defIsDefensive - 防守方是否為固守本心姿態
 * @returns {number} 最終命中率 0~1
 */
function calcHitRate(atkMind, defMind, defIsDefensive = false) {
    let rate = 0.80 + (atkMind - defMind) * 0.002;
    if (defIsDefensive) rate -= 0.10;
    return Math.min(1.0, Math.max(0.15, rate));
}

// ═══════════════════════════════════════════════════════════════════
// 【法則四】終極傷害算式
// ═══════════════════════════════════════════════════════════════════

/**
 * 計算五行倍率。
 *
 * 規則：剋制 → 1.25，被剋 → 0.8，無關聯 → 1.0。
 *
 * @param {string} atkElement - 攻擊方五行屬性
 * @param {string} defElement - 防守方五行屬性
 * @returns {number}
 */
function calcElementMult(atkElement, defElement) {
    if (!atkElement || !defElement) return 1.0;
    const beats = ELEMENT_BEATS[atkElement] ?? [];
    if (beats.includes(defElement)) return 1.25; // 剋制
    // 反查：防守方是否剋制攻擊方
    const defBeats = ELEMENT_BEATS[defElement] ?? [];
    if (defBeats.includes(atkElement)) return 0.8; // 被剋
    return 1.0;
}

/**
 * 終極傷害算式（法則四）。
 *
 * 1. 基礎破防 = max(1, atk - def)
 * 2. × 五行倍率
 * 3. × 境界壓制 = max(0.5, 1.0 + (atkRealm - defRealm) * 0.2)
 * 4. × 技能倍率
 * 5. × 亂數浮動 [0.85, 1.15]
 *
 * @param {object} attacker  - { attack, realm_level, element? }
 * @param {object} defender  - { defense, realm_level, element? }
 * @param {number} skillMult - 技能倍率（玩家普攻 = 1.0）
 * @returns {number} 最終傷害值（至少 1）
 */
function calcFinalDamage(attacker, defender, skillMult = 1.0) {
    const atk  = Math.max(0, attacker.attack  ?? 10);
    const def  = Math.max(0, defender.defense ?? 5);

    const baseDmg     = Math.max(1, atk - def);
    const elementMult = calcElementMult(attacker.element, defender.element);
    const realmMult   = Math.max(0.5, 1.0 + ((attacker.realm_level ?? 1) - (defender.realm_level ?? 1)) * 0.2);
    const variance    = 0.85 + Math.random() * 0.30; // [0.85, 1.15]

    return Math.floor(baseDmg * elementMult * realmMult * skillMult * variance);
}

// ═══════════════════════════════════════════════════════════════════
// 【法則二】技能池抽選
// ═══════════════════════════════════════════════════════════════════

/**
 * 依照技能的 rate 權重，隨機抽選一招。
 *
 * @param {Array} skills - [{ name, mult, rate, cast_time }, ...]
 * @returns {object} 選中的技能
 */
function pickSkill(skills) {
    const pool = (Array.isArray(skills) && skills.length > 0) ? skills : DEFAULT_ENEMY_SKILLS;
    const totalRate = pool.reduce((sum, s) => sum + (s.rate ?? 1), 0);
    let roll = Math.random() * totalRate;
    for (const skill of pool) {
        roll -= (skill.rate ?? 1);
        if (roll <= 0) return skill;
    }
    return pool[pool.length - 1]; // 保底回傳最後一招
}

// ═══════════════════════════════════════════════════════════════════
// 日誌輔助
// ═══════════════════════════════════════════════════════════════════

/**
 * 格式化時間標記。
 * @param {number} t - 虛擬秒數
 * @returns {string} 例如「【1.5s】」
 */
function ts(t) {
    return `【${t.toFixed(1)}s】`;
}

// ═══════════════════════════════════════════════════════════════════
// 核心入口：runCombat
// ═══════════════════════════════════════════════════════════════════

/**
 * ATB 時間軸推演戰鬥引擎。
 *
 * 流程：
 *  1. 讀取玩家 & 隨機敵人
 *  2. 套用姿態（法則一）
 *  3. 虛擬時間軸迴圈 [0, MAX_BATTLE_TIME]
 *     - 每輪取「下一個行動時間點最小」的角色
 *     - 神識命中判定（法則三）
 *     - 若命中 → 終極傷害算式（法則四）
 *     - 妖獸行動 → 技能池抽選（法則二）
 *  4. 結算：寫回 DB（含 delta flush），回傳帶時間標記的 battleLog
 */
/**
 * @param {string}  playerId      - 玩家 UUID
 * @param {string}  stance        - 'aggressive' | 'balanced' | 'defensive'
 * @param {object?} enemyOverride - 若提供，跳過 DB 隨機抽取，直接使用此物件當作敵人。
 *                                  適用於「演武練功」等非隨機對戰場景。
 *                                  欄位對應同 enemies 表：name, hp, attack, defense,
 *                                  mind, realm_level, element, skills, exp_reward,
 *                                  drop_item_name, drop_rate
 */
export async function runCombat(playerId, stance = 'balanced', enemyOverride = null) {
    // ── Step 1：讀取玩家屬性 ───────────────────────────────────────
    const playerRow = await db.query(
        `SELECT hp, max_hp, sp, max_sp, ep, max_ep, attack, defense, mind,
                realm_level, element, last_sync_time
         FROM players WHERE id = $1`,
        [playerId]
    ).then(r => r.rows[0]);

    if (!playerRow) throw new Error('找不到道友的命格');

    // flush 離線 delta，確保以真實數值進行戰鬥判斷
    const now        = new Date();
    const afterDelta = calculateOfflineDelta(playerRow, now);

    if (afterDelta.hp <= 5)  throw new Error('氣血耗盡，已無力再戰');
    if (afterDelta.sp < 10)  throw new Error('體力不足，強行戰鬥恐有性命之憂');

    // ── Step 2：取得妖獸資料 ───────────────────────────────────────
    // enemyOverride 存在時（演武練功等場景）直接使用，跳過 DB 隨機抽取。
    const enemyRow = enemyOverride ?? await db.query(
        `SELECT e.*, i.name AS drop_item_name
         FROM enemies e
         LEFT JOIN items i ON e.drop_item_id = i.id
         ORDER BY RANDOM() LIMIT 1`
    ).then(r => r.rows[0]);

    if (!enemyRow) throw new Error('此地空無一物');

    // ── Step 3：套用姿態（法則一）─────────────────────────────────
    const stanceCfg = STANCE_CONFIG[stance] ?? STANCE_CONFIG.balanced;

    // 建立戰鬥用的可變物件，不直接修改 DB 資料
    const player = {
        name:        '你',
        hp:          afterDelta.hp,
        attack:      Math.floor((playerRow.attack  ?? 10) * stanceCfg.atkMult),
        defense:     Math.floor((playerRow.defense ??  5) * stanceCfg.defMult),
        mind:        playerRow.mind       ?? 0,
        realm_level: playerRow.realm_level ?? 1,
        element:     playerRow.element    ?? null,
        weapon_cd:   playerRow.weapon_cd  ?? PLAYER_WEAPON_CD,
        isDefensive: stance === 'defensive',
    };

    const enemy = {
        name:        enemyRow.name,
        hp:          enemyRow.hp          ?? 50,
        attack:      enemyRow.attack      ?? 8,
        defense:     enemyRow.defense     ?? 3,
        mind:        enemyRow.mind        ?? 0,
        realm_level: enemyRow.realm_level ?? 1,
        element:     enemyRow.element     ?? null,
        // skills 可以是 JSON 陣列欄位，或 null → 用預設技能池
        skills:      enemyRow.skills      ?? DEFAULT_ENEMY_SKILLS,
        exp_reward:  enemyRow.exp_reward  ?? 10,
        drop_item:   enemyRow.drop_item_name ?? null,
        drop_rate:   enemyRow.drop_rate   ?? 0.6,
    };

    // ── Step 4：初始化時間軸 ──────────────────────────────────────
    let currentTime       = 0;
    let playerNextAction  = 0;          // 玩家第一刀立即出手
    let enemyNextAction   = 0.5;        // 妖獸稍後半秒才反應（先手優勢）

    const battleLog = [];

    // 開場說明
    const stanceLabel = { aggressive: '殺伐之勢', defensive: '固守本心', balanced: '隨機應變' };
    battleLog.push({
        text: `【${enemy.name}】突然出現！（HP: ${enemy.hp}　攻: ${enemy.attack}　防: ${enemy.defense}　${enemy.element ?? '無屬性'}）`,
        type: 'header',
    });
    battleLog.push({
        text: `你擺出${stanceLabel[stance] ?? '隨機應變'}之勢迎戰。（HP: ${player.hp}　攻: ${player.attack}　防: ${player.defense}）`,
        type: 'header',
    });

    // ── Step 5：時間軸推演主迴圈 ──────────────────────────────────
    while (player.hp > 0 && enemy.hp > 0 && currentTime < MAX_BATTLE_TIME) {

        // 找出下一個行動時間點
        const nextTime = Math.min(playerNextAction, enemyNextAction);
        if (nextTime > MAX_BATTLE_TIME) break;
        currentTime = parseFloat(nextTime.toFixed(2));

        // ── 玩家行動 ─────────────────────────────────────────────
        if (playerNextAction <= enemyNextAction) {
            const hitRate = calcHitRate(player.mind, enemy.mind, false);
            const isHit   = Math.random() < hitRate;

            if (!isHit) {
                battleLog.push({
                    text: `${ts(currentTime)}【神識壓制】你一招出手，被【${enemy.name}】的靈覺感知，攻擊被閃避！`,
                    type: 'miss',
                });
            } else {
                const dmg = calcFinalDamage(player, enemy, 1.0); // 玩家普攻 skillMult = 1.0
                enemy.hp -= dmg;
                battleLog.push({
                    text: `${ts(currentTime)}你凝神一擊，命中【${enemy.name}】，造成 ${dmg} 點傷害。（妖獸剩餘: ${Math.max(0, enemy.hp)}）`,
                    type: 'player-atk',
                });
            }

            playerNextAction = currentTime + player.weapon_cd;

            if (enemy.hp <= 0) break; // 玩家這刀擊殺，立即結束
        }

        // ── 妖獸行動 ─────────────────────────────────────────────
        if (enemyNextAction <= playerNextAction && enemy.hp > 0) {
            const skill   = pickSkill(enemy.skills);
            const hitRate = calcHitRate(enemy.mind, player.mind, player.isDefensive);
            const isHit   = Math.random() < hitRate;

            if (!isHit) {
                battleLog.push({
                    text: `${ts(currentTime)}【神識壓制】【${enemy.name}】的「${skill.name}」被你輕巧避開！`,
                    type: 'miss',
                });
            } else {
                const dmg = calcFinalDamage(enemy, player, skill.mult);
                player.hp -= dmg;
                battleLog.push({
                    text: `${ts(currentTime)}【${enemy.name}】使出「${skill.name}」撲來，你受到 ${dmg} 點傷害。（你的剩餘: ${Math.max(0, player.hp)}）`,
                    type: 'enemy-atk',
                });
            }

            enemyNextAction = currentTime + skill.cast_time;

            if (player.hp <= 0) break; // 妖獸這刀擊殺玩家
        }
    }

    // 超時判定
    if (currentTime >= MAX_BATTLE_TIME && player.hp > 0 && enemy.hp > 0) {
        battleLog.push({
            text: `【${MAX_BATTLE_TIME}s】戰況膠著，天道不允許此戰無休止——雙方暫且罷手。`,
            type: 'info',
        });
    }

    // ── Step 6：結算 ──────────────────────────────────────────────
    const playerWon   = enemy.hp <= 0;
    const spCost      = 10;
    let   expGained   = 0;
    let   itemDropped = null;

    if (playerWon) {
        expGained = enemy.exp_reward;
        if (enemy.drop_item && Math.random() < enemy.drop_rate) {
            itemDropped = enemy.drop_item;
        }
        battleLog.push({ text: '━━━ 勝利 ━━━', type: 'outcome-win' });
        battleLog.push({
            text: `歷時 ${currentTime.toFixed(1)} 秒，你擊殺了【${enemy.name}】！獲得修為 +${expGained}。`,
            type: 'outcome-win',
        });
        if (itemDropped) {
            battleLog.push({ text: `掉落物：【${itemDropped}】已納入囊中。`, type: 'reward' });
        }
    } else {
        player.hp = 1; // 重傷但不死
        battleLog.push({ text: '━━━ 重傷 ━━━', type: 'outcome-lose' });
        battleLog.push({
            text: `你被【${enemy.name}】打倒，氣血幾近耗盡，勉強保住一口氣逃脫...`,
            type: 'outcome-lose',
        });
    }

    // ── Step 7：寫回 DB（delta flush + 戰鬥結算，一次 UPDATE）──────
    const finalHp = Math.max(1, player.hp);
    const newSp   = Math.max(0, afterDelta.sp - spCost);
    const newMind = (playerRow.mind ?? 0) + expGained;

    await db.query(
        `UPDATE players
         SET hp             = $1,
             sp             = $2,
             ep             = $3,
             mind           = $4,
             last_sync_time = $5
         WHERE id = $6`,
        [finalHp, newSp, afterDelta.ep, newMind, now, playerId]
    );

    if (itemDropped) {
        await db.query(
            `INSERT INTO player_items (player_id, item_id, quantity)
             SELECT $1, id, 1 FROM items WHERE name = $2
             ON CONFLICT (player_id, item_id)
             DO UPDATE SET quantity = player_items.quantity + 1`,
            [playerId, itemDropped]
        );
    }

    // ── Step 8：回傳 ──────────────────────────────────────────────
    return {
        battleLog,
        outcome:      playerWon ? 'win' : 'lose',
        duration_sec: parseFloat(currentTime.toFixed(1)),
        enemy_name:   enemy.name,
        hp_remaining: finalHp,
        sp_cost:      spCost,
        exp_gained:   expGained,
        item_dropped: itemDropped,
        message: playerWon
            ? `你在 ${currentTime.toFixed(1)} 秒後擊敗了【${enemy.name}】，修為 +${expGained}。`
            : `你被【${enemy.name}】重傷，氣血僅餘一線，倉皇逃脫...`,
    };
}

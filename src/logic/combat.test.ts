import { describe, it, expect } from 'vitest';
import { resolveCombatDamage } from './combat';
import type { AttackerStats, DefenderStats } from './combat';

const baseAtk = (): AttackerStats => ({
  body: 100,
  weaponBaseAtk: 50,
  element: null,
  si: 100,
  generalBuffSum: 0,
  conditionBuffSum: 0,
  stanceBuffSum: 0,
  bloodBurnActive: false,
  bloodBurnSpecial: false,
});

const baseDef = (): DefenderStats => ({
  body: 0,
  element: null,
  si: 100,
  shieldDef: 0,
  isDefensiveStance: false,
});

// ── Step 1：理論攻擊力 ──────────────────────────────────────────────

describe('Step 1: theoreticalAtk', () => {
  it('base = body + weaponBaseAtk，無任何加成', () => {
    const { theoreticalAtk } = resolveCombatDamage(baseAtk(), baseDef());
    expect(theoreticalAtk).toBe(150); // (100+50) × 1 × 1 × 1
  });

  it('加法池：generalBuff + conditionBuff + stanceBuff 同池疊加', () => {
    const atk = { ...baseAtk(), generalBuffSum: 0.1, conditionBuffSum: 0.05, stanceBuffSum: 0.15 };
    const { theoreticalAtk } = resolveCombatDamage(atk, baseDef());
    expect(theoreticalAtk).toBeCloseTo(150 * 1.30); // multFactor = 1.30
  });

  it('五行相剋：metal 剋 wood → ×1.2', () => {
    const atk = { ...baseAtk(), element: 'metal' as const };
    const def = { ...baseDef(), element: 'wood' as const };
    expect(resolveCombatDamage(atk, def).theoreticalAtk).toBeCloseTo(150 * 1.2);
  });

  it('五行被剋：wood 遇 metal → ×0.8', () => {
    const atk = { ...baseAtk(), element: 'wood' as const };
    const def = { ...baseDef(), element: 'metal' as const };
    expect(resolveCombatDamage(atk, def).theoreticalAtk).toBeCloseTo(150 * 0.8);
  });

  it('五行中立（同屬性）→ ×1.0', () => {
    const atk = { ...baseAtk(), element: 'fire' as const };
    const def = { ...baseDef(), element: 'fire' as const };
    expect(resolveCombatDamage(atk, def).theoreticalAtk).toBe(150);
  });

  it('五行完整相剋鏈驗證：water 剋 fire → ×1.2', () => {
    const atk = { ...baseAtk(), element: 'water' as const };
    const def = { ...baseDef(), element: 'fire' as const };
    expect(resolveCombatDamage(atk, def).theoreticalAtk).toBeCloseTo(150 * 1.2);
  });

  it('燃血搏命（非特殊）→ ×3', () => {
    const atk = { ...baseAtk(), bloodBurnActive: true, bloodBurnSpecial: false };
    expect(resolveCombatDamage(atk, baseDef()).theoreticalAtk).toBe(150 * 3);
  });

  it('燃血搏命（特殊法寶）→ ×4', () => {
    const atk = { ...baseAtk(), bloodBurnActive: true, bloodBurnSpecial: true };
    expect(resolveCombatDamage(atk, baseDef()).theoreticalAtk).toBe(150 * 4);
  });

  it('燃血搏命屬於獨立乘區，不與加法池混入', () => {
    const atk = { ...baseAtk(), generalBuffSum: 0.1, bloodBurnActive: true, bloodBurnSpecial: false };
    // (100+50) × 1.1 × 1.0 × 3 = 495
    expect(resolveCombatDamage(atk, baseDef()).theoreticalAtk).toBeCloseTo(495);
  });
});

// ── Step 2：命中率 ─────────────────────────────────────────────────

describe('Step 2: hitRate', () => {
  it('雙方 si=0 → 預設 0.75', () => {
    const atk = { ...baseAtk(), si: 0 };
    const def = { ...baseDef(), si: 0 };
    expect(resolveCombatDamage(atk, def).hitRate).toBe(0.75);
  });

  it('雙方 si 相等 → 0.75', () => {
    expect(resolveCombatDamage(baseAtk(), baseDef()).hitRate).toBe(0.75);
  });

  it('攻方 si 遠大於守方 → 上限 1.0', () => {
    const atk = { ...baseAtk(), si: 10000 };
    const def = { ...baseDef(), si: 0 };
    expect(resolveCombatDamage(atk, def).hitRate).toBe(1.0);
  });

  it('攻方 si 遠小於守方 → 下限 0.10', () => {
    const atk = { ...baseAtk(), si: 0 };
    const def = { ...baseDef(), si: 10000 };
    expect(resolveCombatDamage(atk, def).hitRate).toBe(0.10);
  });

  it('公式：0.75 + (atkSi−defSi)/(atkSi+defSi) × 0.65', () => {
    const atk = { ...baseAtk(), si: 200 };
    const def = { ...baseDef(), si: 100 };
    const expected = 0.75 + (100 / 300) * 0.65;
    expect(resolveCombatDamage(atk, def).hitRate).toBeCloseTo(expected, 10);
  });

  it('命中率不會超過 1.0', () => {
    const atk = { ...baseAtk(), si: 500 };
    const def = { ...baseDef(), si: 100 };
    expect(resolveCombatDamage(atk, def).hitRate).toBeLessThanOrEqual(1.0);
  });
});

// ── Step 3：雙層防禦結算 ────────────────────────────────────────────

describe('Step 3: actualDamage', () => {
  it('護盾完全吸收 → penetrateDmg=0, actualDamage=0', () => {
    const def = { ...baseDef(), shieldDef: 10000 };
    const { penetrateDmg, actualDamage } = resolveCombatDamage(baseAtk(), def);
    expect(penetrateDmg).toBe(0);
    expect(actualDamage).toBe(0);
  });

  it('固守本心姿態使護盾 ×1.2', () => {
    // theoreticalAtk=150, hitRate=0.75 → raw=112.5
    // 普通護盾100 → 穿透12.5 > 0；固守護盾120 → 穿透-7.5 → 0
    const normalDef = { ...baseDef(), shieldDef: 100 };
    const stanceDef = { ...baseDef(), shieldDef: 100, isDefensiveStance: true };
    expect(resolveCombatDamage(baseAtk(), normalDef).penetrateDmg).toBeGreaterThan(0);
    expect(resolveCombatDamage(baseAtk(), stanceDef).penetrateDmg).toBe(0);
  });

  it('煉體值在 soft cap (500) 時減傷率約 50%', () => {
    const def = { ...baseDef(), body: 500 };
    const { penetrateDmg, actualDamage } = resolveCombatDamage(baseAtk(), def);
    expect(actualDamage).toBeLessThan(Math.floor(penetrateDmg));
  });

  it('實際傷害最低為 1（極高防禦也至少扣1）', () => {
    const atk = { ...baseAtk(), body: 1, weaponBaseAtk: 1 };
    const def = { ...baseDef(), body: 10000 };
    const { penetrateDmg, actualDamage } = resolveCombatDamage(atk, def);
    if (penetrateDmg > 0) {
      expect(actualDamage).toBeGreaterThanOrEqual(1);
    }
  });

  it('actualDamage 為整數（Math.floor）', () => {
    const { actualDamage } = resolveCombatDamage(baseAtk(), baseDef());
    expect(Number.isInteger(actualDamage)).toBe(true);
  });

  it('penetrateDmg = theoreticalAtk × hitRate − effectiveShield', () => {
    const atk = { ...baseAtk() };   // theoreticalAtk=150, hitRate=0.75
    const def = { ...baseDef(), shieldDef: 50 };
    const { penetrateDmg } = resolveCombatDamage(atk, def);
    expect(penetrateDmg).toBeCloseTo(150 * 0.75 - 50); // 62.5
  });
});

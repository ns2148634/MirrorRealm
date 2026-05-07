import { describe, it, expect } from 'vitest';
import { checkRootThreshold, calcBreakthroughRate } from './breakthrough';
import type { PlayerStatsSnapshot, BreakthroughBonuses } from './breakthrough';

const fullStats = (): PlayerStatsSnapshot => ({
  hp: 100, hpCap: 100,
  mp: 100, mpCap: 100,
  body: 100, bodyCap: 100,
  si: 100, siCap: 100,
});

const noBonuses = (): BreakthroughBonuses => ({
  pillBonus: 0,
  lbsBonus: 0,
  fortuneBonus: 0,
});

// ── 5.1 根基檢定 ─────────────────────────────────────────────────

describe('checkRootThreshold', () => {
  it('四項均滿值 → pass: true', () => {
    expect(checkRootThreshold(fullStats())).toEqual({ pass: true });
  });

  it('四項均恰好 80% → pass: true（邊界值）', () => {
    const stats: PlayerStatsSnapshot = {
      hp: 80, hpCap: 100,
      mp: 80, mpCap: 100,
      body: 80, bodyCap: 100,
      si: 80, siCap: 100,
    };
    expect(checkRootThreshold(stats)).toEqual({ pass: true });
  });

  it('一項為 79% → pass: false，failedStats 包含該項', () => {
    const stats = { ...fullStats(), hp: 79 };
    const result = checkRootThreshold(stats);
    expect(result.pass).toBe(false);
    if (!result.pass) {
      expect(result.failedStats).toHaveLength(1);
      expect(result.failedStats[0]).toContain('氣血');
    }
  });

  it('failedStats 訊息包含百分比（79% → 顯示 79%）', () => {
    const stats = { ...fullStats(), si: 79 };
    const result = checkRootThreshold(stats);
    if (!result.pass) {
      expect(result.failedStats[0]).toContain('79%');
      expect(result.failedStats[0]).toContain('神識');
    }
  });

  it('多項未達門檻 → failedStats 收錄所有失敗項', () => {
    const stats: PlayerStatsSnapshot = {
      hp: 50, hpCap: 100,
      mp: 50, mpCap: 100,
      body: 100, bodyCap: 100,
      si: 100, siCap: 100,
    };
    const result = checkRootThreshold(stats);
    expect(result.pass).toBe(false);
    if (!result.pass) {
      expect(result.failedStats).toHaveLength(2);
    }
  });

  it('cap=0 的項目跳過檢定（e.g. 靈力上限為 0）', () => {
    const stats: PlayerStatsSnapshot = {
      hp: 100, hpCap: 100,
      mp: 0, mpCap: 0,    // 跳過
      body: 100, bodyCap: 100,
      si: 100, siCap: 100,
    };
    expect(checkRootThreshold(stats)).toEqual({ pass: true });
  });

  it('所有四項均失敗 → failedStats.length === 4', () => {
    const stats: PlayerStatsSnapshot = {
      hp: 0, hpCap: 100,
      mp: 0, mpCap: 100,
      body: 0, bodyCap: 100,
      si: 0, siCap: 100,
    };
    const result = checkRootThreshold(stats);
    expect(result.pass).toBe(false);
    if (!result.pass) expect(result.failedStats).toHaveLength(4);
  });
});

// ── 5.2 突破成功率 ────────────────────────────────────────────────

describe('calcBreakthroughRate', () => {
  it('未知境界 lv 拋出錯誤', () => {
    expect(() => calcBreakthroughRate(1, fullStats(), noBonuses())).toThrow('無突破參數');
    expect(() => calcBreakthroughRate(99, fullStats(), noBonuses())).toThrow('無突破參數');
  });

  it('四項滿值時 rootDeduction = 0', () => {
    const result = calcBreakthroughRate(11, fullStats(), noBonuses());
    expect(result.rootDeduction).toBe(0);
  });

  it('四項均為 0 時 rootDeduction 最大 = 40（每項 ×10）', () => {
    const stats: PlayerStatsSnapshot = {
      hp: 0, hpCap: 100,
      mp: 0, mpCap: 100,
      body: 0, bodyCap: 100,
      si: 0, siCap: 100,
    };
    const result = calcBreakthroughRate(11, stats, noBonuses());
    expect(result.rootDeduction).toBe(40);
  });

  it('單項 50% → rootDeduction = 5（(1−0.5)×10）', () => {
    const stats: PlayerStatsSnapshot = {
      hp: 50, hpCap: 100,
      mp: 100, mpCap: 100,
      body: 100, bodyCap: 100,
      si: 100, siCap: 100,
    };
    const result = calcBreakthroughRate(11, stats, noBonuses());
    expect(result.rootDeduction).toBe(5);
  });

  it('finalRate 受 bonusCap 截斷（lv=11：cap=90）', () => {
    // nakedRate=50, rootDeduction=0, bonuses=70 → raw=120 → capped at 90
    const result = calcBreakthroughRate(11, fullStats(), { pillBonus: 50, lbsBonus: 10, fortuneBonus: 10 });
    expect(result.finalRate).toBe(90);
  });

  it('finalRate 最低為 0（不會出現負值）', () => {
    // lv=23: nakedRate=20，全空 → rootDeduction=40 → raw=-20 → clamped 0
    const stats: PlayerStatsSnapshot = {
      hp: 0, hpCap: 100,
      mp: 0, mpCap: 100,
      body: 0, bodyCap: 100,
      si: 0, siCap: 100,
    };
    const result = calcBreakthroughRate(23, stats, noBonuses());
    expect(result.finalRate).toBe(0);
  });

  it('三類加成各自獨立累加', () => {
    const result = calcBreakthroughRate(11, fullStats(), { pillBonus: 5, lbsBonus: 3, fortuneBonus: 2 });
    // 50 - 0 + 5 + 3 + 2 = 60，低於 bonusCap=90
    expect(result.finalRate).toBe(60);
  });

  it('lv=11（氣旋→築基 major）：nakedRate=50, bonusCap=90', () => {
    const result = calcBreakthroughRate(11, fullStats(), noBonuses());
    expect(result.nakedRate).toBe(50);
    expect(result.bonusCap).toBe(90);
  });

  it('lv=2（氣旋初期）：nakedRate=100, bonusCap=100', () => {
    const result = calcBreakthroughRate(2, fullStats(), noBonuses());
    expect(result.nakedRate).toBe(100);
    expect(result.bonusCap).toBe(100);
  });

  it('cap=0 的項目不計入根基扣減', () => {
    const stats: PlayerStatsSnapshot = {
      hp: 100, hpCap: 100,
      mp: 0, mpCap: 0,    // cap=0 跳過
      body: 100, bodyCap: 100,
      si: 100, siCap: 100,
    };
    const result = calcBreakthroughRate(11, stats, noBonuses());
    expect(result.rootDeduction).toBe(0);
  });

  it('breakdown 正確反映各分項（非零扣減）', () => {
    const stats: PlayerStatsSnapshot = {
      hp: 50, hpCap: 100,   // deduction = 5
      mp: 100, mpCap: 100,
      body: 100, bodyCap: 100,
      si: 100, siCap: 100,
    };
    const result = calcBreakthroughRate(11, stats, { pillBonus: 5, lbsBonus: 3, fortuneBonus: 2 });
    expect(result.breakdown['裸成功率']).toBe(50);
    expect(result.breakdown['根基扣減']).toBe(-5);
    expect(result.breakdown['丹藥加成']).toBe(5);
    expect(result.breakdown['LBS加成']).toBe(3);
    expect(result.breakdown['機緣加持']).toBe(2);
  });

  it('finalRate 精確到小數點後兩位', () => {
    const stats: PlayerStatsSnapshot = {
      hp: 33, hpCap: 100,   // deduction = (1-0.33)*10 = 6.7
      mp: 100, mpCap: 100,
      body: 100, bodyCap: 100,
      si: 100, siCap: 100,
    };
    const result = calcBreakthroughRate(11, stats, noBonuses());
    expect(result.rootDeduction).toBe(6.7);
    expect(result.finalRate).toBe(parseFloat((50 - 6.7).toFixed(2)));
  });
});

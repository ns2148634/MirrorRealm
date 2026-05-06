/**
 * 9.1–9.3 丹毒代謝機制
 *
 * 丹毒上限：100
 * 每次服丹增加：+20（固定，不分境界）
 * 每小時自然代謝：-10
 * UI 提示文本依丹毒值區段顯示。
 */

const MAX_TOXICITY      = 100;
const PER_PILL_TOXICITY = 20;
const PER_HOUR_DECAY    = 10;

export class PillToxicityManager {
  private _value: number;

  constructor(initial = 0) {
    this._value = Math.min(MAX_TOXICITY, Math.max(0, initial));
  }

  get value(): number    { return this._value; }
  get isFull(): boolean  { return this._value >= MAX_TOXICITY; }
  get isEmpty(): boolean { return this._value === 0; }

  /**
   * 服丹。每顆固定增加 20 點丹毒，超出上限截斷。
   * @param count 一次服用顆數（預設 1）
   * @returns     服丹後的丹毒值
   */
  takePill(count = 1): number {
    this._value = Math.min(MAX_TOXICITY, this._value + PER_PILL_TOXICITY * count);
    return this._value;
  }

  /**
   * 每小時自然代謝 -10，傳入流逝小時數。
   * @param hours 流逝小時數（可為小數）
   * @returns     代謝後的丹毒值
   */
  metabolize(hours: number): number {
    this._value = Math.max(0, this._value - PER_HOUR_DECAY * hours);
    return this._value;
  }

  /**
   * 根據當前丹毒值返回 UI 提示文本。
   * 0-30：無提示；31-70：輕微警示；71-99：嚴重警告；100：封頂提示。
   */
  getUIText(): string {
    if (this._value <= 30) return '';
    if (this._value <= 70) return '丹力尚在消化，脈象略有波動。';
    if (this._value <= 99) return '丹毒已深，強行服用將導致後遺症。';
    return '藥力無門，待丹毒消退方可繼續。';
  }

  /** 估算丹毒歸零還需幾小時 */
  hoursUntilClear(): number {
    return this._value / PER_HOUR_DECAY;
  }
}

import { calculatePrice } from './pricing.engine';

// Helper: build a minimal input with sensible defaults, overriding only what the test cares about.
function input(overrides: Partial<Parameters<typeof calculatePrice>[0]> = {}) {
  return {
    baseAmount: 200,
    markupType: 'PERCENT' as const,
    markupValue: 10,
    deliveryFee: 30,
    surgeFee: 0,
    surgeEnabled: false,
    ...overrides,
  };
}

describe('calculatePrice', () => {
  // ── markup types ────────────────────────────────────────────────────────────

  it('applies PERCENT markup correctly', () => {
    const result = calculatePrice(
      input({ baseAmount: 200, markupType: 'PERCENT', markupValue: 10 }),
    );
    expect(result.base).toBe(200);
    expect(result.markup).toBe(20);
    expect(result.deliveryFee).toBe(30);
    expect(result.surgeFee).toBe(0);
    expect(result.discount).toBe(0);
    expect(result.total).toBe(250);
  });

  it('applies FLAT markup correctly', () => {
    const result = calculatePrice(
      input({ baseAmount: 200, markupType: 'FLAT', markupValue: 15, deliveryFee: 30 }),
    );
    expect(result.markup).toBe(15);
    expect(result.total).toBe(245);
  });

  // ── edge amounts ────────────────────────────────────────────────────────────

  it('handles zero base amount (PERCENT markup becomes 0)', () => {
    const result = calculatePrice(
      input({ baseAmount: 0, markupType: 'PERCENT', markupValue: 10, deliveryFee: 30 }),
    );
    expect(result.base).toBe(0);
    expect(result.markup).toBe(0);
    expect(result.total).toBe(30);
  });

  it('handles zero markup value', () => {
    const result = calculatePrice(
      input({ baseAmount: 200, markupType: 'PERCENT', markupValue: 0, deliveryFee: 30 }),
    );
    expect(result.markup).toBe(0);
    expect(result.total).toBe(230);
  });

  it('handles zero markup value with FLAT type', () => {
    const result = calculatePrice(
      input({ baseAmount: 200, markupType: 'FLAT', markupValue: 0, deliveryFee: 30 }),
    );
    expect(result.markup).toBe(0);
    expect(result.total).toBe(230);
  });

  // ── surge ───────────────────────────────────────────────────────────────────

  it('adds surgeFee when surgeEnabled is true', () => {
    const result = calculatePrice(
      input({
        baseAmount: 200,
        markupType: 'PERCENT',
        markupValue: 10,
        deliveryFee: 30,
        surgeFee: 20,
        surgeEnabled: true,
      }),
    );
    expect(result.surgeFee).toBe(20);
    expect(result.total).toBe(270);
  });

  it('excludes surgeFee when surgeEnabled is false', () => {
    const result = calculatePrice(
      input({
        baseAmount: 200,
        markupType: 'PERCENT',
        markupValue: 10,
        deliveryFee: 30,
        surgeFee: 20,
        surgeEnabled: false,
      }),
    );
    expect(result.surgeFee).toBe(0);
    expect(result.total).toBe(250);
  });

  // ── discount ────────────────────────────────────────────────────────────────

  it('subtracts discount from total when within bounds', () => {
    const result = calculatePrice(
      input({
        baseAmount: 200,
        markupType: 'PERCENT',
        markupValue: 10,
        deliveryFee: 30,
        discount: 10,
      }),
    );
    expect(result.discount).toBe(10);
    expect(result.total).toBe(240);
  });

  it('applies zero discount when discount is not provided', () => {
    const result = calculatePrice(input({ baseAmount: 200, deliveryFee: 30 }));
    expect(result.discount).toBe(0);
    expect(result.total).toBe(250);
  });

  it('clamps discount to subtotal when discount exceeds total (total = 0)', () => {
    // subtotal = 200 + 20 + 30 = 250; discount 400 > 250
    const result = calculatePrice(
      input({
        baseAmount: 200,
        markupType: 'PERCENT',
        markupValue: 10,
        deliveryFee: 30,
        discount: 400,
      }),
    );
    expect(result.discount).toBe(250);
    expect(result.total).toBe(0);
  });

  it('clamps discount exactly equal to subtotal (total = 0)', () => {
    const result = calculatePrice(
      input({
        baseAmount: 200,
        markupType: 'PERCENT',
        markupValue: 10,
        deliveryFee: 30,
        discount: 250,
      }),
    );
    expect(result.discount).toBe(250);
    expect(result.total).toBe(0);
  });

  // ── rounding ────────────────────────────────────────────────────────────────

  it('rounds PERCENT markup to 2dp (no 3+ decimal drift)', () => {
    // 100.33 * 10% = 10.033 raw — must round to 10.03
    const result = calculatePrice(
      input({ baseAmount: 100.33, markupType: 'PERCENT', markupValue: 10, deliveryFee: 0 }),
    );
    expect(result.markup).toBe(10.03);
    expect(result.total).toBe(110.36);
  });

  it('rounds correctly for a fractional FLAT markup', () => {
    // FLAT markup of 1.555 rounds to 1.56
    const result = calculatePrice(
      input({ baseAmount: 100, markupType: 'FLAT', markupValue: 1.555, deliveryFee: 0 }),
    );
    expect(result.markup).toBe(1.56);
    expect(result.total).toBe(101.56);
  });

  it('handles floating-point representation of inputs without drift', () => {
    // 0.1 + 0.2 = 0.30000000000000004 in IEEE 754; base should still round to 0.30
    const result = calculatePrice(
      input({ baseAmount: 0.1 + 0.2, markupType: 'PERCENT', markupValue: 0, deliveryFee: 0 }),
    );
    expect(result.base).toBe(0.3);
    expect(result.total).toBe(0.3);
  });

  // ── negative input rejection ─────────────────────────────────────────────────

  it('throws RangeError for negative baseAmount', () => {
    expect(() => calculatePrice(input({ baseAmount: -1 }))).toThrow(RangeError);
  });

  it('throws RangeError for negative markupValue', () => {
    expect(() => calculatePrice(input({ markupValue: -5 }))).toThrow(RangeError);
  });

  it('throws RangeError for negative deliveryFee', () => {
    expect(() => calculatePrice(input({ deliveryFee: -10 }))).toThrow(RangeError);
  });

  it('throws RangeError for negative surgeFee', () => {
    expect(() => calculatePrice(input({ surgeFee: -20 }))).toThrow(RangeError);
  });

  it('throws RangeError for negative discount', () => {
    expect(() => calculatePrice(input({ discount: -5 }))).toThrow(RangeError);
  });
});

import { calculateCouponDiscount } from './coupon-discount.engine';

describe('calculateCouponDiscount', () => {
  describe('PERCENT type', () => {
    it('calculates basic percentage discount', () => {
      expect(calculateCouponDiscount({ type: 'PERCENT', value: 10, orderValue: 200 })).toBe(20);
    });

    it('caps discount at maxDiscount when percent exceeds cap', () => {
      // 10% of 1000 = 100, capped at 50
      expect(
        calculateCouponDiscount({ type: 'PERCENT', value: 10, maxDiscount: 50, orderValue: 1000 }),
      ).toBe(50);
    });

    it('does not cap when discount is below maxDiscount', () => {
      // 10% of 200 = 20, cap = 50 -> 20
      expect(
        calculateCouponDiscount({ type: 'PERCENT', value: 10, maxDiscount: 50, orderValue: 200 }),
      ).toBe(20);
    });

    it('ignores null maxDiscount', () => {
      expect(
        calculateCouponDiscount({ type: 'PERCENT', value: 10, maxDiscount: null, orderValue: 200 }),
      ).toBe(20);
    });

    it('clamps discount to orderValue when percent exceeds 100', () => {
      // 200% of 50 = 100, clamped to 50
      expect(calculateCouponDiscount({ type: 'PERCENT', value: 200, orderValue: 50 })).toBe(50);
    });
  });

  describe('FLAT type', () => {
    it('applies flat discount directly', () => {
      expect(calculateCouponDiscount({ type: 'FLAT', value: 50, orderValue: 300 })).toBe(50);
    });

    it('clamps flat discount to orderValue', () => {
      // flat 100 but orderValue is 30 -> discount is 30
      expect(calculateCouponDiscount({ type: 'FLAT', value: 100, orderValue: 30 })).toBe(30);
    });

    it('applies exact flat when equal to orderValue', () => {
      expect(calculateCouponDiscount({ type: 'FLAT', value: 50, orderValue: 50 })).toBe(50);
    });
  });

  describe('rounding', () => {
    it('returns 2-decimal result without float drift', () => {
      // 10% of 333 -> paise: 33300*10/100 = 3330 -> 33.30
      expect(calculateCouponDiscount({ type: 'PERCENT', value: 10, orderValue: 333 })).toBe(33.3);
    });

    it('rounds fractional paise correctly', () => {
      // 15% of 0.10 -> paise: 10*15/100 = 1.5 -> round(1.5) = 2 -> 0.02
      expect(calculateCouponDiscount({ type: 'PERCENT', value: 15, orderValue: 0.1 })).toBe(0.02);
    });

    it('PERCENT capped result is integer-paise safe', () => {
      // 10% of 1000.99 -> paise: 100099*10/100 = 10009.9 -> round(10009.9) = 10010 -> 100.10, capped at 50 -> 50
      expect(
        calculateCouponDiscount({
          type: 'PERCENT',
          value: 10,
          maxDiscount: 50,
          orderValue: 1000.99,
        }),
      ).toBe(50);
    });
  });

  describe('validation rules coverage', () => {
    it('throws RangeError for negative orderValue', () => {
      expect(() => calculateCouponDiscount({ type: 'FLAT', value: 50, orderValue: -1 })).toThrow(
        RangeError,
      );
    });

    it('throws RangeError for negative value', () => {
      expect(() =>
        calculateCouponDiscount({ type: 'PERCENT', value: -10, orderValue: 100 }),
      ).toThrow(RangeError);
    });

    it('zero orderValue gives zero discount', () => {
      expect(calculateCouponDiscount({ type: 'FLAT', value: 50, orderValue: 0 })).toBe(0);
    });
  });
});

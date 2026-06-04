export type CouponDiscountType = 'PERCENT' | 'FLAT';

export interface CouponDiscountInput {
  type: CouponDiscountType;
  /** Percent value (e.g. 10 for 10%) or flat amount */
  value: number;
  /** Cap for PERCENT type; ignored for FLAT */
  maxDiscount?: number | null;
  orderValue: number;
}

/**
 * Pure, stateless coupon discount calculation. No I/O, no side effects.
 *
 * PERCENT: orderValue * value/100, capped at maxDiscount when set.
 * FLAT: value directly.
 *
 * Discount never exceeds orderValue.
 * Uses integer paise (×100) arithmetic throughout to eliminate float drift.
 */
export function calculateCouponDiscount(input: CouponDiscountInput): number {
  if (input.orderValue < 0 || input.value < 0) {
    throw new RangeError('Monetary inputs must be non-negative');
  }

  const orderValuePaise = Math.round(input.orderValue * 100);

  let discountPaise: number;

  if (input.type === 'PERCENT') {
    discountPaise = Math.round((orderValuePaise * input.value) / 100);
    if (input.maxDiscount != null) {
      const capPaise = Math.round(input.maxDiscount * 100);
      discountPaise = Math.min(discountPaise, capPaise);
    }
  } else {
    discountPaise = Math.round(input.value * 100);
  }

  discountPaise = Math.min(discountPaise, orderValuePaise);

  return discountPaise / 100;
}

import type { MarkupType, PriceBreakdown } from '@flavohub/shared';

export interface PricingInput {
  baseAmount: number;
  markupType: MarkupType;
  markupValue: number;
  deliveryFee: number;
  surgeFee: number;
  surgeEnabled: boolean;
  /** Optional discount; defaults to 0. Clamped so total never goes below 0. */
  discount?: number;
}

/**
 * Pure, stateless pricing calculation. No I/O, no side effects.
 *
 * Formula: total = base + markup + deliveryFee + surgeFee - discount
 *
 * Money arithmetic uses integer paise (×100) throughout to avoid
 * floating-point drift, then divides back at the very end.
 *
 * Negative inputs are rejected with a RangeError because they have no
 * meaningful business interpretation (e.g. a negative base amount or
 * negative markup). Callers must validate inputs before invoking.
 */
export function calculatePrice(input: PricingInput): PriceBreakdown {
  const discount = input.discount ?? 0;

  if (
    input.baseAmount < 0 ||
    input.markupValue < 0 ||
    input.deliveryFee < 0 ||
    input.surgeFee < 0 ||
    discount < 0
  ) {
    throw new RangeError('All monetary inputs must be non-negative');
  }

  // Convert to integer paise to eliminate floating-point drift.
  // Math.round absorbs any IEEE 754 representation error (e.g. 1.005*100 = 100.50000…01).
  const basePaise = Math.round(input.baseAmount * 100);

  let markupPaise: number;
  if (input.markupType === 'PERCENT') {
    // (basePaise * value) / 100 keeps the multiplication in integer space before dividing.
    markupPaise = Math.round((basePaise * input.markupValue) / 100);
  } else {
    markupPaise = Math.round(input.markupValue * 100);
  }

  const deliveryFeePaise = Math.round(input.deliveryFee * 100);
  const surgeFeePaise = input.surgeEnabled ? Math.round(input.surgeFee * 100) : 0;
  const discountPaise = Math.round(discount * 100);

  const subtotalPaise = basePaise + markupPaise + deliveryFeePaise + surgeFeePaise;
  // Clamp discount: cannot exceed subtotal, so total is always >= 0.
  const clampedDiscountPaise = Math.min(discountPaise, subtotalPaise);
  const totalPaise = subtotalPaise - clampedDiscountPaise;

  return {
    base: basePaise / 100,
    markup: markupPaise / 100,
    deliveryFee: deliveryFeePaise / 100,
    surgeFee: surgeFeePaise / 100,
    discount: clampedDiscountPaise / 100,
    total: totalPaise / 100,
  };
}

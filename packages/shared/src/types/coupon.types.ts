export type CouponType = 'PERCENT' | 'FLAT';

export interface CouponSummary {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  maxDiscount: number | null;
  minOrderValue: number;
}

export type CouponValidationResult =
  | { valid: true; discount: number; coupon: CouponSummary }
  | { valid: false; reason: string };

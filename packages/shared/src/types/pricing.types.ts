export type MarkupType = 'PERCENT' | 'FLAT';

export interface PriceBreakdown {
  base: number;
  markup: number;
  deliveryFee: number;
  surgeFee: number;
  discount: number;
  total: number;
}

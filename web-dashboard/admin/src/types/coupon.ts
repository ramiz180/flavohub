export type CouponType = 'PERCENT' | 'FLAT';

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  type: CouponType;
  value: string;
  maxDiscount: string | null;
  minOrderValue: string;
  perUserLimit: number | null;
  globalUsageLimit: number | null;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCouponPayload {
  code: string;
  description?: string;
  type: CouponType;
  value: number;
  maxDiscount?: number;
  minOrderValue?: number;
  perUserLimit?: number;
  globalUsageLimit?: number;
  validFrom: string;
  validUntil: string;
  isActive?: boolean;
}

export type UpdateCouponPayload = Partial<CreateCouponPayload>;

export interface ListCouponsQuery {
  isActive?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PlatformSettings {
  id: string;
  platformName: string;
  supportEmail: string | null;
  supportPhone: string | null;
  currencyCode: string;
  ordersEnabled: boolean;
  updatedAt: string;
}

export interface UpdateSettingsPayload {
  platformName?: string;
  supportEmail?: string;
  supportPhone?: string;
  currencyCode?: string;
  ordersEnabled?: boolean;
}

export interface CouponValidatePayload {
  code: string;
  orderValue: number;
  userId?: string;
}

export interface CouponValidateResult {
  valid: boolean;
  discount?: number;
  coupon?: {
    id: string;
    code: string;
    type: CouponType;
    value: number;
    maxDiscount: number | null;
    minOrderValue: number;
  };
  reason?: string;
}

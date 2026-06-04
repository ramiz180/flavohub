import type { MarkupType } from '@flavohub/shared';

// Shape of PlatformPricing row as returned by the API.
// Prisma Decimal fields arrive as strings in JSON.
export interface PlatformPricing {
  id: string;
  globalMarkupType: MarkupType;
  globalMarkupValue: string;
  baseDeliveryFee: string;
  surgeFee: string;
  surgeEnabled: boolean;
  updatedAt: string;
}

export interface UpdatePricingPayload {
  globalMarkupType?: MarkupType;
  globalMarkupValue?: number;
  baseDeliveryFee?: number;
  surgeFee?: number;
  surgeEnabled?: boolean;
}

export interface PricingPreviewPayload {
  restaurantId?: string;
  baseAmount: number;
  discount?: number;
}

export interface UpdateRestaurantMarkupPayload {
  markupType: MarkupType | null;
  markupValue: number | null;
}

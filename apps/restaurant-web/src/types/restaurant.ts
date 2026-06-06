import type { MarkupType } from '@flavohub/shared';

export type { MarkupType };
export type RestaurantStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface RestaurantHours {
  id: string;
  restaurantId: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export interface Restaurant {
  id: string;
  name: string;
  description: string | null;
  addressLine: string;
  city: string;
  phone: string;
  email: string | null;
  cuisineType: string | null;
  latitude: number | null;
  longitude: number | null;
  status: RestaurantStatus;
  isActive: boolean;
  rejectionReason: string | null;
  markupType: MarkupType | null;
  markupValue: string | null;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RestaurantWithHours extends Restaurant {
  hours: RestaurantHours[];
}

export interface UpdateProfilePayload {
  name?: string;
  description?: string;
  addressLine?: string;
  city?: string;
  phone?: string;
  email?: string;
  cuisineType?: string;
  latitude?: number;
  longitude?: number;
}

export interface HoursEntry {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

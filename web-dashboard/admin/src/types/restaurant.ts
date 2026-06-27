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
  logoUrl: string | null;
  // Per-restaurant markup override; null means use global platform pricing
  markupType: MarkupType | null;
  markupValue: string | null; // Prisma Decimal serialized as string
  createdAt: string;
  updatedAt: string;
}

export interface RestaurantOwner {
  id: string;
  email: string;
  fullName: string;
}

export interface RestaurantWithHours extends Restaurant {
  hours: RestaurantHours[];
  owner: RestaurantOwner | null;
}

export interface AssignOwnerPayload {
  email: string;
  password: string;
  fullName: string;
}

export interface ListMeta {
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateRestaurantPayload {
  name: string;
  description?: string;
  addressLine: string;
  city: string;
  phone: string;
  email?: string;
  cuisineType?: string;
  latitude?: number;
  longitude?: number;
  logoUrl?: string;
}

export interface UpdateRestaurantPayload {
  name?: string;
  description?: string;
  addressLine?: string;
  city?: string;
  phone?: string;
  email?: string | null;
  cuisineType?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  logoUrl?: string | null;
}

export interface ListRestaurantsQuery {
  status?: RestaurantStatus;
  isActive?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

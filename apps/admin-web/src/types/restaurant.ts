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
  createdAt: string;
  updatedAt: string;
}

export interface RestaurantWithHours extends Restaurant {
  hours: RestaurantHours[];
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
}

export interface ListRestaurantsQuery {
  status?: RestaurantStatus;
  isActive?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

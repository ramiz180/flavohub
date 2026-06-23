import type { ApiResponse } from '@flavohub/shared';
import type {
  HoursEntry,
  RestaurantHours,
  RestaurantWithHours,
  UpdateProfilePayload,
} from '@/types/restaurant';
import type {
  CreateCategoryPayload,
  CreateItemPayload,
  MenuCategory,
  MenuCategoryWithItems,
  MenuItem,
  UpdateCategoryPayload,
  UpdateItemPayload,
} from '@/types/menu';
import type { Order } from '@/types/order';
import type { CustomerOrder, CustomerOrdersListResponse } from '@/types/customer-order';

export class AuthError extends Error {
  constructor() {
    super('Session expired. Please log in again.');
    this.name = 'AuthError';
  }
}

const BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.token) headers['Authorization'] = `Bearer ${options.token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401 && path !== '/auth/login') {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('flavohub:unauthorized'));
    }
    throw new AuthError();
  }

  // 204 No Content or empty body — treat as success with no data
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  if (!text) return undefined as T;

  let json: ApiResponse<T>;
  try {
    json = JSON.parse(text) as ApiResponse<T>;
  } catch {
    throw new Error(`Server error (${res.status})`);
  }

  if (!json.success) {
    throw new Error(json.error.message);
  }

  return json.data;
}

type LoginData = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; fullName: string; role: string };
};

export const apiClient = {
  login: (email: string, password: string) =>
    apiFetch<LoginData>('/auth/login', { method: 'POST', body: { email, password } }),

  restaurant: {
    getProfile: (token: string) => apiFetch<RestaurantWithHours>('/restaurant/profile', { token }),

    updateProfile: (token: string, dto: UpdateProfilePayload) =>
      apiFetch<RestaurantWithHours>('/restaurant/profile', { method: 'PATCH', body: dto, token }),

    setHours: (token: string, hours: HoursEntry[]) =>
      apiFetch<RestaurantHours[]>('/restaurant/hours', { method: 'PUT', body: { hours }, token }),
  },

  menu: {
    getFullMenu: (token: string) =>
      apiFetch<MenuCategoryWithItems[]>('/restaurant/menu', { token }),

    createCategory: (token: string, dto: CreateCategoryPayload) =>
      apiFetch<MenuCategory>('/restaurant/menu/categories', {
        method: 'POST',
        body: dto,
        token,
      }),

    updateCategory: (token: string, id: string, dto: UpdateCategoryPayload) =>
      apiFetch<MenuCategory>(`/restaurant/menu/categories/${id}`, {
        method: 'PATCH',
        body: dto,
        token,
      }),

    deleteCategory: (token: string, id: string) =>
      apiFetch<void>(`/restaurant/menu/categories/${id}`, { method: 'DELETE', token }),

    createItem: (token: string, dto: CreateItemPayload) =>
      apiFetch<MenuItem>('/restaurant/menu/items', { method: 'POST', body: dto, token }),

    updateItem: (token: string, id: string, dto: UpdateItemPayload) =>
      apiFetch<MenuItem>(`/restaurant/menu/items/${id}`, {
        method: 'PATCH',
        body: dto,
        token,
      }),

    updateAvailability: (token: string, id: string, isAvailable: boolean) =>
      apiFetch<MenuItem>(`/restaurant/menu/items/${id}/availability`, {
        method: 'PATCH',
        body: { isAvailable },
        token,
      }),

    deleteItem: (token: string, id: string) =>
      apiFetch<void>(`/restaurant/menu/items/${id}`, { method: 'DELETE', token }),
  },

  orders: {
    list: (token: string, params?: { pageSize?: number }) => {
      const qs = params?.pageSize ? `?pageSize=${params.pageSize}` : '';
      return apiFetch<Order[]>(`/restaurant/orders${qs}`, { token });
    },

    accept: (token: string, id: string) =>
      apiFetch<Order>(`/restaurant/orders/${id}/accept`, { method: 'POST', token }),

    reject: (token: string, id: string, reason: string) =>
      apiFetch<Order>(`/restaurant/orders/${id}/reject`, {
        method: 'POST',
        body: { reason },
        token,
      }),

    startPreparing: (token: string, id: string) =>
      apiFetch<Order>(`/restaurant/orders/${id}/start-preparing`, { method: 'POST', token }),

    markReady: (token: string, id: string) =>
      apiFetch<Order>(`/restaurant/orders/${id}/ready`, { method: 'POST', token }),

    markDelivered: (token: string, id: string) =>
      apiFetch<Order>(`/restaurant/orders/${id}/delivered`, { method: 'POST', token }),
  },

  customerOrders: {
    list: (token: string, params?: { status?: string; page?: number; pageSize?: number }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set('status', params.status);
      if (params?.page) qs.set('page', String(params.page));
      if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
      const query = qs.toString() ? `?${qs.toString()}` : '';
      return apiFetch<CustomerOrdersListResponse>(`/restaurant/customer-orders${query}`, { token });
    },

    accept: (token: string, id: string) =>
      apiFetch<CustomerOrder>(`/restaurant/customer-orders/${id}/accept`, {
        method: 'PATCH',
        token,
      }),

    reject: (token: string, id: string) =>
      apiFetch<CustomerOrder>(`/restaurant/customer-orders/${id}/reject`, {
        method: 'PATCH',
        token,
      }),

    cancel: (token: string, id: string) =>
      apiFetch<CustomerOrder>(`/restaurant/customer-orders/${id}/cancel`, {
        method: 'POST',
        token,
      }),

    getDelivery: (token: string, id: string) =>
      apiFetch<any>(`/restaurant/customer-orders/${id}/delivery`, {
        token,
      }),

    preparing: (token: string, id: string) =>
      apiFetch<CustomerOrder>(`/restaurant/customer-orders/${id}/preparing`, {
        method: 'PATCH',
        token,
      }),

    ready: (token: string, id: string) =>
      apiFetch<CustomerOrder>(`/restaurant/customer-orders/${id}/ready`, {
        method: 'PATCH',
        token,
      }),

    delivered: (token: string, id: string) =>
      apiFetch<CustomerOrder>(`/restaurant/customer-orders/${id}/delivered`, {
        method: 'PATCH',
        token,
      }),
  },
};

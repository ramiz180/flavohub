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

  // 204 No Content or empty body — treat as success with no data
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  if (!text) return undefined as T;

  const json = JSON.parse(text) as ApiResponse<T>;

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
};

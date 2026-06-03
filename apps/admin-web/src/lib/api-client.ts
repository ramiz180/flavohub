import type { ApiResponse } from '@flavohub/shared';
import type {
  CreateRestaurantPayload,
  ListMeta,
  ListRestaurantsQuery,
  Restaurant,
  RestaurantWithHours,
} from '@/types/restaurant';

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

  const json = (await res.json()) as ApiResponse<T>;

  if (!json.success) {
    throw new Error(json.error.message);
  }

  return json.data;
}

async function apiFetchList<T>(
  path: string,
  options: {
    token?: string;
    query?: Record<string, string | number | boolean | undefined>;
  } = {},
): Promise<{ data: T[]; meta: ListMeta }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.token) headers['Authorization'] = `Bearer ${options.token}`;

  const url = new URL(`${BASE_URL}${path}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), { method: 'GET', headers });
  const json = (await res.json()) as ApiResponse<T[]>;

  if (!json.success) {
    throw new Error(json.error.message);
  }

  const meta = json.meta as ListMeta | undefined;
  return {
    data: json.data,
    meta: meta ?? { total: 0, page: 1, pageSize: 20 },
  };
}

type LoginData = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; fullName: string; role: string };
};

export const apiClient = {
  login: (email: string, password: string) =>
    apiFetch<LoginData>('/auth/login', { method: 'POST', body: { email, password } }),

  adminPing: (token: string) => apiFetch<{ pong: boolean }>('/admin/ping', { token }),

  restaurants: {
    list: (token: string, query: ListRestaurantsQuery = {}) => {
      const q: Record<string, string | number | boolean | undefined> = {};
      if (query.status !== undefined) q['status'] = query.status;
      if (query.isActive !== undefined) q['isActive'] = query.isActive;
      if (query.search) q['search'] = query.search;
      if (query.page !== undefined) q['page'] = query.page;
      if (query.pageSize !== undefined) q['pageSize'] = query.pageSize;
      return apiFetchList<Restaurant>('/admin/restaurants', { token, query: q });
    },

    get: (token: string, id: string) =>
      apiFetch<RestaurantWithHours>(`/admin/restaurants/${id}`, { token }),

    create: (token: string, dto: CreateRestaurantPayload) =>
      apiFetch<Restaurant>('/admin/restaurants', { method: 'POST', body: dto, token }),

    approve: (token: string, id: string) =>
      apiFetch<Restaurant>(`/admin/restaurants/${id}/approve`, { method: 'POST', token }),

    reject: (token: string, id: string, reason: string) =>
      apiFetch<Restaurant>(`/admin/restaurants/${id}/reject`, {
        method: 'POST',
        body: { reason },
        token,
      }),

    activate: (token: string, id: string) =>
      apiFetch<Restaurant>(`/admin/restaurants/${id}/activate`, { method: 'POST', token }),

    deactivate: (token: string, id: string) =>
      apiFetch<Restaurant>(`/admin/restaurants/${id}/deactivate`, { method: 'POST', token }),
  },
};

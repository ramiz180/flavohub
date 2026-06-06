import type { ApiResponse } from '@flavohub/shared';
import type {
  HoursEntry,
  RestaurantHours,
  RestaurantWithHours,
  UpdateProfilePayload,
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
};

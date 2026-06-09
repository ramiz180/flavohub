import type { ApiResponse, PriceBreakdown } from '@flavohub/shared';
import type {
  AssignOwnerPayload,
  CreateRestaurantPayload,
  ListMeta,
  ListRestaurantsQuery,
  MarkupType,
  Restaurant,
  RestaurantOwner,
  RestaurantWithHours,
} from '@/types/restaurant';
import type {
  PlatformPricing,
  PricingPreviewPayload,
  UpdatePricingPayload,
  UpdateRestaurantMarkupPayload,
} from '@/types/pricing';
import type {
  Coupon,
  CouponValidatePayload,
  CouponValidateResult,
  CreateCouponPayload,
  ListCouponsQuery,
  PlatformSettings,
  UpdateCouponPayload,
  UpdateSettingsPayload,
} from '@/types/coupon';

export class AuthError extends Error {
  constructor() {
    super('Session expired. Please log in again.');
    this.name = 'AuthError';
  }
}

const BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

function dispatchUnauthorized(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('flavohub:unauthorized'));
  }
}

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

  if (res.status === 401) {
    dispatchUnauthorized();
    throw new AuthError();
  }

  let json: ApiResponse<T>;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new Error(`Server error (${res.status})`);
  }

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

  if (res.status === 401) {
    dispatchUnauthorized();
    throw new AuthError();
  }

  let json: ApiResponse<T[]>;
  try {
    json = (await res.json()) as ApiResponse<T[]>;
  } catch {
    throw new Error(`Server error (${res.status})`);
  }

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

type MarkupOverrideResult = {
  id: string;
  markupType: MarkupType | null;
  markupValue: string | null;
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

    assignOwner: (token: string, id: string, dto: AssignOwnerPayload) =>
      apiFetch<RestaurantOwner>(`/admin/restaurants/${id}/owner`, {
        method: 'POST',
        body: dto,
        token,
      }),

    resetOwnerPassword: (token: string, id: string, newPassword: string) =>
      apiFetch<{ message: string }>(`/admin/restaurants/${id}/reset-password`, {
        method: 'PATCH',
        body: { newPassword },
        token,
      }),
  },

  pricing: {
    get: (token: string) => apiFetch<PlatformPricing>('/admin/pricing', { token }),

    update: (token: string, dto: UpdatePricingPayload) =>
      apiFetch<PlatformPricing>('/admin/pricing', { method: 'PATCH', body: dto, token }),

    preview: (token: string, dto: PricingPreviewPayload) =>
      apiFetch<PriceBreakdown>('/admin/pricing/preview', { method: 'POST', body: dto, token }),

    updateRestaurantMarkup: (token: string, id: string, dto: UpdateRestaurantMarkupPayload) =>
      apiFetch<MarkupOverrideResult>(`/admin/restaurants/${id}/markup`, {
        method: 'PATCH',
        body: dto,
        token,
      }),
  },

  coupons: {
    list: (token: string, query: ListCouponsQuery = {}) => {
      const q: Record<string, string | number | boolean | undefined> = {};
      if (query.isActive !== undefined) q['isActive'] = query.isActive;
      if (query.search) q['search'] = query.search;
      if (query.page !== undefined) q['page'] = query.page;
      if (query.pageSize !== undefined) q['pageSize'] = query.pageSize;
      return apiFetchList<Coupon>('/admin/coupons', { token, query: q });
    },

    get: (token: string, id: string) => apiFetch<Coupon>(`/admin/coupons/${id}`, { token }),

    create: (token: string, dto: CreateCouponPayload) =>
      apiFetch<Coupon>('/admin/coupons', { method: 'POST', body: dto, token }),

    update: (token: string, id: string, dto: UpdateCouponPayload) =>
      apiFetch<Coupon>(`/admin/coupons/${id}`, { method: 'PATCH', body: dto, token }),

    validate: (token: string, dto: CouponValidatePayload) =>
      apiFetch<CouponValidateResult>('/admin/coupons/validate', {
        method: 'POST',
        body: dto,
        token,
      }),
  },

  settings: {
    get: (token: string) => apiFetch<PlatformSettings>('/admin/settings', { token }),

    update: (token: string, dto: UpdateSettingsPayload) =>
      apiFetch<PlatformSettings>('/admin/settings', { method: 'PATCH', body: dto, token }),
  },
};

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'https://flavohub-api.onrender.com';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('fh_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as typeof error.config & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const rt = await SecureStore.getItemAsync('fh_refresh_token');
        if (!rt) throw new Error('no refresh token');
        const { data } = await axios.post(`${BASE_URL}/customer/auth/refresh`, {
          refreshToken: rt,
        });
        const newToken = (data as { data: { accessToken: string } }).data.accessToken;
        await SecureStore.setItemAsync('fh_access_token', newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      } catch {
        await SecureStore.deleteItemAsync('fh_access_token');
        await SecureStore.deleteItemAsync('fh_refresh_token');
      }
    }
    return Promise.reject(error);
  },
);

// ─── Restaurant Discovery ────────────────────────────────────────────
export const getNearbyRestaurants = async (lat: number, lng: number, radius = 10) => {
  const res = await apiClient.get('/customer/restaurants/nearby', {
    params: { lat, lng, radius },
  });
  return res.data.data as NearbyRestaurant[];
};

export const getRestaurantById = async (id: string) => {
  const res = await apiClient.get(`/customer/restaurants/${id}`);
  return res.data.data as Restaurant;
};

export const getRestaurantMenu = async (id: string) => {
  const res = await apiClient.get(`/customer/restaurants/${id}/menu`);
  return res.data.data as MenuCategory[];
};

// ─── Types ───────────────────────────────────────────────────────────
export interface NearbyRestaurant {
  id: string;
  name: string;
  cuisineType: string;
  logoUrl: string | null;
  addressLine: string;
  city: string;
  isActive: boolean;
  status: string;
  distance: number;
}

export interface RestaurantHours {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export interface Restaurant {
  id: string;
  name: string;
  description: string | null;
  cuisineType: string;
  logoUrl: string | null;
  addressLine: string;
  city: string;
  phone: string | null;
  isActive: boolean;
  status: string;
  latitude: number;
  longitude: number;
  hours: RestaurantHours[];
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  isAvailable: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  sortOrder: number;
  items: MenuItem[];
}

export const customerApi = {
  auth: {
    requestOtp: (phone: string) => apiClient.post('/customer/auth/otp/request', { phone }),
    verifyOtp: (phone: string, code: string) =>
      apiClient.post('/customer/auth/otp/verify', { phone, code }),
    refresh: (refreshToken: string) => apiClient.post('/customer/auth/refresh', { refreshToken }),
    me: () => apiClient.get('/customer/auth/me'),
    logout: () => apiClient.post('/customer/auth/logout'),
  },
  profile: {
    get: () => apiClient.get('/customer/profile'),
    update: (data: { name?: string; email?: string }) => apiClient.patch('/customer/profile', data),
  },
  addresses: {
    list: () => apiClient.get('/customer/addresses'),
    create: (data: object) => apiClient.post('/customer/addresses', data),
    update: (id: string, data: object) => apiClient.patch(`/customer/addresses/${id}`, data),
    remove: (id: string) => apiClient.delete(`/customer/addresses/${id}`),
    setDefault: (id: string) => apiClient.patch(`/customer/addresses/${id}/default`),
  },
};

// ─── Cart API ─────────────────────────────────────────────────────────
export interface CartItem {
  id: string;
  cartId: string;
  menuItemId: string;
  quantity: number;
  menuItem: {
    id: string;
    name: string;
    price: string;
    imageUrl: string | null;
    restaurantId: string;
  };
}

export interface Cart {
  id?: string;
  items: CartItem[];
  total: number;
  restaurantId: string | null;
}

export const getCart = async (): Promise<Cart> => {
  const res = await apiClient.get('/customer/cart');
  return res.data.data as Cart;
};

export const addToCart = async (menuItemId: string, quantity = 1): Promise<Cart> => {
  const res = await apiClient.post('/customer/cart/items', { menuItemId, quantity });
  return res.data.data as Cart;
};

export const updateCartItem = async (menuItemId: string, quantity: number): Promise<Cart> => {
  const res = await apiClient.patch(`/customer/cart/items/${menuItemId}`, {
    quantity,
  });
  return res.data.data as Cart;
};

export const clearCart = async (): Promise<void> => {
  await apiClient.delete('/customer/cart');
};

export const placeOrder = async (
  deliveryAddress: string,
  note?: string,
): Promise<{ id: string; status: string; totalAmount: string }> => {
  const res = await apiClient.post('/customer/orders/checkout', {
    deliveryAddress,
    note,
  });
  return res.data.data;
};

export const getOrders = async () => {
  const res = await apiClient.get('/customer/orders');
  return res.data.data as OrderSummary[];
};

export interface OrderSummary {
  id: string;
  status: string;
  totalAmount: string;
  deliveryAddress: string;
  createdAt: string;
  restaurant: {
    id: string;
    name: string;
    cuisineType: string;
  };
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  name: string;
  price: string;
  quantity: number;
}

// ─── Coupon API ────────────────────────────────────────────────────────
export interface CouponResult {
  valid: boolean;
  discount?: number;
  reason?: string;
  coupon?: {
    id: string;
    code: string;
    type: string;
    value: number;
    minOrderValue: number;
  };
}

export const validateCoupon = async (code: string, orderAmount: number): Promise<CouponResult> => {
  const res = await apiClient.post('/customer/coupons/validate', {
    code: code.toUpperCase().trim(),
    orderAmount,
  });
  return res.data.data as CouponResult;
};

// ─── Payment API ──────────────────────────────────────────────────────
export interface RazorpayOrder {
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
  orderId: string;
}

export interface PaymentVerification {
  success: boolean;
  orderId: string;
  paymentId: string;
  status: string;
}

export const createPaymentOrder = async (orderId: string): Promise<RazorpayOrder> => {
  const res = await apiClient.post('/customer/payments/create-order', {
    orderId,
  });
  return res.data.data as RazorpayOrder;
};

export const verifyPayment = async (
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
  orderId: string,
): Promise<PaymentVerification> => {
  const res = await apiClient.post('/customer/payments/verify', {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    orderId,
  });
  return res.data.data as PaymentVerification;
};

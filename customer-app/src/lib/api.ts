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

import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import type { Customer } from '../../types';
import { customerApi } from '../api';

interface AuthState {
  customer: Customer | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  pendingPhone: string;
  setPendingPhone: (phone: string) => void;
  initialize: () => Promise<void>;
  requestOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, code: string) => Promise<void>;
  updateProfile: (data: { name?: string; email?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  customer: null,
  isAuthenticated: false,
  isInitialized: false,
  pendingPhone: '',

  setPendingPhone: (phone) => set({ pendingPhone: phone }),

  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync('fh_access_token');
      if (!token) {
        set({ isInitialized: true });
        return;
      }
      const { data } = await customerApi.auth.me();
      set({
        customer: (data as { data: Customer }).data,
        isAuthenticated: true,
        isInitialized: true,
      });
    } catch {
      await SecureStore.deleteItemAsync('fh_access_token');
      await SecureStore.deleteItemAsync('fh_refresh_token');
      set({ isInitialized: true });
    }
  },

  requestOtp: async (phone) => {
    await customerApi.auth.requestOtp(phone);
    set({ pendingPhone: phone });
  },

  verifyOtp: async (phone, code) => {
    const { data } = await customerApi.auth.verifyOtp(phone, code);
    const { accessToken, refreshToken, customer } = (
      data as { data: { accessToken: string; refreshToken: string; customer: Customer } }
    ).data;
    await SecureStore.setItemAsync('fh_access_token', accessToken);
    await SecureStore.setItemAsync('fh_refresh_token', refreshToken);
    set({ customer, isAuthenticated: true });
  },

  updateProfile: async (payload) => {
    const { data } = await customerApi.profile.update(payload);
    set((state) => ({
      customer: { ...state.customer!, ...(data as { data: Partial<Customer> }).data },
    }));
  },

  logout: async () => {
    try {
      await customerApi.auth.logout();
    } catch {
      // ignore
    }
    await SecureStore.deleteItemAsync('fh_access_token');
    await SecureStore.deleteItemAsync('fh_refresh_token');
    set({ customer: null, isAuthenticated: false, pendingPhone: '' });
  },
}));

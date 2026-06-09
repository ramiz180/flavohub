'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Role } from '@flavohub/shared';
import { AuthError, apiClient } from './api-client';

interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

interface RestaurantProfile {
  name: string;
  logoUrl: string | null;
}

interface AuthState {
  currentUser: CurrentUser | null;
  accessToken: string | null;
  restaurantProfile: RestaurantProfile | null;
  isInitializing: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setRestaurantProfile: (profile: RestaurantProfile) => void;
}

const STORAGE_KEY = 'flavohub:restaurant:session';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    currentUser: null,
    accessToken: null,
    restaurantProfile: null,
    isInitializing: true,
  });
  const initDone = useRef(false);

  useEffect(() => {
    function handleUnauthorized() {
      sessionStorage.removeItem(STORAGE_KEY);
      setState({
        currentUser: null,
        accessToken: null,
        restaurantProfile: null,
        isInitializing: false,
      });
    }
    window.addEventListener('flavohub:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('flavohub:unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setState((prev) => ({ ...prev, isInitializing: false }));
      return;
    }

    let stored: { accessToken: string; currentUser: CurrentUser } | null = null;
    try {
      stored = JSON.parse(raw) as { accessToken: string; currentUser: CurrentUser };
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
      setState((prev) => ({ ...prev, isInitializing: false }));
      return;
    }

    const { accessToken, currentUser } = stored;

    apiClient.restaurant
      .getProfile(accessToken)
      .then((profile) => {
        setState({
          currentUser,
          accessToken,
          restaurantProfile: { name: profile.name, logoUrl: profile.logoUrl ?? null },
          isInitializing: false,
        });
      })
      .catch((err: unknown) => {
        if (err instanceof AuthError) {
          // Genuine 401 — token is invalid, force re-login
          sessionStorage.removeItem(STORAGE_KEY);
          setState({
            currentUser: null,
            accessToken: null,
            restaurantProfile: null,
            isInitializing: false,
          });
        } else {
          // Network error, 5xx, timeout etc. — keep user logged in
          setState({ currentUser, accessToken, restaurantProfile: null, isInitializing: false });
        }
      });
  }, []);

  async function login(email: string, password: string): Promise<void> {
    const data = await apiClient.login(email, password);
    const currentUser: CurrentUser = {
      id: data.user.id,
      email: data.user.email,
      fullName: data.user.fullName,
      role: data.user.role as unknown as Role,
    };
    const profile = await apiClient.restaurant.getProfile(data.accessToken);
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ accessToken: data.accessToken, currentUser }),
    );
    setState({
      currentUser,
      accessToken: data.accessToken,
      restaurantProfile: { name: profile.name, logoUrl: profile.logoUrl ?? null },
      isInitializing: false,
    });
  }

  function logout(): void {
    sessionStorage.removeItem(STORAGE_KEY);
    setState({
      currentUser: null,
      accessToken: null,
      restaurantProfile: null,
      isInitializing: false,
    });
  }

  function setRestaurantProfile(profile: RestaurantProfile): void {
    setState((prev) => ({ ...prev, restaurantProfile: profile }));
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout, setRestaurantProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

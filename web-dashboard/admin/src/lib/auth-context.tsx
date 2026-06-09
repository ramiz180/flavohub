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

interface AuthState {
  currentUser: CurrentUser | null;
  accessToken: string | null;
  isInitializing: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const STORAGE_KEY = 'flavohub:admin:session';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    currentUser: null,
    accessToken: null,
    isInitializing: true,
  });
  const initDone = useRef(false);

  useEffect(() => {
    function handleUnauthorized() {
      sessionStorage.removeItem(STORAGE_KEY);
      setState({ currentUser: null, accessToken: null, isInitializing: false });
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

    apiClient
      .adminPing(accessToken)
      .then(() => {
        setState({ currentUser, accessToken, isInitializing: false });
      })
      .catch((err: unknown) => {
        if (err instanceof AuthError) {
          // Genuine 401 — token is invalid, force re-login
          sessionStorage.removeItem(STORAGE_KEY);
          setState({ currentUser: null, accessToken: null, isInitializing: false });
        } else {
          // Network error, 5xx, timeout etc. — keep user logged in
          setState({ currentUser, accessToken, isInitializing: false });
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
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ accessToken: data.accessToken, currentUser }),
    );
    setState({ currentUser, accessToken: data.accessToken, isInitializing: false });
  }

  function logout(): void {
    sessionStorage.removeItem(STORAGE_KEY);
    setState({ currentUser: null, accessToken: null, isInitializing: false });
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

'use client';

import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { Role } from '@flavohub/shared';
import { apiClient } from './api-client';

interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

interface AuthState {
  currentUser: CurrentUser | null;
  // Access token is held in memory only — never written to localStorage or sessionStorage.
  // TODO (Part 3 hardening): move both tokens to httpOnly cookies so they survive page
  // refreshes without JavaScript access. Until then, a page refresh clears the session
  // and the user must log in again.
  accessToken: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ currentUser: null, accessToken: null });

  async function login(email: string, password: string): Promise<void> {
    const data = await apiClient.login(email, password);
    setState({
      currentUser: {
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.fullName,
        role: data.user.role as unknown as Role,
      },
      accessToken: data.accessToken,
    });
  }

  function logout(): void {
    setState({ currentUser: null, accessToken: null });
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

'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

interface SidebarContextValue {
  isOpen: boolean;
  isCollapsed: boolean;
  toggle: () => void;
  close: () => void;
  toggleCollapse: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggleCollapse = useCallback(() => setIsCollapsed((v) => !v), []);

  return (
    <SidebarContext.Provider value={{ isOpen, isCollapsed, toggle, close, toggleCollapse }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used inside SidebarProvider');
  return ctx;
}

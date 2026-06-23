'use client';

import type { ReactNode } from 'react';
import { SidebarProvider, useSidebar } from '@/components/sidebar/SidebarContext';
import Sidebar from '@/components/sidebar/Sidebar';
import TopBar from '@/components/TopBar';
import AuthGuard from '@/components/auth-guard';

function DashboardShell({ children }: { children: ReactNode }) {
  const { isOpen, isCollapsed, close, toggleCollapse } = useSidebar();

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        isMobileOpen={isOpen}
        onMobileClose={close}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />

      {/*
        Main content:
        - Mobile: no left padding (sidebar is a drawer overlay)
        - Desktop: push right by sidebar width (safelisted in tailwind.config.ts)
      */}
      <div
        className={`flex min-h-screen flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? 'lg:pl-[68px]' : 'lg:pl-[280px]'
        }`}
      >
        <TopBar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="page-enter">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <DashboardShell>{children}</DashboardShell>
      </SidebarProvider>
    </AuthGuard>
  );
}

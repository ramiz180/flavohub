'use client';

import type { ReactNode } from 'react';
import AuthGuard from '@/components/auth-guard';
import { SidebarProvider, useSidebar } from '@/components/sidebar/SidebarContext';
import Sidebar from '@/components/sidebar/Sidebar';
import TopBar from '@/components/TopBar';

function DashboardShell({ children }: { children: ReactNode }) {
  const { isOpen, isCollapsed, close, toggleCollapse } = useSidebar();

  return (
    <div className="min-h-screen bg-[#f4f6f8]">
      <Sidebar
        isMobileOpen={isOpen}
        onMobileClose={close}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />

      {/*
        Content shifts right by sidebar width on desktop/tablet.
        Mobile: 0 padding
        Tablet (md): 80px padding (sidebar is always collapsed on tablet)
        Laptop+ (lg): 80px or 280px based on isCollapsed
      */}
      <div
        className={`flex min-h-screen flex-col transition-all duration-300 ease-in-out w-full md:pl-[80px] ${
          isCollapsed ? 'lg:pl-[80px]' : 'lg:pl-[280px]'
        }`}
      >
        <TopBar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 page-enter">
          <div className="mx-auto max-w-[1600px] w-full">
            {children}
          </div>
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

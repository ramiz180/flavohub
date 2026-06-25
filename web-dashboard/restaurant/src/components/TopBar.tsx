'use client';

import { usePathname } from 'next/navigation';
import { useSidebar } from './sidebar/SidebarContext';
import { Menu, Bell } from 'lucide-react';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/profile': 'Profile',
  '/dashboard/hours': 'Business Hours',
  '/dashboard/menu': 'Menu',
  '/dashboard/orders': 'Orders',
  '/dashboard/customer-orders': 'Customer Orders',
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  for (const [key, label] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(key + '/')) return label;
  }
  return 'Dashboard';
}

export default function TopBar() {
  const { toggle } = useSidebar();
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-10 flex h-[72px] items-center gap-4 bg-white/60 px-4 backdrop-blur-2xl sm:px-6 lg:px-8 border-b border-slate-200/50 shadow-sm transition-all">
      {/* Hamburger — mobile only */}
      <button
        onClick={toggle}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 lg:hidden shadow-sm bg-white border border-slate-200"
        aria-label="Open navigation menu"
      >
        <Menu size={20} strokeWidth={2.5} />
      </button>

      {/* Page title */}
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-slate-800">{title}</h1>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        <button
          className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 shadow-sm transition-all hover:bg-slate-50 hover:text-emerald-600 hover:border-emerald-200"
          aria-label="Notifications"
        >
          <Bell size={18} strokeWidth={2.5} />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
        </button>

        <div className="mx-2 hidden h-8 w-px bg-slate-200 sm:block" />

        {/* FlavoHub branding */}
        <div className="hidden items-center gap-2 rounded-xl bg-emerald-50/50 px-4 py-2 ring-1 ring-emerald-100/50 sm:flex">
          <div className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Powered by FlavoHub</span>
        </div>
      </div>
    </header>
  );
}

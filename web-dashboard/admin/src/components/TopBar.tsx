'use client';

import { usePathname } from 'next/navigation';
import { useSidebar } from './sidebar/SidebarContext';
import { Menu, Bell, Search, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/restaurants': 'Restaurants',
  '/dashboard/orders': 'Orders',
  '/dashboard/deliveries': 'Deliveries',
  '/dashboard/payments': 'Payments',
  '/dashboard/pricing': 'Pricing',
  '/dashboard/coupons': 'Coupons',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/customers': 'Customers',
  '/dashboard/reviews': 'Reviews',
  '/dashboard/notifications': 'Notifications',
  '/dashboard/settings': 'Settings',
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
    <header className="sticky top-0 z-30 flex h-[72px] items-center gap-4 border-b border-slate-200/50 bg-white/70 px-4 backdrop-blur-xl sm:px-8">
      {/* Mobile Menu Toggle */}
      <button
        onClick={toggle}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 lg:hidden"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Page Title */}
      <div className="flex-1 lg:flex-none lg:w-64">
        <motion.h1 
          key={title}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-bold tracking-tight text-brand-secondary"
        >
          {title}
        </motion.h1>
      </div>

      {/* Global Search */}
      <div className="hidden flex-1 lg:block max-w-xl mx-auto">
        <div className="relative group">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <Search className="h-4 w-4 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search restaurants, orders, or customers..."
            className="block w-full rounded-2xl border-0 bg-slate-100/80 py-2.5 pl-11 pr-4 text-sm text-slate-900 ring-1 ring-inset ring-slate-200/50 transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-brand-primary sm:leading-6 shadow-sm"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <span className="text-[10px] font-medium text-slate-400 border border-slate-200 rounded px-1.5 py-0.5 bg-white">⌘K</span>
          </div>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3 shrink-0 ml-auto lg:ml-0">
        
        {/* Settings Action */}
        <button className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600">
          <Settings className="h-5 w-5" />
        </button>

        {/* Notifications */}
        <button
          className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-2.5 top-2.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary"></span>
          </span>
        </button>

        <div className="mx-2 hidden h-8 w-px bg-slate-200 sm:block" />

        {/* Platform Status */}
        <div className="hidden items-center gap-2.5 rounded-xl bg-emerald-50 px-3 py-2 sm:flex ring-1 ring-emerald-100 shadow-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">All Systems Operational</span>
        </div>
      </div>
    </header>
  );
}

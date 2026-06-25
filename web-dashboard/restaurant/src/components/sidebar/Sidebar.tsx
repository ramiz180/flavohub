'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useSidebar } from './SidebarContext';
import { 
  LayoutDashboard, 
  User, 
  Clock, 
  UtensilsCrossed, 
  Receipt, 
  ShoppingBag, 
  ChevronLeft, 
  ChevronRight, 
  LogOut 
} from 'lucide-react';
import { useEffect, useState } from 'react';

const NAV_ITEMS = [
  { label: 'Overview', href: '/dashboard', icon: <LayoutDashboard size={20} /> },
  { label: 'Profile', href: '/dashboard/profile', icon: <User size={20} /> },
  { label: 'Hours', href: '/dashboard/hours', icon: <Clock size={20} /> },
  { label: 'Menu', href: '/dashboard/menu', icon: <UtensilsCrossed size={20} /> },
  { label: 'Orders', href: '/dashboard/orders', icon: <Receipt size={20} /> },
  { label: 'Customer Orders', href: '/dashboard/customer-orders', icon: <ShoppingBag size={20} /> },
  { label: 'Payments', href: '/dashboard/payments', icon: <Receipt size={20} /> },
];

function NavLink({
  item,
  collapsed,
  onClick,
}: {
  item: (typeof NAV_ITEMS)[0];
  collapsed: boolean;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive =
    item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-300 ${
        isActive
          ? 'bg-emerald-500 text-white shadow-float'
          : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-800'
      } ${collapsed ? 'justify-center lg:justify-center' : 'lg:justify-start justify-center'}`}
    >
      {isActive && !collapsed && (
        <span className="absolute left-0 top-1/2 hidden h-8 w-1 -translate-y-1/2 rounded-r-full bg-emerald-400 lg:block" />
      )}
      <span
        className={`shrink-0 transition-transform duration-300 ${isActive ? 'text-white scale-110' : 'text-slate-400 group-hover:text-slate-600 group-hover:scale-110'}`}
      >
        {item.icon}
      </span>
      {!collapsed && <span className="truncate hidden lg:block">{item.label}</span>}
      
      {/* Tooltip for collapsed state or tablet mode */}
      <div className={`absolute left-full ml-4 hidden w-auto rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white shadow-xl z-50 ${collapsed ? 'lg:group-hover:block' : 'group-hover:block lg:group-hover:hidden'}`}>
        <div className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 bg-slate-800" />
        {item.label}
      </div>
    </Link>
  );
}

function SidebarInner({
  collapsed,
  onNavClick,
  onToggleCollapse,
}: {
  collapsed: boolean;
  onNavClick?: () => void;
  onToggleCollapse: () => void;
}) {
  const { currentUser, restaurantProfile, logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  const logoUrl = restaurantProfile?.logoUrl ?? null;
  const restaurantName = restaurantProfile?.name ?? 'Restaurant';
  const initial = restaurantName.charAt(0).toUpperCase();

  return (
    <div className="flex h-full flex-col">
      <div
        className={`relative flex items-center border-b border-slate-200/50 py-6 ${
          collapsed ? 'justify-center px-4' : 'justify-center lg:justify-start px-4 lg:px-6'
        }`}
      >
        {!collapsed && (
          <div className="hidden lg:flex w-full items-center gap-3">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={restaurantName}
                width={40}
                height={40}
                className="h-10 w-10 rounded-2xl object-cover ring-4 ring-emerald-50 shadow-sm"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-lg font-bold text-white shadow-float">
                {initial}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold tracking-tight text-slate-800">{restaurantName}</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                FlavoHub
              </p>
            </div>
          </div>
        )}
        {(collapsed || true) && (
          <div className={!collapsed ? 'lg:hidden' : ''}>
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={restaurantName}
                width={40}
                height={40}
                className="h-10 w-10 rounded-2xl object-cover ring-4 ring-emerald-50 shadow-sm"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-lg font-bold text-white shadow-float">
                {initial}
              </div>
            )}
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className={`absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm hover:bg-slate-50 hover:text-slate-600 lg:flex`}
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight size={14} strokeWidth={3} /> : <ChevronLeft size={14} strokeWidth={3} />}
        </button>
      </div>

      <nav className="sidebar-scroll flex-1 overflow-y-auto px-4 py-6">
        <div className="space-y-2">
          {!collapsed && (
            <p className="mb-4 ml-2 hidden lg:block text-xs font-bold uppercase tracking-widest text-slate-400">
              Navigation
            </p>
          )}
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} collapsed={collapsed} onClick={onNavClick} />
          ))}
        </div>
      </nav>

      <div className="border-t border-slate-200/50 p-4">
        <div
          className={`flex items-center rounded-2xl bg-slate-50/80 p-3 transition-colors hover:bg-slate-100 ${
            collapsed ? 'justify-center' : 'justify-center lg:justify-start lg:gap-3'
          }`}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-sm font-bold text-white shadow-sm">
            {currentUser?.fullName?.[0]?.toUpperCase() ?? currentUser?.email?.[0]?.toUpperCase() ?? 'R'}
          </div>
          {!collapsed && (
            <div className="hidden lg:flex min-w-0 flex-1 flex-col">
              <p className="truncate text-sm font-bold text-slate-800">
                {currentUser?.fullName ?? 'Owner'}
              </p>
              <p className="truncate text-xs font-medium text-slate-500">{currentUser?.email}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleLogout}
              className="ml-auto hidden lg:flex shrink-0 rounded-xl p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
        {(collapsed || true) && (
          <button
            onClick={handleLogout}
            className={`mt-2 flex w-full items-center justify-center rounded-2xl bg-slate-50 p-3 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 ${!collapsed ? 'lg:hidden' : ''}`}
            aria-label="Logout"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

// Sidebar for Mobile drawer (fully expanded)
function MobileSidebarInner({ onNavClick }: { onNavClick: () => void }) {
  const { currentUser, restaurantProfile, logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  const logoUrl = restaurantProfile?.logoUrl ?? null;
  const restaurantName = restaurantProfile?.name ?? 'Restaurant';
  const initial = restaurantName.charAt(0).toUpperCase();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center border-b border-slate-200/50 py-6 px-6">
        <div className="flex w-full items-center gap-3">
          {logoUrl ? (
            <Image src={logoUrl} alt={restaurantName} width={40} height={40} className="h-10 w-10 rounded-2xl object-cover ring-4 ring-emerald-50 shadow-sm" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-lg font-bold text-white shadow-float">{initial}</div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold tracking-tight text-slate-800">{restaurantName}</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">FlavoHub</p>
          </div>
        </div>
      </div>
      <nav className="sidebar-scroll flex-1 overflow-y-auto px-4 py-6">
        <div className="space-y-2">
          <p className="mb-4 ml-2 text-xs font-bold uppercase tracking-widest text-slate-400">Navigation</p>
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === '/dashboard' ? usePathname() === '/dashboard' : usePathname().startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} onClick={onNavClick} className={`group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-300 ${isActive ? 'bg-emerald-500 text-white shadow-float' : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-800'}`}>
                <span className={`shrink-0 transition-transform duration-300 ${isActive ? 'text-white' : 'text-slate-400'}`}>{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
      <div className="border-t border-slate-200/50 p-4">
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50/80 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-sm font-bold text-white shadow-sm">
            {currentUser?.fullName?.[0]?.toUpperCase() ?? currentUser?.email?.[0]?.toUpperCase() ?? 'R'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-800">{currentUser?.fullName ?? 'Owner'}</p>
            <p className="truncate text-xs font-medium text-slate-500">{currentUser?.email}</p>
          </div>
          <button onClick={handleLogout} className="ml-auto shrink-0 rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><LogOut size={18} /></button>
        </div>
      </div>
    </div>
  );
}

interface SidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({
  isMobileOpen,
  onMobileClose,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  // Client side mounted check to avoid hydration errors with window sizes if any, though we only use CSS here.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer (< 768px) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[280px] transform bg-white shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Mobile navigation"
      >
        <MobileSidebarInner onNavClick={onMobileClose} />
      </aside>

      {/* Tablet / Desktop sidebar (>= 768px) */}
      {/* Tablet: always 80px (md:flex md:w-[80px]) */}
      {/* Desktop: respects isCollapsed (lg:w-[80px] or lg:w-[280px]) */}
      <aside
        className={`fixed inset-y-0 left-0 z-20 hidden bg-white/80 backdrop-blur-2xl border-r border-slate-200/60 shadow-glass transition-all duration-300 ease-in-out md:flex md:flex-col md:w-[80px] ${
          isCollapsed ? 'lg:w-[80px]' : 'lg:w-[280px]'
        }`}
        aria-label="Desktop navigation"
      >
        <SidebarInner collapsed={isCollapsed} onToggleCollapse={onToggleCollapse} />
      </aside>
    </>
  );
}

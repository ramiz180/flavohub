'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Store, 
  ShoppingBag, 
  Truck, 
  CreditCard, 
  Ticket, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Users,
  MessageSquare,
  Bell,
  IndianRupee
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: <Home className="w-5 h-5" /> },
  { label: 'Restaurants', href: '/dashboard/restaurants', icon: <Store className="w-5 h-5" /> },
  { label: 'Orders', href: '/dashboard/orders', icon: <ShoppingBag className="w-5 h-5" /> },
  { label: 'Deliveries', href: '/dashboard/deliveries', icon: <Truck className="w-5 h-5" /> },
  { label: 'Payments', href: '/dashboard/payments', icon: <CreditCard className="w-5 h-5" /> },
  { label: 'Pricing', href: '/dashboard/pricing', icon: <IndianRupee className="w-5 h-5" /> },
  { label: 'Coupons', href: '/dashboard/coupons', icon: <Ticket className="w-5 h-5" /> },
  { label: 'Analytics', href: '/dashboard/analytics', icon: <TrendingUp className="w-5 h-5" /> },
  { label: 'Customers', href: '/dashboard/customers', icon: <Users className="w-5 h-5" /> },
  { label: 'Reviews', href: '/dashboard/reviews', icon: <MessageSquare className="w-5 h-5" /> },
  { label: 'Notifications', href: '/dashboard/notifications', icon: <Bell className="w-5 h-5" /> },
  { label: 'Settings', href: '/dashboard/settings', icon: <Settings className="w-5 h-5" /> },
];

function NavLink({ item, collapsed, onClick }: { item: NavItem; collapsed: boolean; onClick?: () => void }) {
  const pathname = usePathname();
  const isActive = item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
        isActive
          ? 'bg-[#FF6B00]/10 text-[#FF6B00]'
          : 'text-slate-400 hover:bg-white/5 hover:text-white'
      } ${collapsed ? 'justify-center' : ''}`}
    >
      {isActive && !collapsed && (
        <motion.span 
          layoutId="active-nav-indicator"
          className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-[#FF6B00]" 
        />
      )}
      <span className={`shrink-0 transition-colors ${isActive ? 'text-[#FF6B00]' : 'text-slate-500 group-hover:text-slate-300'}`}>
        {item.icon}
      </span>
      {!collapsed && <span className="truncate">{item.label}</span>}
      {collapsed && (
        <span className="pointer-events-none absolute left-full ml-4 hidden whitespace-nowrap rounded-lg bg-brand-secondary px-3 py-2 text-xs font-semibold text-white shadow-premium z-50 group-hover:block">
          {item.label}
        </span>
      )}
    </Link>
  );
}

interface SidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ isMobileOpen, onMobileClose, isCollapsed, onToggleCollapse }: SidebarProps) {
  const { currentUser, logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  const initials = currentUser?.fullName
    ? currentUser.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : currentUser?.email?.[0]?.toUpperCase() ?? 'A';

  const SidebarInner = ({ collapsed, onNavClick }: { collapsed: boolean; onNavClick?: () => void }) => (
    <div className="flex h-full flex-col bg-[#121826] text-white">
      {/* Header */}
      <div className={`flex items-center h-[72px] shrink-0 border-b border-white/10 ${collapsed ? 'justify-center px-4' : 'justify-between px-6'}`}>
        {!collapsed ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FF6B00] shadow-[0_0_15px_rgba(255,107,0,0.4)]">
              <span className="text-sm font-black text-white">F</span>
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-white leading-tight">FlavoHub</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#00C47A]">Admin</p>
            </div>
          </motion.div>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FF6B00] shadow-[0_0_15px_rgba(255,107,0,0.4)]">
            <span className="text-sm font-black text-white">F</span>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="hidden rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white lg:block"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-scroll flex-1 overflow-y-auto px-4 py-6">
        <div className="space-y-1.5">
          {!collapsed && <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Menu</p>}
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} collapsed={collapsed} onClick={onNavClick} />
          ))}
        </div>
      </nav>

      {/* Footer / User Profile */}
      <div className="border-t border-white/10 p-4">
        <div className={`flex items-center rounded-2xl bg-white/5 p-3 transition-colors hover:bg-white/10 ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF6B00] to-[#ff8c33] text-sm font-bold text-white shadow-md">
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{currentUser?.fullName || 'Super Admin'}</p>
              <p className="truncate text-[11px] font-medium text-slate-400">{currentUser?.email}</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={handleLogout} className="ml-auto shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-500/20 hover:text-red-400">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
        {collapsed && (
          <button onClick={handleLogout} className="mt-2 flex w-full items-center justify-center rounded-xl p-3 text-slate-400 transition-colors hover:bg-red-500/20 hover:text-red-400">
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-[#121826]/80 backdrop-blur-sm lg:hidden"
            onClick={onMobileClose}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMobileOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 z-40 w-[280px] shadow-2xl lg:hidden"
          >
            <SidebarInner collapsed={false} onNavClick={onMobileClose} />
          </motion.aside>
        )}
      </AnimatePresence>

      <motion.aside
        animate={{ width: isCollapsed ? 80 : 280 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 left-0 z-20 hidden shadow-premium lg:flex lg:flex-col overflow-hidden"
      >
        <SidebarInner collapsed={isCollapsed} />
      </motion.aside>
    </>
  );
}

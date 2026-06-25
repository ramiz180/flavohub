'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import type { RestaurantWithHours } from '@/types/restaurant';
import { 
  User, 
  Clock, 
  UtensilsCrossed, 
  Receipt,
  ChevronRight,
  AlertCircle,
  Activity,
  CheckCircle2,
  XCircle,
  Clock3
} from 'lucide-react';
import { motion } from 'framer-motion';

const STATUS_CONFIG = {
  PENDING: {
    color: 'text-amber-700 bg-amber-50 ring-amber-200',
    icon: <Clock3 size={16} className="text-amber-500" />,
    label: 'Pending Approval'
  },
  APPROVED: {
    color: 'text-emerald-700 bg-emerald-50 ring-emerald-200',
    icon: <CheckCircle2 size={16} className="text-emerald-500" />,
    label: 'Approved'
  },
  REJECTED: {
    color: 'text-red-700 bg-red-50 ring-red-200',
    icon: <XCircle size={16} className="text-red-500" />,
    label: 'Rejected'
  },
} as const;

function QuickAction({
  href,
  label,
  description,
  icon,
  delay = 0,
}: {
  href: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="h-full"
    >
      <Link
        href={href}
        className="group flex h-full flex-col justify-between rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-premium hover:ring-emerald-200"
      >
        <div>
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-500 group-hover:text-white shadow-sm">
            {icon}
          </div>
          <h3 className="text-lg font-bold text-slate-800 group-hover:text-emerald-700">{label}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
        </div>
        <div className="mt-6 flex items-center text-sm font-semibold text-emerald-600 opacity-0 transition-opacity group-hover:opacity-100">
          Manage <ChevronRight size={16} className="ml-1" />
        </div>
      </Link>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { accessToken } = useAuth();
  const [restaurant, setRestaurant] = useState<RestaurantWithHours | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(() => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    apiClient.restaurant
      .getProfile(accessToken)
      .then(setRestaurant)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load restaurant');
      })
      .finally(() => setLoading(false));
  }, [accessToken]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-12 w-12 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-20"></span>
            <span className="relative inline-flex h-12 w-12 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600"></span>
          </div>
          <p className="font-medium tracking-wide text-slate-400">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
          <AlertCircle size={24} />
        </div>
        <h3 className="text-lg font-bold text-slate-800">Unable to load dashboard</h3>
        <p className="mt-2 text-sm text-slate-500">{error ?? 'Restaurant not found'}</p>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const statusConfig = STATUS_CONFIG[restaurant.status] || STATUS_CONFIG.PENDING;

  return (
    <div className="space-y-8 pb-8">
      {/* Premium Welcome Banner */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-[2rem] bg-slate-900 p-8 sm:p-12 shadow-float"
      >
        {/* Dynamic Background Effects */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl"></div>
        <div className="absolute -bottom-32 -right-32 h-[30rem] w-[30rem] rounded-full bg-teal-500/20 blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 backdrop-blur-md border border-white/10">
                <Clock3 size={14} className="text-emerald-300" />
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-100">{today}</p>
              </div>
              <h2 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Welcome back,<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-300">
                  {restaurant.name}
                </span>
              </h2>
              <p className="mt-4 flex items-center gap-2 text-lg font-medium text-slate-300">
                {restaurant.city}
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 sm:items-end">
              {/* Status Badge */}
              <div className={`flex items-center gap-2 rounded-full px-4 py-2 ring-1 ${statusConfig.color} bg-white shadow-sm`}>
                {statusConfig.icon}
                <span className="text-sm font-bold tracking-wide">{statusConfig.label}</span>
              </div>

              {/* Active Badge */}
              <div
                className={`flex items-center gap-2.5 rounded-full px-4 py-2 backdrop-blur-md border ${
                  restaurant.isActive
                    ? 'border-emerald-400/30 bg-emerald-500/20 text-emerald-50'
                    : 'border-slate-400/30 bg-slate-500/20 text-slate-200'
                }`}
              >
                <div className="relative flex h-2 w-2">
                  {restaurant.isActive && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span className={`relative inline-flex h-2 w-2 rounded-full ${restaurant.isActive ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
                </div>
                <span className="text-sm font-bold tracking-wide">
                  {restaurant.isActive ? 'Accepting Orders' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          {/* Rejection reason */}
          {restaurant.status === 'REJECTED' && restaurant.rejectionReason && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 backdrop-blur-md"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 text-red-400" size={20} />
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-red-300">
                    Action Required
                  </p>
                  <p className="mt-1.5 text-base text-red-100">{restaurant.rejectionReason}</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Info note */}
      {restaurant.status === 'PENDING' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-start gap-4 rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-6 shadow-sm"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <Activity size={20} />
          </div>
          <div>
            <p className="text-base font-bold text-amber-900">Account Under Review</p>
            <p className="mt-1 text-sm leading-relaxed text-amber-700/80">
              Your restaurant is currently pending approval by the FlavoHub team. You will be notified once you can start accepting orders.
            </p>
          </div>
        </motion.div>
      )}

      {/* Quick actions Grid */}
      <div className="mt-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Quick Management</h2>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            href="/dashboard/profile"
            label="Restaurant Profile"
            description="Manage your brand identity, contact details, and location."
            icon={<User size={24} strokeWidth={2} />}
            delay={0.1}
          />
          <QuickAction
            href="/dashboard/hours"
            label="Business Hours"
            description="Set daily operating schedules and special holiday timings."
            icon={<Clock size={24} strokeWidth={2} />}
            delay={0.2}
          />
          <QuickAction
            href="/dashboard/menu"
            label="Menu Management"
            description="Update items, categories, pricing, and item availability."
            icon={<UtensilsCrossed size={24} strokeWidth={2} />}
            delay={0.3}
          />
          <QuickAction
            href="/dashboard/orders"
            label="Live Orders"
            description="Monitor, accept, and process incoming customer orders."
            icon={<Receipt size={24} strokeWidth={2} />}
            delay={0.4}
          />
        </div>
      </div>
    </div>
  );
}

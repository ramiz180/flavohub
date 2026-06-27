'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { motion } from 'framer-motion';
import { 
  Users, Store, IndianRupee, Wallet, CreditCard, 
  XCircle, Truck, Clock, ClipboardCheck, Activity
} from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

function StatCard({ label, value, sub, icon }: StatCardProps) {
  return (
    <motion.div 
      variants={itemVariants}
      className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-premium transition-all hover:shadow-premium-hover border border-slate-100"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2 z-10">
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold tracking-tight text-[#121826]">{value}</h3>
          </div>
          {sub && <p className="text-xs font-medium text-slate-400">{sub}</p>}
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400 group-hover:bg-brand-primary/10 group-hover:text-brand-primary transition-colors z-10">
          {icon}
        </div>
      </div>
      <div className="pointer-events-none absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-brand-primary/5 blur-2xl transition-all group-hover:bg-brand-primary/10 group-hover:scale-150" />
    </motion.div>
  );
}

export default function DashboardPage() {
  const { currentUser, accessToken } = useAuth();

  useEffect(() => {
    if (!accessToken) return;
    apiClient.adminPing(accessToken).catch(() => {});
  }, [accessToken]);

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-[#121826] p-8 sm:p-10 text-white shadow-xl"
      >
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <Activity className="w-64 h-64 text-brand-primary animate-pulse" />
        </div>
        
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#00C47A]">{today}</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Welcome Back, {currentUser?.fullName?.split(' ')[0] ?? 'Admin'}
            </h2>
            <p className="text-sm text-slate-400">Here is what's happening on FlavoHub today.</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 sm:flex sm:gap-6 shrink-0">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur-md">
              <p className="text-xs text-slate-400 font-medium mb-1">Today's Revenue</p>
              <p className="text-2xl font-bold text-white">₹ 0</p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur-md">
              <p className="text-xs text-slate-400 font-medium mb-1">Active Deliveries</p>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF6B00]"></span>
                </span>
                <p className="text-2xl font-bold text-white">0</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Glow Effects */}
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-[#FF6B00]/20 blur-[100px]" />
        <div className="pointer-events-none absolute right-10 -top-20 h-48 w-48 rounded-full bg-[#00C47A]/10 blur-[80px]" />
      </motion.div>

      {/* Stats Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        <StatCard 
          label="Total Customers" 
          value="0"
          sub="Registered on platform"
          icon={<Users className="w-6 h-6" />} 
        />
        <StatCard 
          label="Total Restaurants" 
          value="0"
          sub="Across all operating cities"
          icon={<Store className="w-6 h-6" />} 
        />
        <StatCard 
          label="Total Revenue" 
          value="₹ 0"
          sub="Current month Gross Merchandise Value"
          icon={<IndianRupee className="w-6 h-6" />} 
        />
        <StatCard 
          label="Online Revenue" 
          value="₹ 0"
          sub="Pre-paid via Razorpay"
          icon={<CreditCard className="w-6 h-6" />} 
        />
        <StatCard 
          label="COD Revenue" 
          value="₹ 0"
          sub="Cash collected by Shadowfax"
          icon={<Wallet className="w-6 h-6" />} 
        />
        <StatCard 
          label="Cancelled Orders" 
          value="0"
          sub="High priority review needed"
          icon={<XCircle className="w-6 h-6" />} 
        />
        <StatCard 
          label="Live Deliveries" 
          value="0"
          sub="Currently in transit"
          icon={<Truck className="w-6 h-6" />} 
        />
        <StatCard 
          label="Avg. Delivery Time" 
          value="0m"
          sub="From order acceptance to drop-off"
          icon={<Clock className="w-6 h-6" />} 
        />
        <StatCard 
          label="Pending Approvals" 
          value="0"
          sub="New restaurants awaiting verification"
          icon={<ClipboardCheck className="w-6 h-6" />} 
        />
      </motion.div>

    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { motion } from 'framer-motion';
import { 
  IndianRupee, TrendingUp, Wallet, Landmark, 
  CreditCard, Banknote, ShieldCheck, Receipt, 
  AlertCircle, Activity, Truck
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function AdminPaymentsPage() {
  const { accessToken } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      if (!accessToken) return;
      try {
        const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/admin/payments/summary', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error('Failed to load stats');
        const json = await res.json();
        setStats(json.data || json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [accessToken]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-100 border-t-brand-primary" />
          <p className="text-sm font-medium text-slate-500">Loading financial data...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center text-red-600">
        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-500" />
        <h3 className="font-semibold">Failed to load financials</h3>
        <p className="text-sm opacity-80 mt-1">Please check your connection and try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-brand-secondary">Platform Financials</h2>
          <p className="mt-1 text-sm text-slate-500">Super Admin overview of revenue, settlements, and taxes.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Live Sync</span>
        </div>
      </div>
      
      {/* Top Main Cards */}
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <motion.div variants={itemVariants} className="relative overflow-hidden rounded-2xl bg-[#121826] p-6 text-white shadow-xl">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-primary/20 blur-2xl" />
          <div className="relative z-10 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Total GMV</p>
              <Activity className="h-4 w-4 text-brand-primary" />
            </div>
            <p className="text-4xl font-bold tracking-tight">₹{stats.totalRevenue?.toFixed(2)}</p>
            <p className="text-xs text-slate-400">Gross Merchandise Value across all time</p>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">Today's Revenue</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <p className="text-4xl font-bold tracking-tight text-indigo-900">₹{stats.todayRevenue?.toFixed(2)}</p>
            <p className="text-xs font-medium text-indigo-500">Gross orders processed today</p>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wider">Platform Earnings</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <Landmark className="h-4 w-4" />
              </div>
            </div>
            <p className="text-4xl font-bold tracking-tight text-emerald-900">₹{stats.platformEarnings?.toFixed(2)}</p>
            <p className="text-xs font-medium text-emerald-500">Net platform commission generated</p>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="relative overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-6 shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-amber-600 uppercase tracking-wider">Partner Payouts</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <p className="text-4xl font-bold tracking-tight text-amber-900">₹{stats.restaurantEarnings?.toFixed(2)}</p>
            <p className="text-xs font-medium text-amber-500">Total owed to restaurant partners</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Breakdowns */}
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Payment Methods */}
        <motion.div variants={itemVariants} className="rounded-2xl border border-slate-100 bg-white shadow-premium">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="text-lg font-bold text-slate-800">Payment Collection</h3>
            <p className="text-xs text-slate-500">Breakdown by payment processor</p>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="group relative overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-5 transition-all hover:border-emerald-200 hover:bg-emerald-50">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm group-hover:text-emerald-600">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700 group-hover:text-emerald-700">Online Paid</p>
                  <p className="text-xs text-slate-500">Razorpay gateway</p>
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900 group-hover:text-emerald-700">₹{stats.onlineRevenue?.toFixed(2)}</p>
            </div>
            
            <div className="group relative overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-5 transition-all hover:border-amber-200 hover:bg-amber-50">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm group-hover:text-amber-600">
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700 group-hover:text-amber-700">Cash on Delivery</p>
                  <p className="text-xs text-slate-500">Shadowfax collection</p>
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900 group-hover:text-amber-700">₹{stats.codRevenue?.toFixed(2)}</p>
            </div>
          </div>
        </motion.div>

        {/* Logistics & Compliance */}
        <motion.div variants={itemVariants} className="rounded-2xl border border-slate-100 bg-white shadow-premium">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="text-lg font-bold text-slate-800">Logistics & Compliance</h3>
            <p className="text-xs text-slate-500">Operations and tax liability</p>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="group relative overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-5 transition-all hover:border-blue-200 hover:bg-blue-50">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm group-hover:text-blue-600">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700 group-hover:text-blue-700">Delivery Charges</p>
                  <p className="text-xs text-slate-500">Logistics pass-through</p>
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900 group-hover:text-blue-700">₹{stats.deliveryCharges?.toFixed(2)}</p>
            </div>
            
            <div className="group relative overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-5 transition-all hover:border-indigo-200 hover:bg-indigo-50">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm group-hover:text-indigo-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700 group-hover:text-indigo-700">Tax Collection</p>
                  <p className="text-xs text-slate-500">GST liability (est.)</p>
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900 group-hover:text-indigo-700">₹{stats.taxCollection?.toFixed(2)}</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
      
      {/* Future Schemas */}
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <motion.div variants={itemVariants} className="relative overflow-hidden rounded-2xl border border-dashed border-red-200 bg-red-50/50 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-red-400 shadow-sm">
                <Receipt className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-red-900">Refunds Processed</h3>
                <p className="text-xs font-medium text-red-600/80">Pending v2 Refund Schema</p>
              </div>
            </div>
            <p className="text-2xl font-black text-red-800 opacity-50">₹{stats.refunds?.toFixed(2)}</p>
          </div>
        </motion.div>
        
        <motion.div variants={itemVariants} className="relative overflow-hidden rounded-2xl border border-dashed border-purple-200 bg-purple-50/50 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-purple-400 shadow-sm">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-purple-900">Wallet Transactions</h3>
                <p className="text-xs font-medium text-purple-600/80">Pending v2 Wallet Schema</p>
              </div>
            </div>
            <p className="text-2xl font-black text-purple-800 opacity-50">₹{stats.walletTransactions?.toFixed(2)}</p>
          </div>
        </motion.div>
      </motion.div>

    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Tag, Plus, Search, CheckCircle2, XCircle, 
  TicketPercent, Percent, IndianRupee, Settings2,
  CalendarDays, Activity, ChevronRight
} from 'lucide-react';
import type { Coupon, CouponValidateResult } from '@/types/coupon';
import type { ListMeta } from '@/types/restaurant';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

const inputCls = "w-full rounded-xl border-0 bg-slate-50 py-3 pl-4 pr-4 text-sm font-medium text-slate-900 ring-1 ring-inset ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-inset focus:ring-brand-primary";

function TestCouponPanel() {
  const { accessToken } = useAuth();
  const [code, setCode] = useState('');
  const [orderValue, setOrderValue] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CouponValidateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleTest(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !code.trim() || !orderValue.trim()) return;
    const val = parseFloat(orderValue);
    if (isNaN(val) || val < 0) {
      setError('Enter a valid non-negative order value');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiClient.coupons.validate(accessToken, {
        code: code.trim(),
        orderValue: val,
        ...(userId.trim() ? { userId: userId.trim() } : {}),
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl bg-white shadow-premium ring-1 ring-slate-100 overflow-hidden flex flex-col h-full">
      <div className="border-b border-slate-100 bg-gradient-to-br from-indigo-50 to-white p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
            <TicketPercent className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Test Engine</h3>
            <p className="text-xs text-slate-500">Validate active coupons</p>
          </div>
        </div>
      </div>
      
      <div className="p-6 flex-1 flex flex-col">
        <form onSubmit={handleTest} className="space-y-4 flex-1">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Coupon Code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. WELCOME50"
              className={`${inputCls} uppercase font-mono tracking-widest`}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Order Value (₹)</label>
            <input
              type="number"
              step="any"
              min="0"
              value={orderValue}
              onChange={(e) => setOrderValue(e.target.value)}
              placeholder="e.g. 500"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">User ID (Optional)</label>
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Leave blank for general"
              className={inputCls}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !code.trim() || !orderValue.trim()}
            className="w-full mt-2 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-slate-800 disabled:opacity-50 active:scale-[0.98]"
          >
            {loading ? 'Validating...' : 'Run Test'}
          </button>
        </form>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-500 shrink-0" />
              <p className="text-sm font-medium text-red-700">{error}</p>
            </motion.div>
          )}

          {result && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4">
              {result.valid ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-full h-1 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNiAwTDMySDZ6IiBmaWxsPSIjMTRiODg2IiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=')] opacity-50" />
                  <div className="p-4 flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-emerald-800">Validation Success</p>
                      <p className="text-2xl font-black text-emerald-700 mt-1">₹{result.discount?.toFixed(2)} off</p>
                      {result.coupon && (
                        <p className="text-xs font-medium text-emerald-600 mt-2 bg-emerald-100/50 inline-block px-2 py-1 rounded">
                          {result.coupon.type === 'PERCENT' ? `${result.coupon.value}%` : `₹${result.coupon.value}`}
                          {result.coupon.maxDiscount != null ? ` (Up to ₹${result.coupon.maxDiscount})` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNiAwTDMySDZ6IiBmaWxsPSIjMTRiODg2IiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=')] opacity-50" />
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-900">Validation Failed</p>
                    <p className="text-sm font-medium text-amber-700 mt-1">{result.reason}</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function CouponsPage() {
  const { accessToken } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [meta, setMeta] = useState<ListMeta>({ total: 0, page: 1, pageSize: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'true' | 'false'>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiClient.coupons
      .list(accessToken, {
        page,
        pageSize: 20,
        ...(activeFilter !== 'ALL' ? { isActive: activeFilter === 'true' } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
      })
      .then((result) => {
        if (!cancelled) {
          setCoupons(result.data);
          setMeta(result.meta);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load coupons');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [accessToken, activeFilter, search, page]);

  const totalPages = Math.ceil(meta.total / meta.pageSize) || 1;

  function onFilterChange(setter: () => void) {
    setter();
    setPage(1);
  }

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-brand-secondary">Coupon Management</h2>
          <p className="mt-1 text-sm text-slate-500">
            {meta.total > 0 ? `Managing ${meta.total} promotional campaigns.` : 'Create and manage discount codes.'}
          </p>
        </div>
        <Link
          href="/dashboard/coupons/new"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white shadow-premium transition-all hover:bg-[#E66000] hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" />
          Create Campaign
        </Link>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row items-start">
        {/* Main List */}
        <div className="min-w-0 flex-1 w-full space-y-6">
          
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100/50">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search campaigns by code..."
                value={search}
                onChange={(e) => onFilterChange(() => setSearch(e.target.value))}
                className="w-full rounded-xl border-0 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-brand-primary transition-all"
              />
            </div>
            <select
              value={activeFilter}
              onChange={(e) => onFilterChange(() => setActiveFilter(e.target.value as 'ALL' | 'true' | 'false'))}
              className="rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-brand-primary outline-none cursor-pointer"
            >
              <option value="ALL">All Campaigns</option>
              <option value="true">Active Running</option>
              <option value="false">Inactive / Paused</option>
            </select>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-premium ring-1 ring-slate-100 relative">
            {error && (
              <div className="border-b border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap text-left text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Campaign Code</th>
                    <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Discount Value</th>
                    <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Constraints</th>
                    <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Validity Period</th>
                    <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Status</th>
                    <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px] text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand-primary" />
                          <p className="text-slate-500 font-medium text-sm">Loading campaigns...</p>
                        </div>
                      </td>
                    </tr>
                  ) : coupons.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center text-slate-500">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-3">
                          <Tag className="h-6 w-6 text-slate-400" />
                        </div>
                        <p className="font-medium">No campaigns found matching criteria.</p>
                      </td>
                    </tr>
                  ) : (
                    coupons.map((c, i) => (
                      <motion.tr 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        key={c.id} 
                        className="transition-colors hover:bg-slate-50/50 group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-brand-primary/10 group-hover:text-brand-primary transition-colors">
                              <Tag className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-mono text-sm font-bold tracking-widest text-slate-900 group-hover:text-brand-primary transition-colors">{c.code}</p>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-start gap-1">
                            <span className="inline-flex items-center gap-1 font-bold text-slate-800 text-base">
                              {c.type === 'PERCENT' ? <Percent className="h-3 w-3 text-slate-400" /> : <IndianRupee className="h-3.5 w-3.5 text-slate-400" />}
                              {c.value}{c.type === 'PERCENT' && '%'} OFF
                            </span>
                            {c.maxDiscount && (
                              <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded">Up to ₹{c.maxDiscount}</span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                            <IndianRupee className="h-3 w-3 text-slate-400" /> Min Order: ₹{c.minOrderValue}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-col items-start gap-1">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                              <CalendarDays className="h-3 w-3 text-slate-400" />
                              {fmtDate(c.validFrom)} — {fmtDate(c.validUntil)}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {c.isActive ? (
                            <div className="flex items-center gap-2">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                              <span className="text-sm font-bold text-emerald-700">Active</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-slate-300"></span>
                              <span className="text-sm font-bold text-slate-500">Inactive</span>
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/dashboard/coupons/${c.id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-brand-primary/10 hover:text-brand-primary transition-colors"
                          >
                            <Settings2 className="h-5 w-5" />
                          </Link>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                <span className="text-sm text-slate-500 font-medium">
                  Showing page <span className="text-slate-900 font-bold">{meta.page}</span> of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-all"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Side Panel */}
        <div className="w-full lg:w-96 shrink-0 lg:sticky lg:top-24 h-auto">
          <TestCouponPanel />
        </div>
      </div>
    </div>
  );
}

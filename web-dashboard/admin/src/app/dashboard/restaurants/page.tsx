'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Plus, MoreVertical, Eye, Edit, CheckCircle, 
  XCircle, Ban, Trash2, MapPin, Phone, Star
} from 'lucide-react';
import type {
  ListMeta,
  ListRestaurantsQuery,
  Restaurant,
  RestaurantStatus,
} from '@/types/restaurant';

export default function RestaurantsPage() {
  const { accessToken } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [meta, setMeta] = useState<ListMeta>({ total: 0, page: 1, pageSize: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<RestaurantStatus | 'ALL'>('ALL');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'active' | 'inactive'>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Dropdown state for actions
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const fetchRestaurants = useCallback((showLoading = true) => {
    if (!accessToken) return;
    let cancelled = false;
    if (showLoading) setLoading(true);
    setError(null);

    const query: ListRestaurantsQuery = { page, pageSize: 20 };
    if (statusFilter !== 'ALL') query.status = statusFilter;
    if (activeFilter !== 'ALL') query.isActive = activeFilter === 'active';
    if (search.trim()) query.search = search.trim();

    apiClient.restaurants
      .list(accessToken, query)
      .then((result) => {
        if (!cancelled) {
          setRestaurants(result.data);
          setMeta(result.meta);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load restaurants');
      })
      .finally(() => {
        if (!cancelled && showLoading) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [accessToken, statusFilter, activeFilter, search, page]);

  useEffect(() => {
    const cancel = fetchRestaurants(true);
    return cancel;
  }, [fetchRestaurants]);

  async function handleAction(action: () => Promise<unknown>) {
    try {
      await action();
      fetchRestaurants(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
      fetchRestaurants(false); // revert optimistic update
    }
  }

  async function handleApprove(id: string) {
    if (!accessToken) return;
    setRestaurants(prev => prev.map(r => r.id === id ? { ...r, status: 'APPROVED' } : r));
    await handleAction(() => apiClient.restaurants.approve(accessToken, id));
  }

  async function handleReject(id: string) {
    if (!accessToken) return;
    const reason = window.prompt("Enter rejection reason:");
    if (!reason?.trim()) return;
    setRestaurants(prev => prev.map(r => r.id === id ? { ...r, status: 'REJECTED' } : r));
    await handleAction(() => apiClient.restaurants.reject(accessToken, id, reason.trim()));
  }

  async function handleSuspend(id: string) {
    if (!accessToken) return;
    if (!window.confirm("Are you sure you want to suspend/deactivate this restaurant?")) return;
    setRestaurants(prev => prev.map(r => r.id === id ? { ...r, isActive: false } : r));
    await handleAction(() => apiClient.restaurants.deactivate(accessToken, id));
  }

  const totalPages = Math.ceil(meta.total / meta.pageSize) || 1;

  function onFilterChange(setter: () => void) {
    setter();
    setPage(1);
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-emerald-100 text-emerald-700 ring-emerald-200';
      case 'PENDING': return 'bg-amber-100 text-amber-700 ring-amber-200';
      case 'REJECTED': return 'bg-red-100 text-red-700 ring-red-200';
      default: return 'bg-slate-100 text-slate-700 ring-slate-200';
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-brand-secondary">Restaurants</h2>
          <p className="mt-1 text-sm text-slate-500">
            {meta.total > 0 ? `Manage ${meta.total} active and pending restaurants.` : 'Manage and approve restaurant listings.'}
          </p>
        </div>
        <Link
          href="/dashboard/restaurants/new"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white shadow-premium transition-all hover:bg-[#E66000] hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" />
          Add Restaurant
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100/50">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by restaurant name or city..."
            value={search}
            onChange={(e) => onFilterChange(() => setSearch(e.target.value))}
            className="w-full rounded-xl border-0 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-brand-primary transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => onFilterChange(() => setStatusFilter(e.target.value as RestaurantStatus | 'ALL'))}
          className="rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-brand-primary outline-none cursor-pointer"
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending Approval</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <select
          value={activeFilter}
          onChange={(e) => onFilterChange(() => setActiveFilter(e.target.value as 'ALL' | 'active' | 'inactive'))}
          className="rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-brand-primary outline-none cursor-pointer"
        >
          <option value="ALL">All States</option>
          <option value="active">Active Online</option>
          <option value="inactive">Currently Offline</option>
        </select>
      </div>

      {/* Premium Table Area */}
      <div className="relative rounded-2xl bg-white shadow-premium ring-1 ring-slate-100">
        {error && (
          <div className="border-b border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>
        )}

        <div className="overflow-x-auto lg:overflow-visible pb-4">
          <table className="w-full whitespace-nowrap text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-xs">Restaurant</th>
                <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-xs">Contact</th>
                <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-xs">Rating</th>
                <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-xs">Status</th>
                <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-xs">State</th>
                <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand-primary" />
                      <p className="text-slate-500 font-medium text-sm">Loading restaurants...</p>
                    </div>
                  </td>
                </tr>
              ) : restaurants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-500">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-3">
                      <Search className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="font-medium">No restaurants found matching your criteria</p>
                  </td>
                </tr>
              ) : (
                restaurants.map((r, i) => {
                  const isLastRows = restaurants.length > 2 && i >= restaurants.length - 2;
                  
                  return (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={r.id} 
                    className="transition-colors hover:bg-slate-50/50 group"
                  >
                    {/* Logo & Name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                          {r.logoUrl ? (
                            <img src={r.logoUrl} alt={r.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-indigo-600 font-bold">{r.name.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 group-hover:text-brand-primary transition-colors">{r.name}</p>
                          <p className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                            <MapPin className="h-3 w-3" /> {r.city}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="flex items-center gap-1.5 text-slate-600">
                          <Phone className="h-3.5 w-3.5 text-slate-400" /> {r.phone || 'N/A'}
                        </p>
                        <p className="text-xs text-slate-500">{r.email || 'No email'}</p>
                      </div>
                    </td>

                    {/* Rating (Mock for now as API doesn't return it) */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <span className="font-semibold text-slate-700">4.8</span>
                        <span className="text-xs text-slate-400">(120)</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${getStatusBadge(r.status)}`}>
                        {r.status}
                      </span>
                    </td>

                    {/* Active State */}
                    <td className="px-6 py-4">
                      {r.isActive ? (
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span className="text-sm font-medium text-slate-700">Online</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-slate-300"></span>
                          <span className="text-sm font-medium text-slate-500">Offline</span>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="relative inline-block text-left">
                        <button
                          onClick={() => setOpenDropdownId(openDropdownId === r.id ? null : r.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>

                        <AnimatePresence>
                          {openDropdownId === r.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenDropdownId(null)} />
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.1 }}
                                className={`absolute right-0 z-50 w-48 rounded-xl bg-white shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none divide-y divide-slate-100 ${
                                  isLastRows ? 'bottom-full mb-2 origin-bottom-right' : 'top-full mt-2 origin-top-right'
                                }`}
                              >
                                <div className="p-1">
                                  <Link href={`/dashboard/restaurants/${r.id}`} className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-primary">
                                    <Eye className="h-4 w-4 text-slate-400 group-hover:text-brand-primary" /> View Details
                                  </Link>
                                  <Link href={`/dashboard/restaurants/${r.id}?edit=true`} className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-primary">
                                    <Edit className="h-4 w-4 text-slate-400 group-hover:text-brand-primary" /> Edit
                                  </Link>
                                </div>
                                <div className="p-1">
                                  {r.status !== 'APPROVED' && (
                                    <button onClick={() => { setOpenDropdownId(null); void handleApprove(r.id); }} className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50">
                                      <CheckCircle className="h-4 w-4 text-emerald-500" /> Approve
                                    </button>
                                  )}
                                  {r.status !== 'REJECTED' && (
                                    <button onClick={() => { setOpenDropdownId(null); void handleReject(r.id); }} className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-700 hover:bg-red-50">
                                      <XCircle className="h-4 w-4 text-red-500" /> Reject
                                    </button>
                                  )}
                                  <button onClick={() => { setOpenDropdownId(null); void handleSuspend(r.id); }} className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-amber-700 hover:bg-amber-50">
                                    <Ban className="h-4 w-4 text-amber-500" /> Suspend
                                  </button>
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>
                  </motion.tr>
                  );
                })
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
  );
}

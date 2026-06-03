'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import AuthGuard from '@/components/auth-guard';
import type {
  ListMeta,
  ListRestaurantsQuery,
  Restaurant,
  RestaurantStatus,
} from '@/types/restaurant';

const STATUS_COLORS: Record<RestaurantStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

function RestaurantListContent() {
  const { accessToken } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [meta, setMeta] = useState<ListMeta>({ total: 0, page: 1, pageSize: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<RestaurantStatus | 'ALL'>('ALL');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'active' | 'inactive'>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    setLoading(true);
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
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load restaurants');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, statusFilter, activeFilter, search, page]);

  const totalPages = Math.ceil(meta.total / meta.pageSize) || 1;

  function onFilterChange(setter: () => void) {
    setter();
    setPage(1);
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
              ← Dashboard
            </Link>
            <h1 className="mt-1 text-2xl font-semibold">Restaurants</h1>
          </div>
          <Link
            href="/dashboard/restaurants/new"
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + New Restaurant
          </Link>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3 rounded bg-white p-4 shadow">
          <input
            type="text"
            placeholder="Search name or city…"
            value={search}
            onChange={(e) => onFilterChange(() => setSearch(e.target.value))}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={statusFilter}
            onChange={(e) =>
              onFilterChange(() => setStatusFilter(e.target.value as RestaurantStatus | 'ALL'))
            }
            className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <select
            value={activeFilter}
            onChange={(e) =>
              onFilterChange(() => setActiveFilter(e.target.value as 'ALL' | 'active' | 'inactive'))
            }
            className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Active &amp; Inactive</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
          {meta.total > 0 && (
            <span className="ml-auto text-sm text-gray-500">{meta.total} total</span>
          )}
        </div>

        <div className="rounded bg-white shadow">
          {error && (
            <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="px-4 py-12 text-center text-sm text-gray-500">Loading…</div>
          ) : restaurants.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-gray-500">
              No restaurants found.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Active</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {restaurants.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                    <td className="px-4 py-3 text-gray-600">{r.city}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status]}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.isActive ? (
                        <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/restaurants/${r.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-gray-600">
              <span>
                Page {meta.page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded border px-3 py-1 text-sm hover:bg-gray-100 disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded border px-3 py-1 text-sm hover:bg-gray-100 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function RestaurantsPage() {
  return (
    <AuthGuard>
      <RestaurantListContent />
    </AuthGuard>
  );
}

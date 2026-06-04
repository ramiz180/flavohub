'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import AuthGuard from '@/components/auth-guard';
import type { Coupon, CouponValidateResult } from '@/types/coupon';
import type { ListMeta } from '@/types/restaurant';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
      Active
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
      Inactive
    </span>
  );
}

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
    <section className="rounded bg-white p-5 shadow">
      <h2 className="mb-3 text-base font-semibold text-gray-800">Test Coupon</h2>
      <form onSubmit={(e) => void handleTest(e)} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Code</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. WELCOME10"
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Order Value</label>
          <input
            type="number"
            step="any"
            min="0"
            value={orderValue}
            onChange={(e) => setOrderValue(e.target.value)}
            placeholder="e.g. 500"
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            User ID{' '}
            <span className="font-normal text-gray-400">(optional, for per-user limit check)</span>
          </label>
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="optional"
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !code.trim() || !orderValue.trim()}
          className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
        >
          {loading ? 'Checking…' : 'Validate'}
        </button>
      </form>

      {error && (
        <div className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div
          className={`mt-3 rounded border px-3 py-3 text-sm ${
            result.valid ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'
          }`}
        >
          {result.valid ? (
            <div className="space-y-1">
              <p className="font-medium text-green-800">Valid — discount: ₹{result.discount}</p>
              {result.coupon && (
                <p className="text-xs text-green-700">
                  {result.coupon.code} · {result.coupon.type} ·{' '}
                  {result.coupon.type === 'PERCENT'
                    ? `${result.coupon.value}%`
                    : `₹${result.coupon.value}`}
                  {result.coupon.maxDiscount != null ? ` (cap ₹${result.coupon.maxDiscount})` : ''}
                </p>
              )}
            </div>
          ) : (
            <p className="font-medium text-orange-800">Invalid: {result.reason}</p>
          )}
        </div>
      )}
    </section>
  );
}

function CouponsListContent() {
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

    return () => {
      cancelled = true;
    };
  }, [accessToken, activeFilter, search, page]);

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
            <h1 className="mt-1 text-2xl font-semibold">Coupons</h1>
          </div>
          <Link
            href="/dashboard/coupons/new"
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + New Coupon
          </Link>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="min-w-0 flex-1">
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded bg-white p-4 shadow">
              <input
                type="text"
                placeholder="Search by code…"
                value={search}
                onChange={(e) => onFilterChange(() => setSearch(e.target.value))}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={activeFilter}
                onChange={(e) =>
                  onFilterChange(() => setActiveFilter(e.target.value as 'ALL' | 'true' | 'false'))
                }
                className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All statuses</option>
                <option value="true">Active only</option>
                <option value="false">Inactive only</option>
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
              ) : coupons.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-gray-500">
                  No coupons found.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Value</th>
                      <th className="px-4 py-3">Min Order</th>
                      <th className="px-4 py-3">Valid</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {coupons.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono font-medium text-gray-900">{c.code}</td>
                        <td className="px-4 py-3 text-gray-600">{c.type}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {c.type === 'PERCENT' ? `${c.value}%` : `₹${c.value}`}
                          {c.maxDiscount != null && (
                            <span className="ml-1 text-xs text-gray-400">
                              (cap ₹{c.maxDiscount})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">₹{c.minOrderValue}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {fmtDate(c.validFrom)} – {fmtDate(c.validUntil)}
                        </td>
                        <td className="px-4 py-3">
                          <ActiveBadge active={c.isActive} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/dashboard/coupons/${c.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            Edit →
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

          <div className="w-full lg:w-80 lg:shrink-0">
            <TestCouponPanel />
          </div>
        </div>
      </div>
    </main>
  );
}

export default function CouponsPage() {
  return (
    <AuthGuard>
      <CouponsListContent />
    </AuthGuard>
  );
}

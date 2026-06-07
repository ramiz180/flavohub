'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import AuthGuard from '@/components/auth-guard';
import type { MarkupType, RestaurantOwner, RestaurantWithHours } from '@/types/restaurant';

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
} as const;

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value ?? '—'}</dd>
    </div>
  );
}

function RestaurantDetailContent() {
  const { accessToken } = useAuth();
  const params = useParams();
  const id = typeof params['id'] === 'string' ? params['id'] : '';

  const [restaurant, setRestaurant] = useState<RestaurantWithHours | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // lifecycle action state
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // markup override state
  const [overrideType, setOverrideType] = useState<MarkupType>('PERCENT');
  const [overrideValue, setOverrideValue] = useState('');
  const [markupLoading, setMarkupLoading] = useState(false);
  const [markupError, setMarkupError] = useState<string | null>(null);
  const [markupSuccess, setMarkupSuccess] = useState(false);

  // owner assignment state
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerFullName, setOwnerFullName] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [ownerError, setOwnerError] = useState<string | null>(null);
  const [assignedOwner, setAssignedOwner] = useState<RestaurantOwner | null>(null);

  const loadRestaurant = useCallback(() => {
    if (!accessToken || !id) return;
    setLoading(true);
    setFetchError(null);
    apiClient.restaurants
      .get(accessToken, id)
      .then((r) => setRestaurant(r))
      .catch((err: unknown) => {
        setFetchError(err instanceof Error ? err.message : 'Failed to load restaurant');
      })
      .finally(() => setLoading(false));
  }, [accessToken, id]);

  useEffect(() => {
    loadRestaurant();
  }, [loadRestaurant]);

  // Pre-populate markup form and owner when restaurant data arrives
  useEffect(() => {
    if (!restaurant) return;
    setOverrideType(restaurant.markupType ?? 'PERCENT');
    setOverrideValue(restaurant.markupValue ?? '');
    setAssignedOwner(restaurant.owner);
  }, [restaurant]);

  async function runAction(action: () => Promise<unknown>) {
    setActionLoading(true);
    setActionError(null);
    try {
      await action();
      loadRestaurant();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleApprove() {
    if (!accessToken) return;
    await runAction(() => apiClient.restaurants.approve(accessToken, id));
  }

  async function handleRejectConfirm() {
    if (!accessToken || !rejectReason.trim()) return;
    await runAction(() => apiClient.restaurants.reject(accessToken, id, rejectReason.trim()));
    setShowRejectModal(false);
    setRejectReason('');
  }

  async function handleActivate() {
    if (!accessToken) return;
    await runAction(() => apiClient.restaurants.activate(accessToken, id));
  }

  async function handleDeactivate() {
    if (!accessToken) return;
    await runAction(() => apiClient.restaurants.deactivate(accessToken, id));
  }

  async function handleSaveMarkup(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    const val = parseFloat(overrideValue);
    if (isNaN(val) || val < 0) {
      setMarkupError('Enter a valid non-negative number');
      return;
    }
    setMarkupLoading(true);
    setMarkupError(null);
    setMarkupSuccess(false);
    try {
      await apiClient.pricing.updateRestaurantMarkup(accessToken, id, {
        markupType: overrideType,
        markupValue: val,
      });
      loadRestaurant();
      setMarkupSuccess(true);
      setTimeout(() => setMarkupSuccess(false), 3000);
    } catch (err) {
      setMarkupError(err instanceof Error ? err.message : 'Failed to save markup');
    } finally {
      setMarkupLoading(false);
    }
  }

  async function handleClearMarkup() {
    if (!accessToken) return;
    setMarkupLoading(true);
    setMarkupError(null);
    setMarkupSuccess(false);
    try {
      await apiClient.pricing.updateRestaurantMarkup(accessToken, id, {
        markupType: null,
        markupValue: null,
      });
      loadRestaurant();
      setMarkupSuccess(true);
      setTimeout(() => setMarkupSuccess(false), 3000);
    } catch (err) {
      setMarkupError(err instanceof Error ? err.message : 'Failed to clear markup');
    } finally {
      setMarkupLoading(false);
    }
  }

  async function handleAssignOwner(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setOwnerLoading(true);
    setOwnerError(null);
    try {
      const owner = await apiClient.restaurants.assignOwner(accessToken, id, {
        email: ownerEmail.trim(),
        password: ownerPassword,
        fullName: ownerFullName.trim(),
      });
      setAssignedOwner(owner);
      setOwnerEmail('');
      setOwnerFullName('');
      setOwnerPassword('');
    } catch (err) {
      setOwnerError(err instanceof Error ? err.message : 'Failed to assign owner');
    } finally {
      setOwnerLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-3xl text-center text-sm text-gray-500">Loading…</div>
      </main>
    );
  }

  if (fetchError || !restaurant) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-3xl">
          <Link href="/dashboard/restaurants" className="text-sm text-gray-500 hover:text-gray-700">
            ← Restaurants
          </Link>
          <div className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {fetchError ?? 'Restaurant not found'}
          </div>
        </div>
      </main>
    );
  }

  const canApproveReject = restaurant.status === 'PENDING';
  const canActivate = restaurant.status === 'APPROVED' && !restaurant.isActive;
  const canDeactivate = restaurant.status === 'APPROVED' && restaurant.isActive;
  const hasActions = canApproveReject || canActivate || canDeactivate;
  const hasMarkupOverride = restaurant.markupType !== null;

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link href="/dashboard/restaurants" className="text-sm text-gray-500 hover:text-gray-700">
            ← Restaurants
          </Link>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{restaurant.name}</h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[restaurant.status]}`}
            >
              {restaurant.status}
            </span>
            {restaurant.isActive ? (
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                Active
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                Inactive
              </span>
            )}
          </div>
        </div>

        {actionError && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError}
          </div>
        )}

        {hasActions && (
          <div className="mb-6 flex flex-wrap gap-2 rounded bg-white p-4 shadow">
            <span className="mr-1 self-center text-sm font-medium text-gray-700">Actions:</span>
            {canApproveReject && (
              <>
                <button
                  onClick={() => void handleApprove()}
                  disabled={actionLoading}
                  className="rounded bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-40"
                >
                  {actionLoading ? '…' : 'Approve'}
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={actionLoading}
                  className="rounded bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
                >
                  Reject
                </button>
              </>
            )}
            {canActivate && (
              <button
                onClick={() => void handleActivate()}
                disabled={actionLoading}
                className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
              >
                {actionLoading ? '…' : 'Activate'}
              </button>
            )}
            {canDeactivate && (
              <button
                onClick={() => void handleDeactivate()}
                disabled={actionLoading}
                className="rounded border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40"
              >
                {actionLoading ? '…' : 'Deactivate'}
              </button>
            )}
          </div>
        )}

        <div className="space-y-6">
          <section className="rounded bg-white p-6 shadow">
            <h2 className="mb-4 text-base font-semibold text-gray-800">Profile</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <Field label="Name" value={restaurant.name} />
              <Field label="Cuisine Type" value={restaurant.cuisineType} />
              <Field label="Phone" value={restaurant.phone} />
              <Field label="Email" value={restaurant.email} />
              <div className="col-span-2">
                <Field label="Address" value={restaurant.addressLine} />
              </div>
              <Field label="City" value={restaurant.city} />
              {restaurant.rejectionReason && (
                <div className="col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-red-500">
                    Rejection Reason
                  </dt>
                  <dd className="mt-0.5 text-sm text-gray-900">{restaurant.rejectionReason}</dd>
                </div>
              )}
              {restaurant.description && (
                <div className="col-span-2">
                  <Field label="Description" value={restaurant.description} />
                </div>
              )}
            </dl>
          </section>

          <section className="rounded bg-white p-6 shadow">
            <h2 className="mb-4 text-base font-semibold text-gray-800">Location</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <Field
                label="Latitude"
                value={restaurant.latitude !== null ? String(restaurant.latitude) : null}
              />
              <Field
                label="Longitude"
                value={restaurant.longitude !== null ? String(restaurant.longitude) : null}
              />
            </dl>
          </section>

          {/* ── Markup Override ─────────────────────────────────────────── */}
          <section className="rounded bg-white p-6 shadow">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-base font-semibold text-gray-800">Markup Override</h2>
              {hasMarkupOverride ? (
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                  {restaurant.markupType} — {restaurant.markupValue}
                  {restaurant.markupType === 'PERCENT' ? '%' : '₹'}
                </span>
              ) : (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  Using global pricing
                </span>
              )}
            </div>

            <form onSubmit={(e) => void handleSaveMarkup(e)} className="space-y-3">
              <div className="flex gap-6">
                {(['PERCENT', 'FLAT'] as MarkupType[]).map((t) => (
                  <label key={t} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="overrideType"
                      value={t}
                      checked={overrideType === t}
                      onChange={() => setOverrideType(t)}
                    />
                    {t === 'PERCENT' ? 'Percent (%)' : 'Flat (₹)'}
                  </label>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={overrideValue}
                  onChange={(e) => setOverrideValue(e.target.value)}
                  placeholder="e.g. 12.5"
                  className="w-40 rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={markupLoading}
                  className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
                >
                  {markupLoading ? '…' : 'Set Override'}
                </button>
                {hasMarkupOverride && (
                  <button
                    type="button"
                    onClick={() => void handleClearMarkup()}
                    disabled={markupLoading}
                    className="rounded border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                  >
                    Clear (use global)
                  </button>
                )}
              </div>

              {markupError && <p className="text-sm text-red-600">{markupError}</p>}
              {markupSuccess && <p className="text-sm text-green-600">Markup override updated.</p>}
            </form>
          </section>

          {/* ── Owner ────────────────────────────────────────────────────── */}
          <section className="rounded bg-white p-6 shadow">
            <h2 className="mb-4 text-base font-semibold text-gray-800">Owner Account</h2>
            {assignedOwner ? (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Full Name" value={assignedOwner.fullName} />
                <Field label="Email" value={assignedOwner.email} />
              </dl>
            ) : (
              <form onSubmit={(e) => void handleAssignOwner(e)} className="space-y-3">
                <p className="text-sm text-gray-500">
                  No owner assigned. Create a RESTAURANT_OWNER account below.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={ownerFullName}
                      onChange={(e) => setOwnerFullName(e.target.value)}
                      placeholder="Jane Smith"
                      className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Email</label>
                    <input
                      type="email"
                      required
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder="owner@example.com"
                      className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="max-w-xs">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {ownerError && <p className="text-sm text-red-600">{ownerError}</p>}
                <button
                  type="submit"
                  disabled={ownerLoading}
                  className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
                >
                  {ownerLoading ? 'Creating…' : 'Create & Assign Owner'}
                </button>
              </form>
            )}
          </section>

          <section className="rounded bg-white p-6 shadow">
            <h2 className="mb-4 text-base font-semibold text-gray-800">
              Operating Hours
              <span className="ml-2 text-xs font-normal text-gray-500">(read-only)</span>
            </h2>
            {restaurant.hours.length === 0 ? (
              <p className="text-sm text-gray-500">No hours configured.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    <th className="pb-2 pr-4">Day</th>
                    <th className="pb-2 pr-4">Open</th>
                    <th className="pb-2 pr-4">Close</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {restaurant.hours.map((h) => (
                    <tr key={h.id}>
                      <td className="py-2 pr-4 font-medium text-gray-900">
                        {DAYS[h.dayOfWeek] ?? `Day ${h.dayOfWeek}`}
                      </td>
                      <td className="py-2 pr-4 text-gray-600">{h.isClosed ? '—' : h.openTime}</td>
                      <td className="py-2 pr-4 text-gray-600">{h.isClosed ? '—' : h.closeTime}</td>
                      <td className="py-2">
                        {h.isClosed ? (
                          <span className="text-xs text-gray-500">Closed</span>
                        ) : (
                          <span className="text-xs text-green-700">Open</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="rounded bg-white p-6 shadow">
            <h2 className="mb-4 text-base font-semibold text-gray-800">Metadata</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <Field label="ID" value={restaurant.id} />
              <Field label="Status" value={restaurant.status} />
              <Field label="Created" value={new Date(restaurant.createdAt).toLocaleString()} />
              <Field label="Updated" value={new Date(restaurant.updatedAt).toLocaleString()} />
            </dl>
          </section>
        </div>
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded bg-white p-6 shadow-lg">
            <h3 className="mb-3 text-base font-semibold">Reject Restaurant</h3>
            <label className="mb-1 block text-sm font-medium text-gray-700">Reason</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Enter rejection reason…"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            {actionError && <p className="mt-2 text-sm text-red-600">{actionError}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setActionError(null);
                }}
                className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleRejectConfirm()}
                disabled={actionLoading || !rejectReason.trim()}
                className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
              >
                {actionLoading ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function RestaurantDetailPage() {
  return (
    <AuthGuard>
      <RestaurantDetailContent />
    </AuthGuard>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import AuthGuard from '@/components/auth-guard';
import type { RestaurantWithHours } from '@/types/restaurant';

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
} as const;

function DashboardContent() {
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
    return <p className="text-sm text-gray-500">Loading…</p>;
  }

  if (error || !restaurant) {
    return (
      <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error ?? 'Restaurant not found'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{restaurant.name}</h1>
        <p className="mt-1 text-sm text-gray-500">{restaurant.city}</p>
      </div>

      {/* Status card */}
      <section className="rounded bg-white p-6 shadow">
        <h2 className="mb-4 text-base font-semibold text-gray-800">Status</h2>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[restaurant.status]}`}
          >
            {restaurant.status}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              restaurant.isActive ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {restaurant.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        {restaurant.status === 'REJECTED' && restaurant.rejectionReason && (
          <div className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-red-600">
              Rejection reason
            </p>
            <p className="mt-1 text-sm text-red-800">{restaurant.rejectionReason}</p>
          </div>
        )}

        <p className="mt-4 text-xs text-gray-400">
          Approval and activation are controlled by the platform admin. Contact support if you have
          questions about your status.
        </p>
      </section>

      {/* Quick links */}
      <section className="rounded bg-white p-6 shadow">
        <h2 className="mb-4 text-base font-semibold text-gray-800">Manage</h2>
        <div className="flex gap-4">
          <Link
            href="/dashboard/profile"
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Edit Profile
          </Link>
          <Link
            href="/dashboard/hours"
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Set Hours
          </Link>
        </div>
      </section>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import AuthGuard from '@/components/auth-guard';

function DashboardContent() {
  const { currentUser, accessToken, logout } = useAuth();
  const router = useRouter();
  const [pingResult, setPingResult] = useState<string>('Calling…');

  useEffect(() => {
    if (!accessToken) return;
    apiClient
      .adminPing(accessToken)
      .then(() => setPingResult('pong: true'))
      .catch((err: unknown) => {
        setPingResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
      });
  }, [accessToken]);

  function handleLogout(): void {
    logout();
    router.replace('/login');
  }

  if (!currentUser) return null;

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
          <button onClick={handleLogout} className="text-sm text-gray-600 underline">
            Logout
          </button>
        </div>
        <p className="mb-6 text-gray-700">
          Signed in as <strong>{currentUser.email}</strong>{' '}
          <span className="rounded bg-gray-200 px-1 py-0.5 text-xs">{currentUser.role}</span>
        </p>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/dashboard/restaurants"
            className="rounded bg-white p-5 shadow transition hover:shadow-md"
          >
            <h2 className="mb-1 font-semibold text-gray-900">Restaurants</h2>
            <p className="text-sm text-gray-500">View, filter, approve, and manage restaurants.</p>
          </Link>
          <Link
            href="/dashboard/pricing"
            className="rounded bg-white p-5 shadow transition hover:shadow-md"
          >
            <h2 className="mb-1 font-semibold text-gray-900">Pricing</h2>
            <p className="text-sm text-gray-500">
              Configure markup, delivery fee, surge, and preview breakdowns.
            </p>
          </Link>
        </div>

        <div className="rounded bg-white p-4 shadow">
          <h2 className="mb-2 font-medium text-gray-800">GET /admin/ping</h2>
          <pre className="text-sm text-gray-700">{pingResult}</pre>
        </div>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}

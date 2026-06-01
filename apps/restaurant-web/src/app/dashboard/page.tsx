'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import AuthGuard from '@/components/auth-guard';

function DashboardContent() {
  const { currentUser, logout } = useAuth();
  const router = useRouter();

  function handleLogout(): void {
    logout();
    router.replace('/login');
  }

  if (!currentUser) return null;

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Restaurant Dashboard</h1>
          <button onClick={handleLogout} className="text-sm text-gray-600 underline">
            Logout
          </button>
        </div>
        <p className="mb-6 text-gray-700">
          Signed in as <strong>{currentUser.email}</strong>
        </p>
        <div className="rounded bg-white p-6 shadow">
          <p className="text-gray-500">Restaurant dashboard — coming in Part 2.</p>
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

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';

const NAV = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/profile', label: 'Profile' },
  { href: '/dashboard/hours', label: 'Hours' },
  { href: '/dashboard/menu', label: 'Menu' },
  { href: '/dashboard/orders', label: 'Orders' },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { logout, restaurantProfile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  function handleLogout(): void {
    logout();
    router.replace('/login');
  }

  const restaurantName = restaurantProfile?.name ?? '';
  const logoUrl = restaurantProfile?.logoUrl ?? null;
  const initial = restaurantName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Restaurant identity — prominent */}
            <div className="flex items-center gap-2">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={restaurantName}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-700">
                  {initial}
                </div>
              )}
              {restaurantName && (
                <span className="hidden font-bold text-lg text-gray-900 md:block">
                  {restaurantName}
                </span>
              )}
            </div>

            <nav className="flex gap-4">
              {NAV.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`text-sm font-medium ${
                    pathname === href
                      ? 'text-emerald-700 underline underline-offset-4'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* FlavoHub branding — secondary */}
            <span className="hidden text-sm text-gray-400 sm:block">Powered by FlavoHub</span>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700">
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl p-6">{children}</main>
    </div>
  );
}

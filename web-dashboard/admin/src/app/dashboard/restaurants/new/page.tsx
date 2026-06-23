'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import AuthGuard from '@/components/auth-guard';
import ImageUploadWithCrop from '@/components/ImageUploadWithCrop';
import type { CreateRestaurantPayload } from '@/types/restaurant';

function CreateRestaurantContent() {
  const { accessToken } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState<{
    name: string;
    addressLine: string;
    city: string;
    phone: string;
    email: string;
    description: string;
    cuisineType: string;
    latitude: string;
    longitude: string;
  }>({
    name: '',
    addressLine: '',
    city: '',
    phone: '',
    email: '',
    description: '',
    cuisineType: '',
    latitude: '',
    longitude: '',
  });

  const [logoUrl, setLogoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;

    setSubmitting(true);
    setError(null);

    const payload: CreateRestaurantPayload = {
      name: form.name,
      addressLine: form.addressLine,
      city: form.city,
      phone: form.phone,
    };
    if (form.email && form.email.trim()) payload.email = form.email.trim();
    if (form.description && form.description.trim()) payload.description = form.description.trim();
    if (form.cuisineType && form.cuisineType.trim()) payload.cuisineType = form.cuisineType.trim();
    if (form.latitude && form.latitude.trim()) {
      const lat = parseFloat(form.latitude);
      if (!isNaN(lat)) payload.latitude = lat;
    }
    if (form.longitude && form.longitude.trim()) {
      const lng = parseFloat(form.longitude);
      if (!isNaN(lng)) payload.longitude = lng;
    }
    if (logoUrl && logoUrl.trim()) payload.logoUrl = logoUrl.trim();

    try {
      const restaurant = await apiClient.restaurants.create(accessToken, payload);
      router.push(`/dashboard/restaurants/${restaurant.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create restaurant');
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <Link href="/dashboard/restaurants" className="text-sm text-gray-500 hover:text-gray-700">
            ← Restaurants
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">New Restaurant</h1>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="rounded bg-white p-6 shadow">
          {error && (
            <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Address Line <span className="text-red-500">*</span>
              </label>
              <input
                name="addressLine"
                value={form.addressLine}
                onChange={handleChange}
                required
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                City <span className="text-red-500">*</span>
              </label>
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                required
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                required
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Cuisine Type</label>
              <input
                name="cuisineType"
                value={form.cuisineType}
                onChange={handleChange}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Latitude</label>
                <input
                  name="latitude"
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  value={form.latitude}
                  onChange={handleChange}
                  placeholder="-90 to 90"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Longitude</label>
                <input
                  name="longitude"
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  value={form.longitude}
                  onChange={handleChange}
                  placeholder="-180 to 180"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <ImageUploadWithCrop
              label="Restaurant Logo"
              aspectRatio={1}
              currentImageUrl={logoUrl || undefined}
              onUploadComplete={(url) => setLogoUrl(url)}
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <Link
              href="/dashboard/restaurants"
              className="rounded border px-4 py-2 text-sm hover:bg-gray-100"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
            >
              {submitting ? 'Creating…' : 'Create Restaurant'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function NewRestaurantPage() {
  return (
    <AuthGuard>
      <CreateRestaurantContent />
    </AuthGuard>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import AuthGuard from '@/components/auth-guard';
import type { RestaurantWithHours, UpdateProfilePayload } from '@/types/restaurant';

function ProfileContent() {
  const { accessToken } = useAuth();
  const [restaurant, setRestaurant] = useState<RestaurantWithHours | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [cuisineType, setCuisineType] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  // save state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadProfile = useCallback(() => {
    if (!accessToken) return;
    setLoading(true);
    setFetchError(null);
    apiClient.restaurant
      .getProfile(accessToken)
      .then((r) => {
        setRestaurant(r);
        setName(r.name);
        setDescription(r.description ?? '');
        setAddressLine(r.addressLine);
        setCity(r.city);
        setPhone(r.phone);
        setEmail(r.email ?? '');
        setCuisineType(r.cuisineType ?? '');
        setLatitude(r.latitude !== null ? String(r.latitude) : '');
        setLongitude(r.longitude !== null ? String(r.longitude) : '');
      })
      .catch((err: unknown) => {
        setFetchError(err instanceof Error ? err.message : 'Failed to load profile');
      })
      .finally(() => setLoading(false));
  }, [accessToken]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const dto: UpdateProfilePayload = {
      name: name.trim() || undefined,
      description: description.trim() || undefined,
      addressLine: addressLine.trim() || undefined,
      city: city.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      cuisineType: cuisineType.trim() || undefined,
      latitude: latitude !== '' ? parseFloat(latitude) : undefined,
      longitude: longitude !== '' ? parseFloat(longitude) : undefined,
    };

    try {
      const updated = await apiClient.restaurant.updateProfile(accessToken, dto);
      setRestaurant(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;

  if (fetchError || !restaurant) {
    return (
      <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {fetchError ?? 'Restaurant not found'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Edit Profile</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Update your restaurant&apos;s public details. Status and activation are controlled by the
          platform admin.
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="rounded bg-white p-6 shadow">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="mb-1 block text-xs font-medium text-gray-600">Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="mb-1 block text-xs font-medium text-gray-600">Cuisine Type</label>
            <input
              type="text"
              value={cuisineType}
              onChange={(e) => setCuisineType(e.target.value)}
              placeholder="e.g. Italian, Indian…"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-600">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-600">Address *</label>
            <input
              type="text"
              required
              value={addressLine}
              onChange={(e) => setAddressLine(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">City *</label>
            <input
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Phone *</label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Email (contact)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="col-span-2 border-t pt-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
              Location coordinates (optional)
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Latitude (−90 to 90)
                </label>
                <input
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Longitude (−180 to 180)
                </label>
                <input
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        {saveError && <p className="mt-4 text-sm text-red-600">{saveError}</p>}
        {saveSuccess && (
          <p className="mt-4 text-sm text-emerald-600">Profile saved successfully.</p>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}

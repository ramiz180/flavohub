'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import ImageUploadWithCrop from '@/components/ImageUploadWithCrop';
import MapPicker from '@/components/MapPicker';
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
  const [logoUrl, setLogoUrl] = useState<string>('');

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
        setLogoUrl(r.logoUrl ?? '');
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
      logoUrl: logoUrl || undefined,
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
    <div className="max-w-3xl space-y-8">
      <div className="text-center md:text-left">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Edit Profile</h1>
        <p className="mt-1 text-sm text-gray-500">
          Update your restaurant&apos;s public details. Status and activation are controlled by the
          platform admin.
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="rounded-3xl bg-white p-5 md:p-8 shadow-sm ring-1 ring-slate-100">
        <div className="mb-8 flex flex-col md:flex-row md:items-start gap-6 border-b border-slate-100 pb-8 items-center text-center md:text-left">
          <div className="shrink-0">
            <label className="mb-2 block text-xs font-semibold text-gray-600">Restaurant Logo</label>
            <div className="mx-auto md:mx-0 w-max">
              <ImageUploadWithCrop
                initialUrl={logoUrl}
                onUploadComplete={setLogoUrl}
                aspectRatio={1}
              />
            </div>
            <p className="mt-2 text-[10px] text-gray-400">Square image recommended.</p>
          </div>
          <div className="md:pt-6">
            <h3 className="text-sm font-bold text-gray-800">Brand Identity</h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              Upload a logo for your restaurant. This will be displayed on the customer-facing app and your receipts.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <div className="col-span-1 md:col-span-1">
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="col-span-1 md:col-span-1">
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">Cuisine Type</label>
            <input
              type="text"
              value={cuisineType}
              onChange={(e) => setCuisineType(e.target.value)}
              placeholder="e.g. Italian, Indian…"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="col-span-1 md:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="col-span-1 md:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">Address *</label>
            <input
              type="text"
              required
              value={addressLine}
              onChange={(e) => setAddressLine(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">City *</label>
            <input
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">Phone *</label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">Email (contact)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="col-span-1 md:col-span-2 border-t border-slate-100 pt-5 mt-2">
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-400">
              Location Coordinates & Map (Optional)
            </p>
            <MapPicker
              lat={latitude ? parseFloat(latitude) : null}
              lng={longitude ? parseFloat(longitude) : null}
              onLocationSelect={(lat, lng, address) => {
                setLatitude(String(lat));
                setLongitude(String(lng));
                if (address) {
                  setAddressLine(address);
                }
              }}
            />
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 opacity-50 pointer-events-none">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                  Latitude
                </label>
                <input
                  type="text"
                  value={latitude}
                  readOnly
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm bg-gray-50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                  Longitude
                </label>
                <input
                  type="text"
                  value={longitude}
                  readOnly
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm bg-gray-50"
                />
              </div>
            </div>
          </div>
        </div>

        {saveError && <p className="mt-5 text-center md:text-left text-sm font-medium text-red-600 bg-red-50 p-3 rounded-xl">{saveError}</p>}
        {saveSuccess && (
          <p className="mt-5 text-center md:text-left text-sm font-medium text-emerald-600 bg-emerald-50 p-3 rounded-xl">Profile saved successfully.</p>
        )}

        <div className="mt-8 flex items-center justify-center md:justify-start gap-3">
          <button
            type="submit"
            disabled={saving}
            className="w-full md:w-auto rounded-xl bg-emerald-600 px-8 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md disabled:pointer-events-none disabled:opacity-50"
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
    <ProfileContent />
  );
}

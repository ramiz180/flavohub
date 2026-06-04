'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import AuthGuard from '@/components/auth-guard';
import type { PlatformSettings, UpdateSettingsPayload } from '@/types/coupon';

const INPUT_CLS =
  'w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const LABEL_CLS = 'mb-1 block text-sm font-medium text-gray-700';

interface FormState {
  platformName: string;
  supportEmail: string;
  supportPhone: string;
  currencyCode: string;
  ordersEnabled: boolean;
}

function fromSettings(s: PlatformSettings): FormState {
  return {
    platformName: s.platformName,
    supportEmail: s.supportEmail ?? '',
    supportPhone: s.supportPhone ?? '',
    currencyCode: s.currencyCode,
    ordersEnabled: s.ordersEnabled,
  };
}

function SettingsContent() {
  const { accessToken } = useAuth();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    apiClient.settings
      .get(accessToken)
      .then((s) => {
        setSettings(s);
        setForm(fromSettings(s));
      })
      .catch((err: unknown) => {
        setFetchError(err instanceof Error ? err.message : 'Failed to load settings');
      })
      .finally(() => setLoading(false));
  }, [accessToken]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => prev && { ...prev, [name]: type === 'checkbox' ? checked : value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !form) return;

    const payload: UpdateSettingsPayload = {
      platformName: form.platformName.trim() || undefined,
      currencyCode: form.currencyCode.trim() || undefined,
      ordersEnabled: form.ordersEnabled,
    };
    if (form.supportEmail.trim()) payload.supportEmail = form.supportEmail.trim();
    if (form.supportPhone.trim()) payload.supportPhone = form.supportPhone.trim();

    setSubmitting(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const updated = await apiClient.settings.update(accessToken, payload);
      setSettings(updated);
      setForm(fromSettings(updated));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-2xl text-center text-sm text-gray-500">Loading…</div>
      </main>
    );
  }

  if (fetchError || !form) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-2xl">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
            ← Dashboard
          </Link>
          <div className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {fetchError ?? 'Failed to load settings'}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
            ← Dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">Platform Settings</h1>
          {settings && (
            <p className="mt-1 text-xs text-gray-400">
              Last updated {new Date(settings.updatedAt).toLocaleString()}
            </p>
          )}
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="rounded bg-white p-6 shadow">
          {saveError && (
            <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {saveError}
            </div>
          )}
          {saveSuccess && (
            <div className="mb-4 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              Settings saved.
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className={LABEL_CLS}>Platform Name</label>
              <input
                name="platformName"
                value={form.platformName}
                onChange={handleChange}
                className={INPUT_CLS}
              />
            </div>

            <div>
              <label className={LABEL_CLS}>Support Email</label>
              <input
                name="supportEmail"
                type="email"
                value={form.supportEmail}
                onChange={handleChange}
                placeholder="optional"
                className={INPUT_CLS}
              />
            </div>

            <div>
              <label className={LABEL_CLS}>Support Phone</label>
              <input
                name="supportPhone"
                value={form.supportPhone}
                onChange={handleChange}
                placeholder="optional"
                className={INPUT_CLS}
              />
            </div>

            <div>
              <label className={LABEL_CLS}>Currency Code</label>
              <input
                name="currencyCode"
                value={form.currencyCode}
                onChange={handleChange}
                placeholder="e.g. INR"
                className={INPUT_CLS}
              />
            </div>

            <div className="rounded border border-gray-200 p-4">
              <label className="flex cursor-pointer items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">Orders Enabled</p>
                  <p className="text-xs text-gray-500">
                    When disabled, customers cannot place new orders.
                  </p>
                </div>
                <div className="relative ml-4">
                  <input
                    type="checkbox"
                    name="ordersEnabled"
                    checked={form.ordersEnabled}
                    onChange={handleChange}
                    className="sr-only"
                    id="ordersEnabled"
                  />
                  <label
                    htmlFor="ordersEnabled"
                    className={`block h-6 w-11 cursor-pointer rounded-full transition-colors ${
                      form.ordersEnabled ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
                        form.ordersEnabled ? 'translate-x-5.5' : 'translate-x-0.5'
                      }`}
                    />
                  </label>
                </div>
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
            >
              {submitting ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsContent />
    </AuthGuard>
  );
}

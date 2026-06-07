'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import AuthGuard from '@/components/auth-guard';
import type { PlatformPricing, PricingPreviewPayload, UpdatePricingPayload } from '@/types/pricing';
import type { Restaurant } from '@/types/restaurant';
import type { MarkupType, PriceBreakdown } from '@flavohub/shared';

function BreakdownRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <tr className={bold ? 'border-t font-semibold' : ''}>
      <td className="py-1.5 pr-4 text-sm text-gray-700">{label}</td>
      <td className={`py-1.5 text-right text-sm ${bold ? 'text-gray-900' : 'text-gray-600'}`}>
        {value.toFixed(2)}
      </td>
    </tr>
  );
}

function PricingContent() {
  const { accessToken } = useAuth();

  // ── Global levers state ────────────────────────────────────────────────────
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [markupType, setMarkupType] = useState<MarkupType>('PERCENT');
  const [markupValue, setMarkupValue] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [surgeFee, setSurgeFee] = useState('');
  const [surgeEnabled, setSurgeEnabled] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // ── Preview state ──────────────────────────────────────────────────────────
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [previewBase, setPreviewBase] = useState('');
  const [previewRestaurantId, setPreviewRestaurantId] = useState('');
  const [previewDiscount, setPreviewDiscount] = useState('');
  const [breakdown, setBreakdown] = useState<PriceBreakdown | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  function applySettings(p: PlatformPricing) {
    setMarkupType(p.globalMarkupType);
    setMarkupValue(p.globalMarkupValue);
    setDeliveryFee(p.baseDeliveryFee);
    setSurgeFee(p.surgeFee);
    setSurgeEnabled(p.surgeEnabled);
    setLastUpdated(p.updatedAt);
  }

  const loadSettings = useCallback(() => {
    if (!accessToken) return;
    setSettingsLoading(true);
    setSettingsError(null);
    apiClient.pricing
      .get(accessToken)
      .then(applySettings)
      .catch((err: unknown) => {
        setSettingsError(err instanceof Error ? err.message : 'Failed to load pricing settings');
      })
      .finally(() => setSettingsLoading(false));
  }, [accessToken]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (!accessToken) return;
    apiClient.restaurants
      .list(accessToken, { pageSize: 100 })
      .then((r) => setRestaurants(r.data))
      .catch(() => {});
  }, [accessToken]);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    const mValue = parseFloat(markupValue);
    const dFee = parseFloat(deliveryFee);
    const sFee = parseFloat(surgeFee);
    if (isNaN(mValue) || isNaN(dFee) || isNaN(sFee)) {
      setSaveError('All fee fields must be valid numbers');
      return;
    }
    setSavingSettings(true);
    setSaveSuccess(false);
    setSaveError(null);
    const payload: UpdatePricingPayload = {
      globalMarkupType: markupType,
      globalMarkupValue: mValue,
      baseDeliveryFee: dFee,
      surgeFee: sFee,
      surgeEnabled,
    };
    try {
      const updated = await apiClient.pricing.update(accessToken, payload);
      applySettings(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  }

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    const base = parseFloat(previewBase);
    if (isNaN(base) || base < 0) {
      setPreviewError('Base amount must be a non-negative number');
      return;
    }
    setPreviewLoading(true);
    setPreviewError(null);
    setBreakdown(null);
    const dto: PricingPreviewPayload = { baseAmount: base };
    if (previewRestaurantId) dto.restaurantId = previewRestaurantId;
    const disc = parseFloat(previewDiscount);
    if (!isNaN(disc) && disc > 0) dto.discount = disc;
    try {
      const result = await apiClient.pricing.preview(accessToken, dto);
      setBreakdown(result);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setPreviewLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
            ← Dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">Pricing Settings</h1>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* ── Global levers form ───────────────────────────────────── */}
          <section className="rounded bg-white p-6 shadow">
            <h2 className="mb-4 text-base font-semibold text-gray-800">Global Pricing Levers</h2>

            {settingsLoading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : settingsError ? (
              <p className="text-sm text-red-600">{settingsError}</p>
            ) : (
              <form onSubmit={(e) => void handleSaveSettings(e)} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Markup Type
                  </label>
                  <div className="flex gap-4">
                    {(['PERCENT', 'FLAT'] as MarkupType[]).map((t) => (
                      <label key={t} className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="markupType"
                          value={t}
                          checked={markupType === t}
                          onChange={() => setMarkupType(t)}
                        />
                        {t === 'PERCENT' ? 'Percent (%)' : 'Flat (₹)'}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Markup Value{markupType === 'PERCENT' ? ' (%)' : ' (₹)'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={markupValue}
                    onChange={(e) => setMarkupValue(e.target.value)}
                    required
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Base Delivery Fee (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(e.target.value)}
                    required
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Surge Fee (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={surgeFee}
                    onChange={(e) => setSurgeFee(e.target.value)}
                    required
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    id="surgeEnabled"
                    type="checkbox"
                    checked={surgeEnabled}
                    onChange={(e) => setSurgeEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  <label htmlFor="surgeEnabled" className="text-sm font-medium text-gray-700">
                    Surge Enabled
                  </label>
                  {surgeEnabled && (
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                      ACTIVE
                    </span>
                  )}
                </div>

                {saveError && <p className="text-sm text-red-600">{saveError}</p>}
                {saveSuccess && (
                  <p className="text-sm text-green-600">Settings saved successfully.</p>
                )}

                <button
                  type="submit"
                  disabled={savingSettings}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
                >
                  {savingSettings ? 'Saving…' : 'Save Settings'}
                </button>

                {lastUpdated && (
                  <p className="text-xs text-gray-400">
                    Last updated: {new Date(lastUpdated).toLocaleString()}
                  </p>
                )}
              </form>
            )}
          </section>

          {/* ── Live preview panel ───────────────────────────────────── */}
          <section className="rounded bg-white p-6 shadow">
            <h2 className="mb-4 text-base font-semibold text-gray-800">Live Price Preview</h2>

            <form onSubmit={(e) => void handlePreview(e)} className="mb-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Base Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={previewBase}
                  onChange={(e) => setPreviewBase(e.target.value)}
                  placeholder="e.g. 200"
                  required
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Restaurant (optional — uses global if unset)
                </label>
                <select
                  value={previewRestaurantId}
                  onChange={(e) => setPreviewRestaurantId(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Global defaults</option>
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} — {r.city}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Discount (₹, optional)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={previewDiscount}
                  onChange={(e) => setPreviewDiscount(e.target.value)}
                  placeholder="0"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {previewError && <p className="text-sm text-red-600">{previewError}</p>}

              <button
                type="submit"
                disabled={previewLoading}
                className="w-full rounded bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-40"
              >
                {previewLoading ? 'Calculating…' : 'Calculate Preview'}
              </button>
            </form>

            {breakdown && (
              <div className="rounded border border-gray-200 bg-gray-50 p-4">
                <h3 className="mb-2 text-sm font-medium text-gray-700">Breakdown</h3>
                <table className="w-full">
                  <tbody>
                    <BreakdownRow label="Base" value={breakdown.base} />
                    <BreakdownRow label="Markup" value={breakdown.markup} />
                    <BreakdownRow label="Delivery Fee" value={breakdown.deliveryFee} />
                    <BreakdownRow label="Surge Fee" value={breakdown.surgeFee} />
                    <BreakdownRow label="Discount" value={-breakdown.discount} />
                    <BreakdownRow label="Total" value={breakdown.total} bold />
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

export default function PricingPage() {
  return (
    <AuthGuard>
      <PricingContent />
    </AuthGuard>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import AuthGuard from '@/components/auth-guard';
import type { Coupon, CouponType, UpdateCouponPayload } from '@/types/coupon';

const INPUT_CLS =
  'w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const LABEL_CLS = 'mb-1 block text-sm font-medium text-gray-700';

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIso(local: string): string {
  if (!local) return '';
  const d = new Date(local);
  return isNaN(d.getTime()) ? '' : d.toISOString();
}

interface FormState {
  code: string;
  description: string;
  type: CouponType;
  value: string;
  maxDiscount: string;
  minOrderValue: string;
  perUserLimit: string;
  globalUsageLimit: string;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
}

function fromCoupon(c: Coupon): FormState {
  return {
    code: c.code,
    description: c.description ?? '',
    type: c.type,
    value: c.value,
    maxDiscount: c.maxDiscount ?? '',
    minOrderValue: c.minOrderValue,
    perUserLimit: c.perUserLimit != null ? String(c.perUserLimit) : '',
    globalUsageLimit: c.globalUsageLimit != null ? String(c.globalUsageLimit) : '',
    validFrom: toDatetimeLocal(c.validFrom),
    validUntil: toDatetimeLocal(c.validUntil),
    isActive: c.isActive,
  };
}

function CouponDetailContent() {
  const { accessToken } = useAuth();
  const params = useParams();
  const id = typeof params['id'] === 'string' ? params['id'] : '';

  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadCoupon = useCallback(() => {
    if (!accessToken || !id) return;
    setLoading(true);
    setFetchError(null);
    apiClient.coupons
      .get(accessToken, id)
      .then((c) => {
        setCoupon(c);
        setForm(fromCoupon(c));
      })
      .catch((err: unknown) => {
        setFetchError(err instanceof Error ? err.message : 'Failed to load coupon');
      })
      .finally(() => setLoading(false));
  }, [accessToken, id]);

  useEffect(() => {
    loadCoupon();
  }, [loadCoupon]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    setForm((prev) => prev && { ...prev, [name]: checked !== undefined ? checked : value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !form) return;

    const validFromIso = toIso(form.validFrom);
    const validUntilIso = toIso(form.validUntil);
    if (!validFromIso || !validUntilIso) {
      setSaveError('Valid-from and valid-until dates are required');
      return;
    }

    const payload: UpdateCouponPayload = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: parseFloat(form.value),
      validFrom: validFromIso,
      validUntil: validUntilIso,
      isActive: form.isActive,
    };
    if (form.description.trim()) payload.description = form.description.trim();
    else payload.description = undefined;

    if (form.type === 'PERCENT' && form.maxDiscount.trim())
      payload.maxDiscount = parseFloat(form.maxDiscount);
    if (form.minOrderValue.trim()) payload.minOrderValue = parseFloat(form.minOrderValue);
    if (form.perUserLimit.trim()) payload.perUserLimit = parseInt(form.perUserLimit, 10);
    if (form.globalUsageLimit.trim())
      payload.globalUsageLimit = parseInt(form.globalUsageLimit, 10);

    setSubmitting(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const updated = await apiClient.coupons.update(accessToken, id, payload);
      setCoupon(updated);
      setForm(fromCoupon(updated));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save coupon');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive() {
    if (!accessToken || !coupon) return;
    setSubmitting(true);
    setSaveError(null);
    try {
      const updated = await apiClient.coupons.update(accessToken, id, {
        isActive: !coupon.isActive,
      });
      setCoupon(updated);
      setForm(fromCoupon(updated));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update coupon');
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

  if (fetchError || !coupon || !form) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-2xl">
          <Link href="/dashboard/coupons" className="text-sm text-gray-500 hover:text-gray-700">
            ← Coupons
          </Link>
          <div className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {fetchError ?? 'Coupon not found'}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <Link href="/dashboard/coupons" className="text-sm text-gray-500 hover:text-gray-700">
            ← Coupons
          </Link>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-2xl font-semibold font-mono">{coupon.code}</h1>
            {coupon.isActive ? (
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                Active
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                Inactive
              </span>
            )}
          </div>
        </div>

        <div className="mb-4 flex items-center gap-3 rounded bg-white p-4 shadow">
          <span className="text-sm text-gray-600">
            Used <strong>{coupon.usedCount}</strong> time{coupon.usedCount !== 1 ? 's' : ''}
            {coupon.globalUsageLimit != null && ` of ${coupon.globalUsageLimit}`}
          </span>
          <button
            onClick={() => void handleToggleActive()}
            disabled={submitting}
            className={`ml-auto rounded px-4 py-1.5 text-sm font-medium disabled:opacity-40 ${
              coupon.isActive
                ? 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {coupon.isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="rounded bg-white p-6 shadow">
          {saveError && (
            <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {saveError}
            </div>
          )}
          {saveSuccess && (
            <div className="mb-4 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              Coupon saved successfully.
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className={LABEL_CLS}>Code</label>
              <input
                name="code"
                value={form.code}
                onChange={handleChange}
                required
                className={`${INPUT_CLS} uppercase`}
              />
            </div>

            <div>
              <label className={LABEL_CLS}>Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={2}
                className={INPUT_CLS}
              />
            </div>

            <div>
              <label className={LABEL_CLS}>Type</label>
              <select name="type" value={form.type} onChange={handleChange} className={INPUT_CLS}>
                <option value="PERCENT">PERCENT (%)</option>
                <option value="FLAT">FLAT (₹)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}>Value ({form.type === 'PERCENT' ? '%' : '₹'})</label>
                <input
                  name="value"
                  type="number"
                  step="any"
                  min="0"
                  value={form.value}
                  onChange={handleChange}
                  required
                  className={INPUT_CLS}
                />
              </div>

              {form.type === 'PERCENT' && (
                <div>
                  <label className={LABEL_CLS}>Max Discount Cap (₹)</label>
                  <input
                    name="maxDiscount"
                    type="number"
                    step="any"
                    min="0"
                    value={form.maxDiscount}
                    onChange={handleChange}
                    placeholder="no cap"
                    className={INPUT_CLS}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}>Min Order Value (₹)</label>
                <input
                  name="minOrderValue"
                  type="number"
                  step="any"
                  min="0"
                  value={form.minOrderValue}
                  onChange={handleChange}
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Per-User Limit</label>
                <input
                  name="perUserLimit"
                  type="number"
                  min="1"
                  value={form.perUserLimit}
                  onChange={handleChange}
                  placeholder="unlimited"
                  className={INPUT_CLS}
                />
              </div>
            </div>

            <div>
              <label className={LABEL_CLS}>Global Usage Limit</label>
              <input
                name="globalUsageLimit"
                type="number"
                min="1"
                value={form.globalUsageLimit}
                onChange={handleChange}
                placeholder="unlimited"
                className={INPUT_CLS}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}>Valid From</label>
                <input
                  name="validFrom"
                  type="datetime-local"
                  value={form.validFrom}
                  onChange={handleChange}
                  required
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Valid Until</label>
                <input
                  name="validUntil"
                  type="datetime-local"
                  value={form.validUntil}
                  onChange={handleChange}
                  required
                  className={INPUT_CLS}
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                name="isActive"
                checked={form.isActive}
                onChange={handleChange}
                className="rounded border-gray-300"
              />
              Active
            </label>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <Link
              href="/dashboard/coupons"
              className="rounded border px-4 py-2 text-sm hover:bg-gray-100"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
            >
              {submitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function CouponDetailPage() {
  return (
    <AuthGuard>
      <CouponDetailContent />
    </AuthGuard>
  );
}

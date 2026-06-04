'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import AuthGuard from '@/components/auth-guard';
import type { CouponType, CreateCouponPayload } from '@/types/coupon';

const INPUT_CLS =
  'w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const LABEL_CLS = 'mb-1 block text-sm font-medium text-gray-700';

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

function CreateCouponContent() {
  const { accessToken } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    code: '',
    description: '',
    type: 'PERCENT',
    value: '',
    maxDiscount: '',
    minOrderValue: '',
    perUserLimit: '',
    globalUsageLimit: '',
    validFrom: '',
    validUntil: '',
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    setForm((prev) => ({ ...prev, [name]: checked !== undefined ? checked : value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;

    const validFromIso = toIso(form.validFrom);
    const validUntilIso = toIso(form.validUntil);
    if (!validFromIso || !validUntilIso) {
      setError('Valid-from and valid-until dates are required');
      return;
    }

    const payload: CreateCouponPayload = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: parseFloat(form.value),
      validFrom: validFromIso,
      validUntil: validUntilIso,
      isActive: form.isActive,
    };
    if (form.description.trim()) payload.description = form.description.trim();
    if (form.type === 'PERCENT' && form.maxDiscount.trim())
      payload.maxDiscount = parseFloat(form.maxDiscount);
    if (form.minOrderValue.trim()) payload.minOrderValue = parseFloat(form.minOrderValue);
    if (form.perUserLimit.trim()) payload.perUserLimit = parseInt(form.perUserLimit, 10);
    if (form.globalUsageLimit.trim())
      payload.globalUsageLimit = parseInt(form.globalUsageLimit, 10);

    setSubmitting(true);
    setError(null);

    try {
      await apiClient.coupons.create(accessToken, payload);
      router.push('/dashboard/coupons');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create coupon');
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <Link href="/dashboard/coupons" className="text-sm text-gray-500 hover:text-gray-700">
            ← Coupons
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">New Coupon</h1>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="rounded bg-white p-6 shadow">
          {error && (
            <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className={LABEL_CLS}>
                Code <span className="text-red-500">*</span>
              </label>
              <input
                name="code"
                value={form.code}
                onChange={handleChange}
                required
                placeholder="e.g. WELCOME10"
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
              <label className={LABEL_CLS}>
                Type <span className="text-red-500">*</span>
              </label>
              <select name="type" value={form.type} onChange={handleChange} className={INPUT_CLS}>
                <option value="PERCENT">PERCENT (%)</option>
                <option value="FLAT">FLAT (₹)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}>
                  Value <span className="text-red-500">*</span>
                  <span className="ml-1 font-normal text-gray-400">
                    ({form.type === 'PERCENT' ? '%' : '₹'})
                  </span>
                </label>
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
                    placeholder="optional cap"
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
                  placeholder="0"
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
                <label className={LABEL_CLS}>
                  Valid From <span className="text-red-500">*</span>
                </label>
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
                <label className={LABEL_CLS}>
                  Valid Until <span className="text-red-500">*</span>
                </label>
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
              Active (coupon can be redeemed immediately)
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
              {submitting ? 'Creating…' : 'Create Coupon'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function NewCouponPage() {
  return (
    <AuthGuard>
      <CreateCouponContent />
    </AuthGuard>
  );
}

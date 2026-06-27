'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calculator, Settings2, Percent, IndianRupee, 
  Truck, Zap, ReceiptText, ArrowRight, ShieldCheck, Tag
} from 'lucide-react';
import type { PlatformPricing, PricingPreviewPayload, UpdatePricingPayload } from '@/types/pricing';
import type { Restaurant } from '@/types/restaurant';
import type { MarkupType, PriceBreakdown } from '@flavohub/shared';

function BreakdownRow({ label, value, isTotal, isDiscount, isFree }: { label: string; value: number; isTotal?: boolean; isDiscount?: boolean; isFree?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-2.5 ${isTotal ? 'border-t border-slate-200 border-dashed mt-2 pt-3' : ''}`}>
      <span className={`text-sm ${isTotal ? 'font-bold text-slate-800' : 'font-medium text-slate-500'}`}>{label}</span>
      <span className={`text-sm font-semibold tracking-tight ${
        isTotal ? 'text-lg text-slate-900' : 
        isDiscount ? 'text-emerald-600' : 
        isFree ? 'text-emerald-600' : 'text-slate-700'
      }`}>
        {isDiscount ? '-' : ''}{isFree && value === 0 ? 'FREE' : `₹${value.toFixed(2)}`}
      </span>
    </div>
  );
}

const inputCls = "w-full rounded-xl border-0 bg-slate-50 py-3 pl-11 pr-4 text-sm font-medium text-slate-900 ring-1 ring-inset ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-inset focus:ring-brand-primary";
const labelCls = "mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function PricingPage() {
  const { accessToken } = useAuth();

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
    <div className="space-y-8 max-w-[1600px] mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-brand-secondary">Pricing Engine</h2>
          <p className="mt-1 text-sm text-slate-500">Configure global markups, surge algorithms, and preview order pricing.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 shadow-sm ring-1 ring-slate-100">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Pricing Live</span>
        </div>
      </div>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        
        {/* Global Pricing Controls */}
        <motion.section variants={itemVariants} className="flex flex-col rounded-3xl bg-white shadow-premium ring-1 ring-slate-100 overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/50 p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                <Settings2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Global Configuration</h3>
                <p className="text-xs text-slate-500">
                  {lastUpdated ? `Last updated: ${new Date(lastUpdated).toLocaleString()}` : 'Platform-wide default settings'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 flex-1">
            {settingsLoading ? (
              <div className="flex h-full items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-100 border-t-brand-primary" />
              </div>
            ) : settingsError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                {settingsError}
              </div>
            ) : (
              <form onSubmit={handleSaveSettings} className="space-y-6 flex flex-col h-full justify-between">
                <div className="space-y-6">
                  {/* Markup Configuration */}
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 space-y-5">
                    <div>
                      <label className={labelCls}>Markup Type</label>
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        {(['PERCENT', 'FLAT'] as MarkupType[]).map((t) => (
                          <label 
                            key={t} 
                            className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition-all ${
                              markupType === t 
                                ? 'border-brand-primary bg-brand-primary/5 text-brand-primary shadow-sm' 
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="markupType"
                              value={t}
                              checked={markupType === t}
                              onChange={() => setMarkupType(t)}
                              className="sr-only"
                            />
                            {t === 'PERCENT' ? <Percent className="h-4 w-4" /> : <IndianRupee className="h-4 w-4" />}
                            {t === 'PERCENT' ? 'Percentage' : 'Flat Amount'}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className={labelCls}>
                        Markup Value {markupType === 'PERCENT' ? '(%)' : '(₹)'}
                      </label>
                      <div className="relative mt-2">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                          {markupType === 'PERCENT' ? <Percent className="h-4 w-4 text-slate-400" /> : <IndianRupee className="h-4 w-4 text-slate-400" />}
                        </div>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={markupValue}
                          onChange={(e) => setMarkupValue(e.target.value)}
                          required
                          className={inputCls}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Delivery & Surge */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className={labelCls}>Base Delivery Fee (₹)</label>
                      <div className="relative mt-2">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                          <Truck className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={deliveryFee}
                          onChange={(e) => setDeliveryFee(e.target.value)}
                          required
                          className={inputCls}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelCls}>Surge Fee (₹)</label>
                      <div className="relative mt-2">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                          <Zap className={`h-4 w-4 ${surgeEnabled ? 'text-amber-500' : 'text-slate-400'}`} />
                        </div>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={surgeFee}
                          onChange={(e) => setSurgeFee(e.target.value)}
                          disabled={!surgeEnabled}
                          required
                          className={`${inputCls} ${!surgeEnabled && 'opacity-50 cursor-not-allowed bg-slate-100'}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Surge Toggle */}
                  <div className={`flex items-center justify-between rounded-xl border p-4 transition-colors ${surgeEnabled ? 'border-amber-200 bg-amber-50/50' : 'border-slate-100 bg-white'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${surgeEnabled ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                        <Zap className="h-5 w-5" />
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${surgeEnabled ? 'text-amber-900' : 'text-slate-700'}`}>Active Surge Pricing</p>
                        <p className={`text-xs ${surgeEnabled ? 'text-amber-700' : 'text-slate-500'}`}>Apply extra fee during peak hours</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSurgeEnabled((v) => !v)}
                      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                        surgeEnabled ? 'bg-amber-500' : 'bg-slate-200'
                      }`}
                      role="switch"
                    >
                      <span className={`inline-block h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${surgeEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>

                <div className="pt-4">
                  <AnimatePresence>
                    {saveError && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                        {saveError}
                      </motion.div>
                    )}
                    {saveSuccess && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
                        <ShieldCheck className="h-4 w-4" /> Settings secured and applied globally
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="w-full rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-slate-800 disabled:opacity-50 active:scale-[0.98]"
                  >
                    {savingSettings ? 'Synchronizing...' : 'Save Configuration'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.section>

        {/* Live Preview Engine */}
        <motion.section variants={itemVariants} className="flex flex-col rounded-3xl bg-white shadow-premium ring-1 ring-slate-100 overflow-hidden">
          <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                <Calculator className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Live Price Engine</h3>
                <p className="text-xs text-slate-500">Test final customer calculations instantly</p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 flex-1 flex flex-col">
            <form onSubmit={handlePreview} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Base Amount (₹)</label>
                  <div className="relative mt-2">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <IndianRupee className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={previewBase}
                      onChange={(e) => setPreviewBase(e.target.value)}
                      placeholder="e.g. 250"
                      required
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Discount (₹)</label>
                  <div className="relative mt-2">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <Tag className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={previewDiscount}
                      onChange={(e) => setPreviewDiscount(e.target.value)}
                      placeholder="0"
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className={labelCls}>Target Restaurant Override</label>
                <select
                  value={previewRestaurantId}
                  onChange={(e) => setPreviewRestaurantId(e.target.value)}
                  className={`${inputCls} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%24%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_16px_center] bg-no-repeat`}
                >
                  <option value="">Global Default Configuration</option>
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} ({r.city})</option>
                  ))}
                </select>
              </div>

              {previewError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                  {previewError}
                </div>
              )}

              <button
                type="submit"
                disabled={previewLoading}
                className="w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition-all hover:bg-indigo-700 disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {previewLoading ? 'Calculating Matrix...' : 'Generate Receipt Preview'}
                {!previewLoading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            {/* Receipt Result */}
            <AnimatePresence>
              {breakdown && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 32 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="flex-1 rounded-2xl bg-slate-50 border border-slate-200 p-6 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNiAwTDMySDZ6IiBmaWxsPSIjZTE1ZDM1IiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=')] opacity-50" />
                  
                  <div className="flex items-center gap-2 mb-4">
                    <ReceiptText className="h-5 w-5 text-slate-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Customer Receipt</span>
                  </div>

                  <div className="space-y-1">
                    <BreakdownRow label="Item Subtotal" value={breakdown.base} />
                    <BreakdownRow label="Platform Fee / Taxes" value={breakdown.markup} />
                    <BreakdownRow label="Delivery Partner Fee" value={breakdown.deliveryFee} isFree={breakdown.deliveryFee === 0} />
                    {breakdown.surgeFee > 0 && (
                      <BreakdownRow label="High Demand Surge" value={breakdown.surgeFee} />
                    )}
                    {breakdown.discount > 0 && (
                      <BreakdownRow label="Coupon Discount" value={breakdown.discount} isDiscount />
                    )}
                    <BreakdownRow label="Final Payable Amount" value={breakdown.total} isTotal />
                  </div>
                  
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNiAwTDMySDZ6IiBmaWxsPSIjZTE1ZDM1IiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=')] opacity-50" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}

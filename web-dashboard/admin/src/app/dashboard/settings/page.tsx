'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Mail, Phone, CircleDollarSign, 
  Power, ShieldAlert, CheckCircle2, AlertCircle, 
  Settings2, Save, Globe
} from 'lucide-react';
import type { PlatformSettings, UpdateSettingsPayload } from '@/types/coupon';

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

export default function SettingsPage() {
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
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-100 border-t-brand-primary" />
          <p className="text-sm font-medium text-slate-500">Loading system configuration...</p>
        </div>
      </div>
    );
  }

  if (fetchError || !form) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 flex items-start gap-3">
        <AlertCircle className="h-6 w-6 text-red-500 shrink-0" />
        <div>
          <h3 className="text-sm font-bold text-red-800">Configuration Error</h3>
          <p className="mt-1 text-sm text-red-600">{fetchError ?? 'Failed to load settings'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-brand-secondary">Platform Settings</h2>
          <p className="mt-1 text-sm text-slate-500">
            {settings
              ? `System synced: ${new Date(settings.updatedAt).toLocaleString()}`
              : 'Configure platform identity, communication, and order status.'}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 shadow-sm ring-1 ring-slate-100">
          <Settings2 className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Admin Privileges</span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          
          {/* Identity Card */}
          <motion.div variants={itemVariants} className="rounded-3xl bg-white shadow-premium ring-1 ring-slate-100 p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Platform Identity</h3>
                <p className="text-xs text-slate-500">Global branding and localization</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className={labelCls}>Platform Name</label>
                <div className="relative mt-2">
                  <Building2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    name="platformName"
                    value={form.platformName}
                    onChange={handleChange}
                    className={inputCls}
                    placeholder="e.g. FlavoHub India"
                  />
                </div>
              </div>
              
              <div>
                <label className={labelCls}>Primary Currency</label>
                <div className="relative mt-2">
                  <CircleDollarSign className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    name="currencyCode"
                    value={form.currencyCode}
                    onChange={handleChange}
                    placeholder="e.g. INR"
                    className={`${inputCls} uppercase`}
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Contact Card */}
          <motion.div variants={itemVariants} className="rounded-3xl bg-white shadow-premium ring-1 ring-slate-100 p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Support Channels</h3>
                <p className="text-xs text-slate-500">Customer and partner contact points</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className={labelCls}>Support Email Address</label>
                <div className="relative mt-2">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    name="supportEmail"
                    type="email"
                    value={form.supportEmail}
                    onChange={handleChange}
                    placeholder="support@flavohub.com"
                    className={inputCls}
                  />
                </div>
              </div>
              
              <div>
                <label className={labelCls}>Support Phone Number</label>
                <div className="relative mt-2">
                  <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    name="supportPhone"
                    value={form.supportPhone}
                    onChange={handleChange}
                    placeholder="+91 1800-123-456"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Master Kill Switch */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <div className={`rounded-3xl border transition-all duration-300 p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-center justify-between shadow-premium ${form.ordersEnabled ? 'bg-white border-slate-100' : 'bg-red-50/50 border-red-200 ring-1 ring-red-100'}`}>
              <div className="flex items-start gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${form.ordersEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600 animate-pulse'}`}>
                  {form.ordersEnabled ? <Power className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}
                </div>
                <div>
                  <h3 className={`text-lg font-bold ${form.ordersEnabled ? 'text-slate-900' : 'text-red-900'}`}>
                    Master Order Switch
                  </h3>
                  <p className={`mt-1 text-sm font-medium ${form.ordersEnabled ? 'text-slate-500' : 'text-red-600'}`}>
                    {form.ordersEnabled 
                      ? 'Platform is currently accepting live orders from customers.' 
                      : 'EMERGENCY STOP ACTIVE: All checkout processes are disabled globally.'}
                  </p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => setForm((prev) => prev && { ...prev, ordersEnabled: !prev.ordersEnabled })}
                className={`relative inline-flex h-10 w-20 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 focus:outline-none ${
                  form.ordersEnabled ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30' : 'bg-red-500 hover:bg-red-600 shadow-red-500/30'
                } shadow-lg`}
                role="switch"
              >
                <span
                  className={`inline-block h-9 w-9 rounded-full bg-white shadow-md transition-transform duration-300 ${
                    form.ordersEnabled ? 'translate-x-10' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </motion.div>

        </motion.div>

        {/* Action Footer */}
        <motion.div 
          variants={itemVariants}
          initial="hidden"
          animate="show"
          className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl bg-slate-900 p-4 sm:pl-8 sm:pr-4 shadow-xl"
        >
          <div className="flex-1 w-full flex justify-center sm:justify-start">
            <AnimatePresence mode="wait">
              {saveError && (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-red-400 font-medium text-sm">
                  <AlertCircle className="h-5 w-5" /> {saveError}
                </motion.div>
              )}
              {saveSuccess && (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-emerald-400 font-medium text-sm">
                  <CheckCircle2 className="h-5 w-5" /> Configuration applied and synced globally
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-8 py-3.5 text-sm font-bold text-slate-900 shadow-sm transition-all hover:bg-brand-primary hover:text-white disabled:opacity-50"
          >
            {submitting ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-current" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            {submitting ? 'Applying...' : 'Save Configuration'}
          </button>
        </motion.div>
      </form>
    </div>
  );
}

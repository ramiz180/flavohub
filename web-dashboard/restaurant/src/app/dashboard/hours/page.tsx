'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import type { HoursEntry } from '@/types/restaurant';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function defaultWeek(): HoursEntry[] {
  return DAYS.map((_, i) => ({
    dayOfWeek: i,
    openTime: '09:00',
    closeTime: '21:00',
    isClosed: i === 0,
  }));
}

function HoursContent() {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [entries, setEntries] = useState<HoursEntry[]>(defaultWeek());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadHours = useCallback(() => {
    if (!accessToken) return;
    setLoading(true);
    setFetchError(null);
    apiClient.restaurant
      .getProfile(accessToken)
      .then((r) => {
        if (r.hours.length === 7) {
          setEntries(
            r.hours.map((h) => ({
              dayOfWeek: h.dayOfWeek,
              openTime: h.openTime,
              closeTime: h.closeTime,
              isClosed: h.isClosed,
            })),
          );
        }
      })
      .catch((err: unknown) => {
        setFetchError(err instanceof Error ? err.message : 'Failed to load hours');
      })
      .finally(() => setLoading(false));
  }, [accessToken]);

  useEffect(() => {
    loadHours();
  }, [loadHours]);

  function updateEntry(day: number, patch: Partial<HoursEntry>) {
    setEntries((prev) => prev.map((e) => (e.dayOfWeek === day ? { ...e, ...patch } : e)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await apiClient.restaurant.setHours(accessToken, entries);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save hours');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;

  if (fetchError) {
    return (
      <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {fetchError}
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div className="text-center md:text-left">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Operating Hours</h1>
        <p className="mt-1 text-sm text-gray-500">
          Set your opening and closing times for each day of the week.
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="rounded-3xl bg-white p-5 md:p-8 shadow-sm ring-1 ring-slate-100">
        <div className="space-y-4">
          {/* Desktop/Tablet Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 border-b border-slate-100 pb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
            <div className="col-span-3">Day</div>
            <div className="col-span-4">Open Time</div>
            <div className="col-span-4">Close Time</div>
            <div className="col-span-1 text-center">Closed</div>
          </div>

          <div className="divide-y divide-slate-100/60">
            {entries.map((entry) => (
              <div
                key={entry.dayOfWeek}
                className={`py-4 md:py-3 grid grid-cols-1 md:grid-cols-12 gap-y-3 md:gap-x-4 items-center transition-opacity ${
                  entry.isClosed ? 'opacity-50 grayscale-[0.5]' : ''
                }`}
              >
                {/* Day Label */}
                <div className="col-span-1 md:col-span-3 flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-sm md:text-base">
                    {DAYS[entry.dayOfWeek]}
                  </span>
                  
                  {/* Mobile Closed Toggle */}
                  <label className="md:hidden flex items-center gap-2 text-xs font-semibold text-slate-500">
                    Closed
                    <input
                      type="checkbox"
                      checked={entry.isClosed}
                      onChange={(e) => updateEntry(entry.dayOfWeek, { isClosed: e.target.checked })}
                      className="h-4 w-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </label>
                </div>

                {/* Open Time */}
                <div className="col-span-1 md:col-span-4">
                  <label className="md:hidden block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Open Time</label>
                  <input
                    type="time"
                    required={!entry.isClosed}
                    disabled={entry.isClosed}
                    value={entry.openTime}
                    onChange={(e) => updateEntry(entry.dayOfWeek, { openTime: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-50"
                  />
                </div>

                {/* Close Time */}
                <div className="col-span-1 md:col-span-4">
                  <label className="md:hidden block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Close Time</label>
                  <input
                    type="time"
                    required={!entry.isClosed}
                    disabled={entry.isClosed}
                    value={entry.closeTime}
                    onChange={(e) => updateEntry(entry.dayOfWeek, { closeTime: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-50"
                  />
                </div>

                {/* Desktop Closed Toggle */}
                <div className="hidden md:flex col-span-1 justify-center">
                  <input
                    type="checkbox"
                    checked={entry.isClosed}
                    onChange={(e) => updateEntry(entry.dayOfWeek, { isClosed: e.target.checked })}
                    className="h-4 w-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {saveError && <p className="mt-5 text-center md:text-left text-sm font-medium text-red-600 bg-red-50 p-3 rounded-xl">{saveError}</p>}
        {saveSuccess && <p className="mt-5 text-center md:text-left text-sm font-medium text-emerald-600 bg-emerald-50 p-3 rounded-xl">Hours saved successfully.</p>}

        <div className="mt-8 flex items-center justify-center md:justify-start">
          <button
            type="submit"
            disabled={saving}
            className="w-full md:w-auto rounded-xl bg-emerald-600 px-8 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md disabled:pointer-events-none disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Hours'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function HoursPage() {
  return (
    <div className="max-w-3xl space-y-8">
      <div className="text-center md:text-left">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Operating Hours</h1>
        <p className="mt-4 text-sm font-medium text-emerald-600 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
          🚧 This feature is temporarily skipped during development. Your restaurant is currently set to be always open. We will implement this later!
        </p>
      </div>
      {/* <HoursContent /> */}
    </div>
  );
}

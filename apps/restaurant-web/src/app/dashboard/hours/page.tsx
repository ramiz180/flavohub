'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import AuthGuard from '@/components/auth-guard';
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
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Operating Hours</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Set your opening and closing times for each day of the week.
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="rounded bg-white p-6 shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="pb-3 pr-4 w-28">Day</th>
                <th className="pb-3 pr-4">Open Time</th>
                <th className="pb-3 pr-4">Close Time</th>
                <th className="pb-3 text-center">Closed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((entry) => (
                <tr key={entry.dayOfWeek} className={entry.isClosed ? 'opacity-50' : ''}>
                  <td className="py-3 pr-4 font-medium text-gray-800">{DAYS[entry.dayOfWeek]}</td>
                  <td className="py-3 pr-4">
                    <input
                      type="time"
                      required={!entry.isClosed}
                      disabled={entry.isClosed}
                      value={entry.openTime}
                      onChange={(e) => updateEntry(entry.dayOfWeek, { openTime: e.target.value })}
                      className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-50"
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <input
                      type="time"
                      required={!entry.isClosed}
                      disabled={entry.isClosed}
                      value={entry.closeTime}
                      onChange={(e) => updateEntry(entry.dayOfWeek, { closeTime: e.target.value })}
                      className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-50"
                    />
                  </td>
                  <td className="py-3 text-center">
                    <input
                      type="checkbox"
                      checked={entry.isClosed}
                      onChange={(e) => updateEntry(entry.dayOfWeek, { isClosed: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {saveError && <p className="mt-4 text-sm text-red-600">{saveError}</p>}
        {saveSuccess && <p className="mt-4 text-sm text-emerald-600">Hours saved successfully.</p>}

        <div className="mt-6">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
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
    <AuthGuard>
      <HoursContent />
    </AuthGuard>
  );
}

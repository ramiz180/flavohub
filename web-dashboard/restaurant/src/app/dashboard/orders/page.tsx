'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { useRestaurantSocket } from '@/lib/use-restaurant-socket';
import type { Order } from '@/types/order';

// ── Helpers ─────────────────────────────────────────────────────────────────

const INCOMING = ['PLACED'];
const ACTIVE = ['ACCEPTED', 'PREPARING', 'READY'];
const HISTORY = ['REJECTED', 'DELIVERED', 'CANCELLED'];

function fmt(ts: string | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function StatusBadge({ status }: { status: string }) {
  const color: Record<string, string> = {
    PLACED: 'bg-yellow-100 text-yellow-800',
    ACCEPTED: 'bg-blue-100 text-blue-800',
    PREPARING: 'bg-orange-100 text-orange-800',
    READY: 'bg-emerald-100 text-emerald-800',
    DELIVERED: 'bg-gray-100 text-gray-600',
    REJECTED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
  };
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-semibold ${color[status] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {status}
    </span>
  );
}

// ── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({
  order,
  onAction,
}: {
  order: Order;
  onAction: (id: string, action: string, reason?: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  async function doAction(action: string, reason?: string) {
    setBusy(true);
    setError('');
    try {
      await onAction(order.id, action, reason);
      setRejectOpen(false);
      setRejectReason('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  const itemsSummary = order.items.map((i) => `${i.name} ×${i.quantity}`).join(', ');
  const total = order.total ? `₹${order.total}` : null;
  const delivery = order.deliveries?.[0]; // Get the latest delivery

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 md:p-6 shadow-sm ring-1 ring-slate-100/50">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <span className="font-mono text-sm font-bold text-slate-800">{order.orderNumber}</span>
          {total && <span className="ml-2 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">{total}</span>}
        </div>
        <StatusBadge status={order.status} />
      </div>

      <p className="mt-3 text-sm text-slate-600">{itemsSummary || 'No items'}</p>

      {order.specialInstructions && (
        <p className="mt-2 rounded-xl bg-slate-50 p-3 text-xs italic text-slate-600">"{order.specialInstructions}"</p>
      )}

      {delivery && (
        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-bold text-emerald-800">
            <span>Delivery: {delivery.partner}</span>
            <span className="inline-block rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] uppercase tracking-wider">{delivery.status}</span>
          </div>
          <div className="mt-2 text-sm text-slate-700">
            {delivery.riderName ? `Rider: ${delivery.riderName} (${delivery.riderPhone})` : 'Assigning rider...'}
          </div>
          {(delivery.awbNumber || delivery.trackingId) && (
            <div className="mt-1 text-xs text-slate-500 font-mono">
              {delivery.awbNumber && `AWB: ${delivery.awbNumber} `}
              {delivery.trackingId && `TRK: ${delivery.trackingId}`}
            </div>
          )}
          {delivery.eta && (
            <div className="mt-1 text-xs font-medium text-emerald-700">
              ETA: {fmt(delivery.eta)}
            </div>
          )}
          {delivery.trackingUrl && (
            <a href={delivery.trackingUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block font-semibold text-xs text-emerald-600 hover:text-emerald-700 hover:underline">
              Track Order →
            </a>
          )}
        </div>
      )}

      {/* History timestamps */}
      {HISTORY.includes(order.status) && (
        <div className="mt-2 text-xs text-gray-400 space-y-0.5">
          <div>Placed: {fmt(order.placedAt)}</div>
          {order.rejectionReason && (
            <div className="text-red-500">Reason: {order.rejectionReason}</div>
          )}
          {order.deliveredAt && <div>Delivered: {fmt(order.deliveredAt)}</div>}
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-3">
        {order.status === 'PLACED' && (
          <>
            <button
              onClick={() => void doAction('accept')}
              disabled={busy}
              className="w-full sm:w-auto flex-1 sm:flex-none rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md disabled:pointer-events-none disabled:opacity-50"
            >
              Accept
            </button>
            <button
              onClick={() => {
                setRejectOpen((o) => !o);
                setError('');
              }}
              disabled={busy}
              className="w-full sm:w-auto flex-1 sm:flex-none rounded-xl border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-600 transition-all hover:bg-red-50 disabled:pointer-events-none disabled:opacity-50"
            >
              Reject
            </button>
          </>
        )}
        {order.status === 'ACCEPTED' && (
          <button
            onClick={() => void doAction('start-preparing')}
            disabled={busy}
            className="w-full sm:w-auto flex-1 sm:flex-none rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-md disabled:pointer-events-none disabled:opacity-50"
          >
            Start Preparing
          </button>
        )}
        {order.status === 'PREPARING' && (
          <button
            onClick={() => void doAction('ready')}
            disabled={busy}
            className="w-full sm:w-auto flex-1 sm:flex-none rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md disabled:pointer-events-none disabled:opacity-50"
          >
            Mark Ready
          </button>
        )}
        {order.status === 'READY' && (
          <button
            onClick={() => void doAction('delivered')}
            disabled={busy}
            className="w-full sm:w-auto flex-1 sm:flex-none rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md disabled:pointer-events-none disabled:opacity-50"
          >
            Mark Delivered
          </button>
        )}
      </div>

      {/* Inline reject form */}
      {rejectOpen && (
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Rejection reason…"
            className="w-full sm:flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={() => void doAction('reject', rejectReason.trim())}
              disabled={busy || !rejectReason.trim()}
              className="w-full sm:w-auto flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-red-700 disabled:pointer-events-none disabled:opacity-50"
            >
              Confirm
            </button>
            <button
              onClick={() => {
                setRejectOpen(false);
                setRejectReason('');
              }}
              className="w-full sm:w-auto flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-3 rounded-xl bg-red-50 p-2 text-center text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}

// ── Section ──────────────────────────────────────────────────────────────────

function Section({
  title,
  orders,
  onAction,
  emptyText,
}: {
  title: string;
  orders: Order[];
  onAction: (id: string, action: string, reason?: string) => Promise<void>;
  emptyText: string;
}) {
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-gray-700">
        {title}
        {orders.length > 0 && (
          <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-normal text-gray-600">
            {orders.length}
          </span>
        )}
      </h2>
      {orders.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-gray-400">
          {emptyText}
        </p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <OrderCard key={o.id} order={o} onAction={onAction} />
          ))}
        </div>
      )}
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const { accessToken } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const upsertOrder = useCallback((updated: Order) => {
    setOrders((prev) => {
      const idx = prev.findIndex((o) => o.id === updated.id);
      if (idx === -1) return [updated, ...prev];
      const next = [...prev];
      next[idx] = updated;
      return next;
    });
  }, []);

  const loadOrders = useCallback(async () => {
    if (!accessToken) return;
    setFetchError('');
    try {
      const data = await apiClient.orders.list(accessToken, { pageSize: 100 });
      setOrders(data);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useRestaurantSocket(accessToken, upsertOrder);

  async function handleAction(id: string, action: string, reason?: string): Promise<void> {
    if (!accessToken) return;
    let updated: Order;
    switch (action) {
      case 'accept':
        updated = await apiClient.orders.accept(accessToken, id);
        break;
      case 'reject':
        updated = await apiClient.orders.reject(accessToken, id, reason ?? '');
        break;
      case 'start-preparing':
        updated = await apiClient.orders.startPreparing(accessToken, id);
        break;
      case 'ready':
        updated = await apiClient.orders.markReady(accessToken, id);
        break;
      case 'delivered':
        updated = await apiClient.orders.markDelivered(accessToken, id);
        break;
      default:
        return;
    }
    upsertOrder(updated);
  }

  const incoming = orders.filter((o) => INCOMING.includes(o.status));
  const active = orders.filter((o) => ACTIVE.includes(o.status));
  const history = orders.filter((o) => HISTORY.includes(o.status)).slice(0, 20);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Orders</h2>
        <button
          onClick={() => void loadOrders()}
          className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
        >
          Refresh
        </button>
      </div>

      {fetchError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{fetchError}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
            <p className="text-sm text-slate-400">Loading orders…</p>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          <Section
            title="Incoming"
            orders={incoming}
            onAction={handleAction}
            emptyText="No new orders"
          />
          <Section
            title="Active"
            orders={active}
            onAction={handleAction}
            emptyText="No orders in progress"
          />
          <Section
            title="History (last 20)"
            orders={history}
            onAction={handleAction}
            emptyText="No completed or rejected orders"
          />
        </div>
      )}
    </div>
  );
}

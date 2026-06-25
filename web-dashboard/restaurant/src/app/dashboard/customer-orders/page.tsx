'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import type { CustomerOrder } from '@/types/customer-order';

const BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

const INCOMING_STATUSES = ['PLACED'];
const ACTIVE_STATUSES = ['ACCEPTED', 'PREPARING', 'READY', 'RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'];
const HISTORY_STATUSES = ['DELIVERED', 'REJECTED', 'CANCELLED'];

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // AudioContext not available
  }
}

function timeAgo(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function StatusBadge({ status }: { status: string }) {
  const color: Record<string, string> = {
    PLACED: 'bg-yellow-100 text-yellow-800',
    ACCEPTED: 'bg-blue-100 text-blue-800',
    PREPARING: 'bg-orange-100 text-orange-800',
    READY: 'bg-emerald-100 text-emerald-800',
    OUT_FOR_DELIVERY: 'bg-purple-100 text-purple-800',
    RIDER_ASSIGNED: 'bg-indigo-100 text-indigo-800',
    PICKED_UP: 'bg-teal-100 text-teal-800',
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

function CustomerOrderCard({
  order,
  onAction,
  isNew,
}: {
  order: CustomerOrder;
  onAction: (id: string, action: string) => Promise<void>;
  isNew?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function doAction(action: string) {
    setBusy(true);
    setError('');
    try {
      await onAction(order.id, action);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  const customerName = order.customer?.name ?? 'Customer';
  const itemsSummary = order.items.map((i) => `${i.name} ×${i.quantity}`).join(', ');

  return (
    <div
      className={`rounded-lg border bg-white p-4 shadow-sm transition-all ${isNew ? 'animate-fade-in border-emerald-300' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-semibold text-gray-800">{customerName}</span>
          <span className="ml-2 font-mono text-xs text-gray-500">{order.id.slice(0, 8)}…</span>
          {order.customer?.phone && (
            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              📞 {order.customer.phone}
            </div>
          )}
          {order.deliveryAddress && (
            <div className="text-xs text-gray-500 mt-0.5 flex items-start gap-1">
              📍 <span className="truncate max-w-xs">{
                typeof order.deliveryAddress === 'string' 
                  ? order.deliveryAddress 
                  : (order.deliveryAddress as any)?.addressLine || JSON.stringify(order.deliveryAddress)
              }</span>
            </div>
          )}
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Order Details */}
        <div>
          <p className="text-sm text-gray-600">{itemsSummary || 'No items'}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
            <span className={`font-semibold px-2 py-0.5 rounded-sm ${order.paymentMethod === 'COD' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
              {order.paymentMethod || 'ONLINE'}
            </span>
            <span className={order.paymentStatus === 'PAID' ? 'text-emerald-600 font-medium' : 'text-gray-500'}>
              {order.paymentStatus || 'PENDING'}
            </span>
            <span>{timeAgo(order.createdAt)}</span>
          </div>
          {order.note && <p className="mt-2 text-xs italic text-gray-500 bg-gray-50 p-2 rounded">"{order.note}"</p>}
        </div>

        {/* Financial Breakdown */}
        <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 text-xs">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span>
            <span>₹{(parseFloat(order.totalAmount) - parseFloat(order.taxAmount || '0') - parseFloat(order.deliveryCharges || '0')).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-500 mt-1">
            <span>Taxes</span>
            <span>₹{parseFloat(order.taxAmount || '0').toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-500 mt-1">
            <span>Platform Fee</span>
            <span className="text-red-500">-₹{parseFloat(order.platformFee || '0').toFixed(2)}</span>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between font-semibold text-gray-800">
            <span>Net Earnings</span>
            <span className="text-emerald-600">₹{parseFloat(order.netEarnings || '0').toFixed(2)}</span>
          </div>
        </div>
      </div>

      {order.deliveries && order.deliveries[0] && (
        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-emerald-100/50 pb-3 mb-3">
            <div className="flex items-center gap-3">
              <span className="bg-emerald-600 text-white px-2 py-1 rounded-md text-xs font-bold tracking-wider shadow-sm">
                SHADOWFAX
              </span>
              <span className="text-[11px] font-medium uppercase tracking-wider bg-emerald-200/50 text-emerald-800 px-2.5 py-1 rounded-full">
                {order.deliveries[0].status}
              </span>
            </div>
            {order.deliveries[0].trackingUrl && (
              <a href={order.deliveries[0].trackingUrl} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm transition-all flex items-center gap-2">
                Track Live Map 📍
              </a>
            )}
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-emerald-900/60 text-xs mb-1">Rider Name</p>
              <p className="font-medium text-emerald-900">{order.deliveries[0].riderName || 'Assigning...'}</p>
            </div>
            <div>
              <p className="text-emerald-900/60 text-xs mb-1">Rider Phone</p>
              <p className="font-medium text-emerald-900">{order.deliveries[0].riderPhone || '---'}</p>
            </div>
            <div>
              <p className="text-emerald-900/60 text-xs mb-1">Vehicle</p>
              <p className="font-medium text-emerald-900">{order.deliveries[0].riderVehicle || '---'}</p>
            </div>
            <div>
              <p className="text-emerald-900/60 text-xs mb-1">Tracking ID</p>
              <p className="font-mono font-medium text-emerald-900 truncate" title={order.deliveries[0].shipmentId || ''}>
                {order.deliveries[0].shipmentId || '---'}
              </p>
            </div>
          </div>
          
          {order.deliveries[0].eta && (
            <div className="mt-3 pt-3 border-t border-emerald-100/50 flex items-center gap-2 text-emerald-800 text-xs font-medium">
              ⏱️ ETA: {new Date(order.deliveries[0].eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {order.status === 'PLACED' && (
          <>
            <button
              onClick={() => void doAction('accept')}
              disabled={busy}
              className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
            >
              Accept Order
            </button>
            <button
              onClick={() => void doAction('reject')}
              disabled={busy}
              className="rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Reject
            </button>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to cancel this order?')) {
                  void doAction('cancel');
                }
              }}
              disabled={busy}
              className="rounded text-gray-500 hover:text-red-600 hover:underline px-2 py-1.5 text-sm font-medium ml-auto"
            >
              Cancel Order
            </button>
          </>
        )}
        {order.status === 'ACCEPTED' && (
          <button
            onClick={() => void doAction('preparing')}
            disabled={busy}
            className="rounded bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
          >
            Start Preparing
          </button>
        )}
        {order.status === 'PREPARING' && (
          <button
            onClick={() => void doAction('ready')}
            disabled={busy}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Mark Ready
          </button>
        )}
        {order.status === 'READY' && (
          <span className="text-sm font-medium text-blue-600 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Waiting for Rider
          </span>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function Section({
  title,
  orders,
  onAction,
  emptyText,
  newIds,
  readonly,
}: {
  title: string;
  orders: CustomerOrder[];
  onAction: (id: string, action: string) => Promise<void>;
  emptyText: string;
  newIds?: Set<string>;
  readonly?: boolean;
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
          {orders.map((o) =>
            readonly ? (
              <div key={o.id} className="rounded-lg border bg-white p-4 shadow-sm opacity-75">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-semibold text-gray-700">
                      {o.customer?.name ?? 'Customer'}
                    </span>
                    <span className="ml-2 font-mono text-xs text-gray-400">
                      {o.id.slice(0, 8)}…
                    </span>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {o.items.map((i) => `${i.name} ×${i.quantity}`).join(', ') || 'No items'}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  ₹{parseFloat(o.totalAmount).toFixed(2)} · {new Date(o.createdAt).toLocaleString()}
                </p>
              </div>
            ) : (
              <CustomerOrderCard
                key={o.id}
                order={o}
                onAction={onAction}
                isNew={newIds?.has(o.id)}
              />
            ),
          )}
        </div>
      )}
    </section>
  );
}

export default function CustomerOrdersPage() {
  const { accessToken } = useAuth();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const socketRef = useRef<Socket | null>(null);

  const upsertOrder = useCallback((updated: CustomerOrder) => {
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
      const data = await apiClient.customerOrders.list(accessToken, { pageSize: 100 });
      setOrders(data.orders);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        void Notification.requestPermission();
      }
    }
  }, []);

  // Socket.IO connection
  useEffect(() => {
    if (!accessToken) return;

    const socket: Socket = io(BASE_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on(
      'customer-order:new',
      (payload: {
        orderId: string;
        status: string;
        createdAt: string;
        itemCount: number;
        totalAmount: string;
      }) => {
        beep();
        if (
          typeof window !== 'undefined' &&
          'Notification' in window &&
          Notification.permission === 'granted'
        ) {
          void new Notification('New Order!', {
            body: `New order received · ₹${parseFloat(payload.totalAmount).toFixed(2)} · ${payload.itemCount} item(s)`,
          });
        }
        // Reload to get full order details
        void loadOrders();
        setNewIds((prev) => new Set([...prev, payload.orderId]));
        setTimeout(() => {
          setNewIds((prev) => {
            const next = new Set(prev);
            next.delete(payload.orderId);
            return next;
          });
        }, 5000);
      },
    );

    socket.on(
      'customer-order:updated',
      (payload: { orderId: string; status: string; updatedAt: string }) => {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === payload.orderId
              ? { ...o, status: payload.status, updatedAt: payload.updatedAt }
              : o,
          ),
        );
      },
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, loadOrders]);

  async function handleAction(id: string, action: string): Promise<void> {
    if (!accessToken) return;
    let updated: CustomerOrder;
    switch (action) {
      case 'accept':
        updated = await apiClient.customerOrders.accept(accessToken, id);
        break;
      case 'reject':
        updated = await apiClient.customerOrders.reject(accessToken, id);
        break;
      case 'preparing':
        updated = await apiClient.customerOrders.preparing(accessToken, id);
        break;
      case 'cancel':
        updated = await apiClient.customerOrders.cancel(accessToken, id);
        break;
      case 'ready':
        updated = await apiClient.customerOrders.ready(accessToken, id);
        break;
      case 'delivered':
        updated = await apiClient.customerOrders.delivered(accessToken, id);
        break;
      default:
        return;
    }
    upsertOrder(updated);
  }

  const incoming = orders.filter((o) => INCOMING_STATUSES.includes(o.status));
  const active = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const history = orders.filter((o) => HISTORY_STATUSES.includes(o.status)).slice(0, 20);

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
      `}</style>

      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Customer Orders</h1>
          <button
            onClick={() => void loadOrders()}
            className="text-sm text-emerald-700 hover:underline"
          >
            Refresh
          </button>
        </div>

        {fetchError && (
          <div className="flex items-center gap-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
            <span>{fetchError}</span>
            <button
              onClick={() => void loadOrders()}
              className="rounded border border-red-300 px-2 py-0.5 text-xs hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-10">
            <Section
              title="Incoming"
              orders={incoming}
              onAction={handleAction}
              emptyText="No new orders"
              newIds={newIds}
            />
            <Section
              title="Active"
              orders={active}
              onAction={handleAction}
              emptyText="No orders in progress"
            />
            <details>
              <summary className="mb-3 cursor-pointer text-base font-semibold text-gray-700 select-none">
                History (last 20)
                {history.length > 0 && (
                  <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-normal text-gray-600">
                    {history.length}
                  </span>
                )}
              </summary>
              <Section
                title=""
                orders={history}
                onAction={handleAction}
                emptyText="No completed or rejected orders"
                readonly
              />
            </details>
          </div>
        )}
      </div>
    </>
  );
}

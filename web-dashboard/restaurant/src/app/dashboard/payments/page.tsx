'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import type { CustomerOrder } from '@/types/customer-order';

const BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

export default function PaymentsPage() {
  const { accessToken } = useAuth();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  const loadOrders = useCallback(async () => {
    if (!accessToken) return;
    try {
      // For now, load customer orders and aggregate them
      // In a real app, you'd have a specialized /payments endpoint
      const data = await apiClient.customerOrders.list(accessToken, { pageSize: 500 });
      setOrders(data.orders);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  // Listen for real-time payment status updates (e.g., COD marked RECEIVED on delivery)
  useEffect(() => {
    if (!accessToken) return;

    const socket: Socket = io(BASE_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on(
      'payment:status_updated',
      (payload: { orderId: string; paymentStatus: string; paymentMethod: string }) => {
        setOrders(prev =>
          prev.map(o =>
            o.id === payload.orderId ? { ...o, paymentStatus: payload.paymentStatus } : o
          )
        );
      }
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  // Aggregate stats
  let totalOnlineAmount = 0;
  let totalCodAmount = 0;
  let totalNetEarnings = 0;
  let totalDeliveryCharges = 0;
  let onlineCount = 0;
  let codCount = 0;

  orders.forEach(o => {
    if (['DELIVERED', 'ACCEPTED', 'READY', 'RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(o.status)) {
      const net = parseFloat(o.netEarnings || '0');
      const total = parseFloat(o.totalAmount || '0');
      const delivery = parseFloat(o.deliveryCharges || '0');
      
      totalNetEarnings += net;
      totalDeliveryCharges += delivery;

      if (o.paymentMethod === 'COD') {
        totalCodAmount += total;
        codCount++;
      } else {
        totalOnlineAmount += total;
        onlineCount++;
      }
    }
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payments & Ledger</h1>
          <p className="text-sm text-slate-500 mt-1">Track your earnings and settlements.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-3xl border border-emerald-100 bg-gradient-to-b from-emerald-50 to-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-emerald-800 uppercase tracking-wider">Net Earnings</p>
          <p className="mt-2 text-3xl font-black text-emerald-600">₹{totalNetEarnings.toFixed(2)}</p>
          <p className="mt-1 text-xs font-medium text-emerald-700">After Platform Fees & Taxes</p>
        </div>

        <div className="rounded-3xl border border-indigo-100 bg-gradient-to-b from-indigo-50 to-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-indigo-800 uppercase tracking-wider">Online Revenue</p>
          <p className="mt-2 text-3xl font-black text-indigo-600">₹{totalOnlineAmount.toFixed(2)}</p>
          <p className="mt-1 text-xs font-medium text-indigo-700">{onlineCount} Orders Paid Online</p>
        </div>

        <div className="rounded-3xl border border-amber-100 bg-gradient-to-b from-amber-50 to-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-amber-800 uppercase tracking-wider">COD Collected</p>
          <p className="mt-2 text-3xl font-black text-amber-600">₹{totalCodAmount.toFixed(2)}</p>
          <p className="mt-1 text-xs font-medium text-amber-700">{codCount} Orders via COD</p>
        </div>

        <div className="rounded-3xl border border-blue-100 bg-gradient-to-b from-blue-50 to-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-blue-800 uppercase tracking-wider">Delivery Charges</p>
          <p className="mt-2 text-3xl font-black text-blue-600">₹{totalDeliveryCharges.toFixed(2)}</p>
          <p className="mt-1 text-xs font-medium text-blue-700">Collected from Customer</p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden ring-1 ring-slate-100/50">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-800">Recent Transactions</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {orders.filter(o => o.status !== 'PLACED' && o.status !== 'CANCELLED').slice(0, 20).map(order => (
            <div key={order.id} className="p-4 sm:p-6 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold shadow-sm ${order.paymentMethod === 'COD' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                  {order.paymentMethod === 'COD' ? 'COD' : 'ONL'}
                </div>
                <div>
                  <p className="font-bold text-slate-800">{order.customer?.name || 'Guest'}</p>
                  <p className="text-xs font-medium text-slate-500 font-mono mt-0.5">Order ID: {order.id.slice(0,8)}</p>
                  <p className="text-xs text-slate-500 mt-1">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex flex-col sm:items-end bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                <p className="text-sm font-medium text-slate-500 line-through decoration-slate-300">Gross: ₹{parseFloat(order.totalAmount).toFixed(2)}</p>
                <p className="text-lg font-black text-emerald-600">Net: +₹{parseFloat(order.netEarnings || '0').toFixed(2)}</p>
                
                {order.paymentMethod === 'ONLINE' ? (
                  <span className="mt-1 inline-block rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold tracking-wider text-indigo-700 uppercase">
                    Settled T+2
                  </span>
                ) : (
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${order.paymentStatus === 'RECEIVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {order.paymentStatus === 'RECEIVED' ? 'COD RECEIVED' : 'COD PENDING'}
                  </span>
                )}
              </div>
            </div>
          ))}
          {orders.length === 0 && (
            <div className="p-10 text-center text-slate-400 font-medium">No transactions found.</div>
          )}
        </div>
      </div>
    </div>
  );
}

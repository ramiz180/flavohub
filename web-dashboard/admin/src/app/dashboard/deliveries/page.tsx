'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { motion } from 'framer-motion';
import { 
  Package, Truck, CheckCircle2, XCircle, 
  IndianRupee, CreditCard, Banknote, Search, 
  MapPin, Clock, Navigation
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function AdminDeliveriesPage() {
  const { accessToken } = useAuth();
  const [data, setData] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!accessToken) return;
      try {
        const [ordersRes, analyticsRes] = await Promise.all([
          fetch(process.env.NEXT_PUBLIC_API_URL + '/admin/deliveries?page=1&pageSize=50', {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
          fetch(process.env.NEXT_PUBLIC_API_URL + '/admin/deliveries/analytics', {
            headers: { Authorization: `Bearer ${accessToken}` },
          })
        ]);
        
        if (!ordersRes.ok || !analyticsRes.ok) throw new Error('Failed to load data');
        
        const ordersJson = await ordersRes.json();
        const analyticsJson = await analyticsRes.json();
        
        setData(ordersJson.data || ordersJson);
        setAnalytics(analyticsJson.data || analyticsJson);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [accessToken]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-100 border-t-brand-primary" />
          <p className="text-sm font-medium text-slate-500">Loading delivery logistics...</p>
        </div>
      </div>
    );
  }

  if (!data || !analytics) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center text-red-600">
        <XCircle className="mx-auto mb-3 h-8 w-8 text-red-500" />
        <h3 className="font-semibold">Failed to load data</h3>
        <p className="text-sm opacity-80 mt-1">Please try refreshing the page.</p>
      </div>
    );
  }

  const deliveries = data.deliveries || [];
  const filteredDeliveries = deliveries.filter((d: any) => {
    if (!search) return true;
    const term = search.toLowerCase();
    const o = d.customerOrder;
    return o?.id?.toLowerCase().includes(term) || 
           o?.restaurant?.name?.toLowerCase().includes(term) ||
           o?.customer?.name?.toLowerCase().includes(term) ||
           d.shipmentId?.toLowerCase().includes(term);
  });

  const getOrderStatusColor = (status: string) => {
    switch(status) {
      case 'DELIVERED': return 'bg-emerald-100 text-emerald-700 ring-emerald-200';
      case 'CANCELLED': return 'bg-red-100 text-red-700 ring-red-200';
      case 'IN_TRANSIT':
      case 'OUT_FOR_DELIVERY': return 'bg-blue-100 text-blue-700 ring-blue-200';
      case 'PREPARING': return 'bg-amber-100 text-amber-700 ring-amber-200';
      default: return 'bg-slate-100 text-slate-700 ring-slate-200';
    }
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-brand-secondary">Delivery Logistics</h2>
          <p className="mt-1 text-sm text-slate-500">Monitor platform deliveries, Shadowfax tracking, and order financials.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Order ID, Restaurant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-[300px] rounded-xl border-0 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-brand-primary transition-all"
          />
        </div>
      </div>
      
      {/* Analytics Grid */}
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <motion.div variants={itemVariants} className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-premium ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-500">Total Orders</p>
              <p className="text-3xl font-bold text-slate-900">{analytics.totalDeliveries}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
              <Package className="h-6 w-6" />
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-premium ring-1 ring-emerald-100 border-b-4 border-b-emerald-500">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-emerald-600">Delivered</p>
              <p className="text-3xl font-bold text-emerald-700">{analytics.delivered}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-premium ring-1 ring-blue-100 border-b-4 border-b-blue-500">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-blue-600">Active Deliveries</p>
              <p className="text-3xl font-bold text-blue-700">{analytics.activeDeliveries}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
              <Truck className="h-6 w-6" />
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-premium ring-1 ring-red-100 border-b-4 border-b-red-500">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-red-600">Cancelled / Failed</p>
              <p className="text-3xl font-bold text-red-700">{analytics.failedDeliveries}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-500">
              <XCircle className="h-6 w-6" />
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Financials Row */}
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <motion.div variants={itemVariants} className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <IndianRupee className="h-5 w-5 text-indigo-500" />
            <p className="text-sm font-semibold text-indigo-700 uppercase tracking-wider">Platform Commission</p>
          </div>
          <p className="text-3xl font-black text-indigo-900 tracking-tight">₹{parseFloat(analytics.platformCommission || '0').toFixed(2)}</p>
          <p className="text-xs text-indigo-600 mt-2 font-medium bg-indigo-100/50 inline-block px-2 py-1 rounded">Net revenue collected</p>
        </motion.div>

        <motion.div variants={itemVariants} className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Navigation className="h-5 w-5 text-amber-500" />
            <p className="text-sm font-semibold text-amber-700 uppercase tracking-wider">Delivery Charges</p>
          </div>
          <p className="text-3xl font-black text-amber-900 tracking-tight">₹{parseFloat(analytics.totalDeliveryCharges || '0').toFixed(2)}</p>
          <p className="text-xs text-amber-700 mt-2 font-medium bg-amber-100/50 inline-block px-2 py-1 rounded">Passed to Shadowfax</p>
        </motion.div>

        <motion.div variants={itemVariants} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col justify-between">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Payment Mix</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium text-slate-700">Online Paid</span>
              </div>
              <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{analytics.onlineOrders}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium text-slate-700">Cash on Delivery</span>
              </div>
              <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">{analytics.codOrders}</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
      
      {/* Orders Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-premium ring-1 ring-slate-100">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Recent Deliveries</h3>
          <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">{filteredDeliveries.length} orders found</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Order & Info</th>
                <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Payment</th>
                <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Financials (₹)</th>
                <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Order Status</th>
                <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Shadowfax Logistics</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDeliveries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                    <Package className="mx-auto h-8 w-8 text-slate-300 mb-3" />
                    <p className="font-medium">No deliveries found</p>
                  </td>
                </tr>
              ) : (
                filteredDeliveries.map((delivery: any, i: number) => {
                  const o = delivery.customerOrder;
                  if (!o) return null;
                  
                  return (
                    <motion.tr 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      key={delivery.id} 
                      className="transition-colors hover:bg-slate-50/50 group"
                    >
                      {/* Order & Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-brand-primary/10 group-hover:text-brand-primary transition-colors">
                            <Package className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-mono text-xs font-bold text-slate-900 group-hover:text-brand-primary transition-colors">{o.id.slice(0, 12).toUpperCase()}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-700">{o.restaurant?.name}</p>
                            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate max-w-[150px]">{o.customer?.name || 'Guest Customer'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Payment */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2 items-start">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider ${o.paymentMethod === 'COD' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                            {o.paymentMethod === 'COD' ? <Banknote className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
                            {o.paymentMethod || 'ONL'}
                          </span>
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${o.paymentStatus === 'PAID' || o.paymentStatus === 'RECEIVED' ? 'bg-slate-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {o.paymentStatus || 'PENDING'}
                          </span>
                        </div>
                      </td>

                      {/* Financials */}
                      <td className="px-6 py-4">
                        <div className="w-32 text-xs space-y-1.5 bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                          <div className="flex justify-between text-slate-500"><span>Total:</span> <span className="font-semibold text-slate-700">₹{parseFloat(o.totalAmount).toFixed(2)}</span></div>
                          <div className="flex justify-between text-slate-500"><span>Del. Fee:</span> <span>₹{parseFloat(o.deliveryCharges).toFixed(2)}</span></div>
                          <div className="flex justify-between text-slate-500"><span>Comm:</span> <span>₹{parseFloat(o.platformFee).toFixed(2)}</span></div>
                          <div className="flex justify-between text-emerald-600 font-bold pt-1.5 mt-1.5 border-t border-slate-200 border-dashed">
                            <span>Net:</span> <span>₹{parseFloat(o.netEarnings).toFixed(2)}</span>
                          </div>
                        </div>
                      </td>

                      {/* Order Status */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-start gap-2">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide ring-1 ring-inset ${getOrderStatusColor(o.status)}`}>
                            {o.status.replace(/_/g, ' ')}
                          </span>
                          <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                            <Clock className="h-3 w-3" />
                            {new Date(o.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </div>
                        </div>
                      </td>

                      {/* Logistics Info */}
                      <td className="px-6 py-4">
                        <div className="relative overflow-hidden rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 min-w-[200px]">
                          <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                            <Truck className="h-16 w-16" />
                          </div>
                          
                          <div className="relative z-10 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold tracking-widest text-indigo-800 bg-indigo-100 px-1.5 rounded">SHADOWFAX</span>
                              <span className="text-[10px] font-bold text-indigo-600 uppercase bg-white px-2 py-0.5 rounded shadow-sm">
                                {delivery.status}
                              </span>
                            </div>
                            
                            <div className="flex flex-col gap-0.5">
                              <span className="font-mono text-[11px] text-indigo-700/70">ID: {delivery.shipmentId || 'Awaiting SFX...'}</span>
                              {delivery.awbNumber && (
                                <span className="font-mono text-[11px] text-indigo-700/70">AWB: {delivery.awbNumber}</span>
                              )}
                              {delivery.trackingId && (
                                <span className="font-mono text-[11px] text-indigo-700/70">TRK: {delivery.trackingId}</span>
                              )}
                              <span className="text-sm font-semibold text-indigo-900 mt-1">
                                {delivery.riderName ? delivery.riderName : 'Assigning Rider...'}
                              </span>
                              {delivery.riderPhone && (
                                <span className="text-xs text-indigo-600/80">{delivery.riderPhone}</span>
                              )}
                            </div>
                            
                            {delivery.eta && (
                              <div className="flex items-center gap-1 text-xs font-semibold text-indigo-700 pt-2 mt-2 border-t border-indigo-100">
                                <Clock className="h-3 w-3" />
                                ETA: {new Date(delivery.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

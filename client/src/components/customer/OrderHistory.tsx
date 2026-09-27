import React, { useState, useEffect } from 'react';
import { Search, Filter, Trash2, Download, ExternalLink, RefreshCw, Ban, CheckCircle2, Clock } from 'lucide-react';
import { Order } from '../../types/index.js';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.js';
import { generateReceiptPdf } from '../../services/receipt.js';
import { SkeletonShimmer } from '../common/SkeletonShimmer.js';
import { EmptyState } from '../common/EmptyState.js';
import { useAuth } from '../../context/AuthContext.js';

interface OrderHistoryProps {
  onSelectOrder: (orderId: string) => void;
}

export const OrderHistory: React.FC<OrderHistoryProps> = ({ onSelectOrder }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const { showToast } = useToast();
  const { refreshUser } = useAuth();

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (search.trim()) params.append('search', search.trim());

      const res = await api.get(`/orders/customer?${params.toString()}`);
      if (res.data.success) {
        setOrders(res.data.orders);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const handleCancel = async (order: Order) => {
    if (!window.confirm(`Cancel Order ${order.orderNumber}? ₹${order.totalAmount.toFixed(2)} will be refunded to your wallet.`)) {
      return;
    }

    try {
      const res = await api.post(`/orders/${order.id}/cancel`);
      if (res.data.success) {
        showToast('success', 'Order Cancelled', res.data.message);
        await refreshUser();
        fetchOrders();
      }
    } catch (err: any) {
      showToast('error', 'Cancellation Failed', err.response?.data?.message || 'Could not cancel order');
    }
  };

  const handleDelete = async (orderId: string) => {
    try {
      const res = await api.delete(`/orders/${orderId}`);
      if (res.data.success) {
        showToast('success', 'Removed', 'Order removed from your history.');
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      }
    } catch (err: any) {
      showToast('error', 'Delete Failed', err.response?.data?.message || 'Could not delete order');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Clear all completed and cancelled orders from your history?')) return;
    try {
      const res = await api.delete('/orders/history/clear-all');
      if (res.data.success) {
        showToast('success', 'History Cleared', res.data.message);
        fetchOrders();
      }
    } catch (err: any) {
      showToast('error', 'Failed', 'Could not clear history');
    }
  };

  return (
    <div className="space-y-5">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Order # or File Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm focus:border-indigo-600 focus:outline-none"
          />
        </form>

        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2.5 pl-3 pr-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold focus:border-indigo-600 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Queue</option>
              <option value="PRINTING">Printing</option>
              <option value="PRINTED">Ready for Pickup</option>
              <option value="COLLECTED">Collected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <button
            type="button"
            onClick={fetchOrders}
            className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Refresh Orders"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {orders.some((o) => o.status === 'COLLECTED' || o.status === 'CANCELLED') && (
            <button
              type="button"
              onClick={handleClearAll}
              className="px-3 py-2.5 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs font-bold transition-colors"
            >
              Clear History
            </button>
          )}
        </div>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="space-y-3">
          <SkeletonShimmer variant="card" count={3} />
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No Orders Found"
          description={search ? `No orders matched '${search}'.` : 'You haven’t placed any print orders yet.'}
          zeroStat="0"
          zeroStatLabel="Orders"
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const isDeletable = order.status === 'COLLECTED' || order.status === 'CANCELLED';
            const isCancellable = order.status === 'PENDING';

            return (
              <div
                key={order.id}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-slate-900 dark:text-white text-base">
                      #{order.orderNumber}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        order.status === 'COLLECTED'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : order.status === 'PRINTED'
                          ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                          : order.status === 'PRINTING'
                          ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 animate-pulse'
                          : order.status === 'CANCELLED'
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    Shop: <strong className="text-slate-700 dark:text-slate-300">{order.shop?.name}</strong> • {order.items.length} {order.items.length === 1 ? 'file' : 'files'}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 pt-3 sm:pt-0">
                  <div className="text-left sm:text-right mr-2">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Paid</span>
                    <span className="text-base font-extrabold font-mono text-indigo-600 dark:text-indigo-400">
                      ₹{order.totalAmount.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onSelectOrder(order.id)}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <span>Track</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => generateReceiptPdf(order)}
                      className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      title="Download PDF Receipt"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    {isCancellable && (
                      <button
                        type="button"
                        onClick={() => handleCancel(order)}
                        className="p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Cancel Order & Auto-Refund"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}

                    {isDeletable && (
                      <button
                        type="button"
                        onClick={() => handleDelete(order.id)}
                        className="p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete from History"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

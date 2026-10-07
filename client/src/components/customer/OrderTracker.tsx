import React, { useState, useEffect } from 'react';
import { CheckCircle2, Clock, Printer, PackageCheck, Download, Ban, ArrowLeft, RefreshCw, FileText, Camera, ExternalLink, X } from 'lucide-react';
import { Order, OrderStatus } from '../../types/index.js';
import { api } from '../../services/api.js';
import { generateReceiptPdf } from '../../services/receipt.js';
import { useToast } from '../../context/ToastContext.js';
import { sseClient } from '../../services/sse.js';
import { useAuth } from '../../context/AuthContext.js';

interface OrderTrackerProps {
  orderId: string;
  onBack?: () => void;
}

export const OrderTracker: React.FC<OrderTrackerProps> = ({ orderId, onBack }) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isViewingProof, setIsViewingProof] = useState(false);
  const { showToast } = useToast();
  const { refreshUser } = useAuth();

  const fetchOrder = async () => {
    try {
      const res = await api.get(`/orders/${orderId}`);
      if (res.data.success) {
        setOrder(res.data.order);
      }
    } catch (err) {
      console.error('Failed to fetch order:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();

    // Subscribe to SSE updates
    const unsubscribe = sseClient.on('order_status_update', (data: any) => {
      if (data.orderId === orderId) {
        showToast('info', 'Order Status Updated', data.message || `Order status: ${data.status}`);
        fetchOrder();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [orderId]);

  const handleMarkCollected = async () => {
    if (!order) return;
    setIsUpdating(true);
    try {
      const res = await api.patch(`/orders/${order.id}/status`, { status: 'COLLECTED' });
      if (res.data.success) {
        setOrder(res.data.order);
        showToast('success', 'Order Completed', 'Thank you! Order marked as collected.');
      }
    } catch (err: any) {
      showToast('error', 'Update Failed', err.response?.data?.message || 'Could not update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    if (!window.confirm(`Are you sure you want to cancel Order ${order.orderNumber}? ₹${order.totalAmount.toFixed(2)} will be refunded to your wallet immediately.`)) {
      return;
    }

    setIsUpdating(true);
    try {
      const res = await api.post(`/orders/${order.id}/cancel`);
      if (res.data.success) {
        showToast('success', 'Order Cancelled', res.data.message);
        await refreshUser();
        fetchOrder();
      }
    } catch (err: any) {
      showToast('error', 'Cancellation Failed', err.response?.data?.message || 'Could not cancel order');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 animate-pulse space-y-4">
        <div className="h-6 w-1/3 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
        <p className="text-slate-500">Order not found.</p>
        {onBack && (
          <button onClick={onBack} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold">
            Back to Dashboard
          </button>
        )}
      </div>
    );
  }

  const steps: { key: OrderStatus; label: string; icon: any; desc: string }[] = [
    { key: 'PENDING', label: 'Queued', icon: Clock, desc: 'Waiting in shop print queue' },
    { key: 'PRINTING', label: 'Printing', icon: Printer, desc: 'Spooling on shop printer' },
    { key: 'PRINTED', label: 'Ready for Pickup', icon: PackageCheck, desc: 'Printed & packed at counter' },
    { key: 'COLLECTED', label: 'Collected', icon: CheckCircle2, desc: 'Picked up by customer' }
  ];

  const statusHierarchy = ['PENDING', 'PRINTING', 'PRINTED', 'COLLECTED'];
  const currentStepIdx = statusHierarchy.indexOf(order.status);
  const isCancelled = order.status === 'CANCELLED';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
      {/* Top Bar with Back and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Order #{order.orderNumber}
              </h2>
              <span
                className={`text-xs font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                  isCancelled
                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                    : order.status === 'COLLECTED'
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                    : order.status === 'PRINTED'
                    ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 animate-pulse'
                    : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                }`}
              >
                {order.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Shop: <strong className="text-slate-700 dark:text-slate-300">{order.shop?.name}</strong> • {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={fetchOrder}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Refresh Status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => generateReceiptPdf(order)}
            className="px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            PDF Receipt
          </button>

          {order.status === 'PRINTED' && (
            <button
              type="button"
              onClick={handleMarkCollected}
              disabled={isUpdating}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Mark as Collected
            </button>
          )}

          {order.status === 'PENDING' && (
            <button
              type="button"
              onClick={handleCancelOrder}
              disabled={isUpdating}
              className="px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Ban className="w-4 h-4" />
              Cancel & Refund
            </button>
          )}
        </div>
      </div>

      {/* 4-Step Progress Lifecycle Bar */}
      {!isCancelled ? (
        <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative">
            {steps.map((step, idx) => {
              const isPastOrCurrent = currentStepIdx >= idx;
              const isCurrent = currentStepIdx === idx;
              const StepIcon = step.icon;

              return (
                <div key={step.key} className="flex flex-col items-center text-center relative z-10">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2 transition-all duration-300 ${
                      isCurrent
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-110 ring-4 ring-indigo-100 dark:ring-indigo-950'
                        : isPastOrCurrent
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    <StepIcon className="w-6 h-6" />
                  </div>
                  <span
                    className={`text-xs font-bold mb-0.5 ${
                      isCurrent
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : isPastOrCurrent
                        ? 'text-slate-800 dark:text-slate-200'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 max-w-[130px]">
                    {step.desc}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-center">
          <Ban className="w-8 h-8 text-rose-600 dark:text-rose-400 mx-auto mb-2" />
          <h3 className="font-bold text-rose-900 dark:text-rose-200 text-base">Order Cancelled</h3>
          <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">
            ₹{order.totalAmount.toFixed(2)} was refunded back to your wallet.
          </p>
        </div>
      )}

      {/* Per-Item Order Breakdown */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Document Items ({order.items.length})
        </h3>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          {order.items.map((item, idx) => (
            <div
              key={item.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {item.originalFileName}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    <span>{item.colorMode === 'COLOR' ? '🎨 Color' : '⬛ B&W'}</span>
                    <span>•</span>
                    <span>
                      {item.duplexMode === 'DUPLEX_SHORT'
                        ? '2-Sided (Short Edge)'
                        : item.duplexMode === 'DUPLEX_LONG' || item.duplexMode === 'DUPLEX'
                        ? '2-Sided (Long Edge)'
                        : '1-Sided'}
                    </span>
                    <span>•</span>
                    <span>{item.paperSize}</span>
                    <span>•</span>
                    <span>{item.calculatedPages} pgs × {item.copies} {item.copies === 1 ? 'copy' : 'copies'}</span>
                    {item.pageSubset && item.pageSubset !== 'ALL' && (
                      <>
                        <span>•</span>
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold">
                          {item.pageSubset === 'ODD' ? 'Odd Pages Only' : 'Even Pages Only'}
                        </span>
                      </>
                    )}
                    {item.pageRange !== 'ALL' && <span>• Range: {item.pageRange}</span>}
                    {item.scaling && item.scaling !== 'FIT' && (
                      <span>• {item.scaling === 'ACTUAL' ? '100% Actual' : 'Shrink'}</span>
                    )}
                    {item.orientation && item.orientation !== 'AUTO' && (
                      <span>• {item.orientation === 'LANDSCAPE' ? 'Landscape' : 'Portrait'}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4">
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    item.status === 'PRINTED'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                      : item.status === 'PRINTING'
                      ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 animate-pulse'
                      : item.status === 'FAILED'
                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {item.status}
                </span>

                <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                  ₹{item.itemPrice.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 text-xs">
        <div className="space-y-1">
          <p className="text-slate-500 dark:text-slate-400">
            Payment Method: <strong className="text-slate-800 dark:text-slate-200 uppercase">{order.paymentMethod}</strong> ({order.paymentStatus})
          </p>
          {order.upiTransactionRef && (
            <p className="text-slate-500 dark:text-slate-400 font-mono">
              UTR / Txn ID: <strong className="text-slate-800 dark:text-slate-200">{order.upiTransactionRef}</strong>
            </p>
          )}
          <p className="text-slate-500 dark:text-slate-400">
            Shop Contact: <strong className="text-slate-800 dark:text-slate-200">{order.shop?.phone}</strong>
          </p>
          {order.paymentScreenshot && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setIsViewingProof(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold hover:bg-purple-100 dark:hover:bg-purple-900 transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>View Uploaded Payment Proof</span>
              </button>
            </div>
          )}
        </div>

        <div className="text-right">
          <span className="text-slate-400 dark:text-slate-500 block text-[11px] uppercase font-bold">Total Paid</span>
          <span className="text-xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400">
            ₹{order.totalAmount.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Payment Proof Modal */}
      {isViewingProof && order.paymentScreenshot && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-purple-600" />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Payment Proof ({order.orderNumber})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsViewingProof(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-950 flex items-center justify-center max-h-[65vh] overflow-auto">
              <img
                src={order.paymentScreenshot}
                alt={`Payment Proof for ${order.orderNumber}`}
                className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-lg border border-slate-800"
              />
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Uploaded during checkout
              </span>
              <a
                href={order.paymentScreenshot}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-xl font-bold transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Original</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

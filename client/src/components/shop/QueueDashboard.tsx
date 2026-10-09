import React, { useState, useEffect } from 'react';
import { Play, Printer, CheckCircle2, User, Phone, Clock, FileText, AlertCircle, RefreshCw, Sparkles, Check, Camera, ExternalLink, X } from 'lucide-react';
import { Order, OrderItem } from '../../types/index.js';
import { api, getApiBaseUrl } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.js';
import { sseClient } from '../../services/sse.js';
import { SkeletonShimmer } from '../common/SkeletonShimmer.js';
import { EmptyState } from '../common/EmptyState.js';

export const QueueDashboard: React.FC = () => {
  const [queueOrders, setQueueOrders] = useState<Order[]>([]);
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [printingItemId, setPrintingItemId] = useState<string | null>(null);
  const [tab, setTab] = useState<'QUEUE' | 'HISTORY'>('QUEUE');
  const [viewingScreenshot, setViewingScreenshot] = useState<{
    url: string;
    orderNumber: string;
    amount: number;
    customerName: string;
    upiRef?: string | null;
  } | null>(null);
  const { showToast } = useToast();

  const fetchQueue = async () => {
    try {
      const res = await api.get('/orders/shop/queue');
      if (res.data.success) {
        setQueueOrders(res.data.queue);
        setHistoryOrders(res.data.history);
      }
    } catch (err) {
      console.error('Failed to fetch print queue:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();

    // Ensure SSE is active
    sseClient.connect();

    // Backup polling every 8s to guarantee live queue sync across cloud & desktop
    const pollInterval = setInterval(() => {
      fetchQueue();
    }, 8000);

    // SSE listeners for live new orders and status changes
    const unsubNewOrder = sseClient.on('new_order', async (data: any) => {
      showToast('info', 'New Print Order Received!', `Order #${data.orderNumber} from ${data.customerName} (₹${data.totalAmount?.toFixed(2) || '0.00'})`);
      
      try {
        const res = await api.get('/orders/shop/queue');
        if (res.data.success) {
          setQueueOrders(res.data.queue);
          setHistoryOrders(res.data.history);

          // Check if native Desktop Auto-Print is active
          if (typeof window !== 'undefined' && window.electronAPI?.getConfig) {
            const cfg = await window.electronAPI.getConfig().catch(() => null);
            if (cfg?.autoPrint) {
              const targetOrder = res.data.queue.find((o: Order) => o.id === data.orderId || o.orderNumber === data.orderNumber);
              if (targetOrder?.items) {
                for (const item of targetOrder.items) {
                  if (item.status === 'PENDING') {
                    handleManualPrint(targetOrder.id, item.id, item.originalFileName);
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        fetchQueue();
      }
    });

    const unsubQueue = sseClient.on('queue_updated', () => {
      fetchQueue();
    });

    return () => {
      clearInterval(pollInterval);
      unsubNewOrder();
      unsubQueue();
    };
  }, []);

  const handleManualPrint = async (orderId: string, itemId: string, itemTitle: string) => {
    setPrintingItemId(itemId);
    try {
      const order = queueOrders.find((o) => o.id === orderId);
      const item = order?.items.find((i) => i.id === itemId);

      const res = await api.post(`/orders/${orderId}/items/${itemId}/print`);

      // If running inside native Electron Desktop App, dispatch directly to physical hardware!
      if (typeof window !== 'undefined' && window.electronAPI?.printJob) {
        const itemResult = res.data?.result || {};
        const baseServer = getApiBaseUrl().replace(/\/api$/, '');
        const targetStoredFile = itemResult.storedFileName || item?.storedFileName;
        const targetFileUrl = targetStoredFile
          ? `${baseServer}/uploads/raw/${targetStoredFile}`
          : itemResult.fileUrl || '';

        await window.electronAPI.printJob({
          orderNumber: res.data?.orderNumber || order?.orderNumber || 'ORD',
          originalFileName: itemTitle || item?.originalFileName || 'document.pdf',
          fileUrl: targetFileUrl,
          copies: itemResult.copies || item?.copies || 1,
          colorMode: itemResult.colorMode || item?.colorMode || 'BW',
          duplexMode: itemResult.duplexMode || item?.duplexMode || 'SINGLE',
          paperSize: itemResult.paperSize || item?.paperSize || 'A4',
          pageRange: itemResult.pageRange || item?.pageRange || 'ALL',
          scaling: itemResult.scaling || item?.scaling || 'fit',
          orientation: itemResult.orientation || item?.orientation || 'portrait'
        }).catch((e) => console.warn('[Desktop Spooler] Physical dispatch:', e));
      }

      if (res.data.success) {
        showToast('success', 'Print Job Completed', `${itemTitle} spooled to ${res.data.result?.printerName || 'Printer'}`);
        fetchQueue();
      }
    } catch (err: any) {
      showToast('error', 'Print Failed', err.response?.data?.message || 'Failed to execute print job');
      fetchQueue();
    } finally {
      setPrintingItemId(null);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const res = await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      if (res.data.success) {
        showToast('success', 'Order Updated', `Order marked as ${newStatus}`);
        fetchQueue();
      }
    } catch (err: any) {
      showToast('error', 'Update Failed', err.response?.data?.message || 'Status change failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Queue Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setTab('QUEUE')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                tab === 'QUEUE'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>FIFO Print Queue</span>
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-950 text-[10px]">
                {queueOrders.length}
              </span>
            </button>

            <button
              onClick={() => setTab('HISTORY')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                tab === 'HISTORY'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Completed / History</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px]">
                {historyOrders.length}
              </span>
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchQueue}
          className="self-end sm:self-auto px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <SkeletonShimmer variant="card" count={3} />
        </div>
      ) : tab === 'QUEUE' ? (
        queueOrders.length === 0 ? (
          <EmptyState
            icon={Printer}
            title="Print Queue is Clear"
            description="No pending print orders in queue. New customer orders will appear here in real-time."
            zeroStat="0"
            zeroStatLabel="Pending Jobs"
          />
        ) : (
          <div className="space-y-4">
            {queueOrders.map((order, orderIdx) => {
              const allItemsPrinted = order.items.every((i) => i.status === 'PRINTED');

              return (
                <div
                  key={order.id}
                  className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200/90 dark:border-slate-800 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-900/60 transition-all space-y-4"
                >
                  {/* Order Header: Order #, Arrival Time, Customer Name & Phone Number */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-mono font-bold text-xs flex items-center justify-center border border-indigo-200 dark:border-indigo-800/60">
                        #{orderIdx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                            {order.orderNumber}
                          </h3>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              order.status === 'PRINTED'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                : order.status === 'PRINTING'
                                ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 animate-pulse'
                                : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          Arrived: {new Date(order.createdAt).toLocaleTimeString()} ({new Date(order.createdAt).toLocaleDateString()})
                        </span>
                      </div>
                    </div>

                    {/* Customer Name & Phone Details (Visible to Shop) */}
                    <div className="flex flex-wrap items-center gap-3 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                        <User className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{order.customer?.name || 'Customer'}</span>
                      </div>
                      <span className="text-slate-300 dark:text-slate-600">|</span>
                      <a
                        href={`tel:${order.customer?.phone}`}
                        className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline font-mono"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{order.customer?.phone || 'No phone'}</span>
                      </a>
                      <span className="text-slate-300 dark:text-slate-600">|</span>
                      <span className="px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold font-mono text-[11px]">
                        {order.paymentMethod === 'SHOP_UPI_QR'
                          ? `UPI QR${order.upiTransactionRef ? ` (${order.upiTransactionRef})` : ''}`
                          : order.paymentMethod}
                      </span>
                      {order.paymentScreenshot && (
                        <button
                          type="button"
                          onClick={() =>
                            setViewingScreenshot({
                              url: order.paymentScreenshot!,
                              orderNumber: order.orderNumber,
                              amount: order.totalAmount,
                              customerName: order.customer?.name || 'Customer',
                              upiRef: order.upiTransactionRef
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-[11px] shadow-sm transition-all"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>View Payment Photo</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Per-Item List with Manual Print Buttons */}
                  <div className="space-y-2.5">
                    {order.items.map((item) => {
                      const isPrinting = printingItemId === item.id;
                      const isPrinted = item.status === 'PRINTED';

                      return (
                        <div
                          key={item.id}
                          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 transition-colors ${
                            isPrinted
                              ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50'
                              : 'bg-slate-100/70 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700/70 shadow-sm'
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0 shadow-sm">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 space-y-1.5">
                              <p className="text-sm font-bold text-slate-900 dark:text-white truncate tracking-tight">
                                {item.originalFileName}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                {/* Color Mode Badge */}
                                <span
                                  className={`px-2 py-0.5 rounded-md font-bold flex items-center gap-1 ${
                                    item.colorMode === 'COLOR'
                                      ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60'
                                      : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600/60'
                                  }`}
                                >
                                  {item.colorMode === 'COLOR' ? '🎨 Color (8002)' : '⬛ B&W (8001)'}
                                </span>

                                {/* Duplex Badge */}
                                <span className="px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 font-semibold border border-slate-300/60 dark:border-slate-600/50">
                                  {item.duplexMode === 'DUPLEX_SHORT'
                                    ? 'Duplex (Short Edge)'
                                    : item.duplexMode === 'DUPLEX_LONG' || item.duplexMode === 'DUPLEX'
                                    ? 'Duplex (Long Edge)'
                                    : '1-Sided'}
                                </span>

                                {/* Paper Size Badge */}
                                <span className="px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 font-semibold border border-slate-300/60 dark:border-slate-600/50 font-mono">
                                  {item.paperSize}
                                </span>

                                {/* Pages & Copies Badge */}
                                <span className="px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 font-semibold border border-slate-300/60 dark:border-slate-600/50 font-mono">
                                  {item.calculatedPages} {item.calculatedPages === 1 ? 'pg' : 'pgs'} × {item.copies} {item.copies === 1 ? 'copy' : 'copies'}
                                </span>

                                {/* Page Subset Badge */}
                                {item.pageSubset && item.pageSubset !== 'ALL' && (
                                  <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800/60">
                                    {item.pageSubset === 'ODD' ? 'Odd Pgs' : 'Even Pgs'}
                                  </span>
                                )}

                                {/* Page Range Badge */}
                                {item.pageRange && item.pageRange !== 'ALL' && (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800/60">
                                    Range: {item.pageRange}
                                  </span>
                                )}

                                {/* Scaling Badge */}
                                {item.scaling && item.scaling !== 'FIT' && (
                                  <span className="px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 font-medium border border-slate-300/60 dark:border-slate-600/50">
                                    {item.scaling === 'ACTUAL' ? '100% Actual' : 'Shrink'}
                                  </span>
                                )}

                                {/* Orientation Badge */}
                                {item.orientation && item.orientation !== 'AUTO' && (
                                  <span className="px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 font-medium border border-slate-300/60 dark:border-slate-600/50">
                                    {item.orientation === 'LANDSCAPE' ? 'Landscape' : 'Portrait'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Print Action Button */}
                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            {isPrinted ? (
                              <span className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/90 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800/60">
                                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Printed
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={isPrinting}
                                onClick={() => handleManualPrint(order.id, item.id, item.originalFileName)}
                                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all flex items-center gap-1.5 disabled:opacity-50"
                              >
                                {isPrinting ? (
                                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                )}
                                <span>Print on {item.colorMode === 'COLOR' ? 'Color' : 'B&W'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Order Footer & Status Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs">
                    <div>
                      {order.notes && (
                        <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-3 py-1.5 rounded-xl border border-amber-200/60 dark:border-amber-800/60">
                          <strong>Note from Customer:</strong> {order.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {order.status !== 'PRINTED' && allItemsPrinted && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(order.id, 'PRINTED')}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors"
                        >
                          Mark Order Ready for Pickup
                        </button>
                      )}

                      {order.status === 'PRINTED' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(order.id, 'COLLECTED')}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors"
                        >
                          Mark as Collected (Close)
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* History Tab */
        historyOrders.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="No Past Orders"
            description="Completed and collected print jobs will be listed here."
            zeroStat="0"
            zeroStatLabel="Completed"
          />
        ) : (
          <div className="space-y-3">
            {historyOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      #{order.orderNumber}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        order.status === 'COLLECTED'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : order.status === 'PRINTED'
                          ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                          : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Customer: <strong>{order.customer?.name}</strong> ({order.customer?.phone}) • {order.items.length} file(s) • {new Date(order.updatedAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {order.paymentScreenshot && (
                    <button
                      type="button"
                      onClick={() =>
                        setViewingScreenshot({
                          url: order.paymentScreenshot!,
                          orderNumber: order.orderNumber,
                          amount: order.totalAmount,
                          customerName: order.customer?.name || 'Customer',
                          upiRef: order.upiTransactionRef
                        })
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[11px] font-semibold hover:bg-purple-100 dark:hover:bg-purple-900 transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Photo Proof</span>
                    </button>
                  )}
                  <div className="text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                    ₹{order.totalAmount.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Modal Lightbox for Viewing Payment Screenshot Proof */}
      {viewingScreenshot && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Camera className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Payment Proof: #{viewingScreenshot.orderNumber}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Customer: <strong>{viewingScreenshot.customerName}</strong> • Amount: <strong>₹{viewingScreenshot.amount.toFixed(2)}</strong>
                  {viewingScreenshot.upiRef && ` • UTR: ${viewingScreenshot.upiRef}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingScreenshot(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-950 flex items-center justify-center max-h-[65vh] overflow-auto">
              <img
                src={viewingScreenshot.url}
                alt={`Payment Proof for #${viewingScreenshot.orderNumber}`}
                className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-lg border border-slate-800"
              />
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Verify UTR & amount on receipt before printing
              </span>
              <a
                href={viewingScreenshot.url}
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

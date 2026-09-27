import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, Sliders, Store, ShoppingBag, ArrowRight, Sparkles, CheckCircle2, ShieldCheck, FileText } from 'lucide-react';
import { UploadedFileMeta, PrintSettings, Shop, Order } from '../types/index.js';
import { FileUploader } from '../components/customer/FileUploader.js';
import { PrintSettingsModal } from '../components/customer/PrintSettingsModal.js';
import { ShopSelector } from '../components/customer/ShopSelector.js';
import { CartDrawer } from '../components/customer/CartDrawer.js';
import { PaymentModal } from '../components/customer/PaymentModal.js';
import { OrderTracker } from '../components/customer/OrderTracker.js';
import { WalletModal } from '../components/customer/WalletModal.js';
import { useCart, defaultPrintSettings } from '../context/CartContext.js';
import { useToast } from '../context/ToastContext.js';
import { useAuth } from '../context/AuthContext.js';

export const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { selectedShop, setSelectedShop, addItem, items, subtotal } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Staged Uploaded Files
  const [stagedFiles, setStagedFiles] = useState<{ meta: UploadedFileMeta; settings: PrintSettings }[]>([]);
  const [activeSettingsIdx, setActiveSettingsIdx] = useState<number | null>(null);

  // Modals & Drawers
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [activeTrackedOrder, setActiveTrackedOrder] = useState<Order | null>(null);

  // Bulk Apply Settings to All Files
  const handleApplyToAll = () => {
    if (stagedFiles.length === 0) return;
    const templateSettings = { ...stagedFiles[0].settings };
    const updated = stagedFiles.map((f) => ({
      ...f,
      settings: { ...templateSettings }
    }));
    setStagedFiles(updated);
    showToast('info', 'Settings Applied', 'Settings from 1st file applied to all staged documents.');
  };

  const handleSaveSettings = (newSettings: PrintSettings) => {
    if (activeSettingsIdx !== null && stagedFiles[activeSettingsIdx]) {
      const updated = [...stagedFiles];
      updated[activeSettingsIdx].settings = newSettings;
      setStagedFiles(updated);
      showToast('success', 'Settings Saved', `Configured '${updated[activeSettingsIdx].meta.originalFileName}'`);
    }
  };

  const handleAddAllToCart = () => {
    if (!selectedShop) {
      showToast('error', 'Select Shop', 'Please choose a print shop first.');
      return;
    }

    if (stagedFiles.length === 0) {
      showToast('error', 'No Files', 'Please upload at least one document.');
      return;
    }

    let addedCount = 0;
    let duplicateCount = 0;

    for (const item of stagedFiles) {
      const res = addItem(item.meta, item.settings);
      if (res.success) {
        addedCount++;
      } else if (res.isDuplicate) {
        duplicateCount++;
      }
    }

    if (addedCount > 0) {
      showToast('success', 'Added to Cart', `${addedCount} item(s) added. Live cart total: ₹${subtotal.toFixed(2)}`);
      setStagedFiles([]);
      setIsCartOpen(true);
    } else if (duplicateCount > 0) {
      showToast('warning', 'Duplicate Items', 'These files with identical settings are already in your cart.');
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Active Order Tracker if customer just created an order */}
      {activeTrackedOrder ? (
        <OrderTracker
          orderId={activeTrackedOrder.id}
          onBack={() => setActiveTrackedOrder(null)}
        />
      ) : (
        <>
          {/* Welcome Banner */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-700 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>PrintHub Instant Print Service</span>
              </span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Hello, {user?.name || 'Customer'}! 👋
              </h1>
              <p className="text-xs sm:text-sm text-indigo-100 leading-relaxed">
                Upload your documents, choose paper size & color mode, pick a local verified shop, and collect in minutes.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setIsWalletOpen(true)}
                className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold transition-colors backdrop-blur-sm flex items-center gap-2"
              >
                <span>Wallet Balance:</span>
                <span className="font-mono text-sm text-emerald-300 font-extrabold">
                  ₹{user?.wallet?.balance?.toFixed(2) || '0.00'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/orders')}
                className="px-5 py-3 rounded-2xl bg-white text-indigo-900 hover:bg-indigo-50 text-xs font-bold shadow-md transition-colors flex items-center gap-1.5"
              >
                <span>Order History</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Step 1: Upload Documents */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <span>Upload Documents</span>
              </h2>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                Auto page-count detector
              </span>
            </div>

            <FileUploader
              files={stagedFiles}
              onFilesChange={setStagedFiles}
              onOpenSettings={(idx) => setActiveSettingsIdx(idx)}
              onApplyToAll={handleApplyToAll}
              defaultSettings={defaultPrintSettings}
            />
          </section>

          {/* Step 2: Select Print Shop */}
          <section className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <span>Choose Pickup Location</span>
              </h2>
            </div>

            <ShopSelector
              selectedShop={selectedShop}
              onSelectShop={setSelectedShop}
            />
          </section>

          {/* Step 3: Add to Cart Action Bar */}
          {stagedFiles.length > 0 && (
            <div className="sticky bottom-6 z-30 p-4 sm:p-5 rounded-3xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-bottom-4">
              <div>
                <p className="font-extrabold text-sm sm:text-base">
                  {stagedFiles.length} file(s) configured for {selectedShop?.name || 'Selected Shop'}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-600">
                  Total pages to print:{' '}
                  <strong className="font-mono text-white dark:text-slate-900">
                    {stagedFiles.reduce((sum, f) => sum + f.meta.pageCount * f.settings.copies, 0)}
                  </strong>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleAddAllToCart}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add All to Cart & Review</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Print Settings Modal */}
      {activeSettingsIdx !== null && stagedFiles[activeSettingsIdx] && (
        <PrintSettingsModal
          isOpen={activeSettingsIdx !== null}
          fileMeta={stagedFiles[activeSettingsIdx].meta}
          currentSettings={stagedFiles[activeSettingsIdx].settings}
          shop={selectedShop}
          onSave={handleSaveSettings}
          onClose={() => setActiveSettingsIdx(null)}
        />
      )}

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsPaymentOpen(true);
        }}
      />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onOrderCreated={(order) => {
          setActiveTrackedOrder(order);
        }}
      />

      {/* Wallet Modal */}
      <WalletModal
        isOpen={isWalletOpen}
        onClose={() => setIsWalletOpen(false)}
      />
    </div>
  );
};

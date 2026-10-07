import React from 'react';
import { ShoppingBag, X, Trash2, ArrowRight, FileText, Image as ImageIcon, Sliders } from 'lucide-react';
import { useCart } from '../../context/CartContext.js';
import { EmptyState } from '../common/EmptyState.js';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  onProceedToCheckout
}) => {
  const { items, removeItem, clearCart, subtotal, selectedShop } = useCart();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Print Cart</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {items.length} {items.length === 1 ? 'item' : 'items'} ready for print
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs text-rose-500 hover:text-rose-700 font-semibold px-2 py-1"
                >
                  Clear All
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Selected Shop Info */}
          {selectedShop && (
            <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Printing at:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[220px]">
                {selectedShop.name}
              </span>
            </div>
          )}

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {items.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  icon={ShoppingBag}
                  title="Your Cart is Empty"
                  description="Upload and configure documents to add them to your print queue."
                  zeroStat="₹0.00"
                  zeroStatLabel="Total Due"
                />
              </div>
            ) : (
              items.map((item) => {
                const isPdf = item.fileMeta.fileType === 'pdf';
                const isImg = ['jpg', 'jpeg', 'png', 'webp', 'image'].includes(item.fileMeta.fileType);

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex flex-col gap-2 relative group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isPdf
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                              : isImg
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                              : 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                          }`}
                        >
                          {isImg ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                            {item.fileMeta.originalFileName}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {item.calculatedPages} {item.calculatedPages === 1 ? 'page' : 'pages'} × {item.settings.copies} {item.settings.copies === 1 ? 'copy' : 'copies'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Settings Badges */}
                    <div className="flex flex-wrap gap-1.5 mt-1 text-[11px]">
                      <span
                        className={`px-2 py-0.5 rounded font-semibold ${
                          item.settings.colorMode === 'COLOR'
                            ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {item.settings.colorMode === 'COLOR' ? 'Color' : 'B&W'}
                      </span>

                      <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {item.settings.duplexMode === 'DUPLEX_LONG'
                          ? 'Duplex (Long Edge)'
                          : item.settings.duplexMode === 'DUPLEX_SHORT'
                          ? 'Duplex (Short Edge)'
                          : item.settings.duplexMode === 'DUPLEX'
                          ? 'Duplex'
                          : '1-Sided'}
                      </span>

                      <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {item.settings.paperSize}
                      </span>

                      {item.settings.pageSubset && item.settings.pageSubset !== 'ALL' && (
                        <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                          {item.settings.pageSubset === 'ODD' ? 'Odd Pages Only' : 'Even Pages Only'}
                        </span>
                      )}

                      {item.settings.pageRange !== 'ALL' && (
                        <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                          Range: {item.settings.pageRange}
                        </span>
                      )}
                    </div>

                    {/* Price Breakdown */}
                    <div className="flex items-center justify-between border-t border-slate-200/50 dark:border-slate-700/40 pt-2 mt-1">
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                        ₹{item.unitPrice.toFixed(2)}/page
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                        ₹{item.itemPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Checkout Summary */}
          {items.length > 0 && (
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Subtotal ({items.length} items)</span>
                  <span className="font-mono font-medium">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Convenience Fee / Taxes</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">₹0.00 (Free)</span>
                </div>
                <div className="flex items-center justify-between text-base font-extrabold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800 pt-2">
                  <span>Total Amount</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400 text-lg">
                    ₹{subtotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onProceedToCheckout}
                className="w-full py-3.5 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/35 transition-all flex items-center justify-center gap-2 group"
              >
                <span>Proceed to Payment (₹{subtotal.toFixed(2)})</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

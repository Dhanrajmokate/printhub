import React, { useState } from 'react';
import { ShoppingBag, X, Trash2, ArrowRight, FileText, Image as ImageIcon, Sliders, Award } from 'lucide-react';
import { useCart } from '../../context/CartContext.js';
import { EmptyState } from '../common/EmptyState.js';
import { PrintSettingsModal } from './PrintSettingsModal.js';
import { CartItem } from '../../types/index.js';

interface CartDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
  onProceedToCheckout?: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  onProceedToCheckout
}) => {
  const {
    items,
    removeItem,
    updateItemSettings,
    clearCart,
    subtotal,
    selectedShop,
    isCartOpen: ctxIsOpen,
    closeCart: ctxCloseCart
  } = useCart();

  const [editingItem, setEditingItem] = useState<CartItem | null>(null);

  const effectiveIsOpen = isOpen !== undefined ? isOpen : ctxIsOpen;
  const handleClose = onClose || ctxCloseCart;

  if (!effectiveIsOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
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
                onClick={handleClose}
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

                      {item.settings.scaling === 'FIT_PAGE' && (
                        <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 font-bold flex items-center gap-1 border border-amber-300 dark:border-amber-800">
                          <Award className="w-3 h-3" />
                          Fit to Whole Page (Certificate)
                        </span>
                      )}
                    </div>

                    {/* In-Cart Controls: Edit Configuration & Quick Copies Stepper */}
                    <div className="flex items-center justify-between border-t border-slate-200/50 dark:border-slate-700/40 pt-2.5 mt-0.5">
                      <div className="flex items-center gap-2">
                        {/* Edit Config Trigger */}
                        <button
                          type="button"
                          onClick={() => setEditingItem(item)}
                          className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition-all border border-indigo-200/60 dark:border-indigo-800/60 shadow-sm"
                          title="Edit print specifications & settings"
                        >
                          <Sliders className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>Edit Config</span>
                        </button>

                        {/* Quick Fit to Page Toggle Button */}
                        <button
                          type="button"
                          onClick={() => {
                            const isFit = item.settings.scaling === 'FIT_PAGE';
                            updateItemSettings(item.id, {
                              ...item.settings,
                              scaling: isFit ? 'FIT' : 'FIT_PAGE',
                              orientation: isFit ? item.settings.orientation : 'LANDSCAPE',
                              duplexMode: isFit ? item.settings.duplexMode : 'SINGLE'
                            });
                          }}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all border ${
                            item.settings.scaling === 'FIT_PAGE'
                              ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-xs'
                              : 'bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                          title="Toggle edge-to-edge certificate fit"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>{item.settings.scaling === 'FIT_PAGE' ? '✓ Fit Page' : 'Fit Page'}</span>
                        </button>

                        {/* Quick Copies Stepper */}
                        <div className="flex items-center bg-slate-200/70 dark:bg-slate-700/60 rounded-xl p-0.5 border border-slate-300/60 dark:border-slate-600/60">
                          <button
                            type="button"
                            onClick={() => {
                              const newCopies = Math.max(1, item.settings.copies - 1);
                              updateItemSettings(item.id, { ...item.settings, copies: newCopies });
                            }}
                            disabled={item.settings.copies <= 1}
                            className="w-5 h-5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold transition-colors"
                            title="Decrease copies"
                          >
                            -
                          </button>
                          <span className="px-1.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 font-mono min-w-[18px] text-center">
                            {item.settings.copies}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const newCopies = item.settings.copies + 1;
                              updateItemSettings(item.id, { ...item.settings, copies: newCopies });
                            }}
                            className="w-5 h-5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-100 text-xs font-bold transition-colors"
                            title="Increase copies"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Price Breakdown */}
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block">
                          ₹{item.unitPrice.toFixed(2)}/page
                        </span>
                        <span className="font-extrabold text-slate-900 dark:text-white font-mono text-sm">
                          ₹{item.itemPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Checkout Summary */}
          {items.length > 0 && (
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 space-y-4 shrink-0">
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

              {onProceedToCheckout && (
                <button
                  type="button"
                  onClick={onProceedToCheckout}
                  className="w-full py-3.5 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/35 transition-all flex items-center justify-center gap-2 group"
                >
                  <span>Proceed to Payment (₹{subtotal.toFixed(2)})</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* In-Cart Configuration Modal */}
    {editingItem && (
      <PrintSettingsModal
        isOpen={!!editingItem}
        fileMeta={editingItem.fileMeta}
        currentSettings={editingItem.settings}
        shop={selectedShop}
        onSave={(newSettings) => {
          updateItemSettings(editingItem.id, newSettings);
          setEditingItem(null);
        }}
        onClose={() => setEditingItem(null)}
      />
    )}
    </>
  );
};

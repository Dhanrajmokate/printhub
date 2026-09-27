import React, { useState, useEffect } from 'react';
import { X, Sliders, Calculator, Check, AlertCircle, Copy, FileText } from 'lucide-react';
import { PrintSettings, Shop, UploadedFileMeta } from '../../types/index.js';
import { useCart, parsePageRange } from '../../context/CartContext.js';

interface PrintSettingsModalProps {
  isOpen: boolean;
  fileMeta: UploadedFileMeta | null;
  currentSettings: PrintSettings;
  shop: Shop | null;
  onSave: (newSettings: PrintSettings) => void;
  onClose: () => void;
}

export const PrintSettingsModal: React.FC<PrintSettingsModalProps> = ({
  isOpen,
  fileMeta,
  currentSettings,
  shop,
  onSave,
  onClose
}) => {
  const [settings, setSettings] = useState<PrintSettings>({ ...currentSettings });
  const { calculatePrice } = useCart();

  useEffect(() => {
    if (isOpen && currentSettings) {
      setSettings({ ...currentSettings });
    }
  }, [isOpen, currentSettings]);

  if (!isOpen || !fileMeta) return null;

  const effectivePages = parsePageRange(fileMeta.pageCount, settings.pageRange);
  const priceInfo = calculatePrice(fileMeta, settings, shop);

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  const supportsColor = shop?.capabilities?.supportsColor ?? true;
  const supportsDuplex = shop?.capabilities?.supportsDuplex ?? true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl my-8 relative">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Print Settings</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs sm:max-w-sm">
                {fileMeta.originalFileName} ({fileMeta.pageCount} original {fileMeta.pageCount === 1 ? 'page' : 'pages'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          {/* 1. SEPARATE TOGGLE: B&W vs COLOR */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              1. Print Color Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSettings((s) => ({ ...s, colorMode: 'BW' }))}
                className={`flex items-center justify-center gap-2.5 p-3 rounded-2xl border-2 font-semibold text-sm transition-all ${
                  settings.colorMode === 'BW'
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900 shadow-md'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className="w-3.5 h-3.5 rounded-full bg-slate-500 border border-white" />
                Black & White (B&W)
              </button>

              <button
                type="button"
                disabled={!supportsColor}
                onClick={() => setSettings((s) => ({ ...s, colorMode: 'COLOR' }))}
                className={`flex items-center justify-center gap-2.5 p-3 rounded-2xl border-2 font-semibold text-sm transition-all relative ${
                  !supportsColor
                    ? 'opacity-40 cursor-not-allowed border-slate-200 bg-slate-100 dark:bg-slate-800/20'
                    : settings.colorMode === 'COLOR'
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shadow-md shadow-indigo-500/10'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                }`}
              >
                <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-pink-500 via-amber-400 to-indigo-500" />
                Full Color
                {!supportsColor && (
                  <span className="absolute -top-2 right-2 text-[10px] bg-rose-500 text-white px-1.5 py-0.2 rounded-full">
                    Shop Unsupported
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* 2. SEPARATE TOGGLE: DUPLEX (Single-sided vs Double-sided) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              2. Sides & Duplex Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSettings((s) => ({ ...s, duplexMode: 'SINGLE' }))}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border-2 font-semibold text-sm transition-all ${
                  settings.duplexMode === 'SINGLE'
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <span>📄</span> Single-Sided
              </button>

              <button
                type="button"
                disabled={!supportsDuplex}
                onClick={() => setSettings((s) => ({ ...s, duplexMode: 'DUPLEX' }))}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border-2 font-semibold text-sm transition-all ${
                  !supportsDuplex
                    ? 'opacity-40 cursor-not-allowed border-slate-200'
                    : settings.duplexMode === 'DUPLEX'
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <span>📑</span> Double-Sided (Duplex)
              </button>
            </div>
          </div>

          {/* 3. COPIES & ORIENTATION */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Number of Copies
              </label>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, copies: Math.max(1, s.copies - 1) }))}
                  className="w-11 h-11 rounded-l-2xl border border-r-0 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200 transition-colors"
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={settings.copies}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, copies: Math.max(1, parseInt(e.target.value, 10) || 1) }))
                  }
                  className="w-full h-11 text-center font-bold font-mono border-y border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, copies: s.copies + 1 }))}
                  className="w-11 h-11 rounded-r-2xl border border-l-0 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Orientation
              </label>
              <select
                value={settings.orientation}
                onChange={(e: any) => setSettings((s) => ({ ...s, orientation: e.target.value }))}
                className="w-full h-11 px-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium text-sm focus:border-indigo-600 focus:outline-none"
              >
                <option value="PORTRAIT">Portrait (Vertical)</option>
                <option value="LANDSCAPE">Landscape (Horizontal)</option>
                <option value="AUTO">Auto Detect</option>
              </select>
            </div>
          </div>

          {/* 4. PAPER SIZE & PRINT QUALITY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Paper Size
              </label>
              <select
                value={settings.paperSize}
                onChange={(e: any) => setSettings((s) => ({ ...s, paperSize: e.target.value }))}
                className="w-full h-11 px-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium text-sm focus:border-indigo-600 focus:outline-none"
              >
                <option value="A4">A4 (Standard 210 × 297 mm)</option>
                <option value="A3">A3 (Large 297 × 420 mm)</option>
                <option value="LETTER">US Letter (8.5 × 11 in)</option>
                <option value="LEGAL">Legal (8.5 × 14 in)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Print Quality
              </label>
              <select
                value={settings.quality}
                onChange={(e: any) => setSettings((s) => ({ ...s, quality: e.target.value }))}
                className="w-full h-11 px-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium text-sm focus:border-indigo-600 focus:outline-none"
              >
                <option value="NORMAL">Standard Quality (600 DPI)</option>
                <option value="HIGH">High Definition / Photo (1200 DPI)</option>
                <option value="DRAFT">Draft / Eco Saver</option>
              </select>
            </div>
          </div>

          {/* 5. PAGE RANGE & TARGET CALCULATION */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Page Range
              </label>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                {effectivePages} of {fileMeta.pageCount} pages selected
              </span>
            </div>
            <input
              type="text"
              placeholder="e.g. ALL or 1-5, 8, 11-14"
              value={settings.pageRange}
              onChange={(e) => setSettings((s) => ({ ...s, pageRange: e.target.value }))}
              className="w-full h-11 px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono text-sm focus:border-indigo-600 focus:outline-none"
            />
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Type <strong className="font-mono text-slate-600 dark:text-slate-300">ALL</strong> to print all pages, or comma-separated ranges like <strong className="font-mono text-slate-600 dark:text-slate-300">1-3, 5</strong>.
            </p>
          </div>

          {/* 6. SCALING & COLLATE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Page Scaling
              </label>
              <select
                value={settings.scaling}
                onChange={(e: any) => setSettings((s) => ({ ...s, scaling: e.target.value }))}
                className="w-full h-11 px-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium text-sm focus:border-indigo-600 focus:outline-none"
              >
                <option value="FIT">Fit to Printable Margin</option>
                <option value="ACTUAL">Actual 100% Size</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-6">
              <label className="relative flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.collate}
                  onChange={(e) => setSettings((s) => ({ ...s, collate: e.target.checked }))}
                  className="w-5 h-5 rounded-lg text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
                />
                <span className="ml-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Collate pages (1,2,3... 1,2,3...)
                </span>
              </label>
            </div>
          </div>

          {/* 7. LIVE MULTIPLICATIVE PRICE BREAKDOWN */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] uppercase font-bold tracking-wider text-indigo-700 dark:text-indigo-300 block mb-0.5">
                Live Price Calculation
              </span>
              <p className="text-xs text-indigo-900 dark:text-indigo-200 font-mono">
                ₹{priceInfo.unitPrice.toFixed(2)}/pg × {priceInfo.effectivePages} {priceInfo.effectivePages === 1 ? 'pg' : 'pgs'} × {settings.copies} {settings.copies === 1 ? 'copy' : 'copies'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                ₹{priceInfo.itemPrice.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-4 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Save & Update Price
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Link } from 'react-router-dom';
import { Printer, Shield, Zap, Download, Store } from 'lucide-react';
import { DESKTOP_DOWNLOAD_CONFIG } from '../../config/downloadConfig.js';
import { isShopApp, isCustomerWeb } from '../../utils/platform.js';

export const Footer: React.FC = () => {
  if (isShopApp) {
    return (
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm py-4 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-slate-700 dark:text-slate-300">PrintHub Partner Terminal</span>
            <span>•</span>
            <span>v{DESKTOP_DOWNLOAD_CONFIG.version}</span>
          </div>
          <p>© {new Date().getFullYear()} PrintHub Partner Operations</p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm py-8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
            <Printer className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-sm text-slate-900 dark:text-white">PrintHub</span>
            <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">
              Upload → Pay → Print → Collect
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-5 text-xs font-medium">
          <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <Zap className="w-3.5 h-3.5 text-amber-500" /> Instant Cloud Spooling
          </span>
          <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <Shield className="w-3.5 h-3.5 text-emerald-500" /> ₹100 Welcome Bonus
          </span>
          <Link
            to="/shop"
            className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-bold hover:underline"
            title="Download Counter Desktop Terminal for Print Shopkeepers"
          >
            <Store className="w-3.5 h-3.5" />
            <span>Shop Partner Portal (.exe)</span>
          </Link>
        </div>

        <p className="text-xs text-slate-400 dark:text-slate-500">
          © {new Date().getFullYear()} PrintHub Platform. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

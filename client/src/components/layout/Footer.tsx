import React from 'react';
import { Printer, Heart, Shield, Zap, Sparkles, Download } from 'lucide-react';

export const Footer: React.FC = () => {
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
            <Zap className="w-3.5 h-3.5 text-amber-500" /> Instant Spooling
          </span>
          <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <Shield className="w-3.5 h-3.5 text-emerald-500" /> ₹100 Welcome Bonus
          </span>
          <a
            href="/downloads/PrintHub-Shop-Setup.exe"
            download="PrintHub-Shop-Setup.exe"
            className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
            title="Download Standalone Desktop App for Print Shopkeepers (.exe)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Desktop App (.exe)</span>
          </a>
        </div>

        <p className="text-xs text-slate-400 dark:text-slate-500">
          © {new Date().getFullYear()} PrintHub Platform. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

import React from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  Printer,
  Download,
  Zap,
  ShieldCheck,
  QrCode,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Laptop,
  Layers,
  FileCheck2,
  FileText
} from 'lucide-react';
import { DESKTOP_DOWNLOAD_CONFIG } from '../config/downloadConfig.js';

export const ShopPartnerWebPage: React.FC = () => {
  return (
    <div className="min-h-[85vh] py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-12 animate-in fade-in">
      {/* Hero Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-black uppercase tracking-wider shadow-sm">
          <Store className="w-4 h-4" />
          <span>Shopkeeper Counter Terminal</span>
        </div>

        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
          Run Your Print Store with the{' '}
          <span className="text-indigo-600 dark:text-indigo-400">PrintHub Partner App</span>
        </h1>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          The dedicated Windows counter application for print store owners. Connect your physical thermal,
          laser, and inkjet printers to auto-convert Word documents and silently print customer cloud orders in real time.
        </p>

        {/* Primary Download CTA */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={DESKTOP_DOWNLOAD_CONFIG.downloadUrl}
            download={DESKTOP_DOWNLOAD_CONFIG.fileName}
            className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm sm:text-base shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-3 active:scale-95 group"
          >
            <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
            <span>Download Shop Partner App (.exe)</span>
          </a>

          <Link
            to="/dashboard"
            className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2"
          >
            <span>Are you a customer? Order Prints</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <p className="text-[11px] text-slate-400">
          Version {DESKTOP_DOWNLOAD_CONFIG.version} • Windows 10 & 11 (64-bit) • ~{DESKTOP_DOWNLOAD_CONFIG.fileSize}
        </p>
      </div>

      {/* Why the Desktop App is Required for Shopkeepers */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white shadow-2xl relative overflow-hidden space-y-6">
        <div className="max-w-2xl space-y-2">
          <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-300">
            Why the Desktop App?
          </span>
          <h2 className="text-xl sm:text-2xl font-black">
            Hardware Drivers & Direct USB / Network Spooling
          </h2>
          <p className="text-xs sm:text-sm text-indigo-100 leading-relaxed">
            Standard web browsers cannot communicate directly with physical USB printer ports or trigger
            silent background printing without popups. The PrintHub Shop Partner App runs directly on your counter PC,
            interfacing with the Windows Print Spooler to automate your entire print queue.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/30 flex items-center justify-center text-indigo-200">
              <Printer className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-white">Silent Auto-Printing</h3>
            <p className="text-[11px] text-indigo-100 leading-relaxed">
              Customer print jobs are automatically routed to your default B&W or Color trays the instant payment is confirmed.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/30 flex items-center justify-center text-purple-200">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-white">Universal DOCX Conversion</h3>
            <p className="text-[11px] text-indigo-100 leading-relaxed">
              Word documents (.docx) uploaded by students or customers are auto-converted to pixel-perfect PDFs before hitting your printer.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/30 flex items-center justify-center text-emerald-200">
              <QrCode className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-white">PhonePe Counter Standee</h3>
            <p className="text-[11px] text-indigo-100 leading-relaxed">
              Upload your shop counter UPI QR card. Customers scan and pay directly to your account with zero platform commission.
            </p>
          </div>
        </div>
      </div>

      {/* 3-Step Setup Guide */}
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white">
            Quick 3-Step Counter Setup
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Get your store ready to receive cloud print orders in less than 2 minutes
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-indigo-600/20">
              1
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Download & Install</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Download <strong>PrintHub Shop Partner Setup 1.0.0.exe</strong> and run the installer on your Windows counter PC.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-indigo-600/20">
              2
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Sign In & Set Rates</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Log in with your shop credentials or register your print hub with your custom per-page B&W and Color rates.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-indigo-600/20">
              3
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Link Your Printers</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              The app automatically detects your installed Windows printers. Pick your B&W and Color trays and you're online!
            </p>
          </div>
        </div>
      </div>

      {/* Footer Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Ready to automate your print counter?
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Join thousands of print shop owners across India powered by PrintHub.
          </p>
        </div>

        <a
          href={DESKTOP_DOWNLOAD_CONFIG.downloadUrl}
          download={DESKTOP_DOWNLOAD_CONFIG.fileName}
          className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Download Setup (.exe)</span>
        </a>
      </div>
    </div>
  );
};

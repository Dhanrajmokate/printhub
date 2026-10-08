import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Printer, UploadCloud, CreditCard, PackageCheck, Sparkles, ArrowRight, ShieldCheck, CheckCircle2, Zap, Store, Sliders, FileText, Download, Monitor, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { DESKTOP_DOWNLOAD_CONFIG } from '../config/downloadConfig.js';

export const LandingPage: React.FC = () => {
  const { isAuthenticated, user, login } = useAuth();
  const navigate = useNavigate();

  // Interactive Live Rate Calculator Widget state
  const [calcColor, setCalcColor] = useState<'BW' | 'COLOR'>('BW');
  const [calcDuplex, setCalcDuplex] = useState<'SINGLE' | 'DUPLEX'>('SINGLE');
  const [calcPages, setCalcPages] = useState<number>(10);
  const [calcCopies, setCalcCopies] = useState<number>(1);

  // Default rates for preview
  const ratePerPg = calcColor === 'COLOR' ? (calcDuplex === 'DUPLEX' ? 9.0 : 10.0) : (calcDuplex === 'DUPLEX' ? 1.5 : 2.0);
  const calculatedEstimate = Math.max(1.0, Math.round(ratePerPg * calcPages * calcCopies * 100) / 100);

  const handleDemoCustomerLogin = async () => {
    const res = await login('customer@printhub.com', 'password123');
    if (res.success) {
      navigate('/dashboard');
    }
  };

  const handleDemoShopLogin = async () => {
    const res = await login('shop@printhub.com', 'password123');
    if (res.success) {
      navigate('/shop');
    }
  };

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto px-4 space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Gen Cloud Printing Platform • ₹100 Welcome Bonus</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
          Upload → Pay → Print → <span className="text-indigo-600 dark:text-indigo-400">Collect.</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Skip the counter queue. Upload your documents from anywhere, customize print settings, pay securely via Wallet or UPI, and pick up hot-off-the-press prints at your neighborhood shop.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {isAuthenticated ? (
            <Link
              to={user?.role === 'SHOP' ? '/shop' : '/dashboard'}
              className="px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/35 transition-all flex items-center gap-2"
            >
              <span>Go to {user?.role === 'SHOP' ? 'Shop Dashboard' : 'Upload & Print'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/auth"
                className="px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/35 transition-all flex items-center gap-2"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              {/* 1-Click Quick Demo Switchers */}
              <button
                type="button"
                onClick={handleDemoCustomerLogin}
                className="px-5 py-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition-all shadow-sm flex items-center gap-2"
              >
                <Zap className="w-4 h-4 text-emerald-600" />
                <span>Demo Customer (₹100)</span>
              </button>

              <button
                type="button"
                onClick={handleDemoShopLogin}
                className="px-5 py-4 rounded-2xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold transition-all shadow-sm flex items-center gap-2"
              >
                <Store className="w-4 h-4 text-purple-600" />
                <span>Demo Shop (8001/8002)</span>
              </button>

              <a
                href={DESKTOP_DOWNLOAD_CONFIG.downloadUrl}
                download={DESKTOP_DOWNLOAD_CONFIG.fileName}
                target={DESKTOP_DOWNLOAD_CONFIG.downloadUrl.startsWith('http') ? '_blank' : undefined}
                rel={DESKTOP_DOWNLOAD_CONFIG.downloadUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="px-5 py-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition-all shadow-sm flex items-center gap-2"
                title={`Download Standalone Windows Desktop App (${DESKTOP_DOWNLOAD_CONFIG.fileSize})`}
              >
                <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Download Desktop App (.exe)</span>
              </a>
            </>
          )}
        </div>
      </section>

      {/* Interactive Live Price Calculator Widget */}
      <section className="max-w-3xl mx-auto px-4">
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Live Multiplicative Price Calculator
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Formula: Rate × Duplex Multiplier × Pages × Copies
                </p>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
              Transparent Pricing
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Color Mode */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-2">
                Color Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCalcColor('BW')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                    calcColor === 'BW'
                      ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  ⬛ B&W (₹2.00)
                </button>
                <button
                  type="button"
                  onClick={() => setCalcColor('COLOR')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                    calcColor === 'COLOR'
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-md'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  🎨 Color (₹10.00)
                </button>
              </div>
            </div>

            {/* Duplex Mode */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-2">
                Print Sides
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCalcDuplex('SINGLE')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                    calcDuplex === 'SINGLE'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  📄 1-Sided
                </button>
                <button
                  type="button"
                  onClick={() => setCalcDuplex('DUPLEX')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                    calcDuplex === 'DUPLEX'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  📑 2-Sided (Duplex)
                </button>
              </div>
            </div>

            {/* Pages Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                <span>Number of Pages</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{calcPages} pages</span>
              </div>
              <input
                type="range"
                min={1}
                max={100}
                value={calcPages}
                onChange={(e) => setCalcPages(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* Copies Stepper */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                <span>Number of Copies</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{calcCopies} sets</span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                value={calcCopies}
                onChange={(e) => setCalcCopies(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          </div>

          {/* Calculator Output */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] uppercase font-bold text-indigo-700 dark:text-indigo-300 block">
                Estimated Price
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-mono mt-0.5">
                ₹{ratePerPg.toFixed(2)}/pg × {calcPages} pgs × {calcCopies} {calcCopies === 1 ? 'copy' : 'copies'}
              </p>
            </div>

            <div className="text-right">
              <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                ₹{calculatedEstimate.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Step Lifecycle Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            How PrintHub Works
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            From file drop to counter pickup in four simple steps
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg">
              1
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Upload Documents</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Drop PDFs, Word DOCX, text or images. Our backend automatically analyzes and calculates total page counts instantly.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-lg">
              2
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Granular Print Specs</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Customize B&W vs Full Color, duplex double-sided, custom page ranges, paper sizes (A4/A3), and collate options with live pricing.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg">
              3
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Instant Wallet & UPI</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Pay in 1 click using your preloaded PrintHub Wallet (with ₹100 signup bonus) or Razorpay UPI/Cards with full transparency.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg">
              4
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Track & Pickup</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Watch real-time progress via Server-Sent Events, download official PDF receipt slips, and collect your orders with zero wait.
            </p>
          </div>
        </div>
      </section>

      {/* Shop Partner Desktop App Download Section */}
      <section className="max-w-5xl mx-auto px-4 pb-4">
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-900/60 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center md:text-left max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold">
              <Monitor className="w-3.5 h-3.5" />
              <span>For Print Shop Owners &amp; Vendors</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
              PrintHub Shop Partner for Windows
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Run your Xerox shop on autopilot. Download the standalone Windows app to connect directly with your USB and Wi-Fi printers, enable hands-free <strong>Auto-Print</strong>, and receive live audio order alerts.
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-indigo-200/90 pt-1">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Zero Setup (No npm or command line)
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                HP, Canon, Epson &amp; Brother Support
              </span>
            </div>
            {/* SmartScreen friendly hint */}
            <div className="p-3 rounded-2xl bg-indigo-950/60 border border-indigo-800/60 text-indigo-200 text-[11px] flex items-start gap-2 text-left">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Windows Notice:</strong> If Windows SmartScreen shows <em>"Windows protected your PC"</em>, click <strong>More info</strong> &rarr; <strong>Run anyway</strong>.
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0 w-full sm:w-auto">
            <a
              href={DESKTOP_DOWNLOAD_CONFIG.downloadUrl}
              download={DESKTOP_DOWNLOAD_CONFIG.fileName}
              target={DESKTOP_DOWNLOAD_CONFIG.downloadUrl.startsWith('http') ? '_blank' : undefined}
              rel={DESKTOP_DOWNLOAD_CONFIG.downloadUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="px-6 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2.5 text-center group"
            >
              <Download className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
              <span>Download for Windows (.exe)</span>
            </a>
            <span className="text-[11px] text-slate-400 text-center font-mono">
              v{DESKTOP_DOWNLOAD_CONFIG.version} &bull; {DESKTOP_DOWNLOAD_CONFIG.os} &bull; {DESKTOP_DOWNLOAD_CONFIG.fileSize}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};

import React, { useState } from 'react';
import { Store, Printer, BarChart3, Settings, Clock, Sparkles, MapPin, Phone, RefreshCw, Wallet, Download } from 'lucide-react';
import { QueueDashboard } from '../components/shop/QueueDashboard.js';
import { PrinterManager } from '../components/shop/PrinterManager.js';
import { AnalyticsDashboard } from '../components/shop/AnalyticsDashboard.js';
import { ShopWalletDashboard } from '../components/shop/ShopWalletDashboard.js';
import { ShopSettingsModal } from '../components/shop/ShopSettingsModal.js';
import { useAuth } from '../context/AuthContext.js';

export const ShopDashboard: React.FC = () => {
  const { user } = useAuth();
  const shop = user?.shop;

  const [activeTab, setActiveTab] = useState<'QUEUE' | 'PRINTERS' | 'ANALYTICS' | 'WALLET'>('QUEUE');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Shop Banner */}
      <div className="p-6 sm:p-7 rounded-3xl bg-slate-900 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black">{shop?.name || 'My Print Shop'}</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
              Verified Partner
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              {shop?.address || '123 Market Road'}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              {shop?.phone || '+91 9876543210'}
            </span>
            <span>•</span>
            <span className="font-mono text-indigo-300 font-semibold">
              B&W: ₹{shop?.bwSingleRate?.toFixed(2) || '2.00'} | Color: ₹{shop?.colorSingleRate?.toFixed(2) || '10.00'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <a
            href="/start-printer-agent.bat"
            download="start-printer-agent.bat"
            className="px-3.5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-indigo-500/25"
            title="Download the Windows batch agent to link physical printers"
          >
            <Download className="w-4 h-4" />
            <span>Download Agent (.bat)</span>
          </a>

          <button
            type="button"
            onClick={() => setActiveTab('WALLET')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
              activeTab === 'WALLET'
                ? 'bg-purple-600 text-white shadow-purple-500/25'
                : 'bg-purple-950/60 hover:bg-purple-900 text-purple-200 border border-purple-800'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Shop Wallet & Payouts</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Settings className="w-4 h-4" />
            <span>Pricing & Shop Info</span>
          </button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('QUEUE')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'QUEUE'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Live FIFO Print Queue</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('PRINTERS')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'PRINTERS'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>Printer Fleet & Port Routing</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ANALYTICS')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'ANALYTICS'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Revenue & Job Analytics</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('WALLET')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'WALLET'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Earnings & UPI Withdrawals</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'QUEUE' && <QueueDashboard />}
      {activeTab === 'PRINTERS' && <PrinterManager />}
      {activeTab === 'ANALYTICS' && <AnalyticsDashboard />}
      {activeTab === 'WALLET' && <ShopWalletDashboard />}

      {/* Shop Settings Modal */}
      <ShopSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={() => {}}
      />
    </div>
  );
};

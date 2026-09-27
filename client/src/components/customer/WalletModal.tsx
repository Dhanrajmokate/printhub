import React, { useState, useEffect } from 'react';
import { Wallet, X, Plus, ArrowUpRight, ArrowDownLeft, RefreshCcw, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.js';
import { Transaction } from '../../types/index.js';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [balance, setBalance] = useState(user?.wallet?.balance ?? 0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [topupAmount, setTopupAmount] = useState('100');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const fetchWalletData = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await api.get('/user/wallet');
      if (res.data.success) {
        setBalance(res.data.wallet.balance);
        setTransactions(res.data.wallet.transactions || []);
      }
    } catch (err) {
      console.error('Failed to fetch wallet:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchWalletData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTopup = async (amountToAdd: number) => {
    if (amountToAdd < 1) {
      showToast('error', 'Invalid Amount', 'Minimum top-up is ₹1.00');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await api.post('/user/wallet/topup', {
        amount: amountToAdd,
        paymentMethod: 'UPI/Card'
      });

      if (res.data.success) {
        showToast('success', 'Wallet Top-Up', res.data.message);
        await refreshUser();
        fetchWalletData();
      }
    } catch (err: any) {
      showToast('error', 'Top-Up Failed', err.response?.data?.message || 'Transaction failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl relative my-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">PrintHub Digital Wallet</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Instant 1-Click Checkout & Auto-Refunds</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Balance Card */}
        <div className="p-6 rounded-3xl bg-gradient-to-tr from-indigo-900 via-indigo-800 to-indigo-700 text-white shadow-xl relative overflow-hidden mb-6">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between text-xs text-indigo-200 uppercase tracking-wider font-semibold mb-1">
            <span>Available Balance</span>
            <span className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full text-[10px]">
              <Sparkles className="w-3 h-3 text-amber-300" /> Active
            </span>
          </div>

          <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight my-2">
            ₹{balance.toFixed(2)}
          </div>

          <p className="text-xs text-indigo-200">
            Linked User: <strong className="text-white">{user?.name}</strong> ({user?.email})
          </p>
        </div>

        {/* Quick Top-Up Section */}
        <div className="space-y-3 mb-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Add Money to Wallet
          </label>
          <div className="grid grid-cols-4 gap-2">
            {['50', '100', '200', '500'].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setTopupAmount(amt)}
                className={`py-2 rounded-xl text-xs font-bold font-mono transition-all border ${
                  topupAmount === amt
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                +₹{amt}
              </button>
            ))}
          </div>

          <div className="flex gap-2 mt-2">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400">₹</span>
              <input
                type="number"
                min={1}
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                placeholder="Enter custom amount"
                className="w-full pl-8 pr-3 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-sm focus:border-indigo-600 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => handleTopup(parseFloat(topupAmount) || 0)}
              disabled={isProcessing}
              className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1.5"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Top Up
                </>
              )}
            </button>
          </div>
        </div>

        {/* Transaction History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Recent Transactions
            </h3>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              {transactions.length} record(s)
            </span>
          </div>

          <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 pr-1">
            {isLoadingHistory ? (
              <div className="p-4 text-center text-xs text-slate-400">Loading records...</div>
            ) : transactions.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 font-mono">No transactions recorded yet (₹0.00).</div>
            ) : (
              transactions.map((tx) => {
                const isCredit = tx.type === 'CREDIT';
                const isRefund = tx.type === 'REFUND';

                return (
                  <div
                    key={tx.id}
                    className="p-3 flex items-center justify-between text-xs bg-white dark:bg-slate-900"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isCredit || isRefund
                            ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isCredit ? (
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                        ) : isRefund ? (
                          <RefreshCcw className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        )}
                      </div>

                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {tx.description}
                        </p>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {new Date(tx.createdAt).toLocaleDateString()} • {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`font-mono font-bold ${
                        isCredit || isRefund
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {isCredit || isRefund ? '+' : '-'}₹{tx.amount.toFixed(2)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

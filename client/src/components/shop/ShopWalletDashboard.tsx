import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Smartphone,
  Copy,
  Check,
  Download,
  X,
  Printer,
  ShieldCheck,
  Banknote,
  Clock,
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.js';
import { SkeletonShimmer } from '../common/SkeletonShimmer.js';
import { EmptyState } from '../common/EmptyState.js';

interface WalletData {
  id: string;
  balance: number;
  lifetimeEarnings: number;
  totalWithdrawn: number;
  transactions: {
    id: string;
    amount: number;
    type: 'CREDIT' | 'DEBIT' | 'REFUND';
    description: string;
    orderId?: string;
    createdAt: string;
  }[];
}

interface ShopDetails {
  name: string;
  upiId: string;
  upiName?: string;
  phone: string;
}

interface PayoutReceipt {
  amount: number;
  targetUpiId: string;
  utrNumber: string;
  newBalance: number;
  status: string;
  settledAt: string;
}

export const ShopWalletDashboard: React.FC = () => {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [shopDetails, setShopDetails] = useState<ShopDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL');

  // Withdrawal Modal State
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [targetUpiId, setTargetUpiId] = useState<string>('');
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);
  const [payoutError, setPayoutError] = useState('');
  const [payoutSuccessReceipt, setPayoutSuccessReceipt] = useState<PayoutReceipt | null>(null);
  const [copiedUtr, setCopiedUtr] = useState(false);

  const { showToast } = useToast();

  const fetchWallet = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/shops/wallet');
      if (res.data.success) {
        setWalletData(res.data.wallet);
        setShopDetails(res.data.shop);
        if (!targetUpiId && res.data.shop?.upiId) {
          setTargetUpiId(res.data.shop.upiId);
        }
      }
    } catch (err) {
      console.error('Failed to fetch shop wallet:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const handleOpenWithdrawModal = () => {
    if (shopDetails?.upiId) {
      setTargetUpiId(shopDetails.upiId);
    }
    setWithdrawAmount('');
    setPayoutError('');
    setPayoutSuccessReceipt(null);
    setIsWithdrawModalOpen(true);
  };

  const handleQuickAmount = (pct: number) => {
    if (!walletData) return;
    const val = (walletData.balance * pct).toFixed(2);
    setWithdrawAmount(val);
  };

  const handleExecuteWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(withdrawAmount);

    if (isNaN(amountNum) || amountNum < 10) {
      setPayoutError('Minimum withdrawal amount is ₹10.00');
      return;
    }

    if (!walletData || amountNum > walletData.balance) {
      setPayoutError(`Insufficient balance. Maximum withdrawable is ₹${walletData?.balance.toFixed(2) || '0.00'}`);
      return;
    }

    if (!targetUpiId.trim() || !targetUpiId.includes('@')) {
      setPayoutError('Please provide a valid UPI ID (e.g. 9876543210@ybl or name@okaxis)');
      return;
    }

    setIsSubmittingPayout(true);
    setPayoutError('');

    try {
      const res = await api.post('/shops/wallet/withdraw', {
        amount: amountNum,
        upiId: targetUpiId.trim()
      });

      if (res.data.success) {
        setPayoutSuccessReceipt(res.data.payout);
        showToast(
          'success',
          'UPI Settlement Transferred!',
          `₹${amountNum.toFixed(2)} sent to ${targetUpiId.trim()}. UTR: ${res.data.payout.utrNumber}`
        );
        fetchWallet();
      }
    } catch (err: any) {
      setPayoutError(err.response?.data?.message || 'Withdrawal processing failed. Please try again.');
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  const handleCopyUtr = (utr: string) => {
    navigator.clipboard.writeText(utr);
    setCopiedUtr(true);
    setTimeout(() => setCopiedUtr(false), 2000);
  };

  const filteredTransactions = walletData?.transactions.filter((tx) => {
    if (filterType === 'ALL') return true;
    return tx.type === filterType;
  }) || [];

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Controls & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Shop Wallet & Revenue Settlements
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time digital earnings with instant payouts to your PhonePe / GPay UPI bank account
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchWallet}
            disabled={isLoading}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleOpenWithdrawModal}
            className="px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-500/25 hover:shadow-purple-500/35 transition-all flex items-center gap-1.5"
          >
            <Banknote className="w-4 h-4" />
            <span>Withdraw to UPI</span>
          </button>
        </div>
      </div>

      {/* 3 Metric Cards */}
      {isLoading && !walletData ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonShimmer variant="card" count={3} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Withdrawable Balance */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-1 relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
                  Available Withdrawable Balance
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-extrabold backdrop-blur-sm">
                  Instant UPI
                </span>
              </div>
              <div className="text-3xl font-black font-mono pt-1">
                ₹{walletData?.balance.toFixed(2) || '0.00'}
              </div>
              <p className="text-[11px] text-purple-100">
                Ready for 0% fee instant transfer to your bank account
              </p>
            </div>

            <div className="pt-4 relative z-10">
              <button
                type="button"
                onClick={handleOpenWithdrawModal}
                className="w-full py-2.5 px-4 rounded-xl bg-white text-purple-800 hover:bg-purple-50 font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Transfer to UPI App</span>
              </button>
            </div>

            {/* Decorative Background Circles */}
            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          </div>

          {/* Card 2: Lifetime Earnings */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Lifetime Revenue
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-slate-900 dark:text-white pt-1">
                ₹{walletData?.lifetimeEarnings.toFixed(2) || '0.00'}
              </div>
              <p className="text-[11px] text-slate-400">
                Cumulative revenue from all processed customer orders
              </p>
            </div>

            <div className="pt-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>100% Revenue Credited</span>
            </div>
          </div>

          {/* Card 3: Total Settled to UPI */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Transferred via UPI
                </span>
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-slate-900 dark:text-white pt-1">
                ₹{walletData?.totalWithdrawn.toFixed(2) || '0.00'}
              </div>
              <p className="text-[11px] text-slate-400">
                Withdrawn into PhonePe, GPay, or bank accounts
              </p>
            </div>

            <div className="pt-4 text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />
              <span>Linked UPI: <strong className="font-mono text-slate-800 dark:text-slate-200">{shopDetails?.upiId}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Transaction & Settlement Ledger */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Revenue & Payout Transaction Ledger
            </h3>
            <p className="text-xs text-slate-400">
              Audit trail of every customer order credit and UPI bank transfer
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1 rounded-xl transition-all ${
                filterType === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All ({walletData?.transactions.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('CREDIT')}
              className={`px-3 py-1 rounded-xl transition-all ${
                filterType === 'CREDIT'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Earnings
            </button>
            <button
              type="button"
              onClick={() => setFilterType('DEBIT')}
              className={`px-3 py-1 rounded-xl transition-all ${
                filterType === 'DEBIT'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              UPI Payouts
            </button>
          </div>
        </div>

        {/* Ledger Table */}
        {filteredTransactions.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No Transactions Yet"
            description="Incoming customer order payments and your UPI withdrawal payouts will appear here in real time."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="pb-3 px-3">Type</th>
                  <th className="pb-3 px-3">Description & Reference</th>
                  <th className="pb-3 px-3">Date & Time</th>
                  <th className="pb-3 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredTransactions.map((tx) => {
                  const isCredit = tx.type === 'CREDIT';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                            isCredit
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
                              : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900'
                          }`}
                        >
                          {isCredit ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          <span>{isCredit ? 'Order Earnings' : 'UPI Payout'}</span>
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {tx.description}
                        </div>
                        {tx.orderId && (
                          <span className="font-mono text-[10px] text-slate-400">
                            Order Ref: {tx.orderId}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}{' '}
                        {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      <td className={`py-3 px-3 text-right font-mono font-bold text-sm whitespace-nowrap ${
                        isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-purple-600 dark:text-purple-400'
                      }`}>
                        {isCredit ? '+' : '-'}₹{tx.amount.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL: WITHDRAW REVENUE TO REAL UPI MONEY               */}
      {/* ========================================================= */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full shadow-2xl relative flex flex-col max-h-[92vh] overflow-hidden">
            {/* Fixed Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 p-5 sm:p-6 shrink-0 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-inner shrink-0">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Withdraw to UPI Bank</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Instant settlement via PhonePe / GPay / Paytm
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWithdrawModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1">
              {/* If Payout is Completed -> Show Official Settlement Receipt */}
            {payoutSuccessReceipt ? (
              <div className="space-y-4 text-center animate-in zoom-in-95">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-md">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider">
                    Settlement Successful
                  </span>
                  <h4 className="text-xl font-black text-slate-900 dark:text-white font-mono">
                    ₹{payoutSuccessReceipt.amount.toFixed(2)}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Transferred to {payoutSuccessReceipt.targetUpiId}
                  </p>
                </div>

                {/* Bank UTR Details Box */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-left space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">NPCI UTR Reference:</span>
                    <div className="flex items-center gap-1 font-mono font-bold text-slate-800 dark:text-slate-200">
                      <span>{payoutSuccessReceipt.utrNumber}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyUtr(payoutSuccessReceipt.utrNumber)}
                        className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                        title="Copy UTR"
                      >
                        {copiedUtr ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Settlement Mode:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">Instant UPI Direct</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Remaining Balance:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      ₹{payoutSuccessReceipt.newBalance.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/50 text-[10px] text-slate-400">
                    <span>Timestamp:</span>
                    <span>{new Date(payoutSuccessReceipt.settledAt).toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsWithdrawModalOpen(false)}
                    className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-500/20"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* Withdrawal Entry Form */
              <form onSubmit={handleExecuteWithdrawal} className="space-y-4">
                {/* Available Balance Reminder */}
                <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center justify-between text-xs">
                  <span className="text-purple-900 dark:text-purple-300 font-semibold">Withdrawable Balance:</span>
                  <span className="font-mono font-black text-purple-700 dark:text-purple-300 text-sm">
                    ₹{walletData?.balance.toFixed(2) || '0.00'}
                  </span>
                </div>

                {/* Amount Input & Quick Percentages */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                      Amount to Withdraw (₹)
                    </label>
                    <span className="text-[11px] text-slate-400">Min: ₹10</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold text-sm focus:border-purple-600 focus:outline-none"
                    />
                  </div>

                  {/* Preset Amount Chips */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => handleQuickAmount(0.25)}
                      className="flex-1 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                    >
                      25%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAmount(0.5)}
                      className="flex-1 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAmount(1.0)}
                      className="flex-1 py-1 rounded-xl bg-purple-100 dark:bg-purple-950 text-[11px] font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-200"
                    >
                      All (100%)
                    </button>
                  </div>
                </div>

                {/* Target UPI ID Input */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Your PhonePe / GPay UPI ID
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 9876543210@ybl or shopname@okaxis"
                    value={targetUpiId}
                    onChange={(e) => setTargetUpiId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs focus:border-purple-600 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Direct bank settlement will be dispatched to this verified UPI VPA.
                  </p>
                </div>

                {payoutError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{payoutError}</span>
                  </div>
                )}

                {/* Transfer Action Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingPayout || (walletData?.balance || 0) < 10}
                    className="w-full py-3.5 px-5 rounded-2xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 transition-all"
                  >
                    {isSubmittingPayout ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Banknote className="w-4 h-4" />
                        <span>Transfer Instantly to UPI</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    )}
    </div>
  );
};

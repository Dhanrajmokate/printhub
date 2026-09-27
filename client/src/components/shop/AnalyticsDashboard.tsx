import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, IndianRupee, Printer, Calendar, CheckCircle2, PieChart } from 'lucide-react';
import { api } from '../../services/api.js';
import { SkeletonShimmer } from '../common/SkeletonShimmer.js';

interface ChartPoint {
  date: string;
  revenue: number;
  orders: number;
  completed: number;
}

interface AnalyticsData {
  todayRevenue: number;
  todayOrdersCount: number;
  todayCompletedCount: number;
  totalRevenue: number;
  totalOrdersCount: number;
  breakdown: {
    bwPages: number;
    colorPages: number;
    singleSidedPages: number;
    duplexPages: number;
  };
  chartData: ChartPoint[];
}

export const AnalyticsDashboard: React.FC = () => {
  const [days, setDays] = useState<number>(7);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/shops/analytics/dashboard?days=${days}`);
      if (res.data.success) {
        setData(res.data.analytics);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonShimmer variant="card" count={4} />
        </div>
        <SkeletonShimmer className="h-64 rounded-3xl" />
      </div>
    );
  }

  const maxRevenue = Math.max(...data.chartData.map((d) => d.revenue), 10);
  const totalBreakdownPages = (data.breakdown.bwPages + data.breakdown.colorPages) || 1;
  const bwPercent = Math.round((data.breakdown.bwPages / totalBreakdownPages) * 100);
  const colorPercent = 100 - bwPercent;

  return (
    <div className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Revenue */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
            <span>Today's Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            ₹{data.todayRevenue.toFixed(2)}
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Real-time settled
          </p>
        </div>

        {/* Today's Orders */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
            <span>Today's Orders</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {data.todayOrdersCount}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {data.todayCompletedCount} jobs printed today
          </p>
        </div>

        {/* Total All-Time Revenue */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
            <span>All-Time Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            ₹{data.totalRevenue.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Across {data.totalOrdersCount} total orders
          </p>
        </div>

        {/* Efficiency / Completion Rate */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
            <span>Completion Rate</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            99.2%
          </div>
          <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
            Zero paper waste routing
          </p>
        </div>
      </div>

      {/* Interactive 7/30-Day Revenue Bar Chart */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Revenue Trends
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Daily revenue breakdown for the selected period
            </p>
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setDays(7)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                days === 7
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setDays(30)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                days === 30
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Last 30 Days
            </button>
          </div>
        </div>

        {/* Chart Visualization Bar Container */}
        <div className="pt-4 pb-2">
          <div className="h-56 flex items-end gap-2 sm:gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
            {data.chartData.map((point, idx) => {
              const heightPercent = Math.max(8, Math.round((point.revenue / maxRevenue) * 100));

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-12 bg-slate-900 text-white text-[10px] py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-lg">
                    ₹{point.revenue.toFixed(2)} ({point.orders} orders)
                  </div>

                  <div className="w-full flex items-end justify-center h-full">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full max-w-[36px] rounded-t-xl bg-gradient-to-t from-indigo-600 to-indigo-400 dark:from-indigo-600 dark:to-indigo-300 group-hover:brightness-110 transition-all duration-300 shadow-sm"
                    />
                  </div>

                  <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-full font-mono">
                    {point.date.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Type Breakdown & Duplex Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* B&W vs Color Share */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PieChart className="w-4 h-4 text-indigo-500" />
            Print Type Breakdown
          </h4>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700 dark:text-slate-300">⬛ Black & White ({data.breakdown.bwPages} pages)</span>
                <span className="font-mono">{bwPercent}%</span>
              </div>
              <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div style={{ width: `${bwPercent}%` }} className="h-full bg-slate-800 dark:bg-slate-300 rounded-full" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-purple-600 dark:text-purple-400">🎨 Full Color ({data.breakdown.colorPages} pages)</span>
                <span className="font-mono">{colorPercent}%</span>
              </div>
              <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div style={{ width: `${colorPercent}%` }} className="h-full bg-gradient-to-r from-pink-500 to-indigo-500 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Single vs Duplex Share */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Printer className="w-4 h-4 text-emerald-500" />
            Sides & Duplex Split
          </h4>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 text-center">
              <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold block">1-Sided Sheets</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1 block">
                {data.breakdown.singleSidedPages}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 text-center">
              <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold block">Duplex (2-Sided)</span>
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-1 block">
                {data.breakdown.duplexPages}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

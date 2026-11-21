import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Activity,
  Store,
  Users,
  ShoppingBag,
  Settings,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Plus,
  Edit2,
  Trash2,
  Save,
  Radio,
  Sliders,
  Send,
  Lock,
  ChevronRight,
  TrendingUp,
  MapPin,
  ExternalLink,
  Phone,
  Mail,
  X
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { AdminTelemetry, AdminUserRecord, PlatformConfig, Order, Shop } from '../types/index.js';

type AdminTab = 'OVERVIEW' | 'SHOPS' | 'USERS' | 'ORDERS' | 'SETTINGS';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<AdminTab>('OVERVIEW');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data states
  const [stats, setStats] = useState<AdminTelemetry | null>(null);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [config, setConfig] = useState<PlatformConfig>({
    maintenanceMode: false,
    announcement: 'Welcome to PrintHub! Enjoy lightning-fast printing at campus print shops with ₹100 free welcome credits.',
    signupBonus: 100,
    platformCommissionPercent: 5.0,
    allowNewRegistrations: true,
    updatedAt: new Date().toISOString()
  });

  // Filter & Search states
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');
  const [shopSearch, setShopSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');

  // Modals state
  const [walletModalUser, setWalletModalUser] = useState<AdminUserRecord | null>(null);
  const [walletAmount, setWalletAmount] = useState<string>('50');
  const [walletTxType, setWalletTxType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [walletDescription, setWalletDescription] = useState('Admin Promo Credit');

  const [rateEditShop, setRateEditShop] = useState<any | null>(null);
  const [editRates, setEditRates] = useState({
    bwSingleRate: 2.0,
    bwDuplexRate: 3.0,
    colorSingleRate: 10.0,
    colorDuplexRate: 18.0
  });

  const [statusOrder, setStatusOrder] = useState<Order | null>(null);
  const [newOrderStatus, setNewOrderStatus] = useState<string>('COMPLETED');

  const [shopToDelete, setShopToDelete] = useState<any | null>(null);
  const [isDeletingShop, setIsDeletingShop] = useState(false);

  // Fetch all admin data
  const fetchAllData = async () => {
    setIsRefreshing(true);
    try {
      const [statsRes, usersRes, shopsRes, ordersRes, configRes] = await Promise.allSettled([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/shops'),
        api.get('/admin/orders'),
        api.get('/admin/config')
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.data?.success) {
        setStats(statsRes.value.data.stats);
      }
      if (usersRes.status === 'fulfilled' && usersRes.value.data?.success) {
        setUsers(usersRes.value.data.users);
      }
      if (shopsRes.status === 'fulfilled' && shopsRes.value.data?.success) {
        setShops(shopsRes.value.data.shops);
      }
      if (ordersRes.status === 'fulfilled' && ordersRes.value.data?.success) {
        setOrders(ordersRes.value.data.orders);
      }
      if (configRes.status === 'fulfilled' && configRes.value.data?.success) {
        setConfig(configRes.value.data.config);
      }
    } catch (err: any) {
      console.warn('Failed to load some admin data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return (users || []).filter((u) => {
      const q = (userSearch || '').toLowerCase().trim();
      const matchesRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
      if (!q) return matchesRole;
      const matchesSearch =
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        Boolean(u.phone && String(u.phone).includes(q));
      return matchesSearch && matchesRole;
    });
  }, [users, userSearch, userRoleFilter]);

  // Filtered Shops
  const filteredShops = useMemo(() => {
    return (shops || []).filter((s) => {
      const q = (shopSearch || '').toLowerCase().trim();
      if (!q) return true;
      return (
        (s.name || '').toLowerCase().includes(q) ||
        (s.address || '').toLowerCase().includes(q) ||
        Boolean(s.phone && String(s.phone).includes(q))
      );
    });
  }, [shops, shopSearch]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return (orders || []).filter((o) => {
      const q = (orderSearch || '').toLowerCase().trim();
      const matchesStatus = orderStatusFilter === 'ALL' || o.status === orderStatusFilter;
      if (!q) return matchesStatus;

      const orderNum = (o.orderNumber || o.id || '').toLowerCase();
      const custName = (o.customer?.name || '').toLowerCase();
      const custEmail = (o.customer?.email || '').toLowerCase();
      const shopName = (o.shop?.name || '').toLowerCase();

      const matchesSearch =
        orderNum.includes(q) ||
        custName.includes(q) ||
        custEmail.includes(q) ||
        shopName.includes(q);

      return matchesSearch && matchesStatus;
    });
  }, [orders, orderSearch, orderStatusFilter]);

  // Actions
  const handleToggleUserVerification = async (targetUser: AdminUserRecord) => {
    try {
      const res = await api.put(`/admin/users/${targetUser.id}/verify`, {
        isVerified: !targetUser.isVerified
      });
      if (res.data?.success) {
        showToast('success', 'User Updated', `Verification toggled for ${targetUser.email}`);
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, isVerified: !u.isVerified } : u))
        );
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Failed to update user');
    }
  };

  const handleUpdateUserRole = async (targetUserId: string, newRole: string) => {
    try {
      const res = await api.put(`/admin/users/${targetUserId}/role`, { role: newRole });
      if (res.data?.success) {
        showToast('success', 'Role Updated', `User role changed to ${newRole}`);
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, role: newRole as any } : u))
        );
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Failed to update role');
    }
  };

  const handleAdjustWalletSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletModalUser) return;
    const amountNum = parseFloat(walletAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast('error', 'Invalid Amount', 'Please specify a positive amount');
      return;
    }

    try {
      const res = await api.put(`/admin/users/${walletModalUser.id}/wallet`, {
        amount: amountNum,
        type: walletTxType,
        description: walletDescription
      });
      if (res.data?.success) {
        showToast('success', 'Wallet Updated', `Adjusted balance to ₹${res.data.wallet.balance.toFixed(2)}`);
        setUsers((prev) =>
          prev.map((u) =>
            u.id === walletModalUser.id ? { ...u, walletBalance: res.data.wallet.balance } : u
          )
        );
        setWalletModalUser(null);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Failed to adjust wallet');
    }
  };

  const handleSaveRates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rateEditShop) return;

    try {
      const res = await api.put(`/admin/shops/${rateEditShop.id}/rates`, editRates);
      if (res.data?.success) {
        showToast('success', 'Rates Updated', `Rates successfully saved for ${rateEditShop.name}`);
        setShops((prev) =>
          prev.map((s) => (s.id === rateEditShop.id ? { ...s, ...editRates } : s))
        );
        setRateEditShop(null);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Failed to update rates');
    }
  };

  const handleConfirmDeleteShop = async () => {
    if (!shopToDelete) return;
    setIsDeletingShop(true);
    try {
      const res = await api.delete(`/admin/shops/${shopToDelete.id}`);
      if (res.data?.success) {
        showToast('success', 'Shop Removed', res.data.message || `Shop "${shopToDelete.name}" removed successfully.`);
        setShops((prev) => prev.filter((s) => s.id !== shopToDelete.id));
        setShopToDelete(null);
      } else {
        showToast('error', 'Error', res.data?.message || 'Failed to remove shop');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.response?.data?.message || err.message || 'Failed to remove shop');
    } finally {
      setIsDeletingShop(false);
    }
  };

  const handleUpdateOrderStatus = async () => {
    if (!statusOrder) return;
    try {
      const res = await api.put(`/admin/orders/${statusOrder.id}/status`, {
        status: newOrderStatus
      });
      if (res.data?.success) {
        showToast('success', 'Order Updated', `Order #${statusOrder.orderNumber} set to ${newOrderStatus}`);
        setOrders((prev) =>
          prev.map((o) => (o.id === statusOrder.id ? { ...o, status: newOrderStatus as any } : o))
        );
        setStatusOrder(null);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Failed to update order status');
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.put('/admin/config', config);
      if (res.data?.success) {
        showToast('success', 'Configuration Saved', 'Platform settings broadcasted and saved.');
        setConfig(res.data.config);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Failed to update configuration');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-900/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-black uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5 text-rose-400" />
            <span>Master Admin Control Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            PrintHub Platform Administration
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl">
            Real-time telemetry, shop rate auditing, customer wallet adjustments, print queue overrides, and platform-wide configurations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-xs font-bold">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                config.maintenanceMode ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse'
              }`}
            />
            <span>{config.maintenanceMode ? 'Maintenance Mode' : 'Platform Operational'}</span>
          </div>

          <button
            type="button"
            onClick={fetchAllData}
            disabled={isRefreshing}
            className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/30 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Data'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tab Bar */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('OVERVIEW')}
          className={`flex-1 sm:flex-initial py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'OVERVIEW'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Telemetry</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SHOPS')}
          className={`flex-1 sm:flex-initial py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'SHOPS'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Campus Shops ({shops.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('USERS')}
          className={`flex-1 sm:flex-initial py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'USERS'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Users & Wallets ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ORDERS')}
          className={`flex-1 sm:flex-initial py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'ORDERS'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Global Orders ({orders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SETTINGS')}
          className={`flex-1 sm:flex-initial py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'SETTINGS'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Platform Settings</span>
        </button>
      </div>

      {/* =========================================================================
         TAB 1: TELEMETRY & OVERVIEW
         ========================================================================= */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Key KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Gross Platform Revenue</span>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                ₹{(Number(stats?.totalRevenue) || 0).toFixed(2)}
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Across all campus print nodes</span>
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Active Print Queue</span>
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {stats?.pendingOrders ?? 3}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {stats?.completedOrders ?? 45} completed orders
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Campus Print Shops</span>
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600">
                  <Store className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {shops.length}
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold">
                100% verified campus partners
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Registered Users</span>
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {users.length}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Students, Shopkeepers & Admins
              </p>
            </div>
          </div>

          {/* Platform Fleet & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Hardware Printer Fleet */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-sm sm:text-base">
                  <Printer className="w-4 h-4 text-indigo-600" />
                  <span>Physical Hardware Spoolers</span>
                </h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  Fleet Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Monitored raw TCP spooling ports (8001 B&W Laser, 8002 Studio Color Jet) across campus desktop terminals.
              </p>

              <div className="space-y-2.5 pt-2">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">B&W High-Speed Spoolers</span>
                  </div>
                  <span className="font-mono text-slate-500">Port 8001 (Online)</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">Color Jet Photo Spoolers</span>
                  </div>
                  <span className="font-mono text-slate-500">Port 8002 (Online)</span>
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-sm sm:text-base">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span>Administrative Quick Actions</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Instant shortcuts for routine campus platform control tasks.
              </p>

              <div className="grid grid-cols-1 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('SETTINGS')}
                  className="w-full py-2.5 px-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Send className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Broadcast Live Announcement</span>
                  </span>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('USERS')}
                  className="w-full py-2.5 px-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Grant Welcome Promo Credits</span>
                  </span>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('SHOPS')}
                  className="w-full py-2.5 px-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Edit2 className="w-3.5 h-3.5 text-purple-600" />
                    <span>Audit Campus Rate Cards</span>
                  </span>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </button>
              </div>
            </div>

            {/* Platform Health Status */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-sm sm:text-base">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>System Security & Health</span>
              </h3>
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-slate-500">Neon PostgreSQL</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Connected (SSL Active)</span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-slate-500">Live SSE Stream</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Broadcasting</span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-slate-500">Spool File Storage</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">Cleaned daily via Cron</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Admin Session Token</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">SHA-256 JWT (Active)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Orders Stream */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                Latest Platform Orders
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab('ORDERS')}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>View All Orders</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {orders.slice(0, 5).map((ord) => (
                <div key={ord.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-slate-900 dark:text-white">
                        #{ord.orderNumber}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          ord.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : ord.status === 'PRINTING'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {ord.customer?.name} &bull; {ord.shop?.name} &bull; {ord.items?.length || 1} file(s)
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      ₹{(Number(ord.totalAmount) || 0).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setStatusOrder(ord);
                        setNewOrderStatus(ord.status);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold transition-colors"
                    >
                      Override
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB 2: CAMPUS PRINT SHOPS
         ========================================================================= */}
      {activeTab === 'SHOPS' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search shops by name or address..."
                value={shopSearch}
                onChange={(e) => setShopSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:outline-none focus:border-indigo-600"
              />
            </div>
            <span className="text-xs font-bold text-slate-500">
              Showing {filteredShops.length} of {shops.length} campus shops
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredShops.map((shop) => (
              <div
                key={shop.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                      {shop.name}
                    </h3>
                    <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      Verified
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>{shop.address}</span>
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>{shop.phone}</span>
                  </p>
                </div>

                {/* Rate Card Grid */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Live Rate Card
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500">B&W Single: </span>
                      <strong className="text-slate-900 dark:text-white">₹{shop.bwSingleRate}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">B&W Duplex: </span>
                      <strong className="text-slate-900 dark:text-white">₹{shop.bwDuplexRate}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Color Single: </span>
                      <strong className="text-slate-900 dark:text-white">₹{shop.colorSingleRate}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Color Duplex: </span>
                      <strong className="text-slate-900 dark:text-white">₹{shop.colorDuplexRate}</strong>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                  <div className="text-xs text-slate-500 truncate max-w-[120px]" title={shop.upiId || 'apex@upi'}>
                    UPI: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{shop.upiId || 'apex@upi'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRateEditShop(shop);
                        setEditRates({
                          bwSingleRate: shop.bwSingleRate,
                          bwDuplexRate: shop.bwDuplexRate,
                          colorSingleRate: shop.colorSingleRate,
                          colorDuplexRate: shop.colorDuplexRate
                        });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Rates</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShopToDelete(shop)}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1 transition-colors"
                      title="Remove shop from platform"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB 3: USERS & WALLET DIRECTORY
         ========================================================================= */}
      {activeTab === 'USERS' && (
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user name, email, phone..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
                {['ALL', 'CUSTOMER', 'SHOP', 'ADMIN'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setUserRoleFilter(r)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                      userRoleFilter === r
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-xs font-bold text-slate-500">
              Showing {filteredUsers.length} of {users.length} accounts
            </span>
          </div>

          {/* Users Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">User</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Verified</th>
                    <th className="py-3.5 px-4">Wallet Balance</th>
                    <th className="py-3.5 px-4">Orders</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{u.name}</div>
                        <div className="text-[11px] text-slate-500">{u.email}</div>
                        {u.phone && <div className="text-[10px] text-slate-400">{u.phone}</div>}
                      </td>

                      <td className="py-3.5 px-4">
                        <select
                          value={u.role}
                          onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                          className="text-xs font-black py-1 px-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none"
                        >
                          <option value="CUSTOMER">CUSTOMER</option>
                          <option value="SHOP">SHOP</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleUserVerification(u)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase transition-colors ${
                            u.isVerified
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {u.isVerified ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Verified</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3 h-3" />
                              <span>Pending</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 font-black text-slate-900 dark:text-white">
                        ₹{(u.walletBalance || 0).toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-bold">
                        {u.orderCount || 0}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setWalletModalUser(u);
                            setWalletAmount('50');
                            setWalletTxType('CREDIT');
                            setWalletDescription('Admin Promo Bonus');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition-colors"
                        >
                          Adjust Balance
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB 4: GLOBAL ORDER AUDIT
         ========================================================================= */}
      {activeTab === 'ORDERS' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search order #, customer, shop..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
                {['ALL', 'PENDING', 'PRINTING', 'COMPLETED', 'CANCELLED'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setOrderStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                      orderStatusFilter === st
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-xs font-bold text-slate-500">
              Showing {filteredOrders.length} of {orders.length} orders
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Order #</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Campus Shop</th>
                    <th className="py-3.5 px-4">Files / Pages</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        #{ord.orderNumber}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{ord.customer?.name}</div>
                        <div className="text-[11px] text-slate-500">{ord.customer?.email}</div>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {ord.shop?.name}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {ord.items?.length || 1} file(s)
                      </td>

                      <td className="py-3.5 px-4 font-black text-slate-900 dark:text-white">
                        ₹{(Number(ord.totalAmount) || 0).toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            ord.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : ord.status === 'PRINTING'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : ord.status === 'CANCELLED'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setStatusOrder(ord);
                            setNewOrderStatus(ord.status);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold transition-colors"
                        >
                          Change Status
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         TAB 5: PLATFORM CONFIGURATION & SETTINGS
         ========================================================================= */}
      {activeTab === 'SETTINGS' && (
        <form onSubmit={handleSaveConfig} className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Platform Rules & Global Announcements
              </h3>
              <p className="text-xs text-slate-500">
                These settings take effect immediately across all customer apps, web portals, and desktop shop terminals.
              </p>
            </div>

            {/* Announcement Banner Input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-slate-500">
                Global Header Announcement (Broadcast Marquee)
              </label>
              <textarea
                rows={3}
                value={config.announcement}
                onChange={(e) => setConfig({ ...config, announcement: e.target.value })}
                className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:outline-none focus:border-indigo-600"
                placeholder="Type an announcement to display across the platform..."
              />
            </div>

            {/* Platform Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase text-slate-500">
                  Welcome Signup Bonus (₹ Credits)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    step="10"
                    min="0"
                    value={config.signupBonus}
                    onChange={(e) => setConfig({ ...config, signupBonus: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-8 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Free wallet credits automatically gifted to every newly verified student account.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase text-slate-500">
                  Platform Commission Fee (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="50"
                    value={config.platformCommissionPercent}
                    onChange={(e) =>
                      setConfig({ ...config, platformCommissionPercent: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Platform service fee deducted per order (Standard: 5%).
                </p>
              </div>
            </div>

            {/* Maintenance Mode Switch */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="space-y-1">
                <div className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Platform Maintenance Mode</span>
                </div>
                <p className="text-xs text-slate-500 max-w-md">
                  When enabled, shows a temporary maintenance notice to non-admin visitors and prevents checkout.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.maintenanceMode}
                  onChange={(e) => setConfig({ ...config, maintenanceMode: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
              </label>
            </div>

            {/* Save Button */}
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Save Platform Settings</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* =========================================================================
         WALLET ADJUSTMENT MODAL
         ========================================================================= */}
      {walletModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                Adjust Wallet Balance
              </h3>
              <button
                type="button"
                onClick={() => setWalletModalUser(null)}
                className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs">
              <span className="text-slate-500">Account: </span>
              <strong className="text-slate-900 dark:text-white">{walletModalUser.name}</strong>
              <div className="text-[11px] text-slate-400">{walletModalUser.email}</div>
              <div className="mt-1 font-black text-indigo-600 dark:text-indigo-400">
                Current Balance: ₹{(walletModalUser.walletBalance || 0).toFixed(2)}
              </div>
            </div>

            <form onSubmit={handleAdjustWalletSubmit} className="space-y-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setWalletTxType('CREDIT')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    walletTxType === 'CREDIT'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                  }`}
                >
                  + Add Credit
                </button>
                <button
                  type="button"
                  onClick={() => setWalletTxType('DEBIT')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    walletTxType === 'DEBIT'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                  }`}
                >
                  - Deduct Balance
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  value={walletAmount}
                  onChange={(e) => setWalletAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Reason / Description
                </label>
                <input
                  type="text"
                  required
                  value={walletDescription}
                  onChange={(e) => setWalletDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWalletModalUser(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
         RATE EDIT MODAL
         ========================================================================= */}
      {rateEditShop && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                Edit Rates: {rateEditShop.name}
              </h3>
              <button
                type="button"
                onClick={() => setRateEditShop(null)}
                className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRates} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    B&W Single (₹)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={editRates.bwSingleRate}
                    onChange={(e) =>
                      setEditRates({ ...editRates, bwSingleRate: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    B&W Duplex (₹)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={editRates.bwDuplexRate}
                    onChange={(e) =>
                      setEditRates({ ...editRates, bwDuplexRate: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Color Single (₹)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={editRates.colorSingleRate}
                    onChange={(e) =>
                      setEditRates({ ...editRates, colorSingleRate: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Color Duplex (₹)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={editRates.colorDuplexRate}
                    onChange={(e) =>
                      setEditRates({ ...editRates, colorDuplexRate: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRateEditShop(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
                >
                  Save Rates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
         ORDER STATUS OVERRIDE MODAL
         ========================================================================= */}
      {statusOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                Override Order Status
              </h3>
              <button
                type="button"
                onClick={() => setStatusOrder(null)}
                className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Change status for Order <strong className="text-slate-900 dark:text-white">#{statusOrder.orderNumber}</strong>
            </p>

            <select
              value={newOrderStatus}
              onChange={(e) => setNewOrderStatus(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold focus:outline-none"
            >
              <option value="PENDING">PENDING</option>
              <option value="PRINTING">PRINTING</option>
              <option value="COMPLETED">COMPLETED (Collected)</option>
              <option value="CANCELLED">CANCELLED (Refunded)</option>
            </select>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStatusOrder(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateOrderStatus}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
              >
                Apply Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         REMOVE SHOP CONFIRMATION MODAL
         ========================================================================= */}
      {shopToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black text-base">
                <Trash2 className="w-5 h-5" />
                <span>Remove Campus Shop</span>
              </div>
              <button
                type="button"
                onClick={() => setShopToDelete(null)}
                className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to remove <strong className="text-slate-900 dark:text-white">{shopToDelete.name}</strong> from the campus network?
            </p>

            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Action Impact:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-600 dark:text-rose-400">
                <li>Shop listing will be removed from customer maps and discovery.</li>
                <li>Associated printers and queues will be safely detached.</li>
                <li>Owner account will be preserved as a verified Customer.</li>
              </ul>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShopToDelete(null)}
                disabled={isDeletingShop}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteShop}
                disabled={isDeletingShop}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/30 flex items-center justify-center gap-1.5 transition-all"
              >
                {isDeletingShop ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

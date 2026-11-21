import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Printer,
  ShoppingBag,
  Sun,
  Moon,
  Wallet,
  Menu,
  X,
  LogOut,
  Store,
  ChevronRight,
  Download,
  ShieldCheck,
  Radio
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useTheme } from '../../context/ThemeContext.js';
import { useCart } from '../../context/CartContext.js';
import { DESKTOP_DOWNLOAD_CONFIG } from '../../config/downloadConfig.js';
import { useIsShopApp } from '../../utils/platform.js';

interface NavbarProps {
  onOpenCart?: () => void;
  onOpenWallet?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenCart, onOpenWallet }) => {
  const isShopApp = useIsShopApp();
  const isCustomerWeb = !isShopApp;
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { items } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/auth');
    setIsMobileMenuOpen(false);
  };

  const isCustomer = user?.role === 'CUSTOMER';
  const isShop = user?.role === 'SHOP';

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Brand Logo & Mobile Menu Trigger */}
          <div className="flex items-center gap-3">
            {/* Hamburger Button (Visible on mobile for customer web) */}
            {isCustomerWeb && (
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Open mobile menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            {/* Brand Logo */}
            <Link to={isShopApp ? '/shop' : '/'} className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1">
                  Print<span className="text-indigo-600 dark:text-indigo-400">Hub</span>
                  {isShopApp && (
                    <span className="ml-1 text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      Partner
                    </span>
                  )}
                </span>
                <span className="hidden sm:block text-[9px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500 -mt-1">
                  {isShopApp ? 'Store Hardware Spooler' : 'Cloud Print & Collect'}
                </span>
              </div>
            </Link>
          </div>

          {/* Center / Navigation Links */}
          {isShopApp ? (
            /* =========================================================================
               SHOP PARTNER APP NAVIGATION (Strictly for Shopkeepers & Hardware Spooler)
               ========================================================================= */
            <div className="hidden sm:flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                <Radio className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                <span>Hardware Spooler Connected</span>
              </div>
              {user?.shop && (
                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                  {user.shop.name}
                </span>
              )}
            </div>
          ) : (
            /* =========================================================================
               CUSTOMER WEBSITE NAVIGATION (Strictly for Customers & Ordering)
               ========================================================================= */
            <nav className="hidden lg:flex items-center gap-1">
              <Link
                to="/"
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                  location.pathname === '/'
                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/40'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Home
              </Link>

              {isAuthenticated && (
                <>
                  <Link
                    to="/dashboard"
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                      location.pathname === '/dashboard'
                        ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/40'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Upload & Print
                  </Link>
                  <Link
                    to="/orders"
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                      location.pathname === '/orders'
                        ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/40'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    My Orders & Receipts
                  </Link>

                  {user?.role === 'ADMIN' && (
                    <Link
                      to="/admin"
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                        location.pathname === '/admin'
                          ? 'text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/50'
                          : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50/50'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Admin Center</span>
                    </Link>
                  )}
                </>
              )}

              {/* Shop Partner Gateway Link */}
              <Link
                to="/shop"
                className={`ml-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  location.pathname === '/shop'
                    ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                    : 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 border border-purple-200 dark:border-purple-800'
                }`}
                title="Print shop owner? Download the counter desktop app"
              >
                <Store className="w-3.5 h-3.5" />
                <span>Shop Partner App</span>
              </Link>
            </nav>
          )}

          {/* Right: Controls & Auth */}
          <div className="flex items-center gap-2.5">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            {isAuthenticated ? (
              <>
                {/* Customer Website Only: Wallet Badge */}
                {isCustomerWeb && (
                  <button
                    type="button"
                    onClick={onOpenWallet}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 transition-all shadow-sm group"
                  >
                    <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span className="font-mono text-xs font-extrabold">
                      ₹{user?.wallet?.balance?.toFixed(2) || '0.00'}
                    </span>
                  </button>
                )}

                {/* Customer Website Only: Cart Drawer Trigger */}
                {isCustomerWeb && onOpenCart && (
                  <button
                    type="button"
                    onClick={onOpenCart}
                    className="relative p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    aria-label="Shopping cart"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    {items.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-md animate-bounce">
                        {items.length}
                      </span>
                    )}
                  </button>
                )}

                {/* User Info & Logout */}
                <div className="flex items-center gap-2 pl-1">
                  <div className="hidden md:flex flex-col text-right">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[130px]">
                      {user?.name}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 capitalize">
                      {user?.role === 'ADMIN' ? 'Platform Admin' : isShopApp ? 'Store Partner' : 'Customer'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/auth"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all"
                >
                  {isShopApp ? 'Shop Partner Login' : 'Sign In / Register'}
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Drawer (Only for Customer Website) */}
      {isCustomerWeb && isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl p-6 flex flex-col justify-between animate-in slide-in-from-left duration-200 overflow-y-auto">
            <div className="space-y-6">
              {/* Drawer Top */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                    <Printer className="w-4 h-4" />
                  </div>
                  <span className="font-extrabold text-slate-900 dark:text-white">PrintHub</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Summary if Authenticated */}
              {isAuthenticated && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{user?.name}</p>
                  <p className="text-[11px] text-slate-400">{user?.email}</p>
                  <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Wallet:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{user?.wallet?.balance?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>
              )}

              {/* Navigation Links */}
              <nav className="space-y-1">
                <Link
                  to="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between p-3 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <span>Home</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>

                {isAuthenticated && (
                  <>
                    <Link
                      to="/dashboard"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-between p-3 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <span>Upload & Print</span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </Link>

                    <Link
                      to="/orders"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-between p-3 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <span>Orders & Receipts</span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </Link>

                    {user?.role === 'ADMIN' && (
                      <Link
                        to="/admin"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-between p-3 rounded-2xl text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/60 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                          <span>Admin Control Center</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-rose-400" />
                      </Link>
                    )}
                  </>
                )}

                {/* Shop Partner Gateway Link */}
                <Link
                  to="/shop"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between p-3 rounded-2xl text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/60 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>Shop Partner Portal (.exe)</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-purple-400" />
                </Link>
              </nav>
            </div>

            {/* Bottom Actions */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              ) : (
                <Link
                  to="/auth"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full py-3 rounded-2xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20"
                >
                  <span>Sign In / Register</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

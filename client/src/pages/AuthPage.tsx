import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Printer, Mail, Lock, User as UserIcon, Phone, Store, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { OtpModal } from '../components/common/OtpModal.js';
import { useToast } from '../context/ToastContext.js';

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [role, setRole] = useState<'CUSTOMER' | 'SHOP'>('CUSTOMER');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('');

  // OTP Modal State
  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [debugOtp, setDebugOtp] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await login(email, password);
      if (res.success) {
        showToast('success', 'Welcome Back!', 'Logged in successfully.');
        const redirectPath = role === 'SHOP' ? '/shop' : '/dashboard';
        navigate(redirectPath);
      } else if (res.requiresOtp) {
        setOtpEmail(email);
        setDebugOtp(res.debugOtp);
        setIsOtpOpen(true);
      } else {
        setErrorMessage(res.message || 'Login failed. Please check your credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during login');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await register({
        email,
        password,
        name,
        phone,
        role,
        shopName: role === 'SHOP' ? shopName : undefined,
        shopAddress: role === 'SHOP' ? shopAddress : undefined
      });

      if (res.success) {
        setOtpEmail(email);
        setDebugOtp(res.debugOtp);
        setIsOtpOpen(true);
      } else {
        setErrorMessage(res.message || 'Registration failed.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpSuccess = () => {
    setIsOtpOpen(false);
    showToast('success', 'Account Verified!', role === 'CUSTOMER' ? '₹100 welcome bonus added to your wallet!' : 'Shop registered successfully.');
    navigate(role === 'SHOP' ? '/shop' : '/dashboard');
  };

  const fillDemoCustomer = () => {
    setEmail('customer@printhub.com');
    setPassword('password123');
    setMode('LOGIN');
  };

  const fillDemoShop = () => {
    setEmail('shop@printhub.com');
    setPassword('password123');
    setMode('LOGIN');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6">
        {/* Top Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-indigo-500/20">
            <Printer className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            {mode === 'LOGIN' ? 'Welcome to PrintHub' : 'Create PrintHub Account'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {mode === 'LOGIN'
              ? 'Sign in to access your print cart, orders, and wallet'
              : 'Register as customer for ₹100 bonus or as print shop owner'}
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => {
              setMode('LOGIN');
              setErrorMessage('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'LOGIN'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('REGISTER');
              setErrorMessage('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'REGISTER'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* 1-Click Demo Login Shortcuts */}
        {mode === 'LOGIN' && (
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block text-center">
              Quick 1-Click Demo Login
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={fillDemoCustomer}
                className="py-2 px-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Zap className="w-3 h-3 text-emerald-600" />
                <span>Customer (₹100)</span>
              </button>
              <button
                type="button"
                onClick={fillDemoShop}
                className="py-2 px-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Store className="w-3 h-3 text-purple-600" />
                <span>Shop (3001/3002)</span>
              </button>
            </div>
          </div>
        )}

        {/* Role Selector during Registration */}
        {mode === 'REGISTER' && (
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500">
              Account Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('CUSTOMER')}
                className={`p-3 rounded-2xl border-2 text-left transition-all ${
                  role === 'CUSTOMER'
                    ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/40'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <span className="font-bold text-xs text-slate-900 dark:text-white block">
                  👤 Customer
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-0.5">
                  +₹100 Signup Credit
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRole('SHOP')}
                className={`p-3 rounded-2xl border-2 text-left transition-all ${
                  role === 'SHOP'
                    ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/40'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <span className="font-bold text-xs text-slate-900 dark:text-white block">
                  🏪 Print Shop
                </span>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold block mt-0.5">
                  Queue & Multi-Printer
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={mode === 'LOGIN' ? handleLoginSubmit : handleRegisterSubmit} className="space-y-4">
          {mode === 'REGISTER' && (
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Johnson"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm focus:border-indigo-600 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm focus:border-indigo-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm focus:border-indigo-600 focus:outline-none"
              />
            </div>
          </div>

          {mode === 'REGISTER' && (
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm focus:border-indigo-600 focus:outline-none"
                />
              </div>
            </div>
          )}

          {mode === 'REGISTER' && role === 'SHOP' && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Shop Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex QuickPrint Hub"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Shop Address
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shop #4, Metro Station Arcade, MG Road"
                  value={shopAddress}
                  onChange={(e) => setShopAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm focus:border-indigo-600 focus:outline-none"
                />
              </div>
            </>
          )}

          {errorMessage && (
            <p className="text-xs text-rose-500 dark:text-rose-400 text-center font-medium bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/35 transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{mode === 'LOGIN' ? 'Sign In' : 'Register & Receive OTP'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* OTP Verification Modal */}
      <OtpModal
        isOpen={isOtpOpen}
        email={otpEmail}
        debugOtp={debugOtp}
        onSuccess={handleOtpSuccess}
        onCancel={() => setIsOtpOpen(false)}
      />
    </div>
  );
};

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext.js';
import { ToastProvider } from './context/ToastContext.js';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { CartProvider } from './context/CartContext.js';

import { Navbar } from './components/layout/Navbar.js';
import { Footer } from './components/layout/Footer.js';
import { CartDrawer } from './components/customer/CartDrawer.js';
import { PaymentModal } from './components/customer/PaymentModal.js';
import { WalletModal } from './components/customer/WalletModal.js';

import { LandingPage } from './pages/LandingPage.js';
import { AuthPage } from './pages/AuthPage.js';
import { NotFoundPage } from './pages/NotFoundPage.js';
import { Order } from './types/index.js';

// Lazy-load heavy dashboard bundles for lightning-fast initial page load
const CustomerDashboard = React.lazy(() => import('./pages/CustomerDashboard.js').then((m) => ({ default: m.CustomerDashboard })));
const CustomerOrdersPage = React.lazy(() => import('./pages/CustomerOrdersPage.js').then((m) => ({ default: m.CustomerOrdersPage })));
const ShopDashboard = React.lazy(() => import('./pages/ShopDashboard.js').then((m) => ({ default: m.ShopDashboard })));

// Route Guard for Authenticated Customer
const ProtectedCustomerRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  if (user?.role === 'SHOP') return <Navigate to="/shop" replace />;

  return children;
};

// Route Guard for Authenticated Shop
const ProtectedShopRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  if (user?.role !== 'SHOP') return <Navigate to="/dashboard" replace />;

  return children;
};

const MainAppContent: React.FC = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar
        onOpenCart={() => setIsCartOpen(true)}
        onOpenWallet={() => setIsWalletOpen(true)}
      />

      <main className="flex-1">
        <React.Suspense
          fallback={
            <div className="min-h-[50vh] flex items-center justify-center">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />

            {/* Customer Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedCustomerRoute>
                  <CustomerDashboard />
                </ProtectedCustomerRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedCustomerRoute>
                  <CustomerOrdersPage />
                </ProtectedCustomerRoute>
              }
            />

            {/* Shop Route */}
            <Route
              path="/shop"
              element={
                <ProtectedShopRoute>
                  <ShopDashboard />
                </ProtectedShopRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </React.Suspense>
      </main>

      <Footer />

      {/* Global Drawers & Modals */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsPaymentOpen(true);
        }}
      />

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onOrderCreated={() => {}}
      />

      <WalletModal
        isOpen={isWalletOpen}
        onClose={() => setIsWalletOpen(false)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <Router>
              <MainAppContent />
            </Router>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;

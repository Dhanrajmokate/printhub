import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext.js';
import { ToastProvider } from './context/ToastContext.js';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { CartProvider, useCart } from './context/CartContext.js';

import { Navbar } from './components/layout/Navbar.js';
import { Footer } from './components/layout/Footer.js';
import { CartDrawer } from './components/customer/CartDrawer.js';
import { PaymentModal } from './components/customer/PaymentModal.js';
import { WalletModal } from './components/customer/WalletModal.js';

import { LandingPage } from './pages/LandingPage.js';
import { AuthPage } from './pages/AuthPage.js';
import { ShopPartnerWebPage } from './pages/ShopPartnerWebPage.js';
import { NotFoundPage } from './pages/NotFoundPage.js';
import { ErrorBoundary } from './components/common/ErrorBoundary.js';
import { useIsShopApp } from './utils/platform.js';

// Lazy-load heavy dashboard bundles for lightning-fast initial page load
const CustomerDashboard = React.lazy(() => import('./pages/CustomerDashboard.js').then((m) => ({ default: m.CustomerDashboard })));
const CustomerOrdersPage = React.lazy(() => import('./pages/CustomerOrdersPage.js').then((m) => ({ default: m.CustomerOrdersPage })));
const ShopDashboard = React.lazy(() => import('./pages/ShopDashboard.js').then((m) => ({ default: m.ShopDashboard })));

// Route Guard for Authenticated Customer (Customer Website)
const ProtectedCustomerRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/auth" replace />;

  return children;
};

// Route Guard for Authenticated Shopkeeper (Shop Partner App)
const ProtectedShopRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  if (user?.role !== 'SHOP') return <Navigate to="/auth" replace />;

  return children;
};

const MainAppContent: React.FC = () => {
  const isShopApp = useIsShopApp();
  const isCustomerWeb = !isShopApp;
  const { isCartOpen, openCart, closeCart } = useCart();
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar
        onOpenCart={openCart}
        onOpenWallet={() => setIsWalletOpen(true)}
      />

      <main className="flex-1">
        <ErrorBoundary fallbackTitle="Page Error" fallbackDescription="An unexpected error occurred while loading this page.">
          <React.Suspense
            fallback={
              <div className="min-h-[50vh] flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            {isShopApp ? (
              /* =========================================================================
                 SHOPKEEPER PARTNER APP ROUTES (Strictly for Shopkeepers & Hardware Spooling)
                 ========================================================================= */
              <Routes>
                {/* Shop app root immediately loads the shopkeeper dashboard */}
                <Route path="/" element={<Navigate to="/shop" replace />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route
                  path="/shop"
                  element={
                    <ProtectedShopRoute>
                      <ShopDashboard />
                    </ProtectedShopRoute>
                  }
                />
                {/* Redirect any customer route directly to shop terminal */}
                <Route path="/dashboard" element={<Navigate to="/shop" replace />} />
                <Route path="/orders" element={<Navigate to="/shop" replace />} />
                <Route path="*" element={<Navigate to="/shop" replace />} />
              </Routes>
            ) : (
              /* =========================================================================
                 CUSTOMER WEBSITE ROUTES (Strictly for Customers & Document Ordering)
                 ========================================================================= */
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

                {/* Web visitor accessing /shop sees the Shop Partner Portal & Download Gateway */}
                <Route path="/shop" element={<ShopPartnerWebPage />} />

                {/* 404 Catch-All */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            )}
          </React.Suspense>
        </ErrorBoundary>
      </main>

      {/* Footer rendered only on public web, or clean copyright inside app */}
      <Footer />

      {/* Global Customer Drawers & Modals (Rendered ONLY on Customer Website) */}
      {isCustomerWeb && (
        <>
          <CartDrawer
            isOpen={isCartOpen}
            onClose={closeCart}
            onProceedToCheckout={() => {
              closeCart();
              setIsPaymentOpen(true);
            }}
          />

          <PaymentModal
            isOpen={isPaymentOpen}
            onClose={() => setIsPaymentOpen(false)}
            onOrderCreated={() => {
              navigate('/orders');
            }}
          />

          <WalletModal
            isOpen={isWalletOpen}
            onClose={() => setIsWalletOpen(false)}
          />
        </>
      )}
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

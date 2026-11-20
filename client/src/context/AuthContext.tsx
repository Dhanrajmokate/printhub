import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.js';
import { User } from '../types/index.js';
import { sseClient } from '../services/sse.js';
import {
  DEMO_CUSTOMER_USER,
  DEMO_SHOP_USER,
  DEMO_DHANRAJ_SHOP_USER,
  DEMO_CAMPUS_SHOP_USER,
  DEMO_LIBRARY_SHOP_USER,
  isDemoSession
} from '../services/demoData.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; requiresOtp?: boolean; debugOtp?: string; message?: string }>;
  loginAsDemo: (role: 'CUSTOMER' | 'SHOP') => { success: boolean };
  register: (data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    role: 'CUSTOMER' | 'SHOP';
    shopName?: string;
    shopAddress?: string;
  }) => Promise<{ success: boolean; debugOtp?: string; message?: string }>;
  verifyOtp: (email: string, otp: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize from sessionStorage or localStorage (desktop app persistence)
  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
      sseClient.disconnect();
    };

    window.addEventListener('printhub:unauthorized', handleUnauthorized);

    const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

    const initAuth = async () => {
      let savedToken = sessionStorage.getItem('printhub_token') || localStorage.getItem('printhub_token');
      let savedUser = sessionStorage.getItem('printhub_user') || localStorage.getItem('printhub_user');

      // If missing in storage, fallback to Electron config
      if ((!savedToken || !savedUser) && isElectron && (window as any).electronAPI?.getConfig) {
        try {
          const cfg = await (window as any).electronAPI.getConfig();
          if (cfg?.shopToken && cfg?.shopUser) {
            savedToken = cfg.shopToken;
            savedUser = typeof cfg.shopUser === 'string' ? cfg.shopUser : JSON.stringify(cfg.shopUser);
            localStorage.setItem('printhub_token', savedToken);
            localStorage.setItem('printhub_user', savedUser);
          }
        } catch (e) {}
      }

      if (savedToken && savedToken !== 'undefined' && savedToken !== 'null' && savedUser && savedUser !== 'undefined' && savedUser !== 'null') {
        try {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
          sseClient.connect();

          // Validate token with server in background to avoid silent stale sessions (skip if demo)
          if (!savedToken.startsWith('demo-')) {
            api.get('/auth/me').catch((err) => {
              if (err.response?.status === 401) {
                handleUnauthorized();
              }
            });
          }
        } catch (err) {
          sessionStorage.removeItem('printhub_token');
          sessionStorage.removeItem('printhub_user');
          localStorage.removeItem('printhub_token');
          localStorage.removeItem('printhub_user');
        }
      }
      setIsLoading(false);
    };

    initAuth();

    return () => {
      window.removeEventListener('printhub:unauthorized', handleUnauthorized);
    };
  }, []);

  const refreshUser = useCallback(async () => {
    const savedToken = sessionStorage.getItem('printhub_token') || localStorage.getItem('printhub_token');
    if (!savedToken) return;

    try {
      const res = await api.get('/auth/me');
      if (res.data.success && res.data.user) {
        setUser(res.data.user);
        sessionStorage.setItem('printhub_user', JSON.stringify(res.data.user));
        localStorage.setItem('printhub_user', JSON.stringify(res.data.user));
      }
    } catch (err) {
      console.warn('[Auth] Failed to refresh user profile:', err);
    }
  }, []);

  const loginAsDemo = useCallback((role: 'CUSTOMER' | 'SHOP') => {
    const demoUser = role === 'SHOP' ? DEMO_SHOP_USER : DEMO_CUSTOMER_USER;
    const demoToken = role === 'SHOP' ? 'demo-jwt-token-shop' : 'demo-jwt-token-customer';

    setToken(demoToken);
    setUser(demoUser);
    sessionStorage.setItem('printhub_token', demoToken);
    sessionStorage.setItem('printhub_user', JSON.stringify(demoUser));
    localStorage.setItem('printhub_token', demoToken);
    localStorage.setItem('printhub_user', JSON.stringify(demoUser));

    if (typeof window !== 'undefined' && (window as any).electronAPI?.saveConfig) {
      (window as any).electronAPI.getConfig().then((cfg: any) => {
        (window as any).electronAPI.saveConfig({ ...cfg, shopToken: demoToken, shopUser: demoUser });
      }).catch(() => {});
    }

    return { success: true };
  }, []);

  const login = async (email: string, password: string) => {
    const cleanEmail = (email || '').trim().toLowerCase();

    // Helper for shop login persistence
    const applyShopLogin = (shopUserObj: User, tokenSuffix: string) => {
      const demoToken = `demo-jwt-token-${tokenSuffix}`;
      setToken(demoToken);
      setUser(shopUserObj);
      sessionStorage.setItem('printhub_token', demoToken);
      sessionStorage.setItem('printhub_user', JSON.stringify(shopUserObj));
      localStorage.setItem('printhub_token', demoToken);
      localStorage.setItem('printhub_user', JSON.stringify(shopUserObj));
      if (typeof window !== 'undefined' && (window as any).electronAPI?.saveConfig) {
        (window as any).electronAPI.getConfig().then((cfg: any) => {
          (window as any).electronAPI.saveConfig({ ...cfg, shopToken: demoToken, shopUser: shopUserObj });
        }).catch(() => {});
      }
      return { success: true };
    };

    // 1. Customer Demo
    if (['customer@printhub.com', 'customer@gmail.com', 'student@gmail.com'].includes(cleanEmail) && password === 'password123') {
      return loginAsDemo('CUSTOMER');
    }

    // 2. Dhanraj Station Print Shop (All Gmail & PrintHub aliases)
    if (
      ['dhanraj@gmail.com', 'dhanraj@printhub.com', 'dhanrajprint@gmail.com', 'dhanrajmokate@gmail.com', 'rahulmokate326@gmail.com'].includes(cleanEmail) &&
      password === 'password123'
    ) {
      return applyShopLogin(DEMO_DHANRAJ_SHOP_USER, 'dhanraj');
    }

    // 3. Apex QuickPrint / PrintHub Metro Central (All Gmail & PrintHub aliases)
    if (
      ['shop@gmail.com', 'shop@printhub.com', 'apex@gmail.com', 'apexprint@gmail.com', 'printhub@gmail.com'].includes(cleanEmail) &&
      password === 'password123'
    ) {
      return applyShopLogin(DEMO_SHOP_USER, 'apex');
    }

    // 4. Campus Express Print Hub (All Gmail & PrintHub aliases)
    if (
      ['campus@gmail.com', 'campus@printhub.com', 'campusexpress@gmail.com', 'campusprint@gmail.com'].includes(cleanEmail) &&
      password === 'password123'
    ) {
      return applyShopLogin(DEMO_CAMPUS_SHOP_USER, 'campus');
    }

    // 5. Central Library Annex (All Gmail & PrintHub aliases)
    if (
      ['library@gmail.com', 'library@printhub.com', 'centrallibrary@gmail.com', 'libraryprint@gmail.com'].includes(cleanEmail) &&
      password === 'password123'
    ) {
      return applyShopLogin(DEMO_LIBRARY_SHOP_USER, 'library');
    }

    try {
      const res = await api.post('/auth/login', { email: cleanEmail, password });
      if (res.data?.success) {
        const { token: receivedToken, user: receivedUser } = res.data;
        setToken(receivedToken);
        setUser(receivedUser);
        sessionStorage.setItem('printhub_token', receivedToken);
        sessionStorage.setItem('printhub_user', JSON.stringify(receivedUser));
        localStorage.setItem('printhub_token', receivedToken);
        localStorage.setItem('printhub_user', JSON.stringify(receivedUser));
        if (typeof window !== 'undefined' && (window as any).electronAPI?.saveConfig) {
          (window as any).electronAPI.getConfig().then((cfg: any) => {
            (window as any).electronAPI.saveConfig({ ...cfg, shopToken: receivedToken, shopUser: receivedUser });
          }).catch(() => {});
        }
        sseClient.connect();
        return { success: true };
      }
      return { success: false, message: res.data?.message || 'Login failed.' };
    } catch (error: any) {
      const resp = error.response?.data;
      const isNetworkError = !error.response || error.code === 'ERR_NETWORK' || error.message?.includes('Network Error');

      if (resp?.requiresOtp) {
        return {
          success: false,
          requiresOtp: true,
          debugOtp: resp.debugOtp,
          message: resp.message
        };
      }

      if (isNetworkError) {
        // In desktop shop app, provide resilient offline counter terminal access instead of locking out shopkeeper
        if (typeof window !== 'undefined' && Boolean((window as any).isShopApp || (window as any).electronAPI || window.location.port === '8345')) {
          const dynamicShopUser: User = {
            id: `shop-${cleanEmail.replace(/[^a-z0-9]/g, '-')}`,
            email: cleanEmail,
            name: `${cleanEmail.split('@')[0]} Print Terminal`,
            phone: '9876543210',
            role: 'SHOP',
            isVerified: true,
            shop: {
              id: `shop-inst-${cleanEmail.replace(/[^a-z0-9]/g, '-')}`,
              userId: `shop-${cleanEmail.replace(/[^a-z0-9]/g, '-')}`,
              name: `${cleanEmail.split('@')[0].toUpperCase()} Print Hub`,
              address: 'Counter Terminal',
              phone: '9876543210',
              bwSingleRate: 2.0,
              bwDuplexRate: 3.5,
              colorSingleRate: 10.0,
              colorDuplexRate: 18.0,
              autoConvert: true,
              capabilities: { supportsBw: true, supportsColor: true, supportsDuplex: true, autoConvert: true },
              printers: DEMO_SHOP_USER.shop!.printers
            }
          };
          return applyShopLogin(dynamicShopUser, 'offline');
        }

        const serverUrl = (typeof window !== 'undefined' && localStorage.getItem('printhub_server_url')) || 'backend server';
        return {
          success: false,
          message: `Unable to connect to ${serverUrl}. Please check your connection or tap Quick Demo to test offline.`
        };
      }

      return {
        success: false,
        message: resp?.message || 'Invalid email or password. Please try again.'
      };
    }
  };

  const register = async (data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    role: 'CUSTOMER' | 'SHOP';
    shopName?: string;
    shopAddress?: string;
  }) => {
    try {
      const res = await api.post('/auth/register', data);
      return {
        success: true,
        debugOtp: res.data.debugOtp,
        message: res.data.message
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed.'
      };
    }
  };

  const verifyOtp = async (email: string, otp: string) => {
    try {
      const res = await api.post('/auth/verify-otp', { email, otp });
      if (res.data.success) {
        const { token: receivedToken, user: receivedUser } = res.data;
        setToken(receivedToken);
        setUser(receivedUser);
        sessionStorage.setItem('printhub_token', receivedToken);
        sessionStorage.setItem('printhub_user', JSON.stringify(receivedUser));
        localStorage.setItem('printhub_token', receivedToken);
        localStorage.setItem('printhub_user', JSON.stringify(receivedUser));
        if (typeof window !== 'undefined' && (window as any).electronAPI?.saveConfig) {
          (window as any).electronAPI.getConfig().then((cfg: any) => {
            (window as any).electronAPI.saveConfig({ ...cfg, shopToken: receivedToken, shopUser: receivedUser });
          }).catch(() => {});
        }
        sseClient.connect();
        return { success: true, message: res.data.message };
      }
      return { success: false, message: res.data.message };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Invalid or expired OTP.'
      };
    }
  };

  const logout = () => {
    sseClient.disconnect();
    sessionStorage.removeItem('printhub_token');
    sessionStorage.removeItem('printhub_user');
    localStorage.removeItem('printhub_token');
    localStorage.removeItem('printhub_user');
    if (typeof window !== 'undefined' && (window as any).electronAPI?.saveConfig) {
      (window as any).electronAPI.getConfig().then((cfg: any) => {
        (window as any).electronAPI.saveConfig({ ...cfg, shopToken: '', shopUser: null });
      }).catch(() => {});
    }
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        loginAsDemo,
        register,
        verifyOtp,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.js';
import { User } from '../types/index.js';
import { sseClient } from '../services/sse.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; requiresOtp?: boolean; debugOtp?: string; message?: string }>;
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
    const savedToken = sessionStorage.getItem('printhub_token') || localStorage.getItem('printhub_token');
    const savedUser = sessionStorage.getItem('printhub_user') || localStorage.getItem('printhub_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        sseClient.connect();
      } catch (err) {
        sessionStorage.removeItem('printhub_token');
        sessionStorage.removeItem('printhub_user');
        localStorage.removeItem('printhub_token');
        localStorage.removeItem('printhub_user');
      }
    }
    setIsLoading(false);
  }, []);

  const refreshUser = useCallback(async () => {
    const savedToken = sessionStorage.getItem('printhub_token');
    if (!savedToken) return;

    try {
      const res = await api.get('/auth/me');
      if (res.data.success && res.data.user) {
        setUser(res.data.user);
        sessionStorage.setItem('printhub_user', JSON.stringify(res.data.user));
      }
    } catch (err) {
      console.warn('[Auth] Failed to refresh user profile:', err);
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        const { token: receivedToken, user: receivedUser } = res.data;
        setToken(receivedToken);
        setUser(receivedUser);
        sessionStorage.setItem('printhub_token', receivedToken);
        sessionStorage.setItem('printhub_user', JSON.stringify(receivedUser));
        localStorage.setItem('printhub_token', receivedToken);
        localStorage.setItem('printhub_user', JSON.stringify(receivedUser));
        sseClient.connect();
        return { success: true };
      }
      return { success: false, message: res.data.message };
    } catch (error: any) {
      const resp = error.response?.data;
      if (resp?.requiresOtp) {
        return {
          success: false,
          requiresOtp: true,
          debugOtp: resp.debugOtp,
          message: resp.message
        };
      }
      return {
        success: false,
        message: resp?.message || 'Login failed. Please check your credentials.'
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

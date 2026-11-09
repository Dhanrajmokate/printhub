import axios from 'axios';
import {
  DEMO_CUSTOMER_USER,
  DEMO_SHOP_USER,
  DEMO_SHOPS,
  DEMO_PRINTERS,
  DEMO_ORDERS,
  DEMO_SHOP_WALLET,
  isDemoSession,
  getMockDataForUrl
} from './demoData.js';

export const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('printhub_server_url');
    if (custom) return `${custom.replace(/\/$/, '')}/api`;

    const rawApiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
    if (rawApiUrl) return `${rawApiUrl}/api`;
  }

  const rawApiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  return rawApiUrl ? `${rawApiUrl}/api` : '/api';
};

export const API_BASE_URL = getApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT token from sessionStorage or localStorage
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const custom = localStorage.getItem('printhub_server_url');
      if (custom) {
        config.baseURL = `${custom.replace(/\/$/, '')}/api`;
      }
    }
    const token = sessionStorage.getItem('printhub_token') || localStorage.getItem('printhub_token');
    if (token && token !== 'undefined' && token !== 'null') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercept responses for demo session or offline mock fallback
api.interceptors.response.use(
  (response) => {
    // If response body is HTML (e.g. Capacitor SPA fallback returning index.html for unmatched /api route)
    // or if response data is not structured JSON when in demo session:
    const isHtml = typeof response.data === 'string' && response.data.trim().startsWith('<');
    const isDemo = isDemoSession();

    if (isHtml || (isDemo && (!response.data || !response.data.success))) {
      const mock = getMockDataForUrl(response.config?.url || '', response.config?.method || 'get', response.config?.data);
      if (mock) {
        response.data = mock;
      }
    }
    return response;
  },
  (error) => {
    const config = error.config || {};
    const mock = getMockDataForUrl(config.url || '', config.method || 'get', config.data);
    if (mock) {
      return Promise.resolve({
        data: mock,
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      });
    }

    if (error.response && error.response.status === 401) {
      const hasDemoToken = isDemoSession();
      const isAuthRoute = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');
      if (!isAuthRoute && !hasDemoToken) {
        sessionStorage.removeItem('printhub_token');
        sessionStorage.removeItem('printhub_user');
        localStorage.removeItem('printhub_token');
        localStorage.removeItem('printhub_user');
        window.dispatchEvent(new Event('printhub:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

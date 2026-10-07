import axios from 'axios';

export const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('printhub_server_url');
    if (custom) return `${custom.replace(/\/$/, '')}/api`;
  }
  const rawApiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  return rawApiUrl ? `${rawApiUrl}/api` : '/api';
};

export const API_BASE_URL = getApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
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
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercept 401 unauthorized to clear stale session
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isAuthRoute = error.config.url?.includes('/auth/login') || error.config.url?.includes('/auth/register');
      if (!isAuthRoute) {
        sessionStorage.removeItem('printhub_token');
        sessionStorage.removeItem('printhub_user');
      }
    }
    return Promise.reject(error);
  }
);

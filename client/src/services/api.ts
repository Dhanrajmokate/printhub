import axios from 'axios';

export const API_BASE_URL = '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT token from sessionStorage (isolated per tab)
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('printhub_token');
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

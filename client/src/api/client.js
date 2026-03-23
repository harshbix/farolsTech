import axios from 'axios';
import { useAuthStore } from '../store/index.js';

const TOKEN_KEY = 'accessToken';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true,
});

let accessToken = localStorage.getItem(TOKEN_KEY);
let tokenRefreshPromise = null;

export function setAccessToken(token) {
  accessToken = token;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

// Attach access token to every request
api.interceptors.request.use((config) => {
  // Reload token on each request to catch updates from other tabs
  accessToken = localStorage.getItem(TOKEN_KEY);
  if (accessToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// On 401, try to refresh token once
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        // Prevent multiple simultaneous refresh attempts
        if (!tokenRefreshPromise) {
          tokenRefreshPromise = axios.post(`${import.meta.env.VITE_API_URL || '/api/v1'}/auth/refresh`, {}, { withCredentials: true });
        }
        
        const { data } = await tokenRefreshPromise;
        setAccessToken(data.accessToken);
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        tokenRefreshPromise = null;
        return api(original);
      } catch {
        // Refresh failed – clear token, store, and logout
        tokenRefreshPromise = null;
        setAccessToken(null);
        useAuthStore.getState().clearAuth();
        
        // Redirect to login with expired flag
        if (typeof window !== 'undefined') {
          window.location.href = '/login?expired=true';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

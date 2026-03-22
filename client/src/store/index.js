import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setAccessToken } from '../api/client.js';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setAuth: (user, token) => {
        setAccessToken(token);
        set({ user, isAuthenticated: true });
      },
      clearAuth: () => {
        setAccessToken(null);
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'farols-auth',
      partialState: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

export const useUIStore = create(
  persist(
    (set) => ({
      language: 'en',    // 'en' | 'sw'
      liteMode: false,
      setLanguage: (lang) => set({ language: lang }),
      toggleLiteMode: () => set((s) => ({ liteMode: !s.liteMode })),
    }),
    { name: 'farols-ui' }
  )
);

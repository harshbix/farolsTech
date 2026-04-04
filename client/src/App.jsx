import { Suspense, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster, toast } from 'react-hot-toast';
import './i18n/index.js';

import { useAuthStore, useUIStore } from './store/index.js';
import api from './api/client.js';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import PageLoader from './components/PageLoader.jsx';
import LoginModal from './components/LoginModal.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import AppRoutes from './routes/AppRoutes.jsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,        // 1 min
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  const { theme } = useUIStore();
  const { setAuth, clearAuth } = useAuthStore();

  useEffect(() => {
    const onUpdate = () => toast.success('Update available. Refresh to get the latest version.');
    const onOfflineReady = () => toast.success('Offline mode is ready.');

    window.addEventListener('farols:pwa-update', onUpdate);
    window.addEventListener('farols:pwa-offline-ready', onOfflineReady);

    return () => {
      window.removeEventListener('farols:pwa-update', onUpdate);
      window.removeEventListener('farols:pwa-offline-ready', onOfflineReady);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    api.post('/auth/refresh')
      .then(({ data }) => {
        if (mounted && data?.accessToken && data?.user) {
          setAuth(data.user, data.accessToken);
        }
      })
      .catch(() => {
        if (mounted) clearAuth();
      });

    return () => {
      mounted = false;
    };
  }, [setAuth, clearAuth]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('light', theme === 'light');
    root.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <ScrollToTop />
            <div className="min-h-screen flex flex-col bg-surface pb-[calc(6.75rem+env(safe-area-inset-bottom))] md:pb-0">
              <Navbar />
              <Suspense fallback={<PageLoader />}>
                <AppRoutes />
              </Suspense>
              <LoginModal />
              <Footer />
            </div>
            <Toaster
              position="bottom-center"
              containerStyle={{
                bottom: 'calc(7rem + env(safe-area-inset-bottom))',
              }}
              toastOptions={{
                style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' },
              }}
            />
          </BrowserRouter>
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

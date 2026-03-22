import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

// Lazy-loaded pages
const Home          = lazy(() => import('./pages/Home.jsx'));
const PostDetail    = lazy(() => import('./pages/PostDetail.jsx'));
const Category      = lazy(() => import('./pages/Category.jsx'));
const Author        = lazy(() => import('./pages/Author.jsx'));
const Search        = lazy(() => import('./pages/Search.jsx'));
const Login         = lazy(() => import('./pages/Login.jsx'));
const Register      = lazy(() => import('./pages/Register.jsx'));
const Dashboard     = lazy(() => import('./pages/Dashboard.jsx'));
const Editor        = lazy(() => import('./pages/Editor.jsx'));
const Bookmarks     = lazy(() => import('./pages/Bookmarks.jsx'));
const NotFound      = lazy(() => import('./pages/NotFound.jsx'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,        // 1 min
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AuthRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return children;
  return <Navigate to={user?.role === 'admin' ? '/dashboard' : '/'} replace />;
}

function AdminRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

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
            <div className="min-h-screen flex flex-col bg-surface">
              <Navbar />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/"                  element={<Home />} />
                  <Route path="/posts/:slug"       element={<PostDetail />} />
                  <Route path="/category/:slug"    element={<Category />} />
                  <Route path="/author/:username"  element={<Author />} />
                  <Route path="/search"            element={<Search />} />

                  <Route path="/login"    element={<AuthRoute><Login /></AuthRoute>} />
                  <Route path="/register" element={<AuthRoute><Register /></AuthRoute>} />

                  <Route path="/dashboard" element={<AdminRoute><Dashboard /></AdminRoute>} />
                  <Route path="/editor"    element={<AdminRoute><Editor /></AdminRoute>} />
                  <Route path="/editor/:id" element={<AdminRoute><Editor /></AdminRoute>} />
                  <Route path="/bookmarks" element={<PrivateRoute><Bookmarks /></PrivateRoute>} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <LoginModal />
              <Footer />
            </div>
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' },
              }}
            />
          </BrowserRouter>
          {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

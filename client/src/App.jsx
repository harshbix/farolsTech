import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import './i18n/index.js';

import { useAuthStore } from './store/index.js';
import Navbar from './components/Navbar.jsx';
import PageLoader from './components/PageLoader.jsx';

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
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <div className="min-h-screen bg-surface">
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

                <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="/editor"    element={<PrivateRoute><Editor /></PrivateRoute>} />
                <Route path="/editor/:id" element={<PrivateRoute><Editor /></PrivateRoute>} />
                <Route path="/bookmarks" element={<PrivateRoute><Bookmarks /></PrivateRoute>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </div>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' },
            }}
          />
        </BrowserRouter>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </HelmetProvider>
  );
}

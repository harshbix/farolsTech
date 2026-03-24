import { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/index.js';

const Home = lazy(() => import('../pages/Home.jsx'));
const PostDetail = lazy(() => import('../pages/PostDetail.jsx'));
const Category = lazy(() => import('../pages/Category.jsx'));
const Author = lazy(() => import('../pages/Author.jsx'));
const Search = lazy(() => import('../pages/Search.jsx'));
const Login = lazy(() => import('../pages/Login.jsx'));
const Register = lazy(() => import('../pages/Register.jsx'));
const Dashboard = lazy(() => import('../pages/Dashboard.jsx'));
const Editor = lazy(() => import('../pages/Editor.jsx'));
const Bookmarks = lazy(() => import('../pages/Bookmarks.jsx'));
const Feed = lazy(() => import('../pages/Feed.jsx'));
const Moderation = lazy(() => import('../pages/Moderation.jsx'));
const Analytics = lazy(() => import('../pages/Analytics.jsx'));
const About = lazy(() => import('../pages/About.jsx'));
const Contact = lazy(() => import('../pages/Contact.jsx'));
const ApiDocs = lazy(() => import('../pages/ApiDocs.jsx'));
const Privacy = lazy(() => import('../pages/Privacy.jsx'));
const Terms = lazy(() => import('../pages/Terms.jsx'));
const Cookies = lazy(() => import('../pages/Cookies.jsx'));
const News = lazy(() => import('../pages/News.jsx'));
const ExternalNewsDetail = lazy(() => import('../pages/ExternalNewsDetail.jsx'));
const Blog = lazy(() => import('../pages/Blog.jsx'));
const Careers = lazy(() => import('../pages/Careers.jsx'));
const Press = lazy(() => import('../pages/Press.jsx'));
const NotFound = lazy(() => import('../pages/NotFound.jsx'));

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

export default function AppRoutes() {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/posts/:slug" element={<PostDetail />} />
        <Route path="/category/:slug" element={<Category />} />
        <Route path="/author/:username" element={<Author />} />
        <Route path="/search" element={<Search />} />

        <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
        <Route path="/register" element={<AuthRoute><Register /></AuthRoute>} />

        <Route path="/dashboard" element={<AdminRoute><Dashboard /></AdminRoute>} />
        <Route path="/admin/moderation" element={<AdminRoute><Moderation /></AdminRoute>} />
        <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
        <Route path="/editor" element={<AdminRoute><Editor /></AdminRoute>} />
        <Route path="/editor/:id" element={<AdminRoute><Editor /></AdminRoute>} />
        <Route path="/bookmarks" element={<PrivateRoute><Bookmarks /></PrivateRoute>} />
        <Route path="/feed" element={<PrivateRoute><Feed /></PrivateRoute>} />

        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/docs/api" element={<ApiDocs />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/cookies" element={<Cookies />} />
        <Route path="/news" element={<News />} />
        <Route path="/news/external/:id" element={<ExternalNewsDetail />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/careers" element={<Careers />} />
        <Route path="/press" element={<Press />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
}
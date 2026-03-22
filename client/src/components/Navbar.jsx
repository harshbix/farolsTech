import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuthStore, useUIStore } from '../store/index.js';
import api from '../api/client.js';

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated, clearAuth } = useAuthStore();
    const { language, setLanguage, liteMode, toggleLiteMode, theme, toggleTheme, openLoginModal } = useUIStore();
    
    const logoutMutation = useMutation({
      mutationFn: async () => {
        await api.post('/auth/logout');
      },
      onSuccess: () => {
        clearAuth();
        navigate('/');
        toast.success('Logged out');
      },
    });

  function handleLanguage(lang) {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  }

  const isAdmin = isAuthenticated && user?.role === 'admin';

  return (
    <nav className="sticky top-0 z-50 glass border-b border-surface-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 min-w-0">
          <img
            src="/logos/Farols white.svg"
            alt="Farols"
            className="h-8 w-8 sm:hidden object-contain"
            onError={(event) => { event.currentTarget.style.display = 'none'; }}
          />
          <img
            src="/logos/Farols white word front.svg"
            alt="Farols"
            className="hidden sm:block h-8 w-auto object-contain"
            onError={(event) => { event.currentTarget.style.display = 'none'; }}
          />
          <span className="text-2xl font-display font-bold text-gradient">Farols</span>
        </Link>

        {/* Centre nav */}
        <div className="hidden md:flex items-center gap-1">
          {[
            { to: '/',          label: t('home') },
            { to: '/search',    label: t('search') },
            { to: '/bookmarks', label: t('bookmarks') },
          ].map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-600/20 text-brand-300' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          {/* Language toggle */}
          <button
            id="language-toggle"
            onClick={() => handleLanguage(language === 'en' ? 'sw' : 'en')}
            className="btn-ghost py-1 px-2 text-sm font-medium"
            title={language === 'en' ? 'Switch to Swahili' : 'Switch to English'}
          >
            {language === 'en' ? '🇹🇿 SW' : '🇬🇧 EN'}
          </button>

          {/* Lite mode */}
          <button
            id="lite-mode-toggle"
            onClick={toggleLiteMode}
            className={`btn py-1 px-2 text-xs ${liteMode ? 'bg-amber-700/30 text-amber-400' : 'btn-ghost text-gray-400'}`}
            title="Toggle Lite Mode (<20KB)"
          >
            ⚡ Lite
          </button>

          <button
            id="theme-toggle"
            onClick={toggleTheme}
            className="btn-ghost py-1 px-2 text-xs"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>

          {isAuthenticated ? (
            <>
              {isAdmin && (
                <Link to="/dashboard" className="btn-ghost text-sm py-1.5">
                  {t('dashboard')}
                </Link>
              )}
              <button
                onClick={() => logoutMutation.mutate()}
                className="btn-ghost text-sm py-1.5 text-red-400"
              >
                {t('logout')}
              </button>
              <Link
                to={`/author/${user.username}`}
                className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-sm font-bold uppercase"
              >
                {user.username[0]}
              </Link>
            </>
          ) : (
            <>
              <button onClick={openLoginModal} className="btn-ghost text-sm py-1.5">{t('login')}</button>
              <Link to="/register" className="btn-primary text-sm py-1.5">{t('register')}</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

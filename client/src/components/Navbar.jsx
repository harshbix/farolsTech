import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuthStore, useUIStore } from '../store/index.js';
import api from '../api/client.js';

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const { language, setLanguage, liteMode, toggleLiteMode, theme, toggleTheme, openLoginModal } = useUIStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
    },
    onSuccess: () => {
      clearAuth();
      setIsMobileMenuOpen(false);
      navigate('/');
      toast.success('Logged out');
    },
  });

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isMobileMenuOpen]);

  function handleLanguage(lang) {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  }

  const { data: bookmarksData } = useQuery({
    queryKey: ['bookmarks', 'navbar-count'],
    enabled: isAuthenticated,
    queryFn: () => api.get('/bookmarks?limit=100').then((res) => res.data),
  });

  const bookmarkCount = Array.isArray(bookmarksData?.bookmarks)
    ? bookmarksData.bookmarks.length
    : 0;

  const isAdmin = isAuthenticated && user?.role === 'admin';

  const mobilePrimaryLinks = [
    { to: '/', label: t('home'), icon: 'HO' },
    { to: '/search', label: t('search'), icon: 'SE' },
    { to: '/feed', label: 'For You', icon: 'FY', protected: true },
    { to: '/bookmarks', label: t('bookmarks'), icon: 'BM', protected: true, count: bookmarkCount },
  ];

  const mobileSecondaryLinks = [
    { to: '/about', label: 'About' },
    { to: '/contact', label: 'Contact' },
    { to: '/news', label: 'Newsroom' },
    { to: '/docs/api', label: 'API Docs' },
  ];

  const resolveTarget = (item) => {
    if (item.protected && !isAuthenticated) {
      return '/login';
    }
    return item.to;
  };

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-surface-border/80 bg-surface/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <img
              src="/logos/Farols white.svg"
              alt="Farols"
              className="h-7 w-7 sm:hidden object-contain"
              onError={(event) => { event.currentTarget.style.display = 'none'; }}
            />
            <img
              src="/logos/Farols white word front.svg"
              alt="Farols"
              className="hidden sm:block h-8 w-auto object-contain"
              onError={(event) => { event.currentTarget.style.display = 'none'; }}
            />
            <span className="text-lg sm:text-2xl font-display font-bold text-gradient truncate">Farols</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {[
              { to: '/', label: t('home') },
              { to: '/search', label: t('search') },
              { to: '/feed', label: 'For You' },
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
            <NavLink
              to={isAuthenticated ? '/bookmarks' : '/login'}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  isActive ? 'bg-brand-600/20 text-brand-300' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <span>{t('bookmarks')}</span>
              {isAuthenticated && bookmarkCount > 0 && (
                <span className="inline-flex min-w-5 h-5 px-1 items-center justify-center rounded-full bg-brand-500/25 text-brand-200 text-[11px] leading-none font-semibold">
                  {bookmarkCount > 99 ? '99+' : bookmarkCount}
                </span>
              )}
            </NavLink>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <button
              id="language-toggle"
              onClick={() => handleLanguage(language === 'en' ? 'sw' : 'en')}
              className="btn-ghost py-1 px-2 text-sm font-medium"
              title={language === 'en' ? 'Switch to Swahili' : 'Switch to English'}
            >
              {language === 'en' ? 'SW' : 'EN'}
            </button>
            <button
              id="lite-mode-toggle"
              onClick={toggleLiteMode}
              className={`btn py-1 px-2 text-xs ${liteMode ? 'bg-amber-700/30 text-amber-400' : 'btn-ghost text-gray-400'}`}
              title="Toggle Lite Mode"
            >
              Lite
            </button>
            <button
              id="theme-toggle"
              onClick={toggleTheme}
              className="btn-ghost py-1 px-2 text-xs"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>

            {isAuthenticated ? (
              <>
                {isAdmin && (
                  <>
                    <Link to="/dashboard" className="btn-ghost text-sm py-1.5">
                      {t('dashboard')}
                    </Link>
                    <Link to="/admin/moderation" className="btn-ghost text-sm py-1.5">
                      Moderation
                    </Link>
                  </>
                )}
                <Link to="/analytics" className="btn-ghost text-sm py-1.5">
                  Analytics
                </Link>
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

          <div className="md:hidden flex items-center gap-1">
            <Link
              to="/search"
              className="h-9 px-3 rounded-full border border-surface-border bg-surface-raised/70 text-xs font-semibold tracking-wide flex items-center"
              aria-label="Search"
            >
              Search
            </Link>
            <button
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="h-9 px-3 rounded-full border border-surface-border bg-surface-raised/70 text-xs font-semibold tracking-wide"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-nav-sheet"
            >
              {isMobileMenuOpen ? 'Close' : 'Menu'}
            </button>
          </div>
        </div>
      </nav>

      <nav
        className="md:hidden fixed left-3 right-3 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-50"
        aria-label="Mobile navigation"
      >
        <div className="rounded-2xl border border-surface-border bg-surface/95 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.35)] px-2 py-2">
          <div className="grid grid-cols-5 gap-1">
            {mobilePrimaryLinks.map((item) => (
              <NavLink
                key={item.to}
                to={resolveTarget(item)}
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  if (item.protected && !isAuthenticated) {
                    openLoginModal();
                  }
                }}
                className={({ isActive }) =>
                  `relative min-h-[52px] rounded-xl px-1 py-2 flex flex-col items-center justify-center gap-1 transition-all ${
                    isActive
                      ? 'bg-brand-600/20 text-brand-200'
                      : 'text-[rgb(var(--text-secondary))] hover:bg-surface-raised hover:text-[rgb(var(--text-primary))]'
                  }`
                }
              >
                <span className="text-[10px] leading-none font-bold tracking-wide">{item.icon}</span>
                <span className="text-[11px] leading-none font-semibold">{item.label}</span>
                {item.count > 0 && (
                  <span className="absolute right-2 top-1.5 min-w-4 h-4 px-1 rounded-full bg-brand-500/25 text-brand-100 text-[9px] leading-none font-bold flex items-center justify-center">
                    {item.count > 99 ? '99+' : item.count}
                  </span>
                )}
              </NavLink>
            ))}
            <button
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className={`min-h-[52px] rounded-xl px-1 py-2 flex flex-col items-center justify-center gap-1 transition-all ${
                isMobileMenuOpen
                  ? 'bg-brand-600/20 text-brand-200'
                  : 'text-[rgb(var(--text-secondary))] hover:bg-surface-raised hover:text-[rgb(var(--text-primary))]'
              }`}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-nav-sheet"
            >
              <span className="text-[10px] leading-none font-bold tracking-wide">ME</span>
              <span className="text-[11px] leading-none font-semibold">More</span>
            </button>
          </div>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/55" onClick={() => setIsMobileMenuOpen(false)}>
          <div
            id="mobile-nav-sheet"
            className="absolute left-0 right-0 bottom-[calc(env(safe-area-inset-bottom)+6.25rem)] mx-3 rounded-2xl border border-surface-border bg-surface-raised/98 backdrop-blur-xl p-4 shadow-[0_16px_42px_rgba(0,0,0,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-display font-semibold text-[rgb(var(--text-primary))] mb-0">Quick controls</h2>
              {isAuthenticated ? (
                <Link
                  to={`/author/${user.username}`}
                  className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-sm font-bold uppercase"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {user.username[0]}
                </Link>
              ) : (
                <button
                  onClick={() => {
                    openLoginModal();
                    setIsMobileMenuOpen(false);
                  }}
                  className="px-3 h-9 rounded-full border border-surface-border bg-surface text-xs font-semibold"
                >
                  {t('login')}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                id="language-toggle-mobile"
                onClick={() => handleLanguage(language === 'en' ? 'sw' : 'en')}
                className="h-11 rounded-xl border border-surface-border bg-surface text-sm font-medium"
                title={language === 'en' ? 'Switch to Swahili' : 'Switch to English'}
              >
                {language === 'en' ? 'Language: SW' : 'Language: EN'}
              </button>
              <button
                id="theme-toggle-mobile"
                onClick={toggleTheme}
                className="h-11 rounded-xl border border-surface-border bg-surface text-sm font-medium"
              >
                Theme: {theme === 'dark' ? 'Light' : 'Dark'}
              </button>
              <button
                id="lite-mode-toggle-mobile"
                onClick={toggleLiteMode}
                className={`h-11 rounded-xl border border-surface-border text-sm font-medium ${
                  liteMode ? 'bg-amber-700/20 text-amber-300' : 'bg-surface text-[rgb(var(--text-primary))]'
                }`}
              >
                Lite mode: {liteMode ? 'On' : 'Off'}
              </button>
              <Link
                to="/analytics"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  if (!isAuthenticated) {
                    openLoginModal();
                  }
                }}
                className="h-11 rounded-xl border border-surface-border bg-surface text-sm font-medium flex items-center justify-center"
              >
                Analytics
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-surface-border pt-3">
              {mobileSecondaryLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="h-10 rounded-lg px-3 bg-surface text-sm text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] flex items-center"
                >
                  {item.label}
                </Link>
              ))}
              {!isAuthenticated ? (
                <Link
                  to="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="h-10 rounded-lg px-3 bg-brand-600/20 text-brand-200 text-sm font-semibold flex items-center"
                >
                  {t('register')}
                </Link>
              ) : (
                <button
                  onClick={() => logoutMutation.mutate()}
                  className="h-10 rounded-lg px-3 bg-red-500/10 text-red-300 text-sm font-semibold text-left"
                >
                  {t('logout')}
                </button>
              )}
              {isAdmin && (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="h-10 rounded-lg px-3 bg-surface text-sm text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] flex items-center"
                  >
                    {t('dashboard')}
                  </Link>
                  <Link
                    to="/admin/moderation"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="h-10 rounded-lg px-3 bg-surface text-sm text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] flex items-center"
                  >
                    Moderation
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

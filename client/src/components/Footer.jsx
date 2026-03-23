import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-surface border-t border-surface-border mt-20">
      {/* Main Footer Content */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand Section */}
          <div className="flex flex-col items-start">
            <h3 className="text-2xl font-display font-semibold text-[rgb(var(--text-primary))] mb-3">
              Farols
            </h3>
            <p className="text-sm text-[rgb(var(--text-secondary))] max-w-xs leading-relaxed">
              East African digital newsroom delivering stories that matter. Quality journalism, fast.
            </p>
            <div className="flex gap-4 mt-6">
              <a
                href="https://twitter.com/farols"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
                className="w-10 h-10 rounded-lg bg-surface-raised hover:bg-surface-border flex items-center justify-center transition-colors text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))]"
              >
                𝕏
              </a>
              <a
                href="https://facebook.com/farols"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-10 h-10 rounded-lg bg-surface-raised hover:bg-surface-border flex items-center justify-center transition-colors text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))]"
              >
                f
              </a>
              <a
                href="https://instagram.com/farols"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-10 h-10 rounded-lg bg-surface-raised hover:bg-surface-border flex items-center justify-center transition-colors text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))]"
              >
                📷
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-widest text-[rgb(var(--text-primary))] mb-6">
              {t('product') || 'Product'}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/"
                  className="text-sm text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/search"
                  className="text-sm text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors"
                >
                  Search
                </Link>
              </li>
              <li>
                <Link
                  to="/bookmarks"
                  className="text-sm text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors"
                >
                  Bookmarks
                </Link>
              </li>
              <li>
                <Link
                  to="/feed"
                  className="text-sm text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors"
                >
                  For You Feed
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-widest text-[rgb(var(--text-primary))] mb-6">
              {t('company') || 'Company'}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/about"
                  className="text-sm text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  to="/careers"
                  className="text-sm text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors"
                >
                  Careers
                </Link>
              </li>
              <li>
                <Link
                  to="/press"
                  className="text-sm text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors"
                >
                  Press
                </Link>
              </li>
              <li>
                <Link
                  to="/blog"
                  className="text-sm text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  to="/news"
                  className="text-sm text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors"
                >
                  Newsroom
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Support */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-widest text-[rgb(var(--text-primary))] mb-6">
              {t('legal') || 'Legal'}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/privacy"
                  className="text-sm text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-sm text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  to="/cookies"
                  className="text-sm text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors"
                >
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-sm text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  to="/docs/api"
                  className="text-sm text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors"
                >
                  API Docs
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-surface-border my-8"></div>

        {/* Bottom Section */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <p className="text-xs text-[rgb(var(--text-secondary))]">
              © {currentYear} Farols. All rights reserved.
            </p>
            <p className="text-xs text-[rgb(var(--text-secondary))]">
              Built with care by{' '}
              <a
                href="https://github.com/JuniorJeconia"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-300 hover:text-brand-200"
              >
                Junior Jeconia
              </a>
              {' '}for East Africa.
            </p>
          </div>
          <div className="flex gap-4">
            <Link to="/about#credits" className="text-xs px-4 py-2 rounded-lg bg-surface-raised hover:bg-surface-border text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors">
              Credits
            </Link>
            <Link to="/contact" className="text-xs px-4 py-2 rounded-lg bg-surface-raised hover:bg-surface-border text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors">
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

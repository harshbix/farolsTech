import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LIMIT = 20;
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

const SOURCE_COLORS = [
  '#2563eb',
  '#059669',
  '#dc2626',
  '#7c3aed',
  '#ea580c',
  '#0891b2',
  '#ca8a04',
  '#4f46e5',
];

function getSourceColor(source) {
  const text = source || 'Unknown';
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return SOURCE_COLORS[Math.abs(hash) % SOURCE_COLORS.length];
}

function getSourceInitials(source) {
  return (source || 'Unknown')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

function formatRelativeTime(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Unknown time';

  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
    ['second', 1],
  ];

  for (const [unit, unitSeconds] of units) {
    if (Math.abs(seconds) >= unitSeconds || unit === 'second') {
      return rtf.format(Math.round(seconds / unitSeconds), unit);
    }
  }

  return 'Just now';
}

function SkeletonGrid() {
  return (
    <div className="tech-news-grid" role="status" aria-live="polite" aria-label="Loading tech news">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={`skeleton-${index}`} className="tech-news-card tech-news-card-skeleton" aria-hidden="true">
          <div className="tech-news-skeleton-image shimmer" />
          <div className="tech-news-body">
            <div className="tech-news-skeleton-badge shimmer" />
            <div className="tech-news-skeleton-line shimmer" />
            <div className="tech-news-skeleton-line tech-news-skeleton-line-short shimmer" />
            <div className="tech-news-skeleton-line tech-news-skeleton-line-shorter shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TechNewsFeed() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [imageFailures, setImageFailures] = useState({});

  const fetchArticles = useCallback(async () => {
    console.log('[TechNewsFeed] state -> loading');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/external-news?limit=${LIMIT}`, { cache: 'no-store' });
      console.log('[TechNewsFeed] status:', res.status);
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
      console.log('[TechNewsFeed] articles received:', data.articles?.length ?? 0);
      setArticles(Array.isArray(data.articles) ? data.articles : []);
      console.log('[TechNewsFeed] state -> populated');
    } catch (err) {
      console.error('[TechNewsFeed] fetch failed:', err);
      setError(err.message || 'Failed to fetch news');
      console.log('[TechNewsFeed] state -> error');
    } finally {
      setLoading(false);
      console.log('[TechNewsFeed] state -> loading false');
    }
  }, []);

  useEffect(() => {
    console.log('TechNewsFeed mounted');
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles, refreshTick]);

  const memoArticles = useMemo(() => articles, [articles]);

  const handleRefresh = () => {
    setRefreshTick((tick) => tick + 1);
  };

  const openDetails = (id, url) => {
    if (id !== undefined && id !== null && String(id).trim() !== '') {
      navigate(`/news/external/${encodeURIComponent(String(id))}`);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="tech-news-section" aria-label="Latest Tech News">
      <div className="tech-news-header-row">
        <div>
          <h2 className="tech-news-heading">Latest Tech News</h2>
          <p className="tech-news-subheading">Curated from trusted sources · Updated every 20 minutes</p>
        </div>
        <button
          type="button"
          className="tech-news-refresh"
          onClick={handleRefresh}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="tech-news-error-banner" role="alert">
          <span>Unable to load external tech news right now.</span>
          <button type="button" className="tech-news-inline-action" onClick={handleRefresh}>
            Retry
          </button>
        </div>
      )}

      {loading && <SkeletonGrid />}

      {!loading && memoArticles.length === 0 && !error && (
        <div className="tech-news-empty" role="status" aria-live="polite">
          <div className="tech-news-empty-icon" aria-hidden="true">🗞️</div>
          <p className="tech-news-empty-title">No articles yet — check back in a few minutes</p>
          <button type="button" className="tech-news-refresh" onClick={handleRefresh}>
            Refresh now
          </button>
        </div>
      )}

      {!loading && memoArticles.length > 0 && (
        <div className="tech-news-grid" role="list">
          {memoArticles.map((article) => {
            const sourceColor = getSourceColor(article.source);
            const fallbackInitials = getSourceInitials(article.source);
            const imageKey = article.id ?? article.url;
            const showImage = article.image_url && !imageFailures[imageKey];

            return (
              <article
                key={article.id ?? article.url}
                className="tech-news-card cursor-pointer"
                role="link"
                tabIndex={0}
                aria-label={article.title}
                onClick={() => openDetails(article.id, article.url)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openDetails(article.id, article.url);
                  }
                }}
              >
                <div className="tech-news-media-wrap">
                  {showImage ? (
                    <img
                      src={article.image_url}
                      alt={article.title ? `Thumbnail for ${article.title}` : ''}
                      className="tech-news-image"
                      loading="lazy"
                      width="640"
                      height="360"
                      onError={() => {
                        setImageFailures((prev) => ({ ...prev, [imageKey]: true }));
                      }}
                    />
                  ) : (
                    <div
                      className="tech-news-image-fallback"
                      style={{ backgroundColor: `${sourceColor}22`, color: sourceColor }}
                      aria-label={`Fallback image for ${article.source || 'Unknown source'}`}
                    >
                      {fallbackInitials}
                    </div>
                  )}
                </div>

                <div className="tech-news-body">
                  <span className="tech-news-source" style={{ backgroundColor: `${sourceColor}22`, color: sourceColor }}>
                    {article.source || 'Unknown source'}
                  </span>

                  <h3 className="tech-news-title">{article.title}</h3>

                  {article.description && (
                    <p className="tech-news-description truncate-2">{article.description}</p>
                  )}

                  <time className="tech-news-date" dateTime={article.published_at}>
                    {formatRelativeTime(article.published_at)}
                  </time>

                  <button
                    type="button"
                    className="tech-news-readmore"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openDetails(article.id, article.url);
                    }}
                  >
                    View details
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

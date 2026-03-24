import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import SEOHead from '../components/SEOHead.jsx';

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

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

function sourceInitials(source) {
  return (source || 'News')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

export default function ExternalNewsDetail() {
  const { id } = useParams();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['external-news-detail', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/external-news/${encodeURIComponent(id)}`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Unable to load article (${res.status})`);
      }
      return res.json();
    },
  });

  const article = data?.article;

  const publishedLabel = useMemo(() => {
    if (!article?.published_at) return 'Unknown time';
    return formatRelativeTime(article.published_at);
  }, [article?.published_at]);

  return (
    <>
      <SEOHead
        title={article?.title || 'Tech News'}
        description={article?.description || 'Read external tech news details on Farols'}
      />

      <section className="max-w-4xl mx-auto px-4 py-10" aria-label="External tech news details">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link to="/" className="tech-news-back-link">Back to Home</Link>
          <Link to="/news" className="tech-news-back-link">Newsroom</Link>
        </div>

        {isLoading && (
          <div className="card p-6">
            <div className="tech-news-detail-skeleton shimmer mb-4" />
            <div className="tech-news-detail-skeleton shimmer mb-3" />
            <div className="tech-news-detail-skeleton tech-news-detail-skeleton-short shimmer" />
          </div>
        )}

        {isError && (
          <div className="tech-news-error-banner" role="alert">
            <span>{error?.message || 'Failed to load article details.'}</span>
            <button type="button" className="tech-news-inline-action" onClick={() => refetch()}>
              {isFetching ? 'Retrying...' : 'Retry'}
            </button>
          </div>
        )}

        {!isLoading && !isError && article && (
          <article className="card p-0 overflow-hidden">
            <div className="tech-news-detail-media">
              {article.image_url ? (
                <img
                  src={article.image_url}
                  alt={article.title ? `Cover for ${article.title}` : ''}
                  loading="lazy"
                  width="1200"
                  height="630"
                  className="tech-news-detail-image"
                />
              ) : (
                <div className="tech-news-detail-fallback" aria-hidden="true">
                  {sourceInitials(article.source)}
                </div>
              )}
            </div>

            <div className="p-6 md:p-8">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="tech-news-source">{article.source || 'Unknown source'}</span>
                <time className="tech-news-date" dateTime={article.published_at}>{publishedLabel}</time>
              </div>

              <h1 className="text-3xl md:text-4xl font-display font-bold leading-tight mb-4">
                {article.title}
              </h1>

              <p className="text-base md:text-lg text-[rgb(var(--text-secondary))] leading-relaxed mb-8">
                {article.description || 'This article summary is unavailable. Use Read More to continue on the source website.'}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                >
                  Read More on Original Website
                </a>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => refetch()}
                  disabled={isFetching}
                >
                  {isFetching ? 'Refreshing...' : 'Refresh details'}
                </button>
              </div>
            </div>
          </article>
        )}
      </section>
    </>
  );
}

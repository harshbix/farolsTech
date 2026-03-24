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

  const { data: relatedData, isLoading: relatedLoading } = useQuery({
    queryKey: ['external-news-list-related', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch('/api/external-news?limit=30', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Unable to load related articles');
      }
      return res.json();
    },
  });

  const article = data?.article;

  const publishedLabel = useMemo(() => {
    if (!article?.published_at) return 'Unknown time';
    return formatRelativeTime(article.published_at);
  }, [article?.published_at]);

  const relatedArticles = useMemo(() => {
    const items = Array.isArray(relatedData?.articles) ? relatedData.articles : [];
    if (!article) return [];

    const sameSource = items
      .filter((item) => String(item.id) !== String(article.id))
      .filter((item) => item.source === article.source);

    const fallback = items
      .filter((item) => String(item.id) !== String(article.id))
      .filter((item) => item.source !== article.source);

    return [...sameSource, ...fallback].slice(0, 6);
  }, [article, relatedData?.articles]);

  return (
    <>
      <SEOHead
        title={article?.title || 'Tech News'}
        description={article?.description || 'Read external tech news details on Farols'}
      />

      <section className="max-w-4xl mx-auto px-4 py-10" aria-label="External tech news details">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link to="/" className="tech-news-back-link" aria-label="Back to home">
            <span aria-hidden="true">←</span>
            <span className="icon-label">Home</span>
          </Link>
          <Link to="/news" className="tech-news-back-link" aria-label="Go to newsroom">
            <span aria-hidden="true">📰</span>
            <span className="icon-label">News</span>
          </Link>
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
            <button type="button" className="tech-news-inline-action" aria-label="Retry loading article details" onClick={() => refetch()}>
              <span aria-hidden="true">⟳</span>
              <span className="icon-label">{isFetching ? 'Loading' : 'Retry'}</span>
            </button>
          </div>
        )}

        {!isLoading && !isError && article && (
          <>
            <article className="card p-0 overflow-hidden mb-8">
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
                    aria-label="Open original source website in a new tab"
                  >
                    <span aria-hidden="true">↗</span>
                    <span className="icon-label">Source</span>
                  </a>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => refetch()}
                    aria-label="Refresh article details"
                    disabled={isFetching}
                  >
                    <span aria-hidden="true">↻</span>
                    <span className="icon-label">{isFetching ? 'Loading' : 'Refresh'}</span>
                  </button>
                </div>
              </div>
            </article>

            <section aria-label="Related external articles">
              <div className="flex items-center justify-between mb-4 gap-2">
                <h2 className="text-2xl font-display font-bold m-0">Related Tech News</h2>
                {article.source && (
                  <span className="tech-news-source">More from {article.source}</span>
                )}
              </div>

              {relatedLoading && (
                <div className="card p-4 text-sm text-[rgb(var(--text-secondary))]">Loading related articles...</div>
              )}

              {!relatedLoading && relatedArticles.length === 0 && (
                <div className="card p-4 text-sm text-[rgb(var(--text-secondary))]">No related articles available yet.</div>
              )}

              {!relatedLoading && relatedArticles.length > 0 && (
                <div className="tech-news-grid" role="list">
                  {relatedArticles.map((item) => (
                    <article key={item.id ?? item.url} className="tech-news-card" role="listitem">
                      <Link
                        to={`/news/external/${encodeURIComponent(String(item.id))}`}
                        className="block no-underline text-inherit"
                      >
                        <div className="tech-news-media-wrap">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.title ? `Thumbnail for ${item.title}` : ''}
                              className="tech-news-image"
                              loading="lazy"
                              width="640"
                              height="360"
                            />
                          ) : (
                            <div className="tech-news-image-fallback" aria-hidden="true">
                              {sourceInitials(item.source)}
                            </div>
                          )}
                        </div>

                        <div className="tech-news-body">
                          <span className="tech-news-source">{item.source || 'Unknown source'}</span>
                          <h3 className="tech-news-title">{item.title}</h3>
                          {item.description && <p className="tech-news-description truncate-2">{item.description}</p>}
                          <time className="tech-news-date" dateTime={item.published_at}>
                            {formatRelativeTime(item.published_at)}
                          </time>
                        </div>
                      </Link>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </section>
    </>
  );
}

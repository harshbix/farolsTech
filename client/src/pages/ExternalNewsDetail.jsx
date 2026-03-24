import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import SEOHead from '../components/SEOHead.jsx';
import api from '../api/client.js';
import { useAuthStore, useUIStore } from '../store/index.js';

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

const TOPIC_RULES = {
  ai: ['ai', 'artificial intelligence', 'llm', 'machine learning'],
  security: ['security', 'cybersecurity', 'vulnerability', 'exploit', 'hack'],
  cloud: ['cloud', 'aws', 'azure', 'gcp', 'kubernetes'],
  mobile: ['iphone', 'android', 'ios', 'mobile', 'smartphone'],
  dev: ['developer', 'javascript', 'python', 'api', 'database', 'open source'],
  startup: ['startup', 'funding', 'venture', 'founder', 'series a', 'series b'],
};

function extractTopics(article) {
  const text = `${article?.title || ''} ${article?.description || ''}`.toLowerCase();
  const matched = [];
  Object.entries(TOPIC_RULES).forEach(([topic, keywords]) => {
    if (keywords.some((kw) => text.includes(kw))) matched.push(topic);
  });
  return matched;
}

function estimateReadMinutes(article) {
  const text = `${article?.title || ''} ${article?.description || ''}`.trim();
  const words = text ? text.split(/\s+/).length : 0;
  return Math.max(1, Math.ceil(words / 180));
}

function trackExternalEvent(event) {
  fetch('/api/external-news/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  }).catch(() => {});
}

export default function ExternalNewsDetail() {
  const { id } = useParams();
  const { isAuthenticated } = useAuthStore();
  const { openLoginModal } = useUIStore();
  const [readerMode, setReaderMode] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isBookmarkPending, setIsBookmarkPending] = useState(false);
  const [savedProgress, setSavedProgress] = useState(0);

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

    const baseTopics = new Set(extractTopics(article));
    const scored = items
      .filter((item) => String(item.id) !== String(article.id))
      .map((item) => {
        const itemTopics = extractTopics(item);
        const overlap = itemTopics.filter((t) => baseTopics.has(t)).length;
        const sourceBoost = item.source === article.source ? 1 : 0;
        return { item, score: overlap * 3 + sourceBoost };
      })
      .sort((a, b) => b.score - a.score || String(b.item.published_at).localeCompare(String(a.item.published_at)));

    return scored.slice(0, 6).map((entry) => entry.item);
  }, [article, relatedData?.articles]);

  const readMinutes = useMemo(() => estimateReadMinutes(article), [article]);

  useEffect(() => {
    if (!id) return;
    const storedProgress = Number(localStorage.getItem(`externalNewsProgress:${id}`) || 0);
    setSavedProgress(Number.isFinite(storedProgress) ? storedProgress : 0);

    if (isAuthenticated) {
      api
        .get('/bookmarks?limit=200')
        .then((res) => {
          const rows = Array.isArray(res?.data?.bookmarks) ? res.data.bookmarks : [];
          setIsBookmarked(rows.some((item) => String(item.id) === String(id)));
        })
        .catch(() => setIsBookmarked(false));
      return;
    }

    try {
      const saved = JSON.parse(localStorage.getItem('externalNewsBookmarks') || '[]');
      setIsBookmarked(saved.some((item) => String(item.id) === String(id)));
    } catch {
      setIsBookmarked(false);
    }
  }, [id, isAuthenticated]);

  useEffect(() => {
    if (!article || !id) return;
    const topics = extractTopics(article);
    trackExternalEvent({
      eventType: 'detail_view',
      articleId: article.id,
      source: article.source,
      topic: topics[0] || null,
    });
  }, [article, id]);

  useEffect(() => {
    if (!id) return;
    const handler = () => {
      const doc = document.documentElement;
      const scrollTop = doc.scrollTop || document.body.scrollTop;
      const height = (doc.scrollHeight - doc.clientHeight) || 1;
      const progress = Math.max(0, Math.min(100, Math.round((scrollTop / height) * 100)));
      setScrollProgress(progress);
      localStorage.setItem(`externalNewsProgress:${id}`, String(progress));
    };

    window.addEventListener('scroll', handler, { passive: true });
    handler();
    return () => window.removeEventListener('scroll', handler);
  }, [id]);

  const toggleBookmark = async () => {
    if (!article || isBookmarkPending) return;

    const nextBookmarked = !isBookmarked;

    if (isAuthenticated) {
      setIsBookmarkPending(true);
      setIsBookmarked(nextBookmarked);
      try {
        if (nextBookmarked) {
          await api.post('/bookmarks', { post_id: article.id });
          trackExternalEvent({ eventType: 'bookmark_add', articleId: article.id, source: article.source });
          toast.success('Saved to bookmarks');
        } else {
          await api.delete(`/bookmarks/${encodeURIComponent(String(article.id))}`);
          trackExternalEvent({ eventType: 'bookmark_remove', articleId: article.id, source: article.source });
          toast.success('Removed from bookmarks');
        }
      } catch (err) {
        setIsBookmarked(!nextBookmarked);
        const status = err?.response?.status;
        if (status === 401) {
          openLoginModal();
          return;
        }
        toast.error('Unable to update bookmark right now');
      } finally {
        setIsBookmarkPending(false);
      }
      return;
    }

    const key = 'externalNewsBookmarks';
    let saved = [];
    try {
      saved = JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      saved = [];
    }

    const exists = saved.some((item) => String(item.id) === String(article.id));
    let next = saved;

    if (exists) {
      next = saved.filter((item) => String(item.id) !== String(article.id));
      trackExternalEvent({ eventType: 'bookmark_remove', articleId: article.id, source: article.source });
      setIsBookmarked(false);
      toast.success('Removed local bookmark');
    } else {
      next = [
        {
          id: article.id,
          title: article.title,
          source: article.source,
          published_at: article.published_at,
          saved_at: Date.now(),
        },
        ...saved,
      ].slice(0, 100);
      trackExternalEvent({ eventType: 'bookmark_add', articleId: article.id, source: article.source });
      setIsBookmarked(true);
      toast.success('Saved locally. Login to sync to your account.');
    }

    localStorage.setItem(key, JSON.stringify(next));
  };

  const handleReadMore = () => {
    if (!article?.url) return;
    const topics = extractTopics(article);
    trackExternalEvent({
      eventType: 'read_more',
      articleId: article.id,
      source: article.source,
      topic: topics[0] || null,
    });
    window.open(article.url, '_blank', 'noopener,noreferrer');
  };

  const continueReading = () => {
    const ratio = Math.max(0, Math.min(100, savedProgress)) / 100;
    const doc = document.documentElement;
    const maxScroll = (doc.scrollHeight - doc.clientHeight) || 0;
    window.scrollTo({ top: Math.round(maxScroll * ratio), behavior: 'smooth' });
  };

  return (
    <>
      <SEOHead
        title={article?.title || 'Tech News'}
        description={article?.description || 'Read external tech news details on Farols'}
      />

      <div className="reading-progress-shell" aria-hidden="true">
        <div className="reading-progress-fill" style={{ width: `${scrollProgress}%` }} />
      </div>

      <section className={`max-w-4xl mx-auto px-4 py-10 ${readerMode ? 'reader-mode' : ''}`} aria-label="External tech news details">
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
                  <span className="tech-news-trust">{article.trust_score || 'Unverified'}</span>
                  <time className="tech-news-date" dateTime={article.published_at}>{publishedLabel}</time>
                  <span className="tech-news-date">{readMinutes} min read</span>
                  <span className="tech-news-date">{scrollProgress}% read</span>
                </div>

                <h1 className="text-3xl md:text-4xl font-display font-bold leading-tight mb-4">
                  {article.title}
                </h1>

                <p className="text-base md:text-lg text-[rgb(var(--text-secondary))] leading-relaxed mb-8">
                  {article.description || 'This article summary is unavailable. Use Read More to continue on the source website.'}
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className="btn-primary"
                    aria-label="Open original source website in a new tab"
                    onClick={handleReadMore}
                  >
                    <span aria-hidden="true">↗</span>
                    <span className="icon-label">Source</span>
                  </button>
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
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setReaderMode((prev) => !prev)}
                    aria-label="Toggle reader mode"
                  >
                    <span aria-hidden="true">🧾</span>
                    <span className="icon-label">{readerMode ? 'Default' : 'Reader'}</span>
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={toggleBookmark}
                    aria-label={isBookmarked ? 'Remove bookmark' : 'Save bookmark'}
                    disabled={isBookmarkPending}
                  >
                    <span aria-hidden="true">{isBookmarked ? '★' : '☆'}</span>
                    <span className="icon-label">
                      {isBookmarkPending ? 'Saving' : isBookmarked ? 'Saved' : 'Save'}
                    </span>
                  </button>
                  {savedProgress > 5 && savedProgress < 100 && (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={continueReading}
                      aria-label={`Continue reading from ${savedProgress}%`}
                    >
                      <span aria-hidden="true">↺</span>
                      <span className="icon-label">Continue {savedProgress}%</span>
                    </button>
                  )}
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

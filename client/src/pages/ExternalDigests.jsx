import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import SEOHead from '../components/SEOHead.jsx';

const TOPIC_GROUPS = {
  ai: ['ai', 'artificial intelligence', 'llm', 'machine learning'],
  security: ['security', 'cybersecurity', 'vulnerability', 'exploit', 'hack'],
  startup: ['startup', 'funding', 'venture', 'founder', 'series a', 'series b'],
};

function classifyTopic(article) {
  const text = `${article?.title || ''} ${article?.description || ''}`.toLowerCase();
  for (const [topic, keywords] of Object.entries(TOPIC_GROUPS)) {
    if (keywords.some((kw) => text.includes(kw))) return topic;
  }
  return 'general';
}

function isWithinHours(isoDate, hours) {
  const ts = new Date(isoDate).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= hours * 60 * 60 * 1000;
}

export default function ExternalDigests() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['external-news-digests'],
    queryFn: async () => {
      const res = await fetch('/api/external-news?limit=100', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load digests');
      return res.json();
    },
  });

  const articles = Array.isArray(data?.articles) ? data.articles : [];

  const digests = useMemo(() => {
    const daily = articles.filter((a) => isWithinHours(a.published_at, 24)).slice(0, 12);
    const weekly = articles.filter((a) => isWithinHours(a.published_at, 24 * 7)).slice(0, 20);

    const grouped = {
      ai: [],
      security: [],
      startup: [],
    };

    weekly.forEach((article) => {
      const topic = classifyTopic(article);
      if (grouped[topic] && grouped[topic].length < 8) grouped[topic].push(article);
    });

    return { daily, weekly, grouped };
  }, [articles]);

  return (
    <>
      <SEOHead title="Tech Digests" description="Daily and weekly external tech news digests" />
      <section className="max-w-6xl mx-auto px-4 py-10" aria-label="Tech digests">
        <div className="mb-6">
          <h1 className="text-3xl font-display font-bold mb-2">Tech Digests</h1>
          <p className="text-[rgb(var(--text-secondary))] m-0">Daily and weekly highlights generated from your cached feed.</p>
        </div>

        {isLoading && <div className="card p-4">Loading digests...</div>}
        {isError && <div className="card p-4 text-red-300">Failed to load digests.</div>}

        {!isLoading && !isError && (
          <div className="space-y-8">
            <div className="card p-5">
              <h2 className="text-xl font-display font-bold mt-0 mb-4">Daily Digest</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {digests.daily.map((article) => (
                  <Link key={article.id} to={`/news/external/${encodeURIComponent(String(article.id))}`} className="block p-3 rounded-lg border border-surface-border hover:border-brand-500 transition-colors no-underline">
                    <p className="m-0 font-semibold text-[rgb(var(--text-primary))]">{article.title}</p>
                    <p className="m-0 text-sm text-[rgb(var(--text-secondary))]">{article.source || 'Unknown source'}</p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <h2 className="text-xl font-display font-bold mt-0 mb-4">Weekly Digest</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {digests.weekly.map((article) => (
                  <Link key={article.id} to={`/news/external/${encodeURIComponent(String(article.id))}`} className="block p-3 rounded-lg border border-surface-border hover:border-brand-500 transition-colors no-underline">
                    <p className="m-0 font-semibold text-[rgb(var(--text-primary))]">{article.title}</p>
                    <p className="m-0 text-sm text-[rgb(var(--text-secondary))]">{article.source || 'Unknown source'}</p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {['ai', 'security', 'startup'].map((topic) => (
                <div key={topic} className="card p-4">
                  <h3 className="text-lg font-display font-bold mt-0 mb-3 uppercase">Top {topic}</h3>
                  <div className="space-y-2">
                    {(digests.grouped[topic] || []).map((article) => (
                      <Link key={article.id} to={`/news/external/${encodeURIComponent(String(article.id))}`} className="block text-sm text-[rgb(var(--text-primary))] hover:text-brand-400 transition-colors no-underline">
                        {article.title}
                      </Link>
                    ))}
                    {(digests.grouped[topic] || []).length === 0 && (
                      <p className="text-sm text-[rgb(var(--text-secondary))] m-0">No highlights yet.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client.js';
import SEOHead from '../components/SEOHead.jsx';

function StatCard({ label, value }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-display font-bold text-brand-300">{value}</p>
    </div>
  );
}

export default function Analytics() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics-my-posts'],
    queryFn: () => api.get('/analytics/my-posts').then((r) => r.data),
  });

  const {
    data: externalData,
    isLoading: externalLoading,
    isError: externalError,
  } = useQuery({
    queryKey: ['analytics-external-news'],
    queryFn: () => api.get('/analytics/external-news?days=7').then((r) => r.data),
  });

  const maxViews = useMemo(() => {
    const views = data?.posts?.map((p) => p.views || 0) || [0];
    return Math.max(...views, 1);
  }, [data]);

  return (
    <>
      <SEOHead title="Analytics" description="Post performance and engagement" />
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-display font-bold mb-2">Analytics</h1>
        <p className="text-gray-400 mb-8">Performance overview for your published stories.</p>

        {isLoading && <div className="card p-6">Loading analytics...</div>}
        {isError && !isLoading && <div className="card p-6 text-red-300">Failed to load analytics.</div>}

        {!isLoading && !isError && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <StatCard label="Total Views" value={data?.totals?.total_views || 0} />
              <StatCard label="Total Posts" value={data?.totals?.total_posts || 0} />
              <StatCard label="Total Comments" value={data?.totals?.total_comments || 0} />
            </div>

            <div className="card p-4">
              <h2 className="text-xl font-display font-semibold mb-4">Top Posts by Views</h2>
              <div className="space-y-3">
                {data?.posts?.slice(0, 20).map((post) => {
                  const width = Math.max(6, Math.round(((post.views || 0) / maxViews) * 100));
                  return (
                    <div key={post.id} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-gray-200 truncate">{post.title}</span>
                        <span className="text-gray-400 whitespace-nowrap">{post.views || 0} views</span>
                      </div>
                      <div className="w-full h-2 bg-surface-border rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card p-4 mt-8">
              <h2 className="text-xl font-display font-semibold mb-4">External News Funnel (7 Days)</h2>

              {externalLoading && <p className="text-gray-400">Loading external metrics...</p>}
              {externalError && !externalLoading && <p className="text-red-300">Failed to load external metrics.</p>}

              {!externalLoading && !externalError && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
                    <StatCard label="Card Clicks" value={externalData?.totals?.card_clicks || 0} />
                    <StatCard label="Detail Views" value={externalData?.totals?.detail_views || 0} />
                    <StatCard label="Read More" value={externalData?.totals?.read_more_clicks || 0} />
                    <StatCard label="Bookmarks" value={externalData?.totals?.bookmark_adds || 0} />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-lg font-display font-semibold mb-2">Top Sources</h3>
                      <div className="space-y-2">
                        {(externalData?.top_sources || []).map((row) => (
                          <div key={row.source} className="flex items-center justify-between text-sm">
                            <span className="text-gray-200">{row.source}</span>
                            <span className="text-gray-400">{row.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-display font-semibold mb-2">Top Topics</h3>
                      <div className="space-y-2">
                        {(externalData?.top_topics || []).map((row) => (
                          <div key={row.topic} className="flex items-center justify-between text-sm">
                            <span className="text-gray-200">{row.topic}</span>
                            <span className="text-gray-400">{row.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 text-sm text-gray-400">
                    <p className="mb-1">Card → Detail: {(externalData?.rates?.card_to_detail || 0) * 100}%</p>
                    <p className="mb-0">Detail → Read More: {(externalData?.rates?.detail_to_read_more || 0) * 100}%</p>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

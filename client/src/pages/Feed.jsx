import { useQuery } from '@tanstack/react-query';
import api from '../api/client.js';
import SEOHead from '../components/SEOHead.jsx';
import PostCard from '../components/PostCard.jsx';
import { SkeletonCard } from '../components/PageLoader.jsx';

export default function Feed() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['feed'],
    queryFn: () => api.get('/feed?limit=24').then((r) => r.data),
  });

  const forYou = data?.forYou || data?.posts || [];
  const trending = data?.trending || [];
  const latest = data?.latest || [];

  return (
    <>
      <SEOHead title="For You" description="Personalized feed based on your reading activity" />
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold">For You</h1>
          <p className="text-gray-400 mt-2">
            {data?.hasReadHistory
              ? 'Unread-first recommendations based on your recent reads.'
              : 'A unified stream of personalized, trending, and latest stories.'}
          </p>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <SkeletonCard key={idx} />
            ))}
          </div>
        )}

        {isError && !isLoading && (
          <div className="card p-6 text-red-300">
            We could not load your feed right now. Please try again shortly.
          </div>
        )}

        {!isLoading && !isError && (
          <div className="space-y-12">
            <section>
              <h2 className="text-xl font-display font-semibold mb-4">For You</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {forYou.map((post) => (
                  <PostCard key={`fy-${post.id}`} post={post} />
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold mb-4">Trending</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trending.map((post) => (
                  <PostCard key={`tr-${post.id}`} post={post} />
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-display font-semibold mb-4">Latest</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {latest.map((post) => (
                  <PostCard key={`lt-${post.id}`} post={post} />
                ))}
              </div>
            </section>
          </div>
        )}

        {!isLoading && !isError && forYou.length === 0 && trending.length === 0 && latest.length === 0 && (
          <p className="text-center text-gray-500 py-16">No recommendations yet. Read a few stories and come back.</p>
        )}
      </div>
    </>
  );
}

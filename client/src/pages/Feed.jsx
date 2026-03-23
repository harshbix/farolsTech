import { useQuery } from '@tanstack/react-query';
import api from '../api/client.js';
import SEOHead from '../components/SEOHead.jsx';
import PostCard from '../components/PostCard.jsx';
import { SkeletonCard } from '../components/PageLoader.jsx';

export default function Feed() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['personalized-feed'],
    queryFn: () => api.get('/users/me/feed?limit=20').then((r) => r.data),
  });

  return (
    <>
      <SEOHead title="For You" description="Personalized feed based on your reading activity" />
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold">For You</h1>
          <p className="text-gray-400 mt-2">
            {data?.hasReadHistory
              ? 'Unread-first recommendations based on your recent reads.'
              : 'Fresh stories to help you start building your personalized feed.'}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.posts?.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {!isLoading && !isError && (!data?.posts || data.posts.length === 0) && (
          <p className="text-center text-gray-500 py-16">No recommendations yet. Read a few stories and come back.</p>
        )}
      </div>
    </>
  );
}

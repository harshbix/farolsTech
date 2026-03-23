import { useQuery } from '@tanstack/react-query';
import api from '../api/client.js';
import SEOHead from '../components/SEOHead.jsx';
import PostCard from '../components/PostCard.jsx';
import { SkeletonCard } from '../components/PageLoader.jsx';

export default function News() {
  const { data, isLoading } = useQuery({
    queryKey: ['news-page-posts'],
    queryFn: () => api.get('/posts?limit=20').then((r) => r.data),
  });

  return (
    <>
      <SEOHead title="Newsroom" description="Latest reporting from Farols" />
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-display font-bold mb-2">Newsroom</h1>
        <p className="text-gray-400 mb-8">Latest reports and developing stories.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading
            ? Array.from({ length: 6 }).map((_, idx) => <SkeletonCard key={idx} />)
            : data?.posts?.map((post) => <PostCard key={post.id} post={post} />)}
        </div>
      </div>
    </>
  );
}

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import api from '../api/client.js';
import SEOHead from '../components/SEOHead.jsx';
import PostCard from '../components/PostCard.jsx';
import { SkeletonCard } from '../components/PageLoader.jsx';

export default function Category() {
  const { slug } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ['posts', 'category', slug],
    queryFn: () => api.get(`/posts?category=${slug}&limit=24`).then(r => r.data),
  });

  const catName = slug?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <>
      <SEOHead title={catName} description={`Read the latest ${catName} news on Farols`} />
      <div className="max-w-7xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-display font-bold mb-8 capitalize">{catName}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading
            ? Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)
            : data?.posts?.map(post => <PostCard key={post.id} post={post} />)
          }
        </div>
        {!isLoading && data?.posts?.length === 0 && (
          <p className="text-center text-gray-500 py-16">No articles in this category yet.</p>
        )}
      </div>
    </>
  );
}

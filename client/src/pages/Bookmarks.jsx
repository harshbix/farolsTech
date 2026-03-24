import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import SEOHead from '../components/SEOHead.jsx';
import { SkeletonCard } from '../components/PageLoader.jsx';

export default function Bookmarks() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: () => api.get('/bookmarks').then(r => r.data),
  });

  const removeMutation = useMutation({
    mutationFn: (postId) => api.delete(`/bookmarks/${postId}`),
    onSuccess: () => qc.invalidateQueries(['bookmarks']),
  });

  return (
    <>
      <SEOHead title="Bookmarks" description="Your saved articles" />
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-display font-bold mb-8">🔖 Saved Articles</h1>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : data?.bookmarks?.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-4">No saved articles yet.</p>
            <Link to="/" className="btn-primary">Explore articles</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data?.bookmarks?.map(bm => (
              <div key={bm.id} className="card p-4 flex gap-3">
                {bm.cover_image && (
                  <img src={bm.cover_image} alt={bm.title}
                    className="w-20 h-16 rounded object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <Link
                    to={bm.sourceType === 'api'
                      ? `/news/external/${encodeURIComponent(String(bm.id))}`
                      : `/posts/${bm.slug}`}
                    className="font-medium hover:text-brand-300 line-clamp-2 block"
                  >
                    {bm.title}
                  </Link>
                  {bm.sourceType === 'api' && (
                    <span className="inline-flex items-center rounded-full border border-cyan-400/40 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-cyan-300 mt-2">
                      External
                    </span>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{bm.author_name || bm.author_username}</p>
                </div>
                <button
                  onClick={() => removeMutation.mutate(bm.id)}
                  className="text-gray-500 hover:text-red-400 flex-shrink-0 text-lg"
                  title="Remove bookmark"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

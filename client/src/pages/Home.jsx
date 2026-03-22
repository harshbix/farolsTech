import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../api/client.js';
import SEOHead from '../components/SEOHead.jsx';
import PostCard from '../components/PostCard.jsx';
import { SkeletonCard } from '../components/PageLoader.jsx';
import { Link } from 'react-router-dom';

function useHomeFeed() {
  const trending = useQuery({ queryKey: ['trending'], queryFn: () => api.get('/posts/trending').then(r => r.data.posts) });
  const latest   = useQuery({ queryKey: ['posts', 'latest'], queryFn: () => api.get('/posts?limit=12').then(r => r.data) });
  const cats     = useQuery({ queryKey: ['categories'], queryFn: () => api.get('/categories').then(r => r.data.categories) });
  return { trending, latest, cats };
}

export default function Home() {
  const { t } = useTranslation();
  const { trending, latest, cats } = useHomeFeed();

  return (
    <>
      <SEOHead />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Hero */}
        <section className="mb-12 text-center">
          <h1 className="text-5xl sm:text-6xl font-display font-bold text-gradient mb-4">
            Habari za Tanzania
          </h1>
          <p className="text-lg text-gray-400 max-w-xl mx-auto">
            Stories that matter, delivered fast. Your East African digital newsroom.
          </p>
        </section>

        {/* Trending */}
        <section className="mb-12">
          <h2 className="text-2xl font-display font-bold mb-5 flex items-center gap-2">
            🔥 {t('trending')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trending.isLoading
              ? Array(3).fill(0).map((_, i) => <SkeletonCard key={i} />)
              : trending.data?.map(post => <PostCard key={post.id} post={post} />)
            }
          </div>
        </section>

        {/* Categories */}
        {cats.data?.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-display font-semibold mb-4">{t('categories')}</h2>
            <div className="flex flex-wrap gap-2">
              {cats.data.map(cat => (
                <Link key={cat.id} to={`/category/${cat.slug}`}
                  className="badge-brand hover:bg-brand-800 transition-colors px-3 py-1 text-sm">
                  {cat.name} <span className="opacity-60 ml-1">({cat.post_count})</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Latest */}
        <section>
          <h2 className="text-2xl font-display font-bold mb-5">📰 {t('latest')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {latest.isLoading
              ? Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)
              : latest.data?.posts?.map(post => <PostCard key={post.id} post={post} />)
            }
          </div>
          {latest.data?.total > 12 && (
            <div className="text-center mt-8">
              <Link to="/search" className="btn-primary">Load more</Link>
            </div>
          )}
        </section>

      </main>
    </>
  );
}

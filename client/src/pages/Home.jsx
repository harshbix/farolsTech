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
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Hero */}
        <section className="mb-20 text-center flex flex-col items-center justify-center min-h-[30vh]">
          <h1 className="text-5xl md:text-7xl font-display font-semibold text-[rgb(var(--text-primary))] tracking-tight mb-6 mt-8">
            Habari za Tanzania.
          </h1>
          <p className="text-xl md:text-2xl text-[rgb(var(--text-secondary))] max-w-2xl mx-auto font-medium">
            Stories that matter, delivered fast. Your East African digital newsroom.
          </p>
        </section>

        {/* Trending */}
        <section className="mb-16">
          <h2 className="text-xl font-display font-semibold mb-6 uppercase tracking-widest text-[rgb(var(--text-secondary))]">
            {t('trending')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {trending.isLoading
              ? Array(3).fill(0).map((_, i) => <SkeletonCard key={i} />)
              : trending.data?.map(post => <PostCard key={post.id} post={post} />)
            }
          </div>
        </section>

        {/* Categories */}
        {cats.data?.length > 0 && (
          <section className="mb-16">
            <h2 className="text-xl font-display font-semibold mb-6 uppercase tracking-widest text-[rgb(var(--text-secondary))]">{t('categories')}</h2>
            <div className="flex flex-wrap gap-3">
              {cats.data.map(cat => (
                <Link key={cat.id} to={`/category/${cat.slug}`}
                  className="bg-surface-raised border border-surface-border hover:border-brand-500 transition-colors rounded-full px-4 py-1.5 text-sm font-medium">
                  {cat.name} <span className="opacity-50 ml-1">({cat.post_count})</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Latest */}
        <section>
          <h2 className="text-xl font-display font-semibold mb-6 uppercase tracking-widest text-[rgb(var(--text-secondary))]">The Latest</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {latest.isLoading
              ? Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)
              : latest.data?.posts?.map(post => <PostCard key={post.id} post={post} />)
            }
          </div>
          {latest.data?.total > 12 && (
            <div className="text-center mt-12">
              <Link to="/search" className="btn-ghost border border-surface-border px-8 py-3 rounded-full hover:bg-surface-raised transition-colors">Load more</Link>
            </div>
          )}
        </section>

      </main>
    </>
  );
}

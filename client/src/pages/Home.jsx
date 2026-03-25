import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../api/client.js';
import SEOHead from '../components/SEOHead.jsx';
import PostCard from '../components/PostCard.jsx';
import PageWrapper from '../components/PageWrapper.jsx';
import { SkeletonCard } from '../components/PageLoader.jsx';
import TechNewsFeed from '../components/TechNewsFeed.jsx';
import { Link } from 'react-router-dom';

function useHomeFeed() {
  const trending = useQuery({ queryKey: ['trending'], queryFn: () => api.get('/posts/trending').then(r => r.data.posts) });
  const latest   = useQuery({ queryKey: ['posts', 'latest'], queryFn: () => api.get('/posts?limit=16').then(r => r.data) });
  const cats     = useQuery({ queryKey: ['categories'], queryFn: () => api.get('/categories').then(r => r.data.categories) });
  return { trending, latest, cats };
}

function FeaturedPost({ post }) {
  const date = post.published_at
    ? new Date(post.published_at * 1000).toLocaleDateString('en-TZ', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <Link to={`/posts/${post.slug}`} className="group block featured-post h-full">
      <div className="relative h-80 sm:h-96 md:h-[500px] rounded-xl overflow-hidden mb-6">
        {post.cover_image && (
          <img
            src={post.cover_image}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-80"></div>
        
        {post.category_name && (
          <div className="absolute top-4 left-4 bg-brand-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
            {post.category_name}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-[rgb(var(--text-primary))] group-hover:text-brand-400 transition-colors line-clamp-3">
          {post.title}
        </h2>
        {post.excerpt && (
          <p className="text-base text-[rgb(var(--text-secondary))] line-clamp-2">
            {post.excerpt}
          </p>
        )}
        <div className="flex items-center gap-2 pt-2 text-sm text-[rgb(var(--text-secondary))]">
          <span>{date}</span>
          {post.author_name && <span>•</span>}
          {post.author_name && <span>{post.author_name}</span>}
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const { trending, latest, cats } = useHomeFeed();

  const featuredPost = trending.data?.[0];
  const trendingRest = trending.data?.slice(1, 4);

  return (
    <>
      <SEOHead />
      <PageWrapper>
        <main className="bg-[rgb(var(--surface-bg))] min-h-screen">
        
        {/* Hero Section */}
        <section className="relative py-12 sm:py-20 md:py-28 border-b border-surface-border overflow-hidden">
          <div className="absolute inset-0 -z-10 opacity-5">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-brand-400 rounded-full blur-3xl"></div>
          </div>

          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <span className="inline-block font-display font-semibold text-brand-400 text-sm tracking-widest uppercase mb-4">
                Breaking News & Analysis
              </span>
              <h1 className="text-4xl sm:text-6xl md:text-7xl font-display font-bold text-[rgb(var(--text-primary))] tracking-tight mb-5 sm:mb-6">
                Habari Tanzania!
              </h1>
              <p className="text-base sm:text-xl text-[rgb(var(--text-secondary))] max-w-3xl mx-auto mb-7 sm:mb-8 leading-relaxed px-1">
                In-depth journalism and stories that matter. Your trusted source for East African news, analysis, and perspectives.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full max-w-md mx-auto sm:max-w-none">
                <Link 
                  to="/search" 
                  className="w-full sm:w-auto px-8 py-3 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-full transition-all duration-200 transform hover:scale-105"
                >
                  Explore Stories
                </Link>
                <div className="flex items-center gap-2 text-sm text-[rgb(var(--text-secondary))]">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                  Live Updates Available
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-12 sm:py-20">

          {/* Featured Post */}
          {featuredPost && !trending.isLoading && (
            <section className="mb-20">
              <div className="bg-surface-raised rounded-2xl p-4 sm:p-8 md:p-12 border border-surface-border">
                <FeaturedPost post={featuredPost} />
              </div>
            </section>
          )}

          {/* Trending Posts Secondary */}
          {trendingRest && trendingRest.length > 0 && !trending.isLoading && (
            <section className="mb-20">
              <div className="flex items-center mb-8">
                <div className="flex-1">
                  <h2 className="text-2xl md:text-3xl font-display font-bold text-[rgb(var(--text-primary))]">
                    Trending Now
                  </h2>
                </div>
                <Link to="/search?sort=trending" className="text-brand-400 font-medium hover:text-brand-300 transition-colors">
                  View All →
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {trendingRest?.map((post, idx) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            </section>
          )}

          {/* Categories Showcase */}
          {cats.data?.length > 0 && !cats.isLoading && (
            <section className="mb-20">
              <div className="flex items-center mb-8">
                <h2 className="text-2xl md:text-3xl font-display font-bold text-[rgb(var(--text-primary))]">
                  {t('categories')}
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {cats.data.map(cat => (
                  <Link 
                    key={cat.id} 
                    to={`/category/${cat.slug}`}
                    className="group relative bg-surface-raised border border-surface-border hover:border-brand-500 rounded-xl p-3 sm:p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
                  >
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-3 bg-brand-500/10 rounded-full flex items-center justify-center group-hover:bg-brand-500/20 transition-colors">
                        <span className="text-2xl">📰</span>
                      </div>
                      <h3 className="font-semibold text-sm text-[rgb(var(--text-primary))] mb-1 line-clamp-2">
                        {cat.name}
                      </h3>
                      <span className="text-xs text-[rgb(var(--text-secondary))]">
                        {cat.post_count} {cat.post_count === 1 ? 'post' : 'posts'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Latest Posts */}
          <section className="mb-16">
            <div className="flex items-center mb-8">
              <div className="flex-1">
                <h2 className="text-2xl md:text-3xl font-display font-bold text-[rgb(var(--text-primary))]">
                  Latest Stories
                </h2>
              </div>
              <Link to="/search" className="text-brand-400 font-medium hover:text-brand-300 transition-colors">
                Browse All →
              </Link>
            </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {latest.isLoading
                ? Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)
                : latest.data?.posts?.map(post => <PostCard key={post.id} post={post} />)
              }
            </div>
            {latest.data?.total > 16 && !latest.isLoading && (
              <div className="text-center mt-12">
                <Link 
                  to="/search" 
                  className="inline-block px-8 py-3 border-2 border-surface-border text-[rgb(var(--text-primary))] font-medium rounded-full hover:border-brand-500 hover:text-brand-400 transition-all duration-200"
                >
                  Load More Stories
                </Link>
              </div>
            )}
          </section>

          {/* External Tech News */}
          <section className="mb-16 border-t border-surface-border pt-12">
            <div className="bg-surface-raised/40 rounded-2xl p-3 sm:p-6 md:p-8 border border-surface-border">
              <TechNewsFeed />
            </div>
          </section>

          {/* CTA Section */}
          <section className="mt-16 sm:mt-24 bg-gradient-to-r from-brand-600/10 to-brand-500/10 border border-brand-500/20 rounded-2xl p-5 sm:p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-[rgb(var(--text-primary))] mb-4">
              Stay Informed
            </h2>
            <p className="text-[rgb(var(--text-secondary))] mb-6 max-w-2xl mx-auto">
              Get the latest news and insights delivered to your inbox. Subscribe to our newsletter for curated stories.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="flex-1 px-4 py-3 bg-surface-raised border border-surface-border rounded-full focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-secondary))]"
              />
              <button className="w-full sm:w-auto px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-full transition-colors duration-200 whitespace-nowrap">
                Subscribe
              </button>
            </div>
          </section>

        </div>
      </main>
      </PageWrapper>
    </>
  );
}

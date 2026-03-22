import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client.js';
import SEOHead from '../components/SEOHead.jsx';
import PostCard from '../components/PostCard.jsx';
import { SkeletonCard } from '../components/PageLoader.jsx';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');

  const { data, isFetching } = useQuery({
    queryKey: ['search', searchParams.get('q')],
    queryFn: () => api.get(`/search?q=${encodeURIComponent(searchParams.get('q'))}`).then(r => r.data),
    enabled: !!searchParams.get('q')?.trim(),
  });

  function handleSearch(e) {
    e.preventDefault();
    if (query.trim()) setSearchParams({ q: query.trim() });
  }

  return (
    <>
      <SEOHead title="Search" description="Search Farols articles" />
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-display font-bold mb-6">Search</h1>

        <form onSubmit={handleSearch} className="flex gap-3 mb-8">
          <input
            id="search-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="input flex-1"
            placeholder="Search articles…"
            autoFocus
          />
          <button id="search-submit" type="submit" className="btn-primary px-6">Search</button>
        </form>

        {isFetching && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {data && (
          <>
            <p className="text-sm text-gray-400 mb-4">
              {data.total} result{data.total !== 1 ? 's' : ''} for "{data.query}"
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data.posts.map(post => <PostCard key={post.id} post={post} />)}
            </div>
            {data.posts.length === 0 && (
              <p className="text-center text-gray-500 py-16">No results found. Try different keywords.</p>
            )}
          </>
        )}
      </div>
    </>
  );
}

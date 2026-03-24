import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client.js';
import SEOHead from '../components/SEOHead.jsx';
import PostCard from '../components/PostCard.jsx';
import { SkeletonCard } from '../components/PageLoader.jsx';

function highlightText(text, query) {
  if (!text || !query) return text;
  const q = query.trim();
  if (!q) return text;

  const idx = String(text).toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return text;

  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);
  return (
    <>
      {before}
      <mark className="bg-brand-500/30 text-[rgb(var(--text-primary))] rounded px-0.5">{match}</mark>
      {after}
    </>
  );
}

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [selectedTag, setSelectedTag] = useState(searchParams.get('tag') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const activeQuery = searchParams.get('q') || '';

  const { data, isFetching } = useQuery({
    queryKey: ['search', activeQuery, selectedTag, selectedCategory],
    queryFn: () => api.get(`/search?q=${encodeURIComponent(activeQuery)}${selectedTag ? `&tag=${encodeURIComponent(selectedTag)}` : ''}${selectedCategory ? `&category=${encodeURIComponent(selectedCategory)}` : ''}`).then(r => r.data),
    enabled: !!activeQuery.trim(),
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = {};
      if (query.trim()) next.q = query.trim();
      if (selectedTag) next.tag = selectedTag;
      if (selectedCategory) next.category = selectedCategory;
      setSearchParams(next);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, selectedTag, selectedCategory, setSearchParams]);

  const suggestions = useMemo(() => {
    const posts = data?.posts || [];
    return posts.slice(0, 5);
  }, [data]);

  const discoveredTags = useMemo(() => {
    const tags = new Set();
    for (const post of data?.posts || []) {
      for (const tag of post.tags || []) tags.add(tag);
    }
    return [...tags].slice(0, 20);
  }, [data]);

  const discoveredCategories = useMemo(() => {
    const categories = new Set();
    for (const post of data?.posts || []) {
      if (post.category) categories.add(post.category);
      if (post.category_name) categories.add(post.category_name);
    }
    return [...categories].slice(0, 20);
  }, [data]);

  function handleSearch(e) {
    e.preventDefault();
    if (query.trim()) {
      const next = { q: query.trim() };
      if (selectedTag) next.tag = selectedTag;
      if (selectedCategory) next.category = selectedCategory;
      setSearchParams(next);
    }
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

        {(discoveredTags.length > 0 || discoveredCategories.length > 0) && (
          <div className="mb-6 flex flex-col sm:flex-row gap-3">
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="input"
            >
              <option value="">All tags</option>
              {discoveredTags.map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input"
            >
              <option value="">All categories</option>
              {discoveredCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        )}

        {!isFetching && activeQuery && suggestions.length > 0 && (
          <div className="card p-3 mb-6">
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Instant results</p>
            <div className="space-y-2">
              {suggestions.map((post) => (
                <div key={`suggest-${post.id}`} className="text-sm text-gray-200">
                  {highlightText(post.title, activeQuery)}
                </div>
              ))}
            </div>
          </div>
        )}

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

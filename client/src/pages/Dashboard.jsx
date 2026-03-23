import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/client.js';
import { useAuthStore } from '../store/index.js';
import SEOHead from '../components/SEOHead.jsx';
import PostCard from '../components/PostCard.jsx';
import { SkeletonCard } from '../components/PageLoader.jsx';

export default function Dashboard() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState('published');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-posts', tab],
    queryFn: () => api.get(`/posts?author_id=${user.id}&status=${tab}&limit=50`).then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/posts/${id}`),
    onSuccess: () => { toast.success('Post archived'); qc.invalidateQueries(['dashboard-posts']); },
  });

  const TABS = ['draft', 'published', 'archived'];

  return (
    <>
      <SEOHead title="Dashboard" description="Manage your posts" />
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold">Dashboard</h1>
            <p className="text-gray-400 mt-1">Welcome back, {user?.display_name || user?.username}</p>
          </div>
          <Link to="/editor" className="btn-primary" id="new-post-btn">
            + New Post
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {['published', 'draft', 'archived'].map(s => (
            <div key={s} className="card p-4 text-center">
              <p className="text-2xl font-bold font-display text-brand-400">
                {data?.total ?? '–'}
              </p>
              <p className="text-sm text-gray-400 capitalize">{s}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-surface-border">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors -mb-px border-b-2 ${
                tab === t ? 'border-brand-500 text-brand-300' : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading
            ? Array(3).fill(0).map((_, i) => <SkeletonCard key={i} />)
            : data?.posts?.map(post => (
              <div key={post.id} className="relative">
                <PostCard post={post} />
                <div className="flex gap-2 mt-2 px-1">
                  <Link to={`/editor/${post.id}`} className="btn-ghost text-xs py-1 flex-1 justify-center">Edit</Link>
                  <button
                    onClick={() => deleteMutation.mutate(post.id)}
                    className="btn text-xs py-1 px-3 text-red-400 hover:bg-red-900/20"
                  >
                    Archive
                  </button>
                </div>
              </div>
            ))
          }
        </div>
        {data?.posts?.length === 0 && (
          <p className="text-center text-gray-500 py-16">No {tab} posts yet.</p>
        )}
      </div>
    </>
  );
}

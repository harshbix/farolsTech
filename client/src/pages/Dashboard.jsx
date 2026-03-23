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
  const [rejectingPostId, setRejectingPostId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const qc = useQueryClient();
  const isAdmin = user?.role === 'admin';

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-posts', tab],
    queryFn: () => api.get(`/posts?author_id=${user.id}&status=${tab}&limit=50`).then(r => r.data),
    enabled: !!user?.id && tab !== 'review',
  });

  const { data: reviewQueue, isLoading: isReviewLoading } = useQuery({
    queryKey: ['review-queue'],
    queryFn: () => api.get('/publishing/review-queue').then(r => r.data),
    enabled: isAdmin && tab === 'review',
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/posts/${id}`),
    onSuccess: () => { toast.success('Post archived'); qc.invalidateQueries(['dashboard-posts']); },
  });

  const approveMutation = useMutation({
    mutationFn: (postId) => api.post(`/posts/${postId}/approve`),
    onSuccess: () => {
      toast.success('Post approved and published');
      qc.invalidateQueries(['review-queue']);
      qc.invalidateQueries(['dashboard-posts']);
    },
    onError: () => toast.error('Failed to approve post'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ postId, reason }) => api.post(`/posts/${postId}/reject`, { reason }),
    onSuccess: () => {
      toast.success('Post rejected back to draft');
      setRejectingPostId(null);
      setRejectReason('');
      qc.invalidateQueries(['review-queue']);
      qc.invalidateQueries(['dashboard-posts']);
    },
    onError: () => toast.error('Failed to reject post'),
  });

  const TABS = isAdmin ? ['review', 'draft', 'published', 'archived'] : ['draft', 'published', 'archived'];

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

        {tab === 'review' ? (
          <div className="space-y-4">
            {isReviewLoading ? (
              Array(3).fill(0).map((_, i) => <SkeletonCard key={i} />)
            ) : (
              reviewQueue?.posts?.map(post => (
                <div key={post.id} className="card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-gray-400">Submitted: {new Date(post.submitted_for_review_at).toLocaleString()}</p>
                      <h3 className="font-display text-lg text-white">{post.title}</h3>
                      <p className="text-sm text-gray-400">by {post.author_name || 'Unknown'}</p>
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/editor/${post.id}`} className="btn-ghost text-xs py-2">Open in editor</Link>
                      <button
                        onClick={() => approveMutation.mutate(post.id)}
                        disabled={approveMutation.isPending}
                        className="btn-primary text-xs py-2"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setRejectingPostId(post.id)}
                        className="btn text-xs py-2 px-3 text-red-400 hover:bg-red-900/20"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                  {rejectingPostId === post.id && (
                    <div className="mt-3 flex flex-col sm:flex-row gap-2">
                      <input
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="input flex-1"
                        placeholder="Reason for rejection"
                      />
                      <button
                        onClick={() => rejectMutation.mutate({ postId: post.id, reason: rejectReason })}
                        disabled={!rejectReason.trim() || rejectMutation.isPending}
                        className="btn text-sm py-2 px-3 text-red-300 hover:bg-red-900/20"
                      >
                        Confirm reject
                      </button>
                      <button
                        onClick={() => {
                          setRejectingPostId(null);
                          setRejectReason('');
                        }}
                        className="btn-ghost text-sm py-2 px-3"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
            {!isReviewLoading && reviewQueue?.posts?.length === 0 && (
              <p className="text-center text-gray-500 py-16">No posts waiting for review.</p>
            )}
          </div>
        ) : (
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
        )}
        {tab !== 'review' && data?.posts?.length === 0 && (
          <p className="text-center text-gray-500 py-16">No {tab} posts yet.</p>
        )}
      </div>
    </>
  );
}

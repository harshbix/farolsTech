import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../api/client.js';
import { useAuthStore } from '../store/index.js';
import SEOHead from '../components/SEOHead.jsx';
import PageLoader from '../components/PageLoader.jsx';

function CommentItem({ comment, postId }) {
  const { user, isAuthenticated } = useAuthStore();
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState('');
  const qc = useQueryClient();

  const replyMutation = useMutation({
    mutationFn: () => api.post(`/posts/${postId}/comments`, { body: reply, parent_id: comment.id }),
    onSuccess: () => { setReply(''); setReplying(false); qc.invalidateQueries(['comments', postId]); },
  });

  return (
    <div className="border-l-2 border-surface-border pl-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-full bg-brand-800 flex items-center justify-center text-xs font-bold uppercase">
          {comment.username[0]}
        </div>
        <span className="font-medium text-sm">{comment.display_name || comment.username}</span>
        <span className="text-xs text-gray-500">{new Date(comment.created_at * 1000).toLocaleDateString()}</span>
      </div>
      <p className="text-gray-300 text-sm mb-2">{comment.body}</p>
      {isAuthenticated && !comment.parent_id && (
        <button onClick={() => setReplying(!replying)} className="text-xs text-brand-400 hover:text-brand-300">
          Reply
        </button>
      )}
      {replying && (
        <div className="mt-2 flex gap-2">
          <input value={reply} onChange={e => setReply(e.target.value)}
            className="input text-sm py-1 flex-1" placeholder="Write a reply…" />
          <button onClick={() => replyMutation.mutate()} className="btn-primary py-1 text-sm">
            Send
          </button>
        </div>
      )}
      {comment.replies?.map(r => (
        <div key={r.id} className="mt-3 ml-4 border-l border-surface-border pl-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-brand-900 flex items-center justify-center text-xs font-bold uppercase">
              {r.username[0]}
            </div>
            <span className="font-medium text-xs">{r.display_name || r.username}</span>
          </div>
          <p className="text-gray-400 text-sm">{r.body}</p>
        </div>
      ))}
    </div>
  );
}

export default function PostDetail() {
  const { slug } = useParams();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const qc = useQueryClient();
  const [comment, setComment] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['post', slug],
    queryFn: () => api.get(`/posts/${slug}`).then(r => r.data.post),
  });

  const { data: commentsData } = useQuery({
    queryKey: ['comments', data?.id],
    queryFn: () => api.get(`/posts/${data.id}/comments`).then(r => r.data),
    enabled: !!data?.id,
  });

  const likeMutation = useMutation({
    mutationFn: () => data?.liked ? api.delete(`/posts/${data.id}/like`) : api.post(`/posts/${data.id}/like`),
    onSuccess: () => qc.invalidateQueries(['post', slug]),
    onError: () => toast.error('Login to like'),
  });

  const commentMutation = useMutation({
    mutationFn: () => api.post(`/posts/${data.id}/comments`, { body: comment }),
    onSuccess: () => { setComment(''); qc.invalidateQueries(['comments', data.id]); },
    onError: () => toast.error('Failed to post comment'),
  });

  if (isLoading) return <PageLoader />;
  if (!data) return <div className="text-center py-20 text-gray-400">Post not found</div>;

  const content = (() => {
    try { return JSON.parse(data.content_json); } catch { return null; }
  })();

  return (
    <>
      <SEOHead
        title={data.meta_title || data.title}
        description={data.meta_desc || data.excerpt}
        image={data.og_image || data.cover_image}
        type="article"
        author={data.author_name || data.author_username}
        publishedAt={data.published_at}
        slug={data.slug}
      />
      <main className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        {data.category_name && (
          <Link to={`/category/${data.category_slug}`}>
            <span className="badge-brand mb-4 inline-block">{data.category_name}</span>
          </Link>
        )}
        <h1 className="text-3xl sm:text-4xl font-display font-bold mb-4 text-white leading-tight">
          {data.title}
        </h1>
        <div className="flex items-center gap-3 text-sm text-gray-400 mb-6">
          <Link to={`/author/${data.author_username}`} className="hover:text-brand-300">
            {data.author_name || data.author_username}
          </Link>
          {data.published_at && (
            <span>· {new Date(data.published_at * 1000).toLocaleDateString('en-TZ', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          )}
          <span>· {data.views} views</span>
        </div>
        {data.cover_image && (
          <img src={data.cover_image} alt={data.title} className="w-full rounded-xl mb-8 object-cover max-h-96" />
        )}

        {/* Article content (Tiptap JSON rendered as HTML) */}
        <div
          className="article-content"
          dangerouslySetInnerHTML={{ __html: data.content_json || '' }}
        />

        {/* Actions bar */}
        <div className="flex items-center gap-4 mt-10 pt-6 border-t border-surface-border">
          <button
            id="like-post-btn"
            onClick={() => isAuthenticated ? likeMutation.mutate() : toast.error('Login to like')}
            className={`btn ${data.liked ? 'bg-red-900/30 text-red-400' : 'btn-ghost'}`}
          >
            ♥ {data.likes_count} {t('like')}
          </button>
          <a
            id="whatsapp-share-post"
            href={`https://wa.me/?text=${encodeURIComponent(`${data.title} – https://farols.co.tz/posts/${data.slug}`)}`}
            target="_blank" rel="noopener noreferrer"
            className="btn btn-ghost text-green-400"
            onClick={() => api.post(`/posts/${data.id}/share`, { platform: 'whatsapp' }).catch(() => {})}
          >
            ↗ {t('shareWhatsApp')}
          </a>
        </div>

        {/* Comments */}
        <section className="mt-10">
          <h2 className="text-xl font-display font-semibold mb-5">
            💬 {t('comment')} ({commentsData?.comments?.length ?? 0})
          </h2>
          {isAuthenticated && (
            <div className="flex gap-3 mb-6">
              <input
                id="comment-input"
                value={comment}
                onChange={e => setComment(e.target.value)}
                className="input flex-1"
                placeholder="Share your thoughts…"
              />
              <button
                id="comment-submit"
                onClick={() => comment.trim() && commentMutation.mutate()}
                className="btn-primary"
              >
                Send
              </button>
            </div>
          )}
          <div className="space-y-5">
            {commentsData?.comments?.map(c => (
              <CommentItem key={c.id} comment={c} postId={data.id} />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

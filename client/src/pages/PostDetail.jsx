import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../api/client.js';
import { useAuthStore, useUIStore } from '../store/index.js';
import SEOHead from '../components/SEOHead.jsx';
import PageLoader from '../components/PageLoader.jsx';
import PageWrapper from '../components/PageWrapper.jsx';
import ScrollProgressBar from '../components/ScrollProgressBar.jsx';
import { calculateReadingTime, formatReadingTime } from '../utils/readingTime.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function applyMarks(text, marks = []) {
  return marks.reduce((acc, mark) => {
    if (!mark?.type) return acc;
    if (mark.type === 'bold') return `<strong>${acc}</strong>`;
    if (mark.type === 'italic') return `<em>${acc}</em>`;
    if (mark.type === 'underline') return `<u>${acc}</u>`;
    if (mark.type === 'strike') return `<s>${acc}</s>`;
    if (mark.type === 'code') return `<code>${acc}</code>`;
    if (mark.type === 'link') {
      const href = escapeHtml(mark.attrs?.href || '#');
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${acc}</a>`;
    }
    return acc;
  }, text);
}

function renderNode(node) {
  if (!node) return '';

  if (node.type === 'text') {
    return applyMarks(escapeHtml(node.text || ''), node.marks);
  }

  const children = (node.content || []).map(renderNode).join('');

  switch (node.type) {
    case 'doc':
      return children;
    case 'paragraph':
      return `<p>${children}</p>`;
    case 'heading': {
      const level = Math.min(Math.max(Number(node.attrs?.level || 2), 1), 6);
      return `<h${level}>${children}</h${level}>`;
    }
    case 'bulletList':
      return `<ul>${children}</ul>`;
    case 'orderedList':
      return `<ol>${children}</ol>`;
    case 'listItem':
      return `<li>${children}</li>`;
    case 'blockquote':
      return `<blockquote>${children}</blockquote>`;
    case 'codeBlock':
      return `<pre><code>${escapeHtml((node.content || []).map((c) => c.text || '').join(''))}</code></pre>`;
    case 'hardBreak':
      return '<br />';
    case 'horizontalRule':
      return '<hr />';
    case 'image': {
      const src = escapeHtml(node.attrs?.src || '');
      const alt = escapeHtml(node.attrs?.alt || '');
      const title = escapeHtml(node.attrs?.title || '');
      if (!src) return '';
      return `<img src="${src}" alt="${alt}" title="${title}" loading="lazy" />`;
    }
    default:
      return children;
  }
}

function renderArticleContent(contentJson) {
  if (!contentJson) return '';

  try {
    const parsed = JSON.parse(contentJson);
    if (parsed && typeof parsed === 'object' && parsed.type === 'doc') {
      return renderNode(parsed);
    }
  } catch {
    return contentJson;
  }

  return contentJson;
}

function CommentActions({ commentId, initialScore = 0 }) {
  const { isAuthenticated } = useAuthStore();
  const { openLoginModal } = useUIStore();
  const [score, setScore] = useState(initialScore || 0);
  const [activeVote, setActiveVote] = useState(0);
  const [isFlagging, setIsFlagging] = useState(false);
  const [flagReason, setFlagReason] = useState('');

  const voteMutation = useMutation({
    mutationFn: (vote) => api.post(`/comments/${commentId}/vote`, { vote }),
    onSuccess: ({ data }, vote) => {
      setActiveVote(vote);
      setScore(data?.score ?? 0);
    },
    onError: () => toast.error('Unable to register vote'),
  });

  const flagMutation = useMutation({
    mutationFn: () => api.post(`/comments/${commentId}/flag`, { reason: flagReason }),
    onSuccess: () => {
      toast.success('Comment flagged for moderation');
      setIsFlagging(false);
      setFlagReason('');
    },
    onError: () => toast.error('Unable to flag comment'),
  });

  const guardAuth = () => {
    if (isAuthenticated) return true;
    openLoginModal();
    return false;
  };

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 text-xs text-[rgb(var(--text-secondary))]">
        <button
          onClick={() => guardAuth() && voteMutation.mutate(1)}
          disabled={voteMutation.isPending}
          className={`px-2 py-1 rounded border border-surface-border transition-colors ${activeVote === 1 ? 'text-green-400 border-green-500/50' : 'hover:text-green-400'}`}
        >
          ▲
        </button>
        <span className="min-w-8 text-center font-semibold">{score}</span>
        <button
          onClick={() => guardAuth() && voteMutation.mutate(-1)}
          disabled={voteMutation.isPending}
          className={`px-2 py-1 rounded border border-surface-border transition-colors ${activeVote === -1 ? 'text-red-400 border-red-500/50' : 'hover:text-red-400'}`}
        >
          ▼
        </button>
        <button
          onClick={() => guardAuth() && setIsFlagging((v) => !v)}
          className="px-2 py-1 rounded border border-surface-border hover:text-yellow-300"
        >
          🚩 Flag
        </button>
      </div>

      {isFlagging && (
        <div className="mt-2 flex gap-2">
          <input
            value={flagReason}
            onChange={(e) => setFlagReason(e.target.value)}
            placeholder="Reason for flagging"
            className="input text-xs py-1 flex-1"
          />
          <button
            onClick={() => flagMutation.mutate()}
            disabled={!flagReason.trim() || flagMutation.isPending}
            className="btn-primary text-xs py-1 px-3"
          >
            {flagMutation.isPending ? 'Sending…' : 'Submit'}
          </button>
        </div>
      )}
    </div>
  );
}

function CommentItem({ comment, postId }) {
  const { isAuthenticated } = useAuthStore();
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState('');
  const qc = useQueryClient();

  const replyMutation = useMutation({
    mutationFn: () => api.post(`/posts/${postId}/comments`, { body: reply, parent_id: comment.id }),
    onSuccess: () => { setReply(''); setReplying(false); qc.invalidateQueries(['comments', postId]); },
  });

  return (
    <div className="border-l-2 border-surface-border pl-6 py-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-xs font-bold uppercase text-white">
          {comment.username[0]}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[rgb(var(--text-primary))]">{comment.display_name || comment.username}</span>
            <span className="text-xs text-[rgb(var(--text-secondary))]">{new Date(comment.created_at * 1000).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      <p className="text-[rgb(var(--text-primary))] leading-relaxed mb-3">{comment.body}</p>
      <CommentActions commentId={comment.id} initialScore={comment.score ?? 0} />
      {isAuthenticated && !comment.parent_id && (
        <button onClick={() => setReplying(!replying)} className="text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors">
          Reply
        </button>
      )}
      {replying && (
        <div className="mt-4 flex gap-2">
          <input value={reply} onChange={e => setReply(e.target.value)}
            className="input text-sm py-2 flex-1" placeholder="Write a reply…" />
          <button onClick={() => replyMutation.mutate()} className="btn-primary py-2 text-sm">
            Send
          </button>
        </div>
      )}
      {comment.replies?.map(r => (
        <div key={r.id} className="mt-4 ml-6 border-l border-surface-border pl-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-surface-raised flex items-center justify-center text-xs font-bold uppercase text-brand-400">
              {r.username[0]}
            </div>
            <span className="font-semibold text-xs text-[rgb(var(--text-primary))]">{r.display_name || r.username}</span>
          </div>
          <p className="text-[rgb(var(--text-secondary))] text-sm leading-relaxed">{r.body}</p>
          <CommentActions commentId={r.id} initialScore={r.score ?? 0} />
        </div>
      ))}
    </div>
  );
}

export default function PostDetail() {
  const { slug } = useParams();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const { openLoginModal } = useUIStore();
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
    onError: () => openLoginModal(),
  });

  const commentMutation = useMutation({
    mutationFn: () => api.post(`/posts/${data.id}/comments`, { body: comment }),
    onSuccess: () => { setComment(''); qc.invalidateQueries(['comments', data.id]); },
    onError: () => toast.error('Failed to post comment'),
  });

  useEffect(() => {
    if (!isAuthenticated || !data?.id) return;
    api.post(`/users/me/read/${data.id}`).catch(() => {});
  }, [data?.id, isAuthenticated]);

  useEffect(() => {
    if (!data?.id) return undefined;

    const startedAt = Date.now();
    api.post('/analytics/interactions', {
      action: 'view',
      postId: data.id,
      tags: data.tags?.map((t) => t.name || t.slug || t) || [],
    }).catch(() => {});

    return () => {
      const duration = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      api.post('/analytics/interactions', {
        action: 'view',
        postId: data.id,
        duration,
        tags: data.tags?.map((t) => t.name || t.slug || t) || [],
      }).catch(() => {});
    };
  }, [data?.id]);

  if (isLoading) return <PageLoader />;
  if (!data) return <div className="text-center py-20 text-[rgb(var(--text-secondary))]">Post not found</div>;

  const articleHtml = renderArticleContent(data.content_json);
  const readingTime = calculateReadingTime(data.content_json);

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
      <ScrollProgressBar />
      <PageWrapper>
        <main className="min-h-screen bg-[rgb(var(--surface-bg))]">
        {/* Article Header */}
        <article className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          {/* Category Badge */}
          {data.category_name && (
            <Link to={`/category/${data.category_slug}`}>
              <div className="inline-block text-xs md:text-sm font-bold uppercase tracking-widest text-brand-400 mb-6 pb-2 border-b border-brand-400/30 hover:border-brand-400 transition-colors">
                {data.category_name}
              </div>
            </Link>
          )}

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-[rgb(var(--text-primary))] leading-tight mb-8">
            {data.title}
          </h1>

          {/* Metadata */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 text-sm md:text-base text-[rgb(var(--text-secondary))] mb-8 pb-8 border-b border-surface-border">
            <Link 
              to={`/author/${data.author_username}`} 
              className="font-semibold text-[rgb(var(--text-primary))] hover:text-brand-400 transition-colors"
            >
              {data.author_name || data.author_username}
            </Link>
            
            {data.published_at && (
              <>
                <span className="hidden sm:inline">·</span>
                <time dateTime={new Date(data.published_at * 1000).toISOString()}>
                  {new Date(data.published_at * 1000).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                </time>
              </>
            )}
            
            <span className="hidden sm:inline">·</span>
            <span className="font-medium text-brand-400">{formatReadingTime(readingTime)}</span>
          </div>
        </article>

        {/* Cover Image */}
        {data.cover_image && (
          <div className="w-full max-w-content mx-auto px-4 sm:px-6 lg:px-8 mb-12 md:mb-16">
            <img 
              src={data.cover_image} 
              alt={data.title} 
              className="w-full rounded-2xl object-cover max-h-[600px] shadow-lg transition-transform duration-500 hover:shadow-xl" 
            />
          </div>
        )}

        {/* Article Content */}
        <article className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 pb-12 md:pb-20">
          <div
            className="article-content"
            dangerouslySetInnerHTML={{ __html: articleHtml }}
          />
        </article>

        {/* Social Actions */}
        <div className="border-t border-surface-border bg-surface-raised/50">
          <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
              <span className="text-sm font-medium text-[rgb(var(--text-secondary))]">Share & Engage</span>
              <button
                id="like-post-btn"
                onClick={(e) => {
                  e.preventDefault();
                  isAuthenticated ? likeMutation.mutate() : openLoginModal();
                }}
                className={`btn transition-all duration-200 ${
                  data.liked 
                    ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30' 
                    : 'btn-ghost hover:text-red-400'
                }`}
              >
                <span className="text-lg">♥</span>
                <span>{data.likes_count}</span>
                <span>{t('like')}</span>
              </button>
              <a
                id="whatsapp-share-post"
                href={`https://wa.me/?text=${encodeURIComponent(`${data.title} – https://farols.co.tz/posts/${data.slug}`)}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-ghost text-green-400 hover:text-green-300"
                onClick={() => api.post(`/posts/${data.id}/share`, { platform: 'whatsapp' }).catch(() => {})}
              >
                <span>↗</span>
                <span>{t('shareWhatsApp')}</span>
              </a>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <section className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-[rgb(var(--text-primary))] mb-8">
            💬 {t('comment')} <span className="text-base text-[rgb(var(--text-secondary))]">({commentsData?.comments?.length ?? 0})</span>
          </h2>

          {isAuthenticated ? (
            <div className="mb-10 p-6 bg-surface-raised rounded-xl border border-surface-border flex flex-col gap-3">
              <textarea
                id="comment-input"
                value={comment}
                onChange={e => setComment(e.target.value)}
                className="input resize-none h-24"
                placeholder="Share your thoughts…"
              />
              <div className="flex justify-end">
                <button
                  id="comment-submit"
                  onClick={() => comment.trim() && commentMutation.mutate()}
                  disabled={!comment.trim() || commentMutation.isPending}
                  className="btn-primary"
                >
                  {commentMutation.isPending ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-10 p-6 bg-brand-600/10 border border-brand-600/30 rounded-xl text-center">
              <p className="text-[rgb(var(--text-primary))] mb-4">{t('login')} to comment</p>
              <button 
                onClick={openLoginModal}
                className="btn-primary"
              >
                Sign In
              </button>
            </div>
          )}

          <div className="space-y-2">
            {commentsData?.comments?.map(c => (
              <CommentItem key={c.id} comment={c} postId={data.id} />
            ))}
            {(!commentsData?.comments || commentsData.comments.length === 0) && (
              <p className="text-center py-8 text-[rgb(var(--text-secondary))]">No comments yet. Be the first to share your thoughts!</p>
            )}
          </div>
        </section>
      </main>
      </PageWrapper>
    </>
  );
}

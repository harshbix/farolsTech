import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../api/client.js';
import { useAuthStore, useUIStore } from '../store/index.js';
import SEOHead from '../components/SEOHead.jsx';
import PageLoader from '../components/PageLoader.jsx';

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

  if (isLoading) return <PageLoader />;
  if (!data) return <div className="text-center py-20 text-gray-400">Post not found</div>;

  const articleHtml = renderArticleContent(data.content_json);

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
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          {data.category_name && (
            <Link to={`/category/${data.category_slug}`}>
              <div className="text-xs md:text-sm font-bold uppercase tracking-widest text-[#737373] mb-4">
                {data.category_name}
              </div>
            </Link>
          )}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-semibold mb-6 text-[rgb(var(--text-primary))] leading-tight">
            {data.title}
          </h1>
          <div className="flex items-center justify-center gap-3 text-sm md:text-base font-medium text-[rgb(var(--text-secondary))] mb-8">
            <Link to={`/author/${data.author_username}`} className="hover:text-[rgb(var(--text-primary))] transition-colors">
              {data.author_name || data.author_username}
            </Link>
            {data.published_at && (
              <>
                <span>·</span>
                <span>{new Date(data.published_at * 1000).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </>
            )}
          </div>
        </div>
        {data.cover_image && (
          <img src={data.cover_image} alt={data.title} className="w-full rounded-2xl mb-12 object-cover max-h-[600px]" />
        )}

        {/* Article content (Tiptap JSON rendered as HTML) */}
        <div
          className="article-content max-w-3xl mx-auto"
          dangerouslySetInnerHTML={{ __html: articleHtml }}
        />

        {/* Actions bar */}
        <div className="max-w-3xl mx-auto flex items-center gap-4 mt-12 pt-6 border-t border-surface-border">
          <button
            id="like-post-btn"
            onClick={() => isAuthenticated ? likeMutation.mutate() : openLoginModal()}
            className={`btn ${data.liked ? 'bg-red-900/30 text-red-500' : 'btn-ghost'}`}
          >
            ♥ {data.likes_count} {t('like')}
          </button>
          <a
            id="whatsapp-share-post"
            href={`https://wa.me/?text=${encodeURIComponent(`${data.title} – https://farols.co.tz/posts/${data.slug}`)}`}
            target="_blank" rel="noopener noreferrer"
            className="btn btn-ghost text-green-500"
            onClick={() => api.post(`/posts/${data.id}/share`, { platform: 'whatsapp' }).catch(() => {})}
          >
            ↗ {t('shareWhatsApp')}
          </a>
        </div>

        {/* Comments */}
        <section className="max-w-3xl mx-auto mt-12">
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

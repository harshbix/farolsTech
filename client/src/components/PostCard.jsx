import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client.js';
import { useAuthStore, useUIStore } from '../store/index.js';

export default function PostCard({ post }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { openLoginModal } = useUIStore();
  const queryClient = useQueryClient();
  const isApiPost = post?.sourceType === 'api';
  const postUrl = isApiPost ? (post?.sourceUrl || '#') : `/posts/${post.slug}`;
  const coverImage = post?.cover_image || post?.image;
  const categoryName = post?.category_name || post?.category;

  const likeMutation = useMutation({
    mutationFn: () => post.liked
      ? api.delete(`/posts/${post.id}/like`)
      : api.post(`/posts/${post.id}/like`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['trending'] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'latest'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
    onError: () => openLoginModal(),
  });

  const date = post.published_at
    ? new Date(post.published_at * 1000).toLocaleDateString('en-TZ', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  const handleOpen = () => {
    if (isApiPost) {
      if (post?.sourceUrl) {
        window.open(post.sourceUrl, '_blank', 'noopener,noreferrer');
        api.post('/analytics/interactions', { action: 'click', postId: post.id, tags: post.tags || [] }).catch(() => {});
      }
      return;
    }
    navigate(postUrl);
  };

  return (
    <article
      className="post-card cursor-pointer"
      aria-label={post.title}
      role="link"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleOpen();
        }
      }}
    >
      {coverImage && (
        <div className="post-card-img-wrapper">
          <img
            src={coverImage}
            alt={post.title}
            className="post-card-img"
            loading="lazy"
          />
        </div>
      )}

      {categoryName && (
        <div className="newsroom-category">
          {categoryName}
        </div>
      )}

      <h2 className="newsroom-title line-clamp-2">{post.title}</h2>

      {post.excerpt && (
        <p className="text-sm text-[rgb(var(--text-secondary))] line-clamp-2 mb-3">{post.excerpt}</p>
      )}

      <div className="flex items-center justify-between mt-auto pt-2 gap-3">
        <div className="newsroom-date flex items-center gap-2">
          {date && <span>{date}</span>}
        </div>

        {isApiPost ? (
          <a
            href={postUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.stopPropagation();
              api.post('/analytics/interactions', { action: 'click', postId: post.id, tags: post.tags || [] }).catch(() => {});
            }}
            className="text-sm font-semibold text-brand-400 hover:text-brand-300 transition-colors"
          >
            Read more
          </a>
        ) : (
          <Link
            to={postUrl}
            onClick={(e) => e.stopPropagation()}
            className="text-sm font-semibold text-brand-400 hover:text-brand-300 transition-colors"
          >
            Read more
          </Link>
        )}

        <div className="flex items-center gap-3 text-sm text-[rgb(var(--text-secondary))] pt-1">
          <button
            id={`like-btn-${post.id}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              isAuthenticated ? likeMutation.mutate() : openLoginModal();
            }}
            className={`flex items-center gap-1 hover:text-red-400 transition-colors ${post.liked ? 'text-red-500' : ''}`}
            aria-label={t('like')}
          >
            ♥ {post.likes_count ?? 0}
          </button>
          <span className="flex items-center gap-1 opacity-70">
            💬 {post.comments_count ?? 0}
          </span>
          <a
            id={`whatsapp-share-${post.id}`}
            href={`https://wa.me/?text=${encodeURIComponent(`${post.title} – ${isApiPost ? (post.sourceUrl || 'https://farols.co.tz') : `https://farols.co.tz/posts/${post.slug}`}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-green-500 transition-colors opacity-70"
            aria-label={t('shareWhatsApp')}
            onClick={() => api.post(`/posts/${post.id}/share`, { platform: 'whatsapp' }).catch(() => {})}
          >
            ↗
          </a>
        </div>
      </div>
    </article>
  );
}

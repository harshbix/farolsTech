import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/client.js';
import { useAuthStore, useUIStore } from '../store/index.js';

export default function PostCard({ post }) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const { openLoginModal } = useUIStore();
  const queryClient = useQueryClient();

  const likeMutation = useMutation({
    mutationFn: () => post.liked
      ? api.delete(`/posts/${post.id}/like`)
      : api.post(`/posts/${post.id}/like`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
    onError: () => openLoginModal(),
  });

  const date = post.published_at
    ? new Date(post.published_at * 1000).toLocaleDateString('en-TZ', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <article className="post-card" aria-label={post.title}>
      {post.cover_image && (
        <Link to={`/posts/${post.slug}`} className="post-card-img-wrapper">
          <img
            src={post.cover_image}
            alt={post.title}
            className="post-card-img"
            loading="lazy"
          />
        </Link>
      )}

      {post.category_name && (
        <div className="newsroom-category">
          {post.category_name}
        </div>
      )}

      <Link to={`/posts/${post.slug}`}>
        <h2 className="newsroom-title line-clamp-2">
          {post.title}
        </h2>
      </Link>

      {post.excerpt && (
        <p className="text-sm text-[rgb(var(--text-secondary))] line-clamp-2 mb-3">{post.excerpt}</p>
      )}

      <div className="flex items-center justify-between mt-auto pt-2">
        <div className="newsroom-date flex items-center gap-2">
          {date && <span>{date}</span>}
        </div>

        <div className="flex items-center gap-3 text-sm text-[rgb(var(--text-secondary))] pt-1">
          <button
            id={`like-btn-${post.id}`}
            onClick={() => isAuthenticated ? likeMutation.mutate() : openLoginModal()}
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
            href={`https://wa.me/?text=${encodeURIComponent(`${post.title} – https://farols.co.tz/posts/${post.slug}`)}`}
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

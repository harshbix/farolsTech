import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/client.js';
import { useAuthStore, useUIStore } from '../store/index.js';

export default function PostCard({ post }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { openLoginModal } = useUIStore();
  const queryClient = useQueryClient();
  const postUrl = `/posts/${post.slug}`;

  const likeMutation = useMutation({
    mutationFn: () => post.liked
      ? api.delete(`/posts/${post.id}/like`)
      : api.post(`/posts/${post.id}/like`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['trending'] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'latest'] });
    },
    onError: () => openLoginModal(),
  });

  const date = post.published_at
    ? new Date(post.published_at * 1000).toLocaleDateString('en-TZ', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <article
      className="post-card cursor-pointer"
      aria-label={post.title}
      role="link"
      tabIndex={0}
      onClick={() => navigate(postUrl)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(postUrl);
        }
      }}
    >
      {post.cover_image && (
        <div className="post-card-img-wrapper">
          <img
            src={post.cover_image}
            alt={post.title}
            className="post-card-img"
            loading="lazy"
          />
        </div>
      )}

      {post.category_name && (
        <div className="newsroom-category">
          {post.category_name}
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

        <Link
          to={postUrl}
          onClick={(e) => e.stopPropagation()}
          className="text-sm font-semibold text-brand-400 hover:text-brand-300 transition-colors"
        >
          Read more
        </Link>

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

import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/client.js';
import { useAuthStore } from '../store/index.js';

export default function PostCard({ post }) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const likeMutation = useMutation({
    mutationFn: () => post.liked
      ? api.delete(`/posts/${post.id}/like`)
      : api.post(`/posts/${post.id}/like`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
    onError: () => toast.error('Login to like posts'),
  });

  const date = post.published_at
    ? new Date(post.published_at * 1000).toLocaleDateString('en-TZ', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <article className="post-card" aria-label={post.title}>
      {post.cover_image && (
        <Link to={`/posts/${post.slug}`} className="block -mx-4 -mt-4 mb-4">
          <img
            src={post.cover_image}
            alt={post.title}
            className="w-full h-44 object-cover rounded-t-xl group-hover:opacity-90 transition-opacity"
            loading="lazy"
          />
        </Link>
      )}

      {post.category_name && (
        <Link to={`/category/${post.category_slug}`}>
          <span className="badge-brand mb-2 inline-block">{post.category_name}</span>
        </Link>
      )}

      <Link to={`/posts/${post.slug}`}>
        <h2 className="font-display font-semibold text-lg text-white leading-snug mb-1 hover:text-brand-300 transition-colors line-clamp-2">
          {post.title}
        </h2>
      </Link>

      {post.excerpt && (
        <p className="text-sm text-gray-400 line-clamp-2 mb-3">{post.excerpt}</p>
      )}

      <div className="flex items-center justify-between mt-auto pt-3 border-t border-surface-border">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Link to={`/author/${post.author_username}`} className="hover:text-brand-300 transition-colors font-medium">
            {post.author_name || post.author_username}
          </Link>
          {date && <span>· {date}</span>}
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500">
          <button
            id={`like-btn-${post.id}`}
            onClick={() => isAuthenticated ? likeMutation.mutate() : toast.error('Login to like')}
            className={`flex items-center gap-1 hover:text-red-400 transition-colors ${post.liked ? 'text-red-400' : ''}`}
            aria-label={t('like')}
          >
            ♥ {post.likes_count ?? 0}
          </button>
          <span className="flex items-center gap-1">
            💬 {post.comments_count ?? 0}
          </span>
          {/* WhatsApp share */}
          <a
            id={`whatsapp-share-${post.id}`}
            href={`https://wa.me/?text=${encodeURIComponent(`${post.title} – https://farols.co.tz/posts/${post.slug}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-green-400 transition-colors"
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

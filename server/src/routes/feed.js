import { Router } from 'express';
import { getDb } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/users/me/feed', requireAuth, (req, res, next) => {
  try {
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit || '20', 10)));
    const offset = Math.max(0, Number.parseInt(req.query.offset || '0', 10));
    const db = getDb();

    const readCount = db.prepare('SELECT COUNT(*) AS c FROM user_reads WHERE user_id = ?').get(req.user.id).c;

    let posts;
    if (readCount > 0) {
      posts = db.prepare(`
        SELECT p.id, p.title, p.slug, p.excerpt, p.cover_image, p.published_at,
               p.trending_score, p.views,
               u.username AS author_username, u.display_name AS author_name,
               c.name AS category_name, c.slug AS category_slug,
               (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
               (SELECT COUNT(*) FROM comments co WHERE co.post_id = p.id) AS comments_count
        FROM posts p
        LEFT JOIN users u ON u.id = p.author_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.status = 'published'
          AND p.id NOT IN (SELECT ur.post_id FROM user_reads ur WHERE ur.user_id = ?)
        ORDER BY p.trending_score DESC, p.published_at DESC
        LIMIT ? OFFSET ?
      `).all(req.user.id, limit, offset);
    } else {
      posts = db.prepare(`
        SELECT p.id, p.title, p.slug, p.excerpt, p.cover_image, p.published_at,
               p.trending_score, p.views,
               u.username AS author_username, u.display_name AS author_name,
               c.name AS category_name, c.slug AS category_slug,
               (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
               (SELECT COUNT(*) FROM comments co WHERE co.post_id = p.id) AS comments_count
        FROM posts p
        LEFT JOIN users u ON u.id = p.author_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.status = 'published'
        ORDER BY p.published_at DESC
        LIMIT ? OFFSET ?
      `).all(limit, offset);
    }

    res.json({ posts, offset, limit, hasReadHistory: readCount > 0 });
  } catch (err) {
    next(err);
  }
});

export default router;

import { Router } from 'express';
import { getDb } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function estimateReadingMinutes(contentJson) {
  if (!contentJson) return 1;
  const text = String(contentJson).replace(/<[^>]*>/g, ' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

router.get('/analytics/my-posts', requireAuth, (req, res, next) => {
  try {
    const db = getDb();
    const isAdmin = req.user.role === 'admin';

    const baseWhere = isAdmin ? '' : 'WHERE p.author_id = ?';
    const params = isAdmin ? [] : [req.user.id];

    const posts = db.prepare(`
      SELECT p.id, p.title, p.slug, p.views, p.content_json, p.published_at,
             u.username AS author_username,
             (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count
      FROM posts p
      LEFT JOIN users u ON u.id = p.author_id
      ${baseWhere}
      ORDER BY p.views DESC, p.published_at DESC
    `).all(...params).map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      views: post.views || 0,
      comment_count: post.comment_count || 0,
      avg_reading_time: estimateReadingMinutes(post.content_json),
      published_at: post.published_at,
      author_username: post.author_username,
    }));

    const totals = posts.reduce(
      (acc, p) => {
        acc.total_views += p.views;
        acc.total_comments += p.comment_count;
        return acc;
      },
      { total_views: 0, total_comments: 0 }
    );

    res.json({
      posts,
      totals: {
        total_views: totals.total_views,
        total_posts: posts.length,
        total_comments: totals.total_comments,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;

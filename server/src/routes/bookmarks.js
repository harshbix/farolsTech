import { Router } from 'express';
import { getDb } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';
import { paginate } from '../utils/helpers.js';

const router = Router();

// GET /api/bookmarks
router.get('/', requireAuth, (req, res) => {
  const { limit, offset } = paginate(req.query.page, req.query.limit);
  const db = getDb();
  const bookmarks = db.prepare(`
    SELECT p.id, p.title, p.slug, p.excerpt, p.cover_image, p.published_at,
           u.username AS author_username, u.display_name AS author_name,
           b.created_at AS bookmarked_at
    FROM bookmarks b
    JOIN posts p ON p.id = b.post_id
    JOIN users u ON u.id = p.author_id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.user.id, limit, offset);
  res.json({ bookmarks });
});

// POST /api/bookmarks
router.post('/', requireAuth, (req, res, next) => {
  try {
    const { post_id } = req.body;
    if (!post_id) return res.status(400).json({ error: 'post_id required' });
    const db = getDb();
    db.prepare('INSERT OR IGNORE INTO bookmarks (post_id, user_id) VALUES (?, ?)').run(post_id, req.user.id);
    res.status(201).json({ bookmarked: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/bookmarks/:postId
router.delete('/:postId', requireAuth, (req, res, next) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM bookmarks WHERE post_id = ? AND user_id = ?').run(req.params.postId, req.user.id);
    res.json({ bookmarked: false });
  } catch (err) {
    next(err);
  }
});

export default router;

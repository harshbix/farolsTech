import { Router } from 'express';
import { getDb } from '../db/client.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { paginate } from '../utils/helpers.js';
import { z } from 'zod';

const router = Router();

// GET /api/users/:username
router.get('/:username', optionalAuth, (req, res) => {
  const db = getDb();
  const user = db.prepare(
    'SELECT id, username, display_name, bio, avatar_url, role, created_at FROM users WHERE username = ?'
  ).get(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.post_count = db.prepare("SELECT COUNT(*) AS c FROM posts WHERE author_id = ? AND status = 'published'").get(user.id).c;
  res.json({ user });
});

// GET /api/users/:username/posts
router.get('/:username/posts', optionalAuth, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { limit, offset } = paginate(req.query.page, req.query.limit);
  const posts = db.prepare(`
    SELECT p.id, p.title, p.slug, p.excerpt, p.cover_image, p.status,
           p.views, p.published_at, p.created_at,
           (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes_count,
           (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count
    FROM posts p
    WHERE p.author_id = ? AND p.status = 'published'
    ORDER BY p.published_at DESC
    LIMIT ? OFFSET ?
  `).all(user.id, limit, offset);
  res.json({ posts });
});

// PUT /api/users/:id (update own profile)
router.put('/:id', requireAuth, (req, res, next) => {
  try {
    if (parseInt(req.params.id) !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const schema = z.object({
      display_name: z.string().max(60).optional(),
      bio: z.string().max(300).optional(),
      avatar_url: z.string().url().optional().nullable(),
    });
    const data = schema.parse(req.body);
    const db = getDb();
    db.prepare('UPDATE users SET display_name = COALESCE(?, display_name), bio = COALESCE(?, bio), avatar_url = COALESCE(?, avatar_url), updated_at = unixepoch() WHERE id = ?')
      .run(data.display_name ?? null, data.bio ?? null, data.avatar_url ?? null, req.params.id);
    const updated = db.prepare('SELECT id, username, display_name, bio, avatar_url, role FROM users WHERE id = ?').get(req.params.id);
    res.json({ user: updated });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    next(err);
  }
});

// POST /api/users/me/read/:postId
router.post('/me/read/:postId', requireAuth, (req, res, next) => {
  try {
    const postId = Number.parseInt(req.params.postId, 10);
    if (!Number.isFinite(postId)) return res.status(400).json({ error: 'Invalid post id' });

    const db = getDb();
    const post = db.prepare("SELECT id FROM posts WHERE id = ? AND status = 'published'").get(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    db.prepare('INSERT OR IGNORE INTO user_reads (user_id, post_id) VALUES (?, ?)').run(req.user.id, postId);
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;

import { Router } from 'express';
import { getDb } from '../db/client.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { broadcastBreakingNews } from '../services/websocket.js';

const router = Router();

function canManagePost(reqUser, post) {
  return reqUser?.role === 'admin' || reqUser?.id === post.author_id;
}

router.post('/posts/:id/submit-review', requireAuth, (req, res, next) => {
  try {
    const db = getDb();
    const post = db.prepare('SELECT id, author_id, status FROM posts WHERE id = ?').get(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (!canManagePost(req.user, post)) return res.status(403).json({ error: 'Forbidden' });

    db.prepare(
      "UPDATE posts SET status = 'review', submitted_for_review_at = datetime('now'), updated_at = unixepoch() WHERE id = ?"
    ).run(post.id);

    return res.json({ ok: true, status: 'review' });
  } catch (err) {
    next(err);
  }
});

router.post('/posts/:id/approve', requireAuth, requireRole('admin'), (req, res, next) => {
  try {
    const db = getDb();
    const post = db.prepare('SELECT id, title, slug FROM posts WHERE id = ?').get(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    db.prepare(
      "UPDATE posts SET status = 'published', published_at = unixepoch(), review_reject_reason = NULL, rejected_at = NULL, updated_at = unixepoch() WHERE id = ?"
    ).run(post.id);

    return res.json({ ok: true, status: 'published' });
  } catch (err) {
    next(err);
  }
});

router.post('/posts/:id/reject', requireAuth, requireRole('admin'), (req, res, next) => {
  try {
    const reason = String(req.body?.reason || '').trim();
    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const db = getDb();
    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    db.prepare(
      "UPDATE posts SET status = 'draft', review_reject_reason = ?, rejected_at = datetime('now'), updated_at = unixepoch() WHERE id = ?"
    ).run(reason.slice(0, 500), post.id);

    return res.json({ ok: true, status: 'draft' });
  } catch (err) {
    next(err);
  }
});

router.post('/posts/:id/schedule', requireAuth, (req, res, next) => {
  try {
    const scheduledAt = String(req.body?.scheduled_at || '').trim();
    if (!scheduledAt) {
      return res.status(400).json({ error: 'scheduled_at is required' });
    }

    const parsed = new Date(scheduledAt);
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ error: 'Invalid scheduled_at datetime' });
    }

    const db = getDb();
    const post = db.prepare('SELECT id, author_id FROM posts WHERE id = ?').get(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (!canManagePost(req.user, post)) return res.status(403).json({ error: 'Forbidden' });

    db.prepare(
      "UPDATE posts SET status = 'scheduled', scheduled_at = ?, updated_at = unixepoch() WHERE id = ?"
    ).run(parsed.toISOString(), post.id);

    return res.json({ ok: true, status: 'scheduled', scheduled_at: parsed.toISOString() });
  } catch (err) {
    next(err);
  }
});

router.patch('/posts/:id/breaking', requireAuth, requireRole('admin'), (req, res, next) => {
  try {
    const isBreaking = req.body?.is_breaking ? 1 : 0;
    const db = getDb();
    const post = db.prepare('SELECT id, title, slug, status FROM posts WHERE id = ?').get(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    db.prepare('UPDATE posts SET is_breaking = ?, updated_at = unixepoch() WHERE id = ?').run(isBreaking, post.id);

    if (isBreaking && post.status === 'published') {
      broadcastBreakingNews({
        id: post.id,
        title: post.title,
        slug: post.slug,
      });
    }

    return res.json({ ok: true, is_breaking: Boolean(isBreaking) });
  } catch (err) {
    next(err);
  }
});

router.get('/publishing/review-queue', requireAuth, requireRole('admin'), (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit || '20', 10)));
    const offset = (page - 1) * limit;
    const db = getDb();

    const rows = db.prepare(`
      SELECT p.id, p.title, p.slug, p.status, p.submitted_for_review_at, p.updated_at,
             u.username AS author_username, u.display_name AS author_name
      FROM posts p
      LEFT JOIN users u ON u.id = p.author_id
      WHERE p.status = 'review'
      ORDER BY p.submitted_for_review_at DESC, p.updated_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    const total = db.prepare("SELECT COUNT(*) AS c FROM posts WHERE status = 'review'").get().c;
    return res.json({ posts: rows, total, page, limit });
  } catch (err) {
    next(err);
  }
});

router.get('/publishing/breaking', (req, res, next) => {
  try {
    const db = getDb();
    const post = db.prepare(`
      SELECT id, title, slug, excerpt, published_at
      FROM posts
      WHERE status = 'published' AND is_breaking = 1
      ORDER BY updated_at DESC, published_at DESC
      LIMIT 1
    `).get();

    return res.json({ post: post || null });
  } catch (err) {
    next(err);
  }
});

export default router;

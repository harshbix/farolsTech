import { Router } from 'express';
import { getDb } from '../db/client.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/admin/flagged-comments', requireAuth, requireRole('admin'), (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit || '20', 10)));
    const offset = (page - 1) * limit;

    const db = getDb();
    const comments = db.prepare(`
      SELECT c.id, c.body, c.flag_reason, c.is_flagged, c.created_at,
             u.username AS author_username, u.display_name AS author_name,
             p.id AS post_id, p.title AS post_title, p.slug AS post_slug
      FROM comments c
      JOIN users u ON u.id = c.author_id
      JOIN posts p ON p.id = c.post_id
      WHERE c.is_flagged = 1
      ORDER BY c.updated_at DESC, c.created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    const total = db.prepare('SELECT COUNT(*) AS c FROM comments WHERE is_flagged = 1').get().c;
    res.json({ comments, total, page, limit });
  } catch (err) {
    next(err);
  }
});

router.post('/admin/comments/:id/dismiss', requireAuth, requireRole('admin'), (req, res, next) => {
  try {
    const db = getDb();
    const result = db.prepare(
      'UPDATE comments SET is_flagged = 0, flag_reason = NULL, updated_at = unixepoch() WHERE id = ?'
    ).run(req.params.id);
    if (!result.changes) return res.status(404).json({ error: 'Comment not found' });
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/admin/comments/:id/delete', requireAuth, requireRole('admin'), (req, res, next) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
    if (!result.changes) return res.status(404).json({ error: 'Comment not found' });
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;

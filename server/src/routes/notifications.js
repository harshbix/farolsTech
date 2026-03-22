import { Router } from 'express';
import { getDb } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/notifications
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const notifications = db.prepare(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
  ).all(req.user.id);
  const unread = db.prepare('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read = 0').get(req.user.id).c;
  res.json({ notifications, unread });
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', requireAuth, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

// PATCH /api/notifications/read-all
router.patch('/read-all', requireAuth, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
});

export default router;

import { Router } from 'express';
import { getDb } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

// POST /api/posts/:postId/like
router.post('/', requireAuth, (req, res, next) => {
  try {
    const db = getDb();
    const post = db.prepare("SELECT id, author_id FROM posts WHERE id = ? AND status = 'published'").get(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const existing = db.prepare('SELECT 1 FROM likes WHERE post_id = ? AND user_id = ?').get(req.params.postId, req.user.id);
    if (existing) return res.status(409).json({ error: 'Already liked' });

    db.prepare('INSERT INTO likes (post_id, user_id) VALUES (?, ?)').run(req.params.postId, req.user.id);

    // Notify author
    if (post.author_id !== req.user.id) {
      db.prepare(
        "INSERT INTO notifications (user_id, type, payload_json) VALUES (?, 'like', ?)"
      ).run(post.author_id, JSON.stringify({ post_id: req.params.postId, from: req.user.username }));
    }

    const count = db.prepare('SELECT COUNT(*) AS c FROM likes WHERE post_id = ?').get(req.params.postId).c;
    res.status(201).json({ liked: true, count });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/posts/:postId/like
router.delete('/', requireAuth, (req, res, next) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM likes WHERE post_id = ? AND user_id = ?').run(req.params.postId, req.user.id);
    const count = db.prepare('SELECT COUNT(*) AS c FROM likes WHERE post_id = ?').get(req.params.postId).c;
    res.json({ liked: false, count });
  } catch (err) {
    next(err);
  }
});

export default router;

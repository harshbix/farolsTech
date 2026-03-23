import { Router } from 'express';
import { getDb } from '../db/client.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { shareLimiter } from '../middleware/rateLimiter.js';
import { paginate } from '../utils/helpers.js';
import { z } from 'zod';

const router = Router({ mergeParams: true });

// POST /api/posts/:postId/share
router.post('/', shareLimiter, optionalAuth, (req, res, next) => {
  try {
    const { platform } = z.object({
      platform: z.enum(['whatsapp', 'twitter', 'facebook', 'copy', 'other']),
    }).parse(req.body);

    const postId = parseInt(req.params.postId, 10);
    if (!postId || isNaN(postId)) {
      return res.status(400).json({ error: 'Invalid post ID' });
    }

    const db = getDb();

    // Verify post exists and is published
    const post = db.prepare("SELECT id FROM posts WHERE id = ? AND status = 'published'").get(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    db.prepare('INSERT INTO shares (post_id, user_id, platform) VALUES (?, ?, ?)').run(
      postId, req.user?.id ?? null, platform
    );
    const count = db.prepare('SELECT COUNT(*) AS c FROM shares WHERE post_id = ?').get(postId).c;
    res.status(201).json({ shared: true, count });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    next(err);
  }
});

export default router;

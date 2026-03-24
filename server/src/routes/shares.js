import { Router } from 'express';
import { getDb } from '../db/client.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { shareLimiter } from '../middleware/rateLimiter.js';
import { paginate } from '../utils/helpers.js';
import { z } from 'zod';
import { parsePostIdentity, toUnifiedLocalId } from '../services/postIdentity.js';

const router = Router({ mergeParams: true });

// POST /api/posts/:postId/share
router.post('/', shareLimiter, optionalAuth, (req, res, next) => {
  try {
    const { platform } = z.object({
      platform: z.enum(['whatsapp', 'twitter', 'facebook', 'copy', 'other']),
    }).parse(req.body);

    const identity = parsePostIdentity(req.params.postId);
    if (!identity.unifiedId) return res.status(400).json({ error: 'Invalid post ID' });

    const db = getDb();

    if (identity.sourceType === 'api') {
      const post = db.prepare('SELECT id FROM api_posts WHERE id = ?').get(identity.apiId);
      if (!post) return res.status(404).json({ error: 'Post not found' });

      if (req.user?.id) {
        db.prepare(`
          INSERT INTO post_engagements (post_id, user_id, liked, shared_count, last_updated)
          VALUES (?, ?, 0, 1, unixepoch())
          ON CONFLICT(post_id, user_id)
          DO UPDATE SET shared_count = shared_count + 1, last_updated = unixepoch()
        `).run(identity.unifiedId, req.user.id);
      }

      db.prepare(`
        INSERT OR IGNORE INTO post_analytics (post_id, views, likes, shares, comments, avg_read_time, last_updated)
        VALUES (?, 0, 0, 0, 0, 0, unixepoch())
      `).run(identity.unifiedId);
      db.prepare('UPDATE post_analytics SET shares = shares + 1, last_updated = unixepoch() WHERE post_id = ?')
        .run(identity.unifiedId);

      const count = db.prepare('SELECT shares FROM post_analytics WHERE post_id = ?').get(identity.unifiedId)?.shares || 0;
      return res.status(201).json({ shared: true, count });
    }

    const postId = identity.localId;
    const post = db.prepare("SELECT id FROM posts WHERE id = ? AND status = 'published'").get(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    db.prepare('INSERT INTO shares (post_id, user_id, platform) VALUES (?, ?, ?)').run(
      postId, req.user?.id ?? null, platform
    );
    const count = db.prepare('SELECT COUNT(*) AS c FROM shares WHERE post_id = ?').get(postId).c;

    db.prepare(`
      INSERT OR IGNORE INTO post_analytics (post_id, views, likes, shares, comments, avg_read_time, last_updated)
      VALUES (?, 0, 0, 0, 0, 0, unixepoch())
    `).run(toUnifiedLocalId(postId));
    db.prepare('UPDATE post_analytics SET shares = ?, last_updated = unixepoch() WHERE post_id = ?')
      .run(count, toUnifiedLocalId(postId));

    res.status(201).json({ shared: true, count });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    next(err);
  }
});

export default router;

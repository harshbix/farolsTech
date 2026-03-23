import { Router } from 'express';
import { getDb } from '../db/client.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { commentLimiter } from '../middleware/rateLimiter.js';
import { broadcastComment, pushNotification } from '../services/websocket.js';
import { sanitizePlainText } from '../utils/sanitize.js';
import { z } from 'zod';

const router = Router({ mergeParams: true });

// GET /api/posts/:postId/comments
router.get('/', optionalAuth, (req, res) => {
  const db = getDb();
  const comments = db.prepare(`
    SELECT c.id, c.body, c.parent_id, c.created_at, c.updated_at,
           u.username, u.display_name, u.avatar_url
    FROM comments c
    JOIN users u ON u.id = c.author_id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `).all(req.params.postId);

  // Build tree (2 levels)
  const roots = [];
  const map = {};
  for (const c of comments) {
    map[c.id] = { ...c, replies: [] };
  }
  for (const c of comments) {
    if (c.parent_id && map[c.parent_id]) {
      map[c.parent_id].replies.push(map[c.id]);
    } else {
      roots.push(map[c.id]);
    }
  }
  res.json({ comments: roots });
});

// POST /api/posts/:postId/comments
router.post('/', commentLimiter, requireAuth, (req, res, next) => {
  try {
    const schema = z.object({
      body: z.string().min(1).max(2000),
      parent_id: z.number().int().optional().nullable(),
    });
    const { body, parent_id } = schema.parse(req.body);
    const cleanBody = sanitizePlainText(body, 2000);
    const db = getDb();

    const post = db.prepare("SELECT id FROM posts WHERE id = ? AND status = 'published'").get(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    if (parent_id) {
      const parent = db.prepare('SELECT id, parent_id FROM comments WHERE id = ? AND post_id = ?').get(parent_id, req.params.postId);
      if (!parent) return res.status(400).json({ error: 'Invalid parent comment' });
      if (parent.parent_id) return res.status(400).json({ error: 'Cannot nest replies more than 2 levels' });
    }

    const result = db.prepare(
      'INSERT INTO comments (post_id, author_id, parent_id, body) VALUES (?, ?, ?, ?)'
    ).run(req.params.postId, req.user.id, parent_id ?? null, cleanBody);

    const comment = db.prepare(`
      SELECT c.*, u.username, u.display_name, u.avatar_url
      FROM comments c JOIN users u ON u.id = c.author_id
      WHERE c.id = ?
    `).get(result.lastInsertRowid);

    const postInfo = db.prepare('SELECT slug, author_id FROM posts WHERE id = ?').get(req.params.postId);

    if (postInfo?.author_id && postInfo.author_id !== req.user.id) {
      db.prepare(
        "INSERT INTO notifications (user_id, type, payload_json) VALUES (?, 'comment', ?)"
      ).run(postInfo.author_id, JSON.stringify({ post_id: req.params.postId, comment_id: comment.id, from: req.user.username }));

      const unread = db.prepare('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read = 0').get(postInfo.author_id).c;
      pushNotification(postInfo.author_id, {
        type: 'comment',
        post_id: Number(req.params.postId),
        comment_id: comment.id,
        from: req.user.username,
        unread,
      });
    }

    if (postInfo?.slug) {
      broadcastComment(postInfo.slug, comment);
    }

    res.status(201).json({ comment });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    next(err);
  }
});

// PUT /api/comments/:id
router.put('/:id', requireAuth, (req, res, next) => {
  try {
    const db = getDb();
    const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.author_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { body } = z.object({ body: z.string().min(1).max(2000) }).parse(req.body);
    const cleanBody = sanitizePlainText(body, 2000);
    db.prepare('UPDATE comments SET body = ?, updated_at = unixepoch() WHERE id = ?').run(cleanBody, comment.id);
    res.json({ comment: db.prepare('SELECT * FROM comments WHERE id = ?').get(comment.id) });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    next(err);
  }
});

// DELETE /api/comments/:id
router.delete('/:id', requireAuth, (req, res, next) => {
  try {
    const db = getDb();
    const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.author_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    db.prepare('DELETE FROM comments WHERE id = ?').run(comment.id);
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    next(err);
  }
});

// POST /api/comments/:id/vote
router.post('/:id/vote', requireAuth, (req, res, next) => {
  try {
    const vote = Number.parseInt(req.body?.vote, 10);
    if (![1, -1].includes(vote)) {
      return res.status(400).json({ error: 'vote must be 1 or -1' });
    }

    const db = getDb();
    const comment = db.prepare('SELECT id FROM comments WHERE id = ?').get(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    db.prepare(`
      INSERT INTO comment_votes (comment_id, user_id, vote)
      VALUES (?, ?, ?)
      ON CONFLICT(comment_id, user_id) DO UPDATE SET vote = excluded.vote, created_at = CURRENT_TIMESTAMP
    `).run(comment.id, req.user.id, vote);

    const score = db.prepare('SELECT COALESCE(SUM(vote), 0) AS score FROM comment_votes WHERE comment_id = ?').get(comment.id).score;
    db.prepare('UPDATE comments SET score = ?, updated_at = unixepoch() WHERE id = ?').run(score, comment.id);

    return res.json({ score });
  } catch (err) {
    next(err);
  }
});

// POST /api/comments/:id/flag
router.post('/:id/flag', requireAuth, (req, res, next) => {
  try {
    const reason = String(req.body?.reason || '').trim();
    if (!reason) return res.status(400).json({ error: 'Flag reason is required' });

    const db = getDb();
    const comment = db.prepare('SELECT id FROM comments WHERE id = ?').get(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    db.prepare('UPDATE comments SET is_flagged = 1, flag_reason = ?, updated_at = unixepoch() WHERE id = ?')
      .run(reason.slice(0, 500), comment.id);

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;

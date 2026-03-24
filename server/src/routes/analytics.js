import { Router } from 'express';
import { getDb } from '../db/client.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { parsePostIdentity, toUnifiedLocalId } from '../services/postIdentity.js';

const router = Router();

function ensureAnalyticsRow(db, postId) {
  db.prepare(`
    INSERT OR IGNORE INTO post_analytics (post_id, views, likes, shares, comments, avg_read_time, last_updated)
    VALUES (?, 0, 0, 0, 0, 0, unixepoch())
  `).run(postId);
}

function updateAnalyticsAggregate(db, postId, action, duration = 0) {
  ensureAnalyticsRow(db, postId);

  if (action === 'view') {
    db.prepare('UPDATE post_analytics SET views = views + 1, last_updated = unixepoch() WHERE post_id = ?').run(postId);
  }
  if (action === 'like') {
    db.prepare('UPDATE post_analytics SET likes = likes + 1, last_updated = unixepoch() WHERE post_id = ?').run(postId);
  }
  if (action === 'share' || action === 'click') {
    db.prepare('UPDATE post_analytics SET shares = shares + 1, last_updated = unixepoch() WHERE post_id = ?').run(postId);
  }
  if (action === 'comment') {
    db.prepare('UPDATE post_analytics SET comments = comments + 1, last_updated = unixepoch() WHERE post_id = ?').run(postId);
  }
  if (duration > 0) {
    db.prepare(`
      UPDATE post_analytics
      SET avg_read_time = CASE
            WHEN avg_read_time <= 0 THEN ?
            ELSE ((avg_read_time * 0.8) + (? * 0.2))
          END,
          last_updated = unixepoch()
      WHERE post_id = ?
    `).run(duration, duration, postId);
  }
}

router.post('/interactions', optionalAuth, (req, res, next) => {
  try {
    const db = getDb();
    const payload = Array.isArray(req.body?.events) ? req.body.events : [req.body || {}];
    const inserted = [];

    const tx = db.transaction((events) => {
      for (const event of events) {
        const action = String(event.action || '').trim().toLowerCase();
        if (!['view', 'like', 'click', 'share', 'comment'].includes(action)) continue;

        const identity = parsePostIdentity(event.postId);
        if (!identity.unifiedId) continue;

        const duration = Math.max(0, Number.parseInt(event.duration || 0, 10) || 0);
        const tags = Array.isArray(event.tags)
          ? event.tags.map((t) => String(t).trim()).filter(Boolean).join(',')
          : String(event.tags || '').trim();

        db.prepare(`
          INSERT INTO user_interactions (user_id, post_id, action, duration, tag_snapshot, created_at)
          VALUES (?, ?, ?, ?, ?, unixepoch())
        `).run(req.user?.id ?? null, identity.unifiedId, action, duration, tags || null);

        updateAnalyticsAggregate(db, identity.unifiedId, action, duration);
        inserted.push(identity.unifiedId);
      }
    });

    tx(payload);
    res.status(201).json({ ok: true, tracked: inserted.length });
  } catch (err) {
    next(err);
  }
});

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
    `).all(...params).map((post) => {
      const analytics = db
        .prepare('SELECT views, likes, shares, comments, avg_read_time FROM post_analytics WHERE post_id = ?')
        .get(toUnifiedLocalId(post.id));

      return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      views: Math.max(post.views || 0, analytics?.views || 0),
      likes: analytics?.likes || 0,
      shares: analytics?.shares || 0,
      comment_count: Math.max(post.comment_count || 0, analytics?.comments || 0),
      avg_reading_time: analytics?.avg_read_time || estimateReadingMinutes(post.content_json),
      published_at: post.published_at,
      author_username: post.author_username,
      };
    });

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

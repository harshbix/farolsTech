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

router.get('/analytics/external-news', requireAuth, (req, res, next) => {
  try {
    const db = getDb();
    const days = Math.max(1, Math.min(30, Number.parseInt(req.query.days || '7', 10) || 7));
    const sinceEpoch = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;

    const totals = db.prepare(`
      SELECT
        SUM(CASE WHEN event_type = 'card_click' THEN 1 ELSE 0 END) AS card_clicks,
        SUM(CASE WHEN event_type = 'detail_view' THEN 1 ELSE 0 END) AS detail_views,
        SUM(CASE WHEN event_type = 'read_more' THEN 1 ELSE 0 END) AS read_more_clicks,
        SUM(CASE WHEN event_type = 'bookmark_add' THEN 1 ELSE 0 END) AS bookmark_adds
      FROM external_news_events
      WHERE created_at >= ?
    `).get(sinceEpoch);

    const topSources = db.prepare(`
      SELECT source, COUNT(*) AS count
      FROM external_news_events
      WHERE created_at >= ?
        AND source IS NOT NULL
      GROUP BY source
      ORDER BY count DESC
      LIMIT 10
    `).all(sinceEpoch);

    const topTopics = db.prepare(`
      SELECT topic, COUNT(*) AS count
      FROM external_news_events
      WHERE created_at >= ?
        AND topic IS NOT NULL
      GROUP BY topic
      ORDER BY count DESC
      LIMIT 10
    `).all(sinceEpoch);

    const cardClicks = Number(totals?.card_clicks || 0);
    const detailViews = Number(totals?.detail_views || 0);
    const readMoreClicks = Number(totals?.read_more_clicks || 0);

    res.json({
      period_days: days,
      totals: {
        card_clicks: cardClicks,
        detail_views: detailViews,
        read_more_clicks: readMoreClicks,
        bookmark_adds: Number(totals?.bookmark_adds || 0),
      },
      rates: {
        card_to_detail: cardClicks > 0 ? Number((detailViews / cardClicks).toFixed(3)) : 0,
        detail_to_read_more: detailViews > 0 ? Number((readMoreClicks / detailViews).toFixed(3)) : 0,
      },
      top_sources: topSources,
      top_topics: topTopics,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

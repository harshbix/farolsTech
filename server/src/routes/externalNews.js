// server/src/routes/externalNews.js
/**
 * Route: GET /api/external-news
 * Reads aggregated tech news from the external_articles table.
 * No external API calls — serves from cached DB entries only.
 * Public endpoint — no auth required.
 */

import { Router } from 'express';
import { getDb } from '../db/client.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const TRUST_SCORES = {
  TechCrunch: 'high',
  'The Verge': 'high',
  Wired: 'high',
  'Ars Technica': 'high',
  VentureBeat: 'high',
  Engadget: 'medium',
  Gizmodo: 'medium',
  CNET: 'medium',
  ZDNet: 'medium',
  InfoQ: 'medium',
  DZone: 'medium',
  Mashable: 'medium',
  'The Next Web': 'medium',
  Techradar: 'medium',
};

function getTrustScore(source) {
  return TRUST_SCORES[source] || 'unverified';
}

function getSourceRules(db) {
  const rows = db
    .prepare('SELECT source, blacklisted, priority FROM external_news_source_rules')
    .all();

  const map = new Map();
  rows.forEach((row) => {
    map.set(String(row.source).toLowerCase(), {
      blacklisted: !!row.blacklisted,
      priority: Number(row.priority) || 0,
    });
  });

  return map;
}

function getArticleFlags(db) {
  const rows = db
    .prepare('SELECT article_id, pinned, hidden FROM external_news_article_flags')
    .all();

  const map = new Map();
  rows.forEach((row) => {
    map.set(String(row.article_id), {
      pinned: !!row.pinned,
      hidden: !!row.hidden,
    });
  });

  return map;
}

function getBaseArticles(db, limit, offset) {
  const hasApiPosts = !!db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='api_posts'")
    .get();

  const fetchLimit = Math.max(limit * 4, 60);
  const fetchOffset = Math.max(offset, 0);

  const rows = hasApiPosts
    ? db.prepare(`
        SELECT id, title, description, source_url AS url, image AS image_url, source,
               datetime(published_at, 'unixepoch') AS published_at
        FROM api_posts
        ORDER BY published_at DESC
        LIMIT ? OFFSET ?
      `).all(fetchLimit, fetchOffset)
    : db.prepare(`
        SELECT id, title, description, url, image_url, source, published_at
        FROM external_articles
        ORDER BY published_at DESC
        LIMIT ? OFFSET ?
      `).all(fetchLimit, fetchOffset);

  const total = hasApiPosts
    ? db.prepare('SELECT COUNT(*) AS count FROM api_posts').get().count
    : db.prepare('SELECT COUNT(*) AS count FROM external_articles').get().count;

  return { rows, total };
}

function curateArticles(db, rows, { includeHidden = false } = {}) {
  const sourceRules = getSourceRules(db);
  const articleFlags = getArticleFlags(db);

  const curated = rows
    .map((article) => {
      const rule = sourceRules.get(String(article.source || '').toLowerCase()) || {
        blacklisted: false,
        priority: 0,
      };
      const flags = articleFlags.get(String(article.id)) || { pinned: false, hidden: false };

      return {
        ...article,
        pinned: flags.pinned,
        hidden: flags.hidden,
        source_priority: rule.priority,
        trust_score: getTrustScore(article.source),
      };
    })
    .filter((article) => {
      const rule = sourceRules.get(String(article.source || '').toLowerCase());
      if (rule?.blacklisted) return false;
      if (!includeHidden && article.hidden) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.source_priority !== b.source_priority) return b.source_priority - a.source_priority;
      return String(b.published_at).localeCompare(String(a.published_at));
    });

  return curated;
}

/**
 * GET /api/external-news?limit=20&offset=0
 *
 * Returns paginated list of external tech articles.
 *
 * Query Parameters:
 *   - limit  (number, default 20, max 50)
 *   - offset (number, default 0) — for pagination
 *
 * Response:
 *   {
 *     articles: Array<{id, title, description, url, image_url, source, published_at}>,
 *     total: number,
 *     limit: number,
 *     offset: number
 *   }
 */
router.get('/', (req, res) => {
  const db = req.app.get('db') || getDb();
  const includeHidden = req.query.includeHidden === '1' || req.query.includeHidden === 'true';

  // Validate and sanitize query params
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);
  const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);

  if (isNaN(limit) || isNaN(offset)) {
    return res.status(400).json({ error: 'Invalid limit or offset' });
  }

  try {
    const { rows, total } = getBaseArticles(db, limit, offset);
    const curated = curateArticles(db, rows, { includeHidden });
    const articles = curated.slice(0, limit);

    console.log(`[externalNews] Articles in DB: ${total}`);
    res.json({ articles, total, limit, offset });
  } catch (err) {
    console.error('[GET /api/external-news] Database error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve articles.' });
  }
});

router.post('/events', (req, res) => {
  const db = req.app.get('db') || getDb();
  const payload = Array.isArray(req.body?.events) ? req.body.events : [req.body || {}];
  const validEventTypes = new Set(['card_click', 'detail_view', 'read_more', 'bookmark_add', 'bookmark_remove']);

  try {
    const insert = db.prepare(`
      INSERT INTO external_news_events (article_id, event_type, source, topic, created_at)
      VALUES (?, ?, ?, ?, unixepoch())
    `);

    const tx = db.transaction((events) => {
      let tracked = 0;
      for (const event of events) {
        const eventType = String(event?.eventType || '').trim();
        if (!validEventTypes.has(eventType)) continue;

        insert.run(
          event?.articleId ? String(event.articleId) : null,
          eventType,
          event?.source ? String(event.source) : null,
          event?.topic ? String(event.topic) : null
        );
        tracked += 1;
      }
      return tracked;
    });

    const tracked = tx(payload);
    res.status(201).json({ ok: true, tracked });
  } catch (err) {
    console.error('[POST /api/external-news/events] Database error:', err.message);
    res.status(500).json({ error: 'Failed to track event.' });
  }
});

router.get('/admin/articles', requireAuth, requireRole('admin'), (req, res) => {
  const db = req.app.get('db') || getDb();
  const limit = Math.min(parseInt(req.query.limit || '100', 10), 200);
  const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);

  try {
    const { rows, total } = getBaseArticles(db, limit, offset);
    const articles = curateArticles(db, rows, { includeHidden: true }).slice(0, limit);
    res.json({ articles, total, limit, offset });
  } catch (err) {
    console.error('[GET /api/external-news/admin/articles] Database error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve moderation articles.' });
  }
});

router.patch('/admin/articles/:id', requireAuth, requireRole('admin'), (req, res) => {
  const db = req.app.get('db') || getDb();
  const { id } = req.params;
  const pinned = req.body?.pinned === true;
  const hidden = req.body?.hidden === true;

  try {
    db.prepare(`
      INSERT INTO external_news_article_flags (article_id, pinned, hidden, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(article_id)
      DO UPDATE SET pinned = excluded.pinned, hidden = excluded.hidden, updated_at = CURRENT_TIMESTAMP
    `).run(String(id), pinned ? 1 : 0, hidden ? 1 : 0);

    res.json({ ok: true, article_id: String(id), pinned, hidden });
  } catch (err) {
    console.error('[PATCH /api/external-news/admin/articles/:id] Database error:', err.message);
    res.status(500).json({ error: 'Failed to update article moderation flags.' });
  }
});

router.post('/admin/sources/blacklist', requireAuth, requireRole('admin'), (req, res) => {
  const db = req.app.get('db') || getDb();
  const source = String(req.body?.source || '').trim();
  const blacklisted = req.body?.blacklisted === true;

  if (!source) {
    return res.status(400).json({ error: 'source is required' });
  }

  try {
    db.prepare(`
      INSERT INTO external_news_source_rules (source, blacklisted, priority, updated_at)
      VALUES (?, ?, 0, CURRENT_TIMESTAMP)
      ON CONFLICT(source)
      DO UPDATE SET blacklisted = excluded.blacklisted, updated_at = CURRENT_TIMESTAMP
    `).run(source, blacklisted ? 1 : 0);

    res.json({ ok: true, source, blacklisted });
  } catch (err) {
    console.error('[POST /api/external-news/admin/sources/blacklist] Database error:', err.message);
    res.status(500).json({ error: 'Failed to update source blacklist.' });
  }
});

router.post('/admin/sources/priority', requireAuth, requireRole('admin'), (req, res) => {
  const db = req.app.get('db') || getDb();
  const source = String(req.body?.source || '').trim();
  const priority = Number.parseInt(req.body?.priority, 10);

  if (!source || Number.isNaN(priority)) {
    return res.status(400).json({ error: 'source and numeric priority are required' });
  }

  try {
    db.prepare(`
      INSERT INTO external_news_source_rules (source, blacklisted, priority, updated_at)
      VALUES (?, 0, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(source)
      DO UPDATE SET priority = excluded.priority, updated_at = CURRENT_TIMESTAMP
    `).run(source, priority);

    res.json({ ok: true, source, priority });
  } catch (err) {
    console.error('[POST /api/external-news/admin/sources/priority] Database error:', err.message);
    res.status(500).json({ error: 'Failed to update source priority.' });
  }
});

/**
 * GET /api/external-news/:id
 *
 * Returns a single external news article by id.
 */
router.get('/:id', (req, res) => {
  const db = req.app.get('db') || getDb();
  const { id } = req.params;

  try {
    const hasApiPosts = !!db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='api_posts'")
      .get();

    let article = null;

    if (hasApiPosts) {
      article = db.prepare(`
        SELECT id, title, description, source_url AS url, image AS image_url, source,
               datetime(published_at, 'unixepoch') AS published_at
        FROM api_posts
        WHERE id = ?
        LIMIT 1
      `).get(id);
    }

    if (!article) {
      const numericId = Number(id);
      if (Number.isNaN(numericId)) {
        return res.status(404).json({ error: 'Article not found' });
      }

      article = db.prepare(`
        SELECT id, title, description, url, image_url, source, published_at
        FROM external_articles
        WHERE id = ?
        LIMIT 1
      `).get(numericId);
    }

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const sourceRules = getSourceRules(db);
    const articleFlags = getArticleFlags(db);
    const rule = sourceRules.get(String(article.source || '').toLowerCase()) || {
      blacklisted: false,
      priority: 0,
    };
    const flags = articleFlags.get(String(article.id)) || { pinned: false, hidden: false };

    if (rule.blacklisted || flags.hidden) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json({
      article: {
        ...article,
        pinned: flags.pinned,
        hidden: flags.hidden,
        source_priority: rule.priority,
        trust_score: getTrustScore(article.source),
      },
    });
  } catch (err) {
    console.error('[GET /api/external-news/:id] Database error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve article.' });
  }
});

export default router;

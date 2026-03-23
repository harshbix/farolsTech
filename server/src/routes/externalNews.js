// server/src/routes/externalNews.js
/**
 * Route: GET /api/external-news
 * Reads aggregated tech news from the external_articles table.
 * No external API calls — serves from cached DB entries only.
 * Public endpoint — no auth required.
 */

import { Router } from 'express';
import { getDb } from '../db/client.js';

const router = Router();

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

  // Validate and sanitize query params
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);
  const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);

  if (isNaN(limit) || isNaN(offset)) {
    return res.status(400).json({ error: 'Invalid limit or offset' });
  }

  try {
    const articles = db
      .prepare(
        `
        SELECT id, title, description, url, image_url, source, published_at
        FROM   external_articles
        ORDER  BY published_at DESC
        LIMIT  ? OFFSET ?
      `
      )
      .all(limit, offset);

    const count = db.prepare('SELECT COUNT(*) AS count FROM external_articles').get();
    const total = count.count;
    console.log(`[externalNews] Articles in DB: ${count.count}`);

    res.json({ articles, total, limit, offset });
  } catch (err) {
    console.error('[GET /api/external-news] Database error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve articles.' });
  }
});

export default router;

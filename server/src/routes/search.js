import { Router } from 'express';
import { getDb } from '../db/client.js';

const router = Router();

// GET /api/search?q=keyword&page=1&limit=20
router.get('/', (req, res) => {
  const { q, page = 1, limit = 20 } = req.query;
  if (!q || q.trim().length < 2) return res.status(400).json({ error: 'Query must be at least 2 characters' });

  const db = getDb();
  const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit));

  const posts = db.prepare(`
    SELECT p.id, p.title, p.slug, p.excerpt, p.cover_image, p.published_at,
           u.username AS author_username, u.display_name AS author_name,
           c.name AS category_name, c.slug AS category_slug,
           snippet(posts_fts, 0, '<mark>', '</mark>', '…', 10) AS title_snippet,
           snippet(posts_fts, 1, '<mark>', '</mark>', '…', 30) AS content_snippet,
           rank
    FROM posts_fts
    JOIN posts p ON p.id = posts_fts.rowid
    LEFT JOIN users u ON u.id = p.author_id
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE posts_fts MATCH ? AND p.status = 'published'
    ORDER BY rank
    LIMIT ? OFFSET ?
  `).all(`${q}*`, parseInt(limit), offset);

  const total = db.prepare(`
    SELECT COUNT(*) AS count FROM posts_fts
    JOIN posts p ON p.id = posts_fts.rowid
    WHERE posts_fts MATCH ? AND p.status = 'published'
  `).get(`${q}*`);

  res.json({ posts, total: total.count, query: q });
});

export default router;

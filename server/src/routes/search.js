import { Router } from 'express';
import { getDb } from '../db/client.js';
import { getUnifiedPosts } from '../services/unifiedPosts.js';
import { logEndpointTiming, nowMs, timeOperation } from '../utils/performance.js';

const router = Router();

// GET /api/search?q=keyword&page=1&limit=20
router.get('/', (req, res) => {
  const startedAt = nowMs();
  const { q, page = 1, limit = 20, tag, category } = req.query;
  if (!q || q.trim().length < 2) return res.status(400).json({ error: 'Query must be at least 2 characters' });

  const db = getDb();
  const lim = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * lim;
  const query = String(q).trim().toLowerCase();

  const { result: unified } = timeOperation('search.getUnifiedPosts', () => getUnifiedPosts(db, { userId: null, limit: 1000 }), { limit: 1000 });

  const items = unified
    .map((post) => {
      const title = String(post.title || '').toLowerCase();
      const excerpt = String(post.excerpt || '').toLowerCase();
      const tags = (post.tags || []).map((t) => String(t).toLowerCase());
      const categoryName = String(post.category || '').toLowerCase();

      const startsWith = title.startsWith(query) ? 1 : 0;
      const inTitle = title.includes(query) ? 1 : 0;
      const inExcerpt = excerpt.includes(query) ? 1 : 0;
      const inTags = tags.some((t) => t.includes(query)) ? 1 : 0;
      const fuzzy = query
        .split(/\s+/)
        .filter(Boolean)
        .reduce((acc, token) => acc + (title.includes(token) || excerpt.includes(token) ? 1 : 0), 0);

      const relevance = startsWith * 5 + inTitle * 4 + inExcerpt * 2 + inTags * 2 + fuzzy;
      return { ...post, relevance, rank: relevance + post.score };
    })
    .filter((post) => post.relevance > 0)
    .filter((post) => {
      if (tag) {
        const tagLower = String(tag).toLowerCase();
        if (!(post.tags || []).some((t) => String(t).toLowerCase() === tagLower)) return false;
      }
      if (category) {
        const cat = String(category).toLowerCase();
        if (String(post.category || '').toLowerCase() !== cat) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (b.rank !== a.rank) return b.rank - a.rank;
      return (b.publishedAt || 0) - (a.publishedAt || 0);
    });

  const posts = items.slice(offset, offset + lim);
  logEndpointTiming('GET /search', startedAt, { queryLength: query.length, total: items.length, returned: posts.length, limit: lim });
  res.json({ posts, total: items.length, query: q, page: Math.max(1, parseInt(page, 10)), limit: lim });
});

export default router;

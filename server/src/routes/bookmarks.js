import { Router } from 'express';
import { getDb } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';
import { paginate } from '../utils/helpers.js';
import { parsePostIdentity, toUnifiedLocalId } from '../services/postIdentity.js';

const router = Router();

// GET /api/bookmarks
router.get('/', requireAuth, (req, res) => {
  const { limit, offset } = paginate(req.query.page, req.query.limit);
  const db = getDb();
  const unifiedRows = db.prepare(`
    SELECT bu.post_id, bu.created_at
    FROM bookmarks_unified bu
    WHERE bu.user_id = ?
    ORDER BY bu.created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.user.id, limit, offset);

  const bookmarks = db.prepare(`
    SELECT p.id, p.title, p.slug, p.excerpt, p.cover_image, p.published_at,
           u.username AS author_username, u.display_name AS author_name,
           b.created_at AS bookmarked_at
    FROM bookmarks b
    JOIN posts p ON p.id = b.post_id
    JOIN users u ON u.id = p.author_id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.user.id, limit, offset);

  const unifiedBookmarks = unifiedRows.map((row) => {
    if (String(row.post_id).startsWith('local_')) {
      const localId = Number.parseInt(String(row.post_id).slice(6), 10);
      const post = db.prepare(`
        SELECT p.id, p.title, p.slug, p.excerpt, p.cover_image, p.published_at,
               u.username AS author_username, u.display_name AS author_name
        FROM posts p
        LEFT JOIN users u ON u.id = p.author_id
        WHERE p.id = ? AND p.status = 'published'
      `).get(localId);
      return post ? { ...post, id: row.post_id, bookmarked_at: row.created_at, sourceType: 'local' } : null;
    }

    const apiPost = db.prepare(`
      SELECT id, title, description AS excerpt, image AS cover_image, published_at, source
      FROM api_posts WHERE id = ?
    `).get(row.post_id);
    if (!apiPost) return null;

    return {
      id: apiPost.id,
      title: apiPost.title,
      slug: null,
      excerpt: apiPost.excerpt,
      cover_image: apiPost.cover_image,
      published_at: apiPost.published_at,
      author_username: apiPost.source,
      author_name: apiPost.source,
      sourceType: 'api',
      bookmarked_at: row.created_at,
    };
  }).filter(Boolean);

  res.json({ bookmarks: [...unifiedBookmarks, ...bookmarks] });
});

// POST /api/bookmarks
router.post('/', requireAuth, (req, res, next) => {
  try {
    const { post_id } = req.body;
    if (!post_id) return res.status(400).json({ error: 'post_id required' });
    const db = getDb();

    const identity = parsePostIdentity(post_id);
    if (!identity.unifiedId) return res.status(400).json({ error: 'Invalid post id' });

    if (identity.sourceType === 'api') {
      const post = db.prepare('SELECT id FROM api_posts WHERE id = ?').get(identity.apiId);
      if (!post) return res.status(404).json({ error: 'Post not found' });
    } else {
      const post = db.prepare("SELECT id FROM posts WHERE id = ? AND status = 'published'").get(identity.localId);
      if (!post) return res.status(404).json({ error: 'Post not found' });
      db.prepare('INSERT OR IGNORE INTO bookmarks (post_id, user_id) VALUES (?, ?)').run(identity.localId, req.user.id);
    }

    db.prepare('INSERT OR IGNORE INTO bookmarks_unified (user_id, post_id) VALUES (?, ?)').run(req.user.id, identity.unifiedId);
    res.status(201).json({ bookmarked: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/bookmarks/:postId
router.delete('/:postId', requireAuth, (req, res, next) => {
  try {
    const db = getDb();
    const identity = parsePostIdentity(req.params.postId);
    if (!identity.unifiedId) return res.status(400).json({ error: 'Invalid post id' });

    if (identity.sourceType === 'local') {
      db.prepare('DELETE FROM bookmarks WHERE post_id = ? AND user_id = ?').run(identity.localId, req.user.id);
      db.prepare('DELETE FROM bookmarks_unified WHERE user_id = ? AND post_id = ?').run(req.user.id, toUnifiedLocalId(identity.localId));
    } else {
      db.prepare('DELETE FROM bookmarks_unified WHERE user_id = ? AND post_id = ?').run(req.user.id, identity.unifiedId);
    }
    res.json({ bookmarked: false });
  } catch (err) {
    next(err);
  }
});

export default router;

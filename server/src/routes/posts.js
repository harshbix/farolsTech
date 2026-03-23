import { Router } from 'express';
import { getDb } from '../db/client.js';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js';
import { slugify, paginate } from '../utils/helpers.js';
import { sanitizePlainText, sanitizeRichHtml } from '../utils/sanitize.js';
import { z } from 'zod';

const router = Router();

const nullableAssetUrlField = z.union([
  z.string().url(),
  z.string().regex(/^\/uploads\/.+/),
  z.literal(''),
  z.null(),
  z.undefined(),
]).transform((value) => (value ? value : null));

const postSchema = z.object({
  title: z.string().min(3).max(200),
  content_json: z.string(),
  category_id: z.number().int().optional().nullable(),
  excerpt: z.string().max(500).optional(),
  cover_image: nullableAssetUrlField,
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  featured: z.boolean().default(false),
  meta_title: z.string().max(70).optional(),
  meta_desc: z.string().max(160).optional(),
  og_image: nullableAssetUrlField,
  tags: z.array(z.string()).optional(),
  // Bilingual
  title_sw: z.string().optional(),
  content_json_sw: z.string().optional(),
});

// GET /api/posts
router.get('/', optionalAuth, (req, res) => {
  const { page, limit, category, tag, author, author_id, status, featured } = req.query;
  const { limit: lim, offset } = paginate(page, limit);
  const db = getDb();

  let where = [];
  let params = [];

  // Status filtering: admins can filter, non-admins always see published
  const isAdmin = req.user && req.user.role === 'admin';
  const statusFilter = status || 'published'; // Default to published
  if (!isAdmin) {
    where.push("p.status = 'published'");
  } else {
    where.push('p.status = ?');
    params.push(statusFilter);
  }

  // Author filtering: prefer author_id (stable) over username
  if (author_id) {
    where.push('p.author_id = ?');
    params.push(author_id);
  } else if (author) {
    where.push('u.username = ?');
    params.push(author);
  }

  if (category) { where.push('c.slug = ?'); params.push(category); }
  if (tag) { where.push('t.slug = ?'); params.push(tag); }
  if (featured) { where.push('p.featured = 1'); }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const posts = db.prepare(`
    SELECT p.id, p.title, p.slug, p.excerpt, p.cover_image, p.status, p.featured,
           p.views, p.trending_score, p.published_at, p.created_at,
           u.username AS author_username, u.display_name AS author_name, u.avatar_url AS author_avatar,
           c.name AS category_name, c.slug AS category_slug,
           (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
           (SELECT COUNT(*) FROM comments co WHERE co.post_id = p.id) AS comments_count
    FROM posts p
    LEFT JOIN users u ON u.id = p.author_id
    LEFT JOIN categories c ON c.id = p.category_id
    ${whereClause}
    ORDER BY p.published_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, lim, offset);

  const total = db.prepare(`
    SELECT COUNT(*) AS count FROM posts p
    LEFT JOIN users u ON u.id = p.author_id
    LEFT JOIN categories c ON c.id = p.category_id
    ${whereClause}
  `).get(...params);

  res.json({ posts, total: total.count, page: parseInt(page) || 1, limit: lim });
});

// GET /api/posts/trending
router.get('/trending', (req, res) => {
  const db = getDb();
  const posts = db.prepare(`
    SELECT p.id, p.title, p.slug, p.excerpt, p.cover_image, p.trending_score,
           p.views, p.published_at,
           u.username AS author_username, u.display_name AS author_name,
           c.name AS category_name, c.slug AS category_slug,
           (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count
    FROM posts p
    LEFT JOIN users u ON u.id = p.author_id
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.status = 'published'
    ORDER BY p.trending_score DESC
    LIMIT 10
  `).all();
  res.json({ posts });
});

// GET /api/posts/id/:id (admin editor fetch by numeric id)
router.get('/id/:id', requireAuth, requireRole('admin'), (req, res) => {
  const db = getDb();
  const postId = Number.parseInt(req.params.id, 10);
  if (!Number.isFinite(postId)) {
    return res.status(400).json({ error: 'Invalid post id' });
  }

  const post = db.prepare(`
    SELECT p.*,
           u.username AS author_username, u.display_name AS author_name,
           c.name AS category_name, c.slug AS category_slug
    FROM posts p
    LEFT JOIN users u ON u.id = p.author_id
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.id = ?
  `).get(postId);

  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  post.tags = db.prepare(`
    SELECT t.id, t.name, t.slug FROM tags t
    JOIN post_tags pt ON pt.tag_id = t.id
    WHERE pt.post_id = ?
  `).all(post.id);

  return res.json({ post });
});

// GET /api/posts/:slug
router.get('/:slug', optionalAuth, (req, res) => {
  const db = getDb();
  const post = db.prepare(`
    SELECT p.*,
           u.username AS author_username, u.display_name AS author_name,
           u.bio AS author_bio, u.avatar_url AS author_avatar,
           c.name AS category_name, c.slug AS category_slug
    FROM posts p
    LEFT JOIN users u ON u.id = p.author_id
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.slug = ?
  `).get(req.params.slug);

  if (!post) return res.status(404).json({ error: 'Post not found' });

  const canSee = post.status === 'published' ||
    (req.user && req.user.role === 'admin');
  if (!canSee) return res.status(404).json({ error: 'Post not found' });

  // Increment view count
  db.prepare('UPDATE posts SET views = views + 1 WHERE id = ?').run(post.id);

  // Fetch tags
  post.tags = db.prepare(`
    SELECT t.id, t.name, t.slug FROM tags t
    JOIN post_tags pt ON pt.tag_id = t.id
    WHERE pt.post_id = ?
  `).all(post.id);

  post.likes_count = db.prepare('SELECT COUNT(*) AS c FROM likes WHERE post_id = ?').get(post.id).c;
  post.comments_count = db.prepare('SELECT COUNT(*) AS c FROM comments WHERE post_id = ?').get(post.id).c;

  if (req.user) {
    post.liked = !!db.prepare('SELECT 1 FROM likes WHERE post_id = ? AND user_id = ?').get(post.id, req.user.id);
    post.bookmarked = !!db.prepare('SELECT 1 FROM bookmarks WHERE post_id = ? AND user_id = ?').get(post.id, req.user.id);
  }

  res.json({ post });
});

// POST /api/posts
router.post('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const data = postSchema.parse(req.body);
    const db = getDb();

    const cleanedData = {
      ...data,
      title: sanitizePlainText(data.title, 200),
      excerpt: data.excerpt ? sanitizePlainText(data.excerpt, 500) : null,
      content_json: sanitizeRichHtml(data.content_json),
      title_sw: data.title_sw ? sanitizePlainText(data.title_sw, 200) : null,
      content_json_sw: data.content_json_sw ? sanitizeRichHtml(data.content_json_sw) : null,
      meta_title: data.meta_title ? sanitizePlainText(data.meta_title, 70) : null,
      meta_desc: data.meta_desc ? sanitizePlainText(data.meta_desc, 160) : null,
    };

    let slug = slugify(cleanedData.title);
    // Ensure unique slug
    let existing = db.prepare('SELECT id FROM posts WHERE slug = ?').get(slug);
    if (existing) slug = `${slug}-${Date.now()}`;

    const publishedAt = data.status === 'published' ? Math.floor(Date.now() / 1000) : null;

    const result = db.prepare(`
      INSERT INTO posts (author_id, category_id, title, slug, excerpt, content_json,
        cover_image, status, featured, meta_title, meta_desc, og_image,
        title_sw, content_json_sw, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id, cleanedData.category_id ?? null, cleanedData.title, slug,
      cleanedData.excerpt ?? null, cleanedData.content_json,
      cleanedData.cover_image ?? null, cleanedData.status, cleanedData.featured ? 1 : 0,
      cleanedData.meta_title ?? null, cleanedData.meta_desc ?? null, cleanedData.og_image ?? null,
      cleanedData.title_sw ?? null, cleanedData.content_json_sw ?? null,
      publishedAt
    );

    // Handle tags
    if (cleanedData.tags?.length) {
      for (const tagName of cleanedData.tags) {
        const tagSlug = slugify(tagName);
        let tag = db.prepare('SELECT id FROM tags WHERE slug = ?').get(tagSlug);
        if (!tag) {
          const r = db.prepare('INSERT INTO tags (name, slug) VALUES (?, ?)').run(tagName, tagSlug);
          tag = { id: r.lastInsertRowid };
        }
        db.prepare('INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)').run(result.lastInsertRowid, tag.id);
      }
    }

    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ post });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    next(err);
  }
});

// PUT /api/posts/:id
router.put('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const db = getDb();
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    // Save revision before update (keep last 20)
    db.prepare('INSERT INTO revisions (post_id, content_json) VALUES (?, ?)').run(post.id, post.content_json);
    const revCount = db.prepare('SELECT COUNT(*) AS c FROM revisions WHERE post_id = ?').get(post.id).c;
    if (revCount > 20) {
      db.prepare(`DELETE FROM revisions WHERE post_id = ? AND id IN (
        SELECT id FROM revisions WHERE post_id = ? ORDER BY saved_at ASC LIMIT ?
      )`).run(post.id, post.id, revCount - 20);
    }

    const data = postSchema.partial().parse(req.body);
    const cleanedData = {
      ...data,
      title: data.title !== undefined ? sanitizePlainText(data.title, 200) : undefined,
      excerpt: data.excerpt !== undefined ? sanitizePlainText(data.excerpt ?? '', 500) : undefined,
      content_json: data.content_json !== undefined ? sanitizeRichHtml(data.content_json) : undefined,
      title_sw: data.title_sw !== undefined ? sanitizePlainText(data.title_sw ?? '', 200) : undefined,
      content_json_sw: data.content_json_sw !== undefined ? sanitizeRichHtml(data.content_json_sw ?? '') : undefined,
      meta_title: data.meta_title !== undefined ? sanitizePlainText(data.meta_title ?? '', 70) : undefined,
      meta_desc: data.meta_desc !== undefined ? sanitizePlainText(data.meta_desc ?? '', 160) : undefined,
    };

    const wasPublished = post.status !== 'published' && cleanedData.status === 'published';
    const publishedAt = wasPublished ? Math.floor(Date.now() / 1000) : post.published_at;

    db.prepare(`
      UPDATE posts SET
        title = COALESCE(?, title), excerpt = COALESCE(?, excerpt),
        content_json = COALESCE(?, content_json), category_id = COALESCE(?, category_id),
        cover_image = COALESCE(?, cover_image), status = COALESCE(?, status),
        featured = COALESCE(?, featured), meta_title = COALESCE(?, meta_title),
        meta_desc = COALESCE(?, meta_desc), og_image = COALESCE(?, og_image),
        title_sw = COALESCE(?, title_sw), content_json_sw = COALESCE(?, content_json_sw),
        published_at = COALESCE(?, published_at),
        updated_at = unixepoch()
      WHERE id = ?
    `).run(
      cleanedData.title ?? null, cleanedData.excerpt ?? null, cleanedData.content_json ?? null,
      cleanedData.category_id ?? null, cleanedData.cover_image ?? null, cleanedData.status ?? null,
      cleanedData.featured !== undefined ? (cleanedData.featured ? 1 : 0) : null,
      cleanedData.meta_title ?? null, cleanedData.meta_desc ?? null, cleanedData.og_image ?? null,
      cleanedData.title_sw ?? null, cleanedData.content_json_sw ?? null, publishedAt ?? null,
      post.id
    );

    res.json({ post: db.prepare('SELECT * FROM posts WHERE id = ?').get(post.id) });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    next(err);
  }
});

// DELETE /api/posts/:id (soft delete → archived)
router.delete('/:id', requireAuth, requireRole('admin'), (req, res, next) => {
  try {
    const db = getDb();
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    db.prepare("UPDATE posts SET status = 'archived', updated_at = unixepoch() WHERE id = ?").run(post.id);
    res.json({ message: 'Post archived' });
  } catch (err) {
    next(err);
  }
});

// GET /api/posts/:id/revisions
router.get('/:id/revisions', requireAuth, requireRole('admin'), (req, res) => {
  const db = getDb();
  const revisions = db.prepare(
    'SELECT id, saved_at FROM revisions WHERE post_id = ? ORDER BY saved_at DESC LIMIT 20'
  ).all(req.params.id);
  res.json({ revisions });
});

export default router;

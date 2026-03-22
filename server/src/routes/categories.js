import { Router } from 'express';
import { getDb } from '../db/client.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { slugify } from '../utils/helpers.js';
import { z } from 'zod';

const router = Router();

// GET /api/categories
router.get('/', (req, res) => {
  const db = getDb();
  const categories = db.prepare(`
    SELECT c.id, c.name, c.slug, c.description,
           COUNT(p.id) AS post_count
    FROM categories c
    LEFT JOIN posts p ON p.category_id = c.id AND p.status = 'published'
    GROUP BY c.id
    ORDER BY c.name ASC
  `).all();
  res.json({ categories });
});

// POST /api/categories (admin only)
router.post('/', requireAuth, requireRole('admin'), (req, res, next) => {
  try {
    const { name, description } = z.object({
      name: z.string().min(2).max(50),
      description: z.string().optional(),
    }).parse(req.body);
    const db = getDb();
    const slug = slugify(name);
    const result = db.prepare('INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)').run(name, slug, description ?? null);
    res.status(201).json({ category: db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid) });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    next(err);
  }
});

// PUT /api/categories/:id
router.put('/:id', requireAuth, requireRole('admin'), (req, res, next) => {
  try {
    const db = getDb();
    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    if (!cat) return res.status(404).json({ error: 'Category not found' });
    const { name, description } = z.object({
      name: z.string().min(2).max(50).optional(),
      description: z.string().optional(),
    }).parse(req.body);
    const slug = name ? slugify(name) : cat.slug;
    db.prepare('UPDATE categories SET name = COALESCE(?, name), slug = ?, description = COALESCE(?, description) WHERE id = ?')
      .run(name ?? null, slug, description ?? null, cat.id);
    res.json({ category: db.prepare('SELECT * FROM categories WHERE id = ?').get(cat.id) });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    next(err);
  }
});

// DELETE /api/categories/:id
router.delete('/:id', requireAuth, requireRole('admin'), (req, res, next) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;

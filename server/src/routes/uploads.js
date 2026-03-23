import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getDb } from '../db/client.js';

const router = Router();
const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadsRoot = join(__dirname, '..', '..', 'uploads');

const MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const SIZE_SET = [400, 800, 1200];
const MAX_IMAGE_WIDTH = 5000;
const MAX_IMAGE_HEIGHT = 5000;
const MIN_IMAGE_WIDTH = 80;
const MIN_IMAGE_HEIGHT = 80;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!MIME_TYPES.has(file.mimetype)) {
      cb(new Error('Unsupported file type. Only JPEG, PNG and WebP are allowed.'));
      return;
    }
    cb(null, true);
  },
});

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

async function validateImageDimensions(buffer) {
  try {
    const metadata = await sharp(buffer).metadata();
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Unable to read image dimensions');
    }
    
    if (metadata.width > MAX_IMAGE_WIDTH || metadata.height > MAX_IMAGE_HEIGHT) {
      throw new Error(
        `Image dimensions ${metadata.width}x${metadata.height} exceed maximum of ${MAX_IMAGE_WIDTH}x${MAX_IMAGE_HEIGHT}`
      );
    }
    
    if (metadata.width < MIN_IMAGE_WIDTH || metadata.height < MIN_IMAGE_HEIGHT) {
      throw new Error(
        `Image dimensions ${metadata.width}x${metadata.height} must be at least ${MIN_IMAGE_WIDTH}x${MIN_IMAGE_HEIGHT}`
      );
    }
    
    return metadata;
  } catch (err) {
    const message = err.message.includes('Image dimensions') ? err.message : `Invalid image: ${err.message}`;
    throw new Error(message);
  }
}

async function generateResponsiveWebp(buffer, outputDir, prefix) {
  ensureDir(outputDir);

  const results = [];
  for (const width of SIZE_SET) {
    const fileName = `${prefix}-${width}.webp`;
    const filePath = join(outputDir, fileName);
    await sharp(buffer)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 78, effort: 4 })
      .toFile(filePath);

    results.push({ width, fileName });
  }

  return results;
}

// POST /api/v1/uploads/posts/image (admin only)
router.post('/posts/image', requireAuth, requireRole('admin'), upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image file is required' });

    // Validate image dimensions before processing
    await validateImageDimensions(req.file.buffer);

    const id = crypto.randomUUID();
    const outputDir = join(uploadsRoot, 'posts');
    const generated = await generateResponsiveWebp(req.file.buffer, outputDir, id);

    const images = generated.map((item) => ({
      width: item.width,
      url: `/uploads/posts/${item.fileName}`,
    }));

    res.status(201).json({
      image: {
        url: images.find((item) => item.width === 800)?.url || images[0].url,
        srcset: images,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/uploads/users/avatar
router.post('/users/avatar', requireAuth, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image file is required' });

    // Validate image dimensions before processing
    await validateImageDimensions(req.file.buffer);

    const id = crypto.randomUUID();
    const outputDir = join(uploadsRoot, 'avatars');
    const generated = await generateResponsiveWebp(req.file.buffer, outputDir, id);

    const avatarUrl = `/uploads/avatars/${generated[0].fileName}`;
    const db = getDb();
    db.prepare('UPDATE users SET avatar_url = ?, updated_at = unixepoch() WHERE id = ?').run(avatarUrl, req.user.id);

    res.status(201).json({
      avatar_url: avatarUrl,
      srcset: generated.map((item) => ({ width: item.width, url: `/uploads/avatars/${item.fileName}` })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;

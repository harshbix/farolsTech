import { Router } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getDb } from '../db/client.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { requireAuth } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();
const ACCESS_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const REFRESH_SECRET = process.env.JWT_SECRET + '_refresh' || 'dev_refresh_secret';
const ACCESS_EXP = process.env.JWT_ACCESS_EXPIRES || '15m';
const REFRESH_EXP_DAYS = 7;

function signAccess(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXP }
  );
}

function signRefresh(user) {
  const token = jwt.sign({ id: user.id }, REFRESH_SECRET, { expiresIn: `${REFRESH_EXP_DAYS}d` });
  return token;
}

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const schema = z.object({
      username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
      email: z.string().email(),
      password: z.string().min(8),
    });
    const { username, email, password } = schema.parse(req.body);

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
    if (existing) return res.status(409).json({ error: 'Email or username already taken' });

    const hash = await argon2.hash(password, { type: argon2.argon2id });
    const result = db.prepare(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)'
    ).run(username, email, hash);

    const user = db.prepare('SELECT id, username, email, role FROM users WHERE id = ?').get(result.lastInsertRowid);
    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user);

    // Store hashed refresh token
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expires = Math.floor(Date.now() / 1000) + REFRESH_EXP_DAYS * 86400;
    db.prepare('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)').run(user.id, tokenHash, expires);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: REFRESH_EXP_DAYS * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({ user, accessToken });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string(),
    });
    const { email, password } = schema.parse(req.body);

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await argon2.verify(user.password_hash, password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user);

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expires = Math.floor(Date.now() / 1000) + REFRESH_EXP_DAYS * 86400;
    db.prepare('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)').run(user.id, tokenHash, expires);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: REFRESH_EXP_DAYS * 24 * 60 * 60 * 1000,
    });

    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser, accessToken });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });

    let payload;
    try {
      payload = jwt.verify(refreshToken, REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const db = getDb();
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const stored = db.prepare('SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked = 0').get(tokenHash);
    if (!stored || stored.expires_at < Math.floor(Date.now() / 1000)) {
      return res.status(401).json({ error: 'Refresh token expired or revoked' });
    }

    const user = db.prepare('SELECT id, username, email, role FROM users WHERE id = ?').get(payload.id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    const accessToken = signAccess(user);
    res.json({ accessToken, user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      const db = getDb();
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?').run(tokenHash);
    }
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, username, email, role, display_name, bio, avatar_url, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json({ user });
});

export default router;

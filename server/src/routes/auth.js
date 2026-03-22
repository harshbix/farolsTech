import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getDb } from '../db/client.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { requireAuth } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();
const ACCESS_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || `${ACCESS_SECRET}_refresh`;
const ACCESS_EXP = process.env.JWT_ACCESS_EXPIRES || '15m';
const REFRESH_EXP_DAYS = 7;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 15 * 60;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin_farols';

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

function setRefreshCookie(res, refreshToken) {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: REFRESH_EXP_DAYS * 24 * 60 * 60 * 1000,
  });
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

    if (username === ADMIN_USERNAME) {
      return res.status(403).json({ error: 'Reserved username' });
    }

    const hash = await bcrypt.hash(password, 12);
    const result = db.prepare(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run(username, email, hash, 'viewer');

    const user = db.prepare('SELECT id, username, email, role FROM users WHERE id = ?').get(result.lastInsertRowid);
    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user);

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expires = Math.floor(Date.now() / 1000) + REFRESH_EXP_DAYS * 86400;
    db.prepare('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)').run(user.id, tokenHash, expires);

    setRefreshCookie(res, refreshToken);

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

    const now = Math.floor(Date.now() / 1000);
    if (user.locked_until && user.locked_until > now) {
      return res.status(423).json({ error: 'Account temporarily locked. Try again later.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const failedAttempts = (user.failed_attempts || 0) + 1;
      const lockUntil = failedAttempts >= MAX_FAILED_ATTEMPTS ? now + LOCKOUT_SECONDS : null;
      db.prepare(
        'UPDATE users SET failed_attempts = ?, locked_until = ?, updated_at = unixepoch() WHERE id = ?'
      ).run(failedAttempts, lockUntil, user.id);

      const status = lockUntil ? 423 : 401;
      return res.status(status).json({
        error: lockUntil ? 'Account temporarily locked after failed attempts.' : 'Invalid credentials',
      });
    }

    db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL, updated_at = unixepoch() WHERE id = ?').run(user.id);

    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user);

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expires = Math.floor(Date.now() / 1000) + REFRESH_EXP_DAYS * 86400;
    db.prepare('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)').run(user.id, tokenHash, expires);

    setRefreshCookie(res, refreshToken);

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

    const nextRefreshToken = signRefresh(user);
    const nextTokenHash = crypto.createHash('sha256').update(nextRefreshToken).digest('hex');
    const expires = Math.floor(Date.now() / 1000) + REFRESH_EXP_DAYS * 86400;

    const tx = db.transaction(() => {
      db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?').run(tokenHash);
      db.prepare('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)').run(user.id, nextTokenHash, expires);
    });
    tx();

    setRefreshCookie(res, nextRefreshToken);

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
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
    });
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

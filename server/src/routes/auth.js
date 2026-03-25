import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getDb } from '../db/client.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { requireAuth } from '../middleware/auth.js';
import OAuthProvider from '../services/oauth.js';
import { z } from 'zod';

const router = Router();
const ACCESS_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || `${ACCESS_SECRET}_refresh`;
const ACCESS_EXP = process.env.JWT_ACCESS_EXPIRES || '15m';
const REFRESH_EXP_DAYS = 7;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 15 * 60;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin_farols';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const REFRESH_COOKIE_SAMESITE = process.env.REFRESH_COOKIE_SAMESITE
  || (IS_PRODUCTION ? 'none' : 'lax');

function resolveSameSite(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'strict') return 'Strict';
  if (normalized === 'none') return 'None';
  return 'Lax';
}

const COOKIE_SAMESITE = resolveSameSite(REFRESH_COOKIE_SAMESITE);

// Helper to return minimal user object (no PII or system fields)
function minimizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name || null,
    avatar_url: user.avatar_url || null,
    role: user.role,
  };
}

function signAccess(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXP }
  );
}

function signRefresh(user) {
  const token = jwt.sign(
    { id: user.id, jti: crypto.randomUUID() },
    REFRESH_SECRET,
    { expiresIn: `${REFRESH_EXP_DAYS}d` }
  );
  return token;
}

function setRefreshCookie(res, refreshToken) {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: COOKIE_SAMESITE,
    maxAge: REFRESH_EXP_DAYS * 24 * 60 * 60 * 1000,
  });
}

function normalizeUsername(seed) {
  return String(seed || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24) || 'user';
}

function allocateUniqueUsername(db, seed) {
  const base = normalizeUsername(seed);
  let candidate = base;
  let i = 1;
  while (db.prepare('SELECT id FROM users WHERE username = ?').get(candidate)) {
    candidate = `${base.slice(0, Math.max(3, 24 - String(i).length - 1))}_${i}`;
    i += 1;
  }
  return candidate;
}

// GET /api/auth/google
router.get('/google', (req, res) => {
  try {
    const { url } = OAuthProvider.googleAuthUrl();
    return res.redirect(url);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Google OAuth not configured' });
  }
});

// GET /api/auth/google/callback
router.get('/google/callback', async (req, res) => {
  try {
    const code = String(req.query.code || '').trim();
    if (!code) return res.status(400).json({ error: 'Missing OAuth code' });

    const profile = await OAuthProvider.exchangeGoogleCode(code);
    const db = getDb();

    let user = db.prepare('SELECT id, username, email, role, display_name, avatar_url FROM users WHERE email = ?').get(profile.email);

    if (!user) {
      const username = allocateUniqueUsername(db, profile.name || profile.email.split('@')[0]);
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, 12);

      const result = db.prepare(`
        INSERT INTO users (username, email, password_hash, role, display_name, avatar_url, is_verified)
        VALUES (?, ?, ?, 'viewer', ?, ?, 1)
      `).run(username, profile.email, passwordHash, profile.name || username, profile.picture || null);

      user = db.prepare('SELECT id, username, email, role, display_name, avatar_url FROM users WHERE id = ?').get(result.lastInsertRowid);
    }

    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user);
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expires = Math.floor(Date.now() / 1000) + REFRESH_EXP_DAYS * 86400;
    db.prepare('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)').run(user.id, tokenHash, expires);
    setRefreshCookie(res, refreshToken);

    const encodedUser = Buffer.from(JSON.stringify(minimizeUser(user))).toString('base64url');
    const redirectUrl = new URL('/login', CLIENT_ORIGIN);
    redirectUrl.searchParams.set('oauth', 'google');
    redirectUrl.searchParams.set('token', accessToken);
    redirectUrl.searchParams.set('user', encodedUser);
    return res.redirect(redirectUrl.toString());
  } catch (err) {
    const redirectUrl = new URL('/login', CLIENT_ORIGIN);
    redirectUrl.searchParams.set('oauthError', err.message || 'OAuth failed');
    return res.redirect(redirectUrl.toString());
  }
});

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

    res.status(201).json({ user: minimizeUser(user), accessToken });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    next(err);
  }
});

// POST /api/auth/oauth
// Simulates Google, Facebook, and Apple logins to support the UI without requesting real Client IDs 
router.post('/oauth', authLimiter, async (req, res, next) => {
  try {
    const { provider } = req.body;
    if (!['Apple', 'Google', 'Facebook'].includes(provider)) {
      return res.status(400).json({ error: 'Unsupported provider' });
    }

    const email = `user_${provider.toLowerCase()}@example.com`;
    const username = `${provider}User`;
    
    const db = getDb();
    let user = db.prepare('SELECT id, username, email, role FROM users WHERE email = ?').get(email);
    
    if (!user) {
      // Create user with a random unguessable password
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const hash = await bcrypt.hash(randomPassword, 12);
      
      const result = db.prepare(
        'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
      ).run(username, email, hash, 'viewer');
      
      user = db.prepare('SELECT id, username, email, role FROM users WHERE id = ?').get(result.lastInsertRowid);
    }

    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user);

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expires = Math.floor(Date.now() / 1000) + REFRESH_EXP_DAYS * 86400;
    db.prepare('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)').run(user.id, tokenHash, expires);

    setRefreshCookie(res, refreshToken);

    res.status(200).json({ user: minimizeUser(user), accessToken, provider });
  } catch (err) {
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

    res.json({ user: minimizeUser(user), accessToken });
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
      // Single-use guarantee: only one concurrent refresh can revoke this token.
      const revokeResult = db
        .prepare('UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ? AND revoked = 0')
        .run(tokenHash);

      if (revokeResult.changes !== 1) {
        return false;
      }

      db.prepare('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)').run(user.id, nextTokenHash, expires);
      return true;
    });
    const rotated = tx();

    if (!rotated) {
      return res.status(401).json({ error: 'Refresh token already used' });
    }

    setRefreshCookie(res, nextRefreshToken);

    const accessToken = signAccess(user);
    res.json({ accessToken, user: minimizeUser(user) });
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
      secure: IS_PRODUCTION,
      sameSite: COOKIE_SAMESITE,
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

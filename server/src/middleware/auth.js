import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

const ACCESS_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET);
    // ✓ Use JWT payload directly (already verified)
    req.user = decoded;
    next();
  } catch (err) {
    logger.warn(`Auth failed: ${err.message}`);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Optional auth – attaches user if token present but doesn't block
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.slice(7), ACCESS_SECRET);
      // ✓ Use JWT payload directly (already verified)
      req.user = decoded;
    } catch (_) {}
  }
  next();
}

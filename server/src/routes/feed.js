import { Router } from 'express';
import { getDb } from '../db/client.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { composeFeed, getUnifiedPosts } from '../services/unifiedPosts.js';
import { parsePostIdentity, toUnifiedLocalId } from '../services/postIdentity.js';
import { logEndpointTiming, nowMs, timeOperation } from '../utils/performance.js';

const router = Router();

function toNumber(value, fallback) {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function rankRelated(posts, seedPost) {
  const seedTags = new Set((seedPost.tags || []).map((t) => String(t).toLowerCase()));
  return posts
    .filter((p) => p.id !== seedPost.id)
    .map((p) => {
      const overlap = (p.tags || []).filter((tag) => seedTags.has(String(tag).toLowerCase())).length;
      return { ...p, relatedScore: overlap * 2 + p.score };
    })
    .sort((a, b) => b.relatedScore - a.relatedScore);
}

// GET /api/feed
router.get('/feed', optionalAuth, (req, res, next) => {
  const startedAt = nowMs();
  try {
    const limit = Math.min(60, Math.max(6, toNumber(req.query.limit, 24)));
    const db = getDb();
    const userId = req.user?.id ?? null;
    const { result: posts } = timeOperation('feed.getUnifiedPosts', () => getUnifiedPosts(db, { userId, limit: 300 }), { limit: 300, userId: userId || null });
    const { result: sections } = timeOperation('feed.composeFeed', () => composeFeed(posts, { userId, limit }), { limit });

    logEndpointTiming('GET /feed', startedAt, { returned: sections.forYou.length + sections.trending.length + sections.latest.length });
    res.json({
      forYou: sections.forYou,
      trending: sections.trending,
      latest: sections.latest,
      total: posts.length,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/trending
router.get('/trending', optionalAuth, (req, res, next) => {
  const startedAt = nowMs();
  try {
    const db = getDb();
    const hours = Math.min(72, Math.max(24, toNumber(req.query.windowHours, 48)));
    const limit = Math.min(50, Math.max(1, toNumber(req.query.limit, 10)));
    const sinceEpoch = Math.floor(Date.now() / 1000) - hours * 3600;

    const { result: posts } = timeOperation('trending.getUnifiedPosts', () => getUnifiedPosts(db, { userId: req.user?.id ?? null, limit: 500 }), { limit: 500, hours })
      .filter((p) => (p.publishedAt || 0) >= sinceEpoch)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    logEndpointTiming('GET /trending', startedAt, { limit, returned: posts.length, hours });
    res.json({ posts, windowHours: hours, limit });
  } catch (err) {
    next(err);
  }
});

// GET /api/posts/:postId/related
router.get('/posts/:postId/related', optionalAuth, (req, res, next) => {
  const startedAt = nowMs();
  try {
    const db = getDb();
    const limit = Math.min(20, Math.max(1, toNumber(req.query.limit, 6)));
    const identity = parsePostIdentity(req.params.postId);
    const { result: all } = timeOperation('related.getUnifiedPosts', () => getUnifiedPosts(db, { userId: req.user?.id ?? null, limit: 500 }), { limit: 500 });
    const targetId = identity.sourceType === 'local' ? toUnifiedLocalId(identity.localId) : identity.unifiedId;
    const seed = all.find((p) => p.id === targetId);

    if (!seed) return res.status(404).json({ error: 'Post not found' });

    const related = rankRelated(all, seed).slice(0, limit);
    logEndpointTiming('GET /posts/:postId/related', startedAt, { limit, returned: related.length });
    res.json({ postId: seed.id, related });
  } catch (err) {
    next(err);
  }
});

router.get('/users/me/feed', requireAuth, (req, res, next) => {
  const startedAt = nowMs();
  try {
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit || '20', 10)));
    const offset = Math.max(0, Number.parseInt(req.query.offset || '0', 10));
    const db = getDb();

    const interactionsCount = db.prepare('SELECT COUNT(*) AS c FROM user_interactions WHERE user_id = ?').get(req.user.id).c;
    const { result: merged } = timeOperation('users.feed.getUnifiedPosts', () => getUnifiedPosts(db, { userId: req.user.id, limit: 400 }), { limit: 400, userId: req.user.id });
    const { result: sections } = timeOperation('users.feed.composeFeed', () => composeFeed(merged, { userId: req.user.id, limit: Math.max(limit, 20) }), { limit: Math.max(limit, 20) });
    const page = sections.forYou.slice(offset, offset + limit);

    logEndpointTiming('GET /users/me/feed', startedAt, { offset, limit, returned: page.length });
    res.json({
      posts: page,
      forYou: page,
      trending: sections.trending,
      latest: sections.latest,
      offset,
      limit,
      hasReadHistory: interactionsCount > 0,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

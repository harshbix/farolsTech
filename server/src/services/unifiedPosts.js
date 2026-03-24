import { parseTags, toUnifiedLocalId } from './postIdentity.js';

function toEpochSeconds(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Math.floor(value);
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : null;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function computeRecencyBoost(publishedAt) {
  const published = toEpochSeconds(publishedAt);
  if (!published) return 0;
  const ageHours = Math.max(0, (Date.now() / 1000 - published) / 3600);
  // Freshness decays linearly over 72h, capped at 4 points.
  return clamp((72 - ageHours) / 18, 0, 4);
}

function computeUserInterestMatch(tags, preferredTagSet) {
  if (!preferredTagSet || preferredTagSet.size === 0) return 0;
  const overlap = tags.filter((tag) => preferredTagSet.has(tag.toLowerCase())).length;
  return overlap * 1.2;
}

export function computeUnifiedScore({ views = 0, likes = 0, comments = 0, shares = 0, publishedAt, tags = [], preferredTagSet }) {
  const recencyBoost = computeRecencyBoost(publishedAt);
  const interestBoost = computeUserInterestMatch(tags, preferredTagSet);

  return (
    views * 0.2 +
    likes * 0.3 +
    comments * 0.25 +
    shares * 0.25 +
    recencyBoost +
    interestBoost
  );
}

function getPreferredTags(db, userId) {
  if (!userId) return new Set();

  const rows = db.prepare(`
    SELECT tag_snapshot, COUNT(*) AS weight
    FROM user_interactions
    WHERE user_id = ? AND tag_snapshot IS NOT NULL AND tag_snapshot <> ''
    GROUP BY tag_snapshot
    ORDER BY weight DESC
    LIMIT 50
  `).all(userId);

  const scoreByTag = new Map();
  for (const row of rows) {
    for (const tag of parseTags(row.tag_snapshot)) {
      const key = tag.toLowerCase();
      scoreByTag.set(key, (scoreByTag.get(key) || 0) + row.weight);
    }
  }

  return new Set(
    [...scoreByTag.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag]) => tag)
  );
}

function getViewedPosts(db, userId) {
  if (!userId) return new Set();
  const rows = db.prepare('SELECT DISTINCT post_id FROM user_interactions WHERE user_id = ?').all(userId);
  return new Set(rows.map((r) => String(r.post_id)));
}

function getAnalyticsMap(db) {
  const rows = db.prepare(`
    SELECT post_id, views, likes, shares, comments, avg_read_time
    FROM post_analytics
  `).all();

  const map = new Map();
  for (const row of rows) {
    map.set(String(row.post_id), {
      views: row.views || 0,
      likes: row.likes || 0,
      shares: row.shares || 0,
      comments: row.comments || 0,
      avgReadTime: row.avg_read_time || 0,
    });
  }
  return map;
}

function getLocalPosts(db, limit = 300) {
  return db.prepare(`
    SELECT p.id, p.title, p.slug, p.excerpt, p.content_json, p.cover_image,
           p.published_at, p.views,
           u.display_name AS author_name, u.username AS author_username,
           c.name AS category_name,
           GROUP_CONCAT(t.name, ',') AS tags,
           (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
           (SELECT COUNT(*) FROM comments co WHERE co.post_id = p.id) AS comments_count,
           (SELECT COUNT(*) FROM shares sh WHERE sh.post_id = p.id) AS shares_count
    FROM posts p
    LEFT JOIN users u ON u.id = p.author_id
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN post_tags pt ON pt.post_id = p.id
    LEFT JOIN tags t ON t.id = pt.tag_id
    WHERE p.status = 'published'
    GROUP BY p.id
    ORDER BY p.published_at DESC
    LIMIT ?
  `).all(limit);
}

function getApiPosts(db, limit = 300) {
  return db.prepare(`
    SELECT id, title, description, source_url, image, source, published_at, cached_at, category, tags
    FROM api_posts
    ORDER BY published_at DESC
    LIMIT ?
  `).all(limit);
}

function normalizeLocal(row, analytics, preferredTagSet, viewedSet) {
  const id = toUnifiedLocalId(row.id);
  const tags = parseTags(row.tags);
  const views = Math.max(row.views || 0, analytics?.views || 0);
  const likes = Math.max(row.likes_count || 0, analytics?.likes || 0);
  const comments = Math.max(row.comments_count || 0, analytics?.comments || 0);
  const shares = Math.max(row.shares_count || 0, analytics?.shares || 0);
  const score = computeUnifiedScore({ views, likes, comments, shares, publishedAt: row.published_at, tags, preferredTagSet });

  return {
    id,
    localId: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content_json,
    image: row.cover_image,
    cover_image: row.cover_image,
    sourceType: 'local',
    sourceUrl: null,
    source: 'Farols',
    author: row.author_name || row.author_username || 'Farols',
    publishedAt: row.published_at,
    published_at: row.published_at,
    category: row.category_name || null,
    tags,
    likes,
    likes_count: likes,
    commentsCount: comments,
    comments_count: comments,
    shares,
    views,
    score,
    viewed: viewedSet.has(id),
  };
}

function normalizeApi(row, analytics, preferredTagSet, viewedSet) {
  const id = String(row.id);
  const tags = parseTags(row.tags || row.category);
  const views = analytics?.views || 0;
  const likes = analytics?.likes || 0;
  const comments = analytics?.comments || 0;
  const shares = analytics?.shares || 0;
  const score = computeUnifiedScore({ views, likes, comments, shares, publishedAt: row.published_at, tags, preferredTagSet });

  return {
    id,
    localId: null,
    slug: null,
    title: row.title,
    excerpt: row.description,
    content: null,
    image: row.image,
    cover_image: row.image,
    sourceType: 'api',
    sourceUrl: row.source_url,
    source: row.source,
    author: row.source || 'External Source',
    publishedAt: row.published_at,
    published_at: row.published_at,
    category: row.category,
    tags,
    likes,
    likes_count: likes,
    commentsCount: comments,
    comments_count: comments,
    shares,
    views,
    score,
    viewed: viewedSet.has(id),
  };
}

export function getUnifiedPosts(db, { userId = null, limit = 100 } = {}) {
  const preferredTagSet = getPreferredTags(db, userId);
  const viewedSet = getViewedPosts(db, userId);
  const analyticsMap = getAnalyticsMap(db);

  const local = getLocalPosts(db, Math.max(limit, 200)).map((row) =>
    normalizeLocal(row, analyticsMap.get(toUnifiedLocalId(row.id)), preferredTagSet, viewedSet)
  );

  const api = getApiPosts(db, Math.max(limit, 200)).map((row) =>
    normalizeApi(row, analyticsMap.get(String(row.id)), preferredTagSet, viewedSet)
  );

  const merged = [...local, ...api]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.publishedAt || 0) - (a.publishedAt || 0);
    });

  return merged.slice(0, limit);
}

export function composeFeed(posts, { userId = null, limit = 20 } = {}) {
  const cap = Math.max(1, limit);
  const personalizedTarget = Math.round(cap * 0.55);
  const trendingTarget = Math.round(cap * 0.25);
  const freshApiTarget = cap - personalizedTarget - trendingTarget;

  const forYou = userId
    ? posts
        .filter((p) => !p.viewed)
        .sort((a, b) => b.score - a.score)
        .slice(0, personalizedTarget)
    : posts
        .slice(0, personalizedTarget);

  const trending = posts
    .filter((p) => !forYou.some((fy) => fy.id === p.id))
    .sort((a, b) => b.score - a.score)
    .slice(0, trendingTarget);

  const latest = posts
    .filter((p) => !forYou.some((fy) => fy.id === p.id) && !trending.some((tr) => tr.id === p.id))
    .sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))
    .slice(0, cap);

  const freshApi = posts
    .filter((p) => p.sourceType === 'api')
    .sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))
    .slice(0, freshApiTarget);

  const composedForYou = [...forYou];
  for (const item of freshApi) {
    if (composedForYou.length >= cap) break;
    if (!composedForYou.some((p) => p.id === item.id)) composedForYou.push(item);
  }

  return {
    forYou: composedForYou,
    trending,
    latest,
  };
}
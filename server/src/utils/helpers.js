/**
 * Trending score algorithm from the spec:
 * score = ((likes*3) + (comments*5) + (shares*4) + (views*0.5)) / (hours+2)^1.5
 */
export function calcTrendingScore({ likes = 0, comments = 0, shares = 0, views = 0, publishedAt }) {
  const now = Math.floor(Date.now() / 1000);
  const seconds = Math.max(0, now - (publishedAt || now));
  const hours = seconds / 3600;
  const numerator = likes * 3 + comments * 5 + shares * 4 + views * 0.5;
  const denominator = Math.pow(hours + 2, 1.5);
  return numerator / denominator;
}

export function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function paginate(page = 1, limit = 20) {
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));
  return { limit: l, offset: (p - 1) * l };
}

// server/src/services/newsFetcher.js
/**
 * Fetches and filters tech news from NewsAPI.
 * Responsibilities:
 *   - Fetch from NewsAPI
 *   - Validate data completeness
 *   - Filter by trusted sources
 *   - Filter by relevant keywords
 *   - Return normalized article format
 */

import https from 'https';

// ─── Configuration ─────────────────────────────────────────────────────────

const NEWSAPI_URL =
  'https://newsapi.org/v2/top-headlines' +
  '?category=technology' +
  '&language=en' +
  '&pageSize=100';

const TRUSTED_SOURCES = new Set([
  'TechCrunch',
  'The Verge',
  'Wired',
  'Ars Technica',
  'Hacker News',
  'Slashdot',
  'VentureBeat',
  'Engadget',
  'Gizmodo',
  'CNET',
  'ZDNet',
  'InfoQ',
  'DZone',
  'Mashable',
  'The Next Web',
  'Techradar',
]);

const KEYWORDS = [
  'ai',
  'artificial intelligence',
  'software',
  'programming',
  'developer',
  'cybersecurity',
  'cloud',
  'machine learning',
  'data science',
  'startup',
  'technology',
  'api',
  'database',
  'javascript',
  'python',
  'web development',
  'open source',
  'algorithm',
];

// ─── Helper Functions ──────────────────────────────────────────────────────

/**
 * Validates that a string is a well-formed URL.
 */
function isValidUrl(str) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if article title or description matches any keyword.
 */
function matchesKeyword(article) {
  const haystack = `${article.title} ${article.description || ''}`.toLowerCase();
  return KEYWORDS.some((kw) => haystack.includes(kw));
}

/**
 * Checks if article source is in the trusted list.
 */
function isTrustedSource(article) {
  return TRUSTED_SOURCES.has(article.source?.name);
}

/**
 * Validates that an article has all required fields.
 */
function isComplete(article) {
  return (
    typeof article.title === 'string' &&
    article.title.trim() !== '' &&
    typeof article.url === 'string' &&
    isValidUrl(article.url) &&
    article.publishedAt
  );
}

// ─── Fetcher ───────────────────────────────────────────────────────────────

/**
 * Low-level fetch from NewsAPI.
 * Throws on network error, non-200 status, or parse failure.
 * @returns {Promise<{articles: Array, statusCode: number, bodySnippet: string}>}
 */
function fetchRaw() {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    throw new Error(
      'NEWS_API_KEY is not set in environment variables. ' +
      'Please add it to your .env file.'
    );
  }

  return new Promise((resolve, reject) => {
    const url = `${NEWSAPI_URL}&apiKey=${apiKey}`;
    const options = {
      headers: {
        'User-Agent': 'Farols/1.0 (+http://farols.co.tz)',
      },
    };

    https
      .get(url, options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          const bodySnippet = body.slice(0, 400);
          console.log(`[newsFetcher] NewsAPI status: ${res.statusCode}`);
          console.log(`[newsFetcher] NewsAPI body (first 400 chars): ${bodySnippet}`);

          if (res.statusCode !== 200) {
            return reject(
              new Error(
                `NewsAPI responded with status ${res.statusCode}: ${body.slice(0, 200)}`
              )
            );
          }
          try {
            const json = JSON.parse(body);
            resolve({
              articles: json.articles || [],
              statusCode: res.statusCode,
              bodySnippet,
            });
          } catch (e) {
            reject(new Error(`Failed to parse NewsAPI response: ${e.message}`));
          }
        });
      })
      .on('error', (err) => {
        reject(new Error(`Network error fetching from NewsAPI: ${err.message}`));
      });
  });
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Returns filtered, normalized articles ready for DB insertion.
 * Applies filters for completeness and relevance.
 * Accepts articles that are complete AND (from trusted source OR match keywords)
 *
 * @returns {Promise<Array<Object>>} Normalized articles with keys:
 *   - title
 *   - description
 *   - url
 *   - image_url
 *   - source
 *   - published_at
 */
async function fetchFilteredArticles() {
  try {
    const { articles: raw } = await fetchRaw();
    const afterComplete = raw.filter(isComplete);
    const afterSource = afterComplete.filter(isTrustedSource);
    const afterKeyword = afterSource.filter(matchesKeyword);

    console.log(`[newsFetcher] Raw: ${raw.length}`);
    console.log(`[newsFetcher] After isComplete: ${afterComplete.length}`);
    console.log(`[newsFetcher] After isTrustedSource: ${afterSource.length}`);
    console.log(`[newsFetcher] After matchesKeyword: ${afterKeyword.length}`);

    let finalArticles = afterKeyword;
    if (afterSource.length === 0 && afterComplete.length > 0) {
      const sourceCounts = new Map();
      afterComplete.forEach((article) => {
        const source = article.source?.name || 'Unknown';
        sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
      });

      const topSources = [...sourceCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([source, count]) => `${source}(${count})`)
        .join(', ');

      console.warn(`[newsFetcher] Source filter eliminated all complete articles. Sources seen: ${topSources}`);
      finalArticles = afterComplete.filter(matchesKeyword);
      console.log(`[newsFetcher] Fallback (keywords only) count: ${finalArticles.length}`);
    }

    return finalArticles.map((a) => ({
      title: a.title.trim(),
      description: a.description?.trim() || null,
      url: a.url,
      image_url: a.urlToImage || null,
      source: a.source?.name || 'Unknown',
      published_at: a.publishedAt,
    }));
  } catch (err) {
    console.error('[newsFetcher] Fetch/filter pipeline failed:', err.message);
    throw err;
  }
}

export { fetchFilteredArticles };

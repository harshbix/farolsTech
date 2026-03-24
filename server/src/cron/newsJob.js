// server/src/cron/newsJob.js
/**
 * Background job for tech news aggregation.
 * Runs every 20 minutes.
 * Fetches from NewsAPI, filters, and inserts new articles into external_articles table.
 * Failures are logged but never propagated — app stays up.
 */

import { fetchFilteredArticles } from '../services/newsFetcher.js';
import { createHash } from 'crypto';

const INTERVAL_MS = 20 * 60 * 1000; // 20 minutes

/**
 * Inserts articles into external_articles table.
 * Duplicates are silently ignored via UNIQUE constraint on url.
 *
 * @param {object} db - SQLite database instance
 * @param {Array<Object>} articles - Normalized articles from newsFetcher
 * @returns {number} Count of newly inserted rows
 */
function storeArticles(db, articles) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO external_articles
      (title, description, url, image_url, source, published_at)
    VALUES
      (@title, @description, @url, @image_url, @source, @published_at)
  `);

  const stmtUnified = db.prepare(`
    INSERT OR IGNORE INTO api_posts
      (id, title, description, source_url, image, source, published_at, cached_at, category, tags)
    VALUES
      (@id, @title, @description, @source_url, @image, @source, @published_at, unixepoch(), @category, @tags)
  `);

  const insertMany = db.transaction((items) => {
    let inserted = 0;
    for (const item of items) {
      const result = stmt.run(item);
      if (result.changes > 0) inserted++;

      const hash = createHash('sha1').update(String(item.url)).digest('hex').slice(0, 16);
      const publishedEpoch = Math.floor(new Date(item.published_at).getTime() / 1000) || Math.floor(Date.now() / 1000);
      stmtUnified.run({
        id: `api_${hash}`,
        title: item.title,
        description: item.description,
        source_url: item.url,
        image: item.image_url,
        source: item.source,
        published_at: publishedEpoch,
        category: 'technology',
        tags: 'technology,news,api',
      });
    }
    return inserted;
  });

  return insertMany(articles);
}

/**
 * One complete fetch-filter-store cycle.
 * Never throws — errors are caught and logged.
 *
 * @param {object} db - SQLite database instance
 */
async function runFetchCycle(db) {
  try {
    const articles = await fetchFilteredArticles();
    if (articles.length === 0) {
      console.log('[newsJob] Fetch complete — no articles passed filters.');
      return;
    }

    const blacklistedSources = new Set(
      db
        .prepare('SELECT source FROM external_news_source_rules WHERE blacklisted = 1')
        .all()
        .map((row) => String(row.source).toLowerCase())
    );

    const allowedArticles = articles.filter(
      (article) => !blacklistedSources.has(String(article.source || '').toLowerCase())
    );

    if (allowedArticles.length === 0) {
      console.log('[newsJob] All fetched articles were blocked by source blacklist rules.');
      return;
    }

    const inserted = storeArticles(db, allowedArticles);
    console.log(
      `[newsJob] Cycle complete — ${inserted} new articles stored ` +
      `(${allowedArticles.length} fetched and filtered).`
    );
  } catch (err) {
    // Error is logged but never thrown — app continues running
    console.error('[newsJob] Fetch cycle failed (app continues normally):', err.message);
  }
}

/**
 * Start the background news fetching job.
 * Must be called once at server startup, after DB is initialized.
 *
 * @param {object} db - SQLite database instance
 * @returns {object} Job object with stop() method
 */
function startNewsJob(db) {
  let intervalId = null;
  let inFlight = false;

  const safeRunCycle = async () => {
    if (inFlight) {
      console.log('[newsJob] Skipping cycle because previous cycle is still running.');
      return;
    }

    inFlight = true;
    try {
      await runFetchCycle(db);
    } finally {
      inFlight = false;
    }
  };

  const stop = () => {
    if (intervalId) clearInterval(intervalId);
    console.log('[newsJob] Stopped');
  };

  console.log('[newsJob] Started — immediate fetch, then every 20 minutes.');

  // Immediate cycle for debugging and faster feedback
  safeRunCycle();
  // Then repeat every 20 minutes
  intervalId = setInterval(safeRunCycle, INTERVAL_MS);

  return { stop };
}

export { startNewsJob };

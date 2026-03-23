// server/src/cron/newsJob.js
/**
 * Background job for tech news aggregation.
 * Runs every 20 minutes.
 * Fetches from NewsAPI, filters, and inserts new articles into external_articles table.
 * Failures are logged but never propagated — app stays up.
 */

import { fetchFilteredArticles } from '../services/newsFetcher.js';

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

  const insertMany = db.transaction((items) => {
    let inserted = 0;
    for (const item of items) {
      const result = stmt.run(item);
      if (result.changes > 0) inserted++;
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
    const inserted = storeArticles(db, articles);
    console.log(
      `[newsJob] Cycle complete — ${inserted} new articles stored ` +
      `(${articles.length} fetched and filtered).`
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

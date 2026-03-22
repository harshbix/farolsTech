import cron from 'node-cron';
import { getDb } from '../db/client.js';
import { calcTrendingScore } from '../utils/helpers.js';
import logger from '../utils/logger.js';

export function startTrendingJob() {
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', () => {
    try {
      const db = getDb();
      const posts = db.prepare(`
        SELECT p.id, p.published_at,
               (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes,
               (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments,
               (SELECT COUNT(*) FROM shares WHERE post_id = p.id) AS shares,
               p.views
        FROM posts p
        WHERE p.status = 'published' AND p.published_at IS NOT NULL
      `).all();

      const update = db.prepare('UPDATE posts SET trending_score = ? WHERE id = ?');
      const updateMany = db.transaction((rows) => {
        for (const row of rows) {
          const score = calcTrendingScore({
            likes: row.likes,
            comments: row.comments,
            shares: row.shares,
            views: row.views,
            publishedAt: row.published_at,
          });
          update.run(score, row.id);
        }
      });
      updateMany(posts);
      logger.debug(`Trending scores updated for ${posts.length} posts`);
    } catch (err) {
      logger.error('Trending job failed:', err);
    }
  });

  logger.info('Trending score cron job started (every 15 min)');
}

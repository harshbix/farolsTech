import logger from '../utils/logger.js';
import { broadcastBreakingNews } from '../services/websocket.js';

export function startScheduledPublisher(db) {
  const interval = setInterval(() => {
    try {
      const duePosts = db.prepare(`
        SELECT id, title, slug, is_breaking
        FROM posts
        WHERE status = 'scheduled'
          AND scheduled_at IS NOT NULL
          AND scheduled_at <= datetime('now')
      `).all();

      if (!duePosts.length) return;

      const publishStmt = db.prepare(
        "UPDATE posts SET status = 'published', published_at = unixepoch(), updated_at = unixepoch() WHERE id = ?"
      );

      const tx = db.transaction((posts) => {
        for (const post of posts) {
          publishStmt.run(post.id);
          if (post.is_breaking) {
            broadcastBreakingNews({ id: post.id, title: post.title, slug: post.slug });
          }
        }
      });

      tx(duePosts);
      logger.info(`[scheduledPublisher] Published ${duePosts.length} scheduled post(s)`);
    } catch (err) {
      logger.error(`[scheduledPublisher] ${err.message}`);
    }
  }, 2 * 60 * 1000);

  logger.info('[scheduledPublisher] Started (runs every 2 minutes)');

  return {
    stop() {
      clearInterval(interval);
      logger.info('[scheduledPublisher] Stopped');
    },
  };
}

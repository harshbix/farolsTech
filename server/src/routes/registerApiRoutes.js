import authRoutes from './auth.js';
import postsRoutes from './posts.js';
import commentsRoutes from './comments.js';
import likesRoutes from './likes.js';
import sharesRoutes from './shares.js';
import searchRoutes from './search.js';
import categoriesRoutes from './categories.js';
import usersRoutes from './users.js';
import notificationsRoutes from './notifications.js';
import bookmarksRoutes from './bookmarks.js';
import uploadsRoutes from './uploads.js';
import externalNewsRoutes from './externalNews.js';
import publishingRoutes from './publishing.js';
import moderationRoutes from './moderation.js';
import feedRoutes from './feed.js';
import analyticsRoutes from './analytics.js';

export function registerApiRoutes(app, prefix) {
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/posts`, postsRoutes);
  app.use(`${prefix}/posts/:postId/comments`, commentsRoutes);
  app.use(`${prefix}/comments`, commentsRoutes);
  app.use(`${prefix}/posts/:postId/like`, likesRoutes);
  app.use(`${prefix}/posts/:postId/share`, sharesRoutes);
  app.use(`${prefix}/search`, searchRoutes);
  app.use(`${prefix}/categories`, categoriesRoutes);
  app.use(`${prefix}/users`, usersRoutes);
  app.use(`${prefix}/notifications`, notificationsRoutes);
  app.use(`${prefix}/bookmarks`, bookmarksRoutes);
  app.use(`${prefix}/uploads`, uploadsRoutes);
  app.use(`${prefix}/external-news`, externalNewsRoutes);
  app.use(`${prefix}`, publishingRoutes);
  app.use(`${prefix}`, moderationRoutes);
  app.use(`${prefix}`, feedRoutes);
  app.use(`${prefix}`, analyticsRoutes);

  app.get(`${prefix}/health`, (_req, res) => {
    res.json({ status: 'ok', env: process.env.NODE_ENV, time: new Date().toISOString() });
  });
}
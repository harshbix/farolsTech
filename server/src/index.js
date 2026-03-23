import 'dotenv/config';
import dotenv from 'dotenv';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Load .env from root directory
const __dirname = dirname(fileURLToPath(import.meta.url));
if (!process.env.NEWS_API_KEY) {
  dotenv.config({ path: join(__dirname, '..', '..', '.env'), override: false });
}

import logger from './utils/logger.js';
import { runMigrations } from './db/client.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { setupWebSocket } from './services/websocket.js';
import { startTrendingJob } from './services/trending.js';
import { getDb } from './db/client.js';
import migrate from './db/migrations/001_create_external_articles.js';
import { startNewsJob } from './cron/newsJob.js';

// Routes
import authRoutes        from './routes/auth.js';
import postsRoutes       from './routes/posts.js';
import commentsRoutes    from './routes/comments.js';
import likesRoutes       from './routes/likes.js';
import sharesRoutes      from './routes/shares.js';
import searchRoutes      from './routes/search.js';
import categoriesRoutes  from './routes/categories.js';
import usersRoutes       from './routes/users.js';
import notificationsRoutes from './routes/notifications.js';
import bookmarksRoutes   from './routes/bookmarks.js';
import uploadsRoutes     from './routes/uploads.js';
import externalNewsRoutes from './routes/externalNews.js';

if (!process.env.NEWS_API_KEY) {
  console.error('[FATAL] NEWS_API_KEY is not set. News fetch will not work.');
} else {
  const masked = `${process.env.NEWS_API_KEY.slice(0, 4)}...${process.env.NEWS_API_KEY.slice(-4)}`;
  logger.info(`[startup] NEWS_API_KEY detected: ${masked}`);
}

// Ensure data directory exists
mkdirSync(join(__dirname, '..', 'data'), { recursive: true });
mkdirSync(join(__dirname, '..', 'uploads', 'posts'), { recursive: true });
mkdirSync(join(__dirname, '..', 'uploads', 'avatars'), { recursive: true });

// Run DB migrations on startup
const db = getDb();
try {
  runMigrations();
  migrate(db); // Run external articles migration
} catch (err) {
  logger.error('[startup] Database migration failed:', err);
}

try {
  const table = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='external_articles'")
    .get();
  logger.info(`[startup] external_articles table exists: ${Boolean(table)}`);

  const probeUrl = `https://startup-probe.local/${Date.now()}`;
  db.prepare(
    `
      INSERT OR IGNORE INTO external_articles
      (title, description, url, image_url, source, published_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `
  ).run(
    'Startup probe',
    'Connectivity probe row',
    probeUrl,
    null,
    'Farols Probe',
    new Date().toISOString()
  );

  const probeRow = db.prepare('SELECT id, url FROM external_articles WHERE url = ?').get(probeUrl);
  logger.info(`[startup] external_articles manual write/read probe: ${Boolean(probeRow)}`);
  db.prepare('DELETE FROM external_articles WHERE url = ?').run(probeUrl);
} catch (err) {
  logger.error('[startup] external_articles diagnostics failed:', err);
}

const app = express();
const PORT = process.env.PORT || 3001;
app.set('db', db);

// ── Global Middleware ──────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(globalLimiter);
app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

// Request logging
app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

function mountApiRoutes(prefix) {
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/posts`, postsRoutes);
  app.use(`${prefix}/posts/:postId/comments`, commentsRoutes);
  app.use(`${prefix}/posts/:postId/like`, likesRoutes);
  app.use(`${prefix}/posts/:postId/share`, sharesRoutes);
  app.use(`${prefix}/search`, searchRoutes);
  app.use(`${prefix}/categories`, categoriesRoutes);
  app.use(`${prefix}/users`, usersRoutes);
  app.use(`${prefix}/notifications`, notificationsRoutes);
  app.use(`${prefix}/bookmarks`, bookmarksRoutes);
  app.use(`${prefix}/uploads`, uploadsRoutes);
  app.use(`${prefix}/external-news`, externalNewsRoutes);

  app.get(`${prefix}/health`, (_req, res) => {
    res.json({ status: 'ok', env: process.env.NODE_ENV, time: new Date().toISOString() });
  });
}

// v1 routes + backward compatibility routes
mountApiRoutes('/api/v1');
mountApiRoutes('/api');

// ── Error Handlers ─────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── HTTP + WebSocket Server ────────────────────────────────────
const server = createServer(app);
let wsServer = null;
let trendingJob = null;
let newsJob = null;
let isShuttingDown = false;

// Initialize servers
wsServer = setupWebSocket(server);
trendingJob = startTrendingJob();
newsJob = startNewsJob(db);

// ── Server Error Handler ───────────────────────────────────────
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use. Retrying in 3 seconds...`);
    setTimeout(() => {
      server.listen(PORT, () => {
        logger.info(`Farols API running on http://localhost:${PORT}`);
      });
    }, 3000);
  } else {
    logger.error('Server error:', err.message);
    if (!isShuttingDown) {
      process.exit(1);
    }
  }
});

// ── Graceful Shutdown Handler ──────────────────────────────────
function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Close WebSocket connections
  if (wsServer) {
    wsServer.clients.forEach((ws) => {
      ws.close(1000, 'Server shutting down');
    });
    logger.info('WebSocket connections closed');
  }
  
  // Stop cron jobs
  if (trendingJob) {
    try {
      trendingJob.stop();
      logger.info('Trending job stopped');
    } catch (err) {
      logger.warn('Error stopping trending job:', err.message);
    }
  }
  
  if (newsJob) {
    try {
      newsJob.stop();
      logger.info('News fetcher job stopped');
    } catch (err) {
      logger.warn('Error stopping news job:', err.message);
    }
  }
  
  // Close database connection
  try {
    const db = getDb();
    db.close();
    logger.info('Database connection closed');
  } catch (err) {
    logger.warn('Error closing database:', err.message);
  }
  
  // Exit after short delay to allow everything to flush
  setTimeout(() => {
    logger.info('Graceful shutdown complete');
    process.exit(0);
  }, 500);

  // Force exit after 10 seconds if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Graceful shutdown timeout - forcing exit');
    process.exit(1);
  }, 10000);
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  if (!isShuttingDown) {
    gracefulShutdown('uncaughtException');
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// ── Start Server ───────────────────────────────────────────────
server.listen(PORT, () => {
  logger.info(`Farols API running on http://localhost:${PORT}`);
});

export default app;

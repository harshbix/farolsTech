import 'dotenv/config';
import dotenv from 'dotenv';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';

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
import migrateWorkflowAndEngagement from './db/migrations/002_workflow_and_engagement.js';
import migrateUnifiedContentPlatform from './db/migrations/003_unified_content_platform.js';
import migrateExternalNewsFeatures from './db/migrations/004_external_news_features.js';
import { startNewsJob } from './cron/newsJob.js';
import { startScheduledPublisher } from './cron/scheduledPublisher.js';
import { registerApiRoutes } from './routes/registerApiRoutes.js';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_VERCEL_RUNTIME = process.env.VERCEL === '1' || Boolean(process.env.VERCEL_URL);

let helmetMiddleware = (_req, _res, next) => next();
try {
  const helmetModule = await import('helmet');
  helmetMiddleware = helmetModule.default();
} catch (err) {
  logger.warn(`[startup] helmet is not installed; continuing without helmet middleware (${err.message})`);
}

if (!process.env.NEWS_API_KEY) {
  console.error('[FATAL] NEWS_API_KEY is not set. News fetch will not work.');
} else {
  const masked = `${process.env.NEWS_API_KEY.slice(0, 4)}...${process.env.NEWS_API_KEY.slice(-4)}`;
  logger.info(`[startup] NEWS_API_KEY detected: ${masked}`);
}

// Ensure data directory exists
if (!IS_VERCEL_RUNTIME) {
  mkdirSync(join(__dirname, '..', 'data'), { recursive: true });
  mkdirSync(join(__dirname, '..', 'uploads', 'posts'), { recursive: true });
  mkdirSync(join(__dirname, '..', 'uploads', 'avatars'), { recursive: true });
}

// Run DB migrations on startup
const db = getDb();
try {
  runMigrations();
  migrate(db); // Run external articles migration
  migrateWorkflowAndEngagement(db);
  migrateUnifiedContentPlatform(db);
  migrateExternalNewsFeatures(db);
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
const isTestEnv = process.env.NODE_ENV === 'test';
const SHOULD_RUN_PERSISTENT_SERVICES = !isTestEnv && !IS_VERCEL_RUNTIME;

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://farols-tech.vercel.app',
];

const explicitAllowedOrigins = (process.env.CLIENT_ORIGIN || defaultAllowedOrigins.join(','))
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowVercelPreviewOrigins = process.env.ALLOW_VERCEL_PREVIEW_ORIGINS
  ? process.env.ALLOW_VERCEL_PREVIEW_ORIGINS === 'true'
  : IS_PRODUCTION;

const authRouteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, please try again later.' },
});

// ── Global Middleware ──────────────────────────────────────────
app.use(helmetMiddleware);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (explicitAllowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    if (allowVercelPreviewOrigins && /\.vercel\.app$/i.test(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use('/api/auth', authRouteLimiter);
app.use('/api/v1/auth', authRouteLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(globalLimiter);
app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

// Request logging
app.use((req, _res, next) => {
  const startedAt = Date.now();
  _res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    logger.info(`${req.method} ${req.path} ${_res.statusCode} ${durationMs}ms`);
  });
  next();
});

// v1 routes + backward compatibility routes
registerApiRoutes(app, '/api/v1');
registerApiRoutes(app, '/api');

// ── Error Handlers ─────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── HTTP + WebSocket Server ────────────────────────────────────
const server = SHOULD_RUN_PERSISTENT_SERVICES ? createServer(app) : null;
let wsServer = null;
let trendingJob = null;
let newsJob = null;
let scheduledPublisherJob = null;
let isShuttingDown = false;

// Initialize servers
if (!isTestEnv && SHOULD_RUN_PERSISTENT_SERVICES && server) {
  wsServer = setupWebSocket(server);
  trendingJob = startTrendingJob();
  newsJob = startNewsJob(db);
  scheduledPublisherJob = startScheduledPublisher(db);
}

// ── Server Error Handler ───────────────────────────────────────
if (!isTestEnv && SHOULD_RUN_PERSISTENT_SERVICES && server) {
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
}

// ── Graceful Shutdown Handler ──────────────────────────────────
function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  // Stop accepting new connections
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
    });
  }

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

  if (scheduledPublisherJob) {
    try {
      scheduledPublisherJob.stop();
      logger.info('Scheduled publisher job stopped');
    } catch (err) {
      logger.warn('Error stopping scheduled publisher job:', err.message);
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
if (!isTestEnv && SHOULD_RUN_PERSISTENT_SERVICES) {
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

// Handle uncaught errors
if (!isTestEnv && SHOULD_RUN_PERSISTENT_SERVICES) {
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    if (!isShuttingDown) {
      gracefulShutdown('uncaughtException');
    }
  });
}

if (!isTestEnv && SHOULD_RUN_PERSISTENT_SERVICES) {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
}

// ── Start Server ───────────────────────────────────────────────
if (!isTestEnv && SHOULD_RUN_PERSISTENT_SERVICES && server) {
  server.listen(PORT, () => {
    logger.info(`Farols API running on http://localhost:${PORT}`);
  });
}

export default app;

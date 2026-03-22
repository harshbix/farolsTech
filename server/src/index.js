import 'dotenv/config';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import logger from './utils/logger.js';
import { runMigrations } from './db/client.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { setupWebSocket } from './services/websocket.js';
import { startTrendingJob } from './services/trending.js';

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

const __dirname = dirname(fileURLToPath(import.meta.url));

// Ensure data directory exists
mkdirSync(join(__dirname, '..', 'data'), { recursive: true });
mkdirSync(join(__dirname, '..', 'uploads', 'posts'), { recursive: true });
mkdirSync(join(__dirname, '..', 'uploads', 'avatars'), { recursive: true });

// Run DB migrations on startup
runMigrations();

const app = express();
const PORT = process.env.PORT || 3001;

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
setupWebSocket(server);
startTrendingJob();

server.listen(PORT, () => {
  logger.info(`Farols API running on http://localhost:${PORT}`);
});

export default app;

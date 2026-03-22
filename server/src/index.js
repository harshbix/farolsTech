import 'dotenv/config';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { mkdirSync } from 'fs';

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

// Ensure data directory exists
mkdirSync('./data', { recursive: true });

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

// Request logging
app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// ── API Routes ─────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/posts',         postsRoutes);
app.use('/api/posts/:postId/comments', commentsRoutes);
app.use('/api/posts/:postId/like',     likesRoutes);
app.use('/api/posts/:postId/share',    sharesRoutes);
app.use('/api/search',        searchRoutes);
app.use('/api/categories',    categoriesRoutes);
app.use('/api/users',         usersRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/bookmarks',     bookmarksRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV, time: new Date().toISOString() });
});

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

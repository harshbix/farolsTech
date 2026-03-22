import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

const ACCESS_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

// Map: postSlug -> Set<WebSocket>
const rooms = new Map();

// Map: userId -> Set<WebSocket>
const userSockets = new Map();

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    const postSlug = url.searchParams.get('post');

    // Optional auth
    if (token) {
      try {
        ws.user = jwt.verify(token, ACCESS_SECRET);
        if (!userSockets.has(ws.user.id)) userSockets.set(ws.user.id, new Set());
        userSockets.get(ws.user.id).add(ws);
      } catch (_) {}
    }

    // Join post room
    if (postSlug) {
      if (!rooms.has(postSlug)) rooms.set(postSlug, new Set());
      rooms.get(postSlug).add(ws);
      ws.postSlug = postSlug;
    }

    ws.on('close', () => {
      if (ws.postSlug && rooms.has(ws.postSlug)) {
        rooms.get(ws.postSlug).delete(ws);
      }
      if (ws.user && userSockets.has(ws.user.id)) {
        userSockets.get(ws.user.id).delete(ws);
      }
    });

    ws.on('error', (err) => logger.warn(`WS error: ${err.message}`));
  });

  logger.info('WebSocket server initialized at /ws');
  return wss;
}

/** Broadcast a new comment to all clients watching a post */
export function broadcastComment(postSlug, comment) {
  const room = rooms.get(postSlug);
  if (!room) return;
  const msg = JSON.stringify({ type: 'new_comment', payload: comment });
  for (const client of room) {
    if (client.readyState === 1) client.send(msg);
  }
}

/** Push a notification to a specific user */
export function pushNotification(userId, notification) {
  const sockets = userSockets.get(userId);
  if (!sockets) return;
  const msg = JSON.stringify({ type: 'notification', payload: notification });
  for (const client of sockets) {
    if (client.readyState === 1) client.send(msg);
  }
}

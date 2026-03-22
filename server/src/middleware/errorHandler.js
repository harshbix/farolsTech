import logger from '../utils/logger.js';

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  logger.error(err);
  const status = err.status || err.statusCode || 500;
  const message = err.expose ? err.message : 'Internal server error';
  res.status(status).json({ error: message });
}

export function notFound(req, res) {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
}

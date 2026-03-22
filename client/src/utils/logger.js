/**
 * Client-side logger utility
 * Provides consistent logging for the frontend application
 */

const isDev = import.meta.env.DEV;

const logger = {
  debug: (message, data) => {
    if (isDev) {
      console.debug(`[DEBUG] ${message}`, data || '');
    }
  },

  info: (message, data) => {
    console.info(`[INFO] ${message}`, data || '');
  },

  warn: (message, data) => {
    console.warn(`[WARN] ${message}`, data || '');
  },

  error: (message, data) => {
    console.error(`[ERROR] ${message}`, data || '');
    // In production, you could send this to a monitoring service like Sentry
  },
};

export default logger;

// server/src/db/migrations/004_external_news_features.js
/**
 * Migration: external news governance and analytics.
 * Idempotent and safe to run at startup.
 */

export default function migrateExternalNewsFeatures(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS external_news_source_rules (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      source      TEXT NOT NULL UNIQUE,
      blacklisted INTEGER NOT NULL DEFAULT 0,
      priority    INTEGER NOT NULL DEFAULT 0,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS external_news_article_flags (
      article_id  TEXT PRIMARY KEY,
      pinned      INTEGER NOT NULL DEFAULT 0,
      hidden      INTEGER NOT NULL DEFAULT 0,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS external_news_events (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id  TEXT,
      event_type  TEXT NOT NULL,
      source      TEXT,
      topic       TEXT,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_external_news_events_created_at
      ON external_news_events (created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_external_news_events_type
      ON external_news_events (event_type);

    CREATE INDEX IF NOT EXISTS idx_external_news_events_source
      ON external_news_events (source);

    CREATE INDEX IF NOT EXISTS idx_external_news_events_topic
      ON external_news_events (topic);
  `);
}

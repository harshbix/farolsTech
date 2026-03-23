// server/src/db/migrations/001_create_external_articles.js
/**
 * Migration: Create external_articles table for tech news aggregation.
 * Idempotent — safe to run multiple times.
 */

export default function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS external_articles (
      id           INTEGER  PRIMARY KEY AUTOINCREMENT,
      title        TEXT     NOT NULL,
      description  TEXT,
      url          TEXT     NOT NULL UNIQUE,
      image_url    TEXT,
      source       TEXT     NOT NULL,
      published_at DATETIME NOT NULL,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_ext_articles_published
      ON external_articles (published_at DESC);
  `);
};

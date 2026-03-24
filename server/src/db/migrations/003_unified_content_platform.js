export default function migrateUnifiedContentPlatform(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_posts (
      id            TEXT PRIMARY KEY,
      title         TEXT NOT NULL,
      description   TEXT,
      source_url    TEXT NOT NULL UNIQUE,
      image         TEXT,
      source        TEXT NOT NULL,
      published_at  INTEGER NOT NULL,
      cached_at     INTEGER NOT NULL DEFAULT (unixepoch()),
      category      TEXT,
      tags          TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_api_posts_published ON api_posts(published_at DESC);
    CREATE INDEX IF NOT EXISTS idx_api_posts_category ON api_posts(category);

    CREATE TABLE IF NOT EXISTS user_interactions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
      post_id       TEXT NOT NULL,
      action        TEXT NOT NULL CHECK(action IN ('view', 'like', 'click', 'share', 'comment')),
      duration      INTEGER DEFAULT 0,
      tag_snapshot  TEXT,
      created_at    INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_user_interactions_user ON user_interactions(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_user_interactions_post ON user_interactions(post_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_user_interactions_action ON user_interactions(action, created_at DESC);

    CREATE TABLE IF NOT EXISTS post_analytics (
      post_id        TEXT PRIMARY KEY,
      views          INTEGER NOT NULL DEFAULT 0,
      likes          INTEGER NOT NULL DEFAULT 0,
      shares         INTEGER NOT NULL DEFAULT 0,
      comments       INTEGER NOT NULL DEFAULT 0,
      avg_read_time  REAL NOT NULL DEFAULT 0,
      last_updated   INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS bookmarks_unified (
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      post_id       TEXT NOT NULL,
      created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (user_id, post_id)
    );

    CREATE TABLE IF NOT EXISTS post_engagements (
      post_id       TEXT NOT NULL,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      liked         INTEGER NOT NULL DEFAULT 0,
      shared_count  INTEGER NOT NULL DEFAULT 0,
      last_updated  INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (post_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS api_comments (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id       TEXT NOT NULL,
      author_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      parent_id     INTEGER REFERENCES api_comments(id) ON DELETE CASCADE,
      body          TEXT NOT NULL,
      score         INTEGER NOT NULL DEFAULT 0,
      is_flagged    INTEGER NOT NULL DEFAULT 0,
      flag_reason   TEXT,
      created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_api_comments_post ON api_comments(post_id, created_at ASC);

    CREATE VIRTUAL TABLE IF NOT EXISTS api_posts_fts USING fts5(
      title,
      description,
      content='api_posts',
      content_rowid='rowid',
      tokenize='porter ascii'
    );

    CREATE TRIGGER IF NOT EXISTS api_posts_fts_insert AFTER INSERT ON api_posts BEGIN
      INSERT INTO api_posts_fts(rowid, title, description)
      VALUES (new.rowid, new.title, COALESCE(new.description, ''));
    END;

    CREATE TRIGGER IF NOT EXISTS api_posts_fts_update AFTER UPDATE ON api_posts BEGIN
      INSERT INTO api_posts_fts(api_posts_fts, rowid, title, description)
      VALUES ('delete', old.rowid, old.title, COALESCE(old.description, ''));
      INSERT INTO api_posts_fts(rowid, title, description)
      VALUES (new.rowid, new.title, COALESCE(new.description, ''));
    END;

    CREATE TRIGGER IF NOT EXISTS api_posts_fts_delete AFTER DELETE ON api_posts BEGIN
      INSERT INTO api_posts_fts(api_posts_fts, rowid, title, description)
      VALUES ('delete', old.rowid, old.title, COALESCE(old.description, ''));
    END;
  `);

  // Backfill unified api_posts from existing external cache if present.
  const rows = db.prepare(`
    SELECT id, title, description, url, image_url, source, published_at
    FROM external_articles
    ORDER BY published_at DESC
  `).all();

  const upsert = db.prepare(`
    INSERT OR IGNORE INTO api_posts
      (id, title, description, source_url, image, source, published_at, cached_at, category, tags)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, unixepoch(), 'technology', 'technology,news')
  `);

  const tx = db.transaction((items) => {
    for (const row of items) {
      const epoch = Math.floor(new Date(row.published_at).getTime() / 1000) || Math.floor(Date.now() / 1000);
      const stableId = `api_${row.id}`;
      upsert.run(stableId, row.title, row.description, row.url, row.image_url, row.source, epoch);
    }
  });

  tx(rows);
}
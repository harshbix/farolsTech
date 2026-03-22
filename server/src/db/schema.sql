-- ============================================================
-- Farols Platform – SQLite Schema (WAL mode, FTS5)
-- ============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  username     TEXT    NOT NULL UNIQUE,
  email        TEXT    NOT NULL UNIQUE,
  password_hash TEXT   NOT NULL,
  role         TEXT    NOT NULL DEFAULT 'reader',  -- reader | author | editor | admin
  display_name TEXT,
  bio          TEXT,
  avatar_url   TEXT,
  created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at   INTEGER NOT NULL DEFAULT (unixepoch())
);

-- ── Refresh Tokens ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT    NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  revoked    INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- ── Categories ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL UNIQUE,
  slug        TEXT    NOT NULL UNIQUE,
  description TEXT,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

-- ── Tags ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tags (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);

-- ── Posts ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  author_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id     INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  title           TEXT    NOT NULL,
  slug            TEXT    NOT NULL UNIQUE,
  excerpt         TEXT,
  content_json    TEXT    NOT NULL DEFAULT '{}',
  cover_image     TEXT,
  status          TEXT    NOT NULL DEFAULT 'draft',  -- draft | published | archived
  featured        INTEGER NOT NULL DEFAULT 0,
  -- SEO
  meta_title      TEXT,
  meta_desc       TEXT,
  og_image        TEXT,
  canonical_url   TEXT,
  -- Bilingual
  title_sw        TEXT,
  content_json_sw TEXT,
  -- Metrics (denormalised for speed)
  views           INTEGER NOT NULL DEFAULT 0,
  trending_score  REAL    NOT NULL DEFAULT 0,
  -- Timestamps
  published_at    INTEGER,
  created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at      INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_posts_slug        ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_author      ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_status      ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_trending    ON posts(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category    ON posts(category_id);

-- ── Post ↔ Tags ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_tags (
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- ── FTS5 Full-Text Search ────────────────────────────────────
CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
  title,
  content_text,  -- plain text extracted from content_json
  content='posts',
  content_rowid='id',
  tokenize='porter ascii'
);

-- Keep FTS in sync via triggers
CREATE TRIGGER IF NOT EXISTS posts_fts_insert AFTER INSERT ON posts BEGIN
  INSERT INTO posts_fts(rowid, title, content_text) VALUES (new.id, new.title, new.content_json);
END;
CREATE TRIGGER IF NOT EXISTS posts_fts_update AFTER UPDATE ON posts BEGIN
  INSERT INTO posts_fts(posts_fts, rowid, title, content_text) VALUES ('delete', old.id, old.title, old.content_json);
  INSERT INTO posts_fts(rowid, title, content_text) VALUES (new.id, new.title, new.content_json);
END;
CREATE TRIGGER IF NOT EXISTS posts_fts_delete AFTER DELETE ON posts BEGIN
  INSERT INTO posts_fts(posts_fts, rowid, title, content_text) VALUES ('delete', old.id, old.title, old.content_json);
END;

-- ── Revisions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS revisions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id      INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  content_json TEXT    NOT NULL,
  saved_at     INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_revisions_post ON revisions(post_id, saved_at DESC);

-- ── Comments (threaded, 2 levels) ────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id    INTEGER NOT NULL REFERENCES posts(id)    ON DELETE CASCADE,
  author_id  INTEGER NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  parent_id  INTEGER          REFERENCES comments(id) ON DELETE CASCADE,
  body       TEXT    NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_comments_post   ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);

-- ── Likes ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS likes (
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (post_id, user_id)
);

-- ── Shares ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shares (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    INTEGER          REFERENCES users(id) ON DELETE SET NULL,
  platform   TEXT    NOT NULL,  -- whatsapp | twitter | copy | etc.
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_shares_post ON shares(post_id);

-- ── Bookmarks ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookmarks (
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (post_id, user_id)
);

-- ── Notifications ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT    NOT NULL,  -- comment | like | mention | system
  payload_json TEXT    NOT NULL DEFAULT '{}',
  read         INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);

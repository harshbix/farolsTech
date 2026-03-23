export default function migrateWorkflowAndEngagement(db) {
  const tryAlter = (sql) => {
    try {
      db.exec(sql);
    } catch (err) {
      if (!String(err.message || '').toLowerCase().includes('duplicate column name')) {
        throw err;
      }
    }
  };

  tryAlter('ALTER TABLE posts ADD COLUMN scheduled_at DATETIME');
  tryAlter('ALTER TABLE posts ADD COLUMN submitted_for_review_at DATETIME');
  tryAlter('ALTER TABLE posts ADD COLUMN is_breaking INTEGER DEFAULT 0');
  tryAlter('ALTER TABLE posts ADD COLUMN review_reject_reason TEXT');
  tryAlter('ALTER TABLE posts ADD COLUMN rejected_at DATETIME');

  tryAlter('ALTER TABLE comments ADD COLUMN score INTEGER DEFAULT 0');
  tryAlter('ALTER TABLE comments ADD COLUMN is_flagged INTEGER DEFAULT 0');
  tryAlter('ALTER TABLE comments ADD COLUMN flag_reason TEXT');

  tryAlter('ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 1');

  db.exec(`
    CREATE TABLE IF NOT EXISTS comment_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      vote INTEGER NOT NULL CHECK(vote IN (1, -1)),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(comment_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS user_reads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, post_id)
    );

    CREATE INDEX IF NOT EXISTS idx_posts_scheduled_at ON posts(status, scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_comments_flagged ON comments(is_flagged, updated_at);
    CREATE INDEX IF NOT EXISTS idx_comment_votes_comment ON comment_votes(comment_id);
    CREATE INDEX IF NOT EXISTS idx_user_reads_user ON user_reads(user_id, read_at DESC);
  `);
}

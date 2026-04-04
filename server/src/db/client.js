import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IS_VERCEL_RUNTIME = process.env.VERCEL === '1' || Boolean(process.env.VERCEL_URL);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const DB_PATH = process.env.DB_PATH || (IS_VERCEL_RUNTIME
  ? '/tmp/farols.db'
  : join(__dirname, '..', '..', 'data', 'farols.db'));
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin_farols';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@farols.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

function resolveAdminPasswordHash() {
  if (ADMIN_PASSWORD_HASH) {
    return ADMIN_PASSWORD_HASH;
  }

  if (ADMIN_PASSWORD) {
    return bcrypt.hashSync(ADMIN_PASSWORD, 12);
  }

  if (IS_PRODUCTION) {
    throw new Error('ADMIN_PASSWORD or ADMIN_PASSWORD_HASH must be set in production before first startup.');
  }

  logger.warn('ADMIN_PASSWORD not set; using development fallback password for seeded admin.');
  return bcrypt.hashSync('123456', 12);
}

let db;

export function getDb() {
  if (!db) {
    // Ensure custom DB_PATH directories (e.g. mounted persistent disks) exist.
    try {
      mkdirSync(dirname(DB_PATH), { recursive: true });
    } catch (err) {
      logger.warn(`Could not ensure DB directory for path ${DB_PATH}: ${err.message}`);
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');
    logger.info(`SQLite connected: ${DB_PATH}`);
  }
  return db;
}

export function runMigrations() {
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  const dbInstance = getDb();
  dbInstance.exec(schema);

  const userColumns = dbInstance.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
  if (!userColumns.includes('failed_attempts')) {
    dbInstance.exec('ALTER TABLE users ADD COLUMN failed_attempts INTEGER NOT NULL DEFAULT 0');
  }
  if (!userColumns.includes('locked_until')) {
    dbInstance.exec('ALTER TABLE users ADD COLUMN locked_until INTEGER');
  }

  dbInstance.prepare("UPDATE users SET role = 'viewer' WHERE role NOT IN ('viewer', 'admin')").run();

  const admins = dbInstance.prepare("SELECT id, username FROM users WHERE role = 'admin' ORDER BY id ASC").all();
  if (admins.length > 1) {
    const keepAdminId = admins.find((adminUser) => adminUser.username === ADMIN_USERNAME)?.id ?? admins[0].id;
    dbInstance.prepare("UPDATE users SET role = 'viewer' WHERE role = 'admin' AND id <> ?").run(keepAdminId);
  }

  const seededAdmin = dbInstance.prepare('SELECT id FROM users WHERE username = ?').get(ADMIN_USERNAME);
  const shouldSyncAdminPassword = Boolean(ADMIN_PASSWORD_HASH || ADMIN_PASSWORD);
  const shouldSyncAdminEmail = Boolean(process.env.ADMIN_EMAIL);
  const adminPasswordHash = (!seededAdmin || shouldSyncAdminPassword)
    ? resolveAdminPasswordHash()
    : null;

  if (!seededAdmin) {
    dbInstance.prepare(
      'INSERT INTO users (username, email, password_hash, role, display_name) VALUES (?, ?, ?, ?, ?)'
    ).run(ADMIN_USERNAME, ADMIN_EMAIL, adminPasswordHash, 'admin', 'Farols Admin');
    logger.info(`Seeded predefined admin account: ${ADMIN_USERNAME}`);
  } else {
    if (shouldSyncAdminPassword && shouldSyncAdminEmail) {
      dbInstance.prepare(
        "UPDATE users SET role = 'admin', email = ?, password_hash = ?, updated_at = unixepoch() WHERE id = ?"
      ).run(ADMIN_EMAIL, adminPasswordHash, seededAdmin.id);
    } else if (shouldSyncAdminPassword) {
      dbInstance.prepare(
        "UPDATE users SET role = 'admin', password_hash = ?, updated_at = unixepoch() WHERE id = ?"
      ).run(adminPasswordHash, seededAdmin.id);
    } else if (shouldSyncAdminEmail) {
      dbInstance.prepare(
        "UPDATE users SET role = 'admin', email = ?, updated_at = unixepoch() WHERE id = ?"
      ).run(ADMIN_EMAIL, seededAdmin.id);
    } else {
      dbInstance.prepare(
        "UPDATE users SET role = 'admin', updated_at = unixepoch() WHERE id = ?"
      ).run(seededAdmin.id);
    }
  }

  logger.info('Database migrations applied');
}

export default getDb;

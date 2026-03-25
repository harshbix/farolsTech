import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DB_PATH = process.env.DB_PATH || join(__dirname, '..', '..', 'data', 'farols.db');
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin_farols';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@farols.local';
const ADMIN_PASSWORD_SOURCE = process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD || '123456';

let db;

export function getDb() {
  if (!db) {
    // Ensure custom DB_PATH directories (e.g. mounted persistent disks) exist.
    mkdirSync(dirname(DB_PATH), { recursive: true });
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
  const adminPasswordHash = ADMIN_PASSWORD_SOURCE.startsWith('$2')
    ? ADMIN_PASSWORD_SOURCE
    : bcrypt.hashSync(ADMIN_PASSWORD_SOURCE, 12);

  if (!seededAdmin) {
    dbInstance.prepare(
      'INSERT INTO users (username, email, password_hash, role, display_name) VALUES (?, ?, ?, ?, ?)'
    ).run(ADMIN_USERNAME, ADMIN_EMAIL, adminPasswordHash, 'admin', 'Farols Admin');
    logger.info(`Seeded predefined admin account: ${ADMIN_USERNAME}`);
  } else {
    dbInstance.prepare(
      "UPDATE users SET role = 'admin', email = ?, password_hash = ?, updated_at = unixepoch() WHERE id = ?"
    ).run(ADMIN_EMAIL, adminPasswordHash, seededAdmin.id);
  }

  logger.info('Database migrations applied');
}

export default getDb;

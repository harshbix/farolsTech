import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DB_PATH = process.env.DB_PATH || './data/farols.db';

let db;

export function getDb() {
  if (!db) {
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
  logger.info('Database migrations applied');
}

export default getDb;

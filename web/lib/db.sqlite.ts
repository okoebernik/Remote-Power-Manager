import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import fs from 'node:fs';
import path from 'node:path';
import type { DbAdapter, RunResult } from './db';
import { config } from './config';

function ensureColumn(sqlite: Database.Database, table: string, column: string, ddl: string) {
  const columns = sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!columns.some((c) => c.name === column)) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

function migrate(sqlite: Database.Database) {
  sqlite.pragma('foreign_keys = ON');

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  ensureColumn(sqlite, 'users', 'locale', `locale TEXT NOT NULL DEFAULT 'de'`);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      device_ip TEXT NOT NULL DEFAULT '',
      mqtt_on_topic TEXT NOT NULL,
      mqtt_on_payload TEXT NOT NULL DEFAULT 'ON',
      mqtt_off_topic TEXT NOT NULL,
      mqtt_off_payload TEXT NOT NULL DEFAULT 'OFF',
      mqtt_status_topic TEXT NOT NULL DEFAULT '',
      mqtt_status_request_topic TEXT NOT NULL DEFAULT '',
      mqtt_status_request_payload TEXT NOT NULL DEFAULT '',
      mqtt_status_mode TEXT NOT NULL DEFAULT 'plain',
      mqtt_status_power_path TEXT NOT NULL DEFAULT 'POWER',
      mqtt_status_on_value TEXT NOT NULL DEFAULT 'ON',
      mqtt_status_off_value TEXT NOT NULL DEFAULT 'OFF',
      restart_delay_ms INTEGER NOT NULL DEFAULT 15000,
      last_socket_status TEXT NOT NULL DEFAULT 'unknown',
      last_status_payload TEXT NOT NULL DEFAULT '',
      last_status_error TEXT NOT NULL DEFAULT '',
      last_ping_status TEXT NOT NULL DEFAULT 'unknown',
      last_checked_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  ensureColumn(sqlite, 'devices', 'mqtt_status_mode', `mqtt_status_mode TEXT NOT NULL DEFAULT 'plain'`);
  ensureColumn(sqlite, 'devices', 'mqtt_status_request_topic', `mqtt_status_request_topic TEXT NOT NULL DEFAULT ''`);
  ensureColumn(sqlite, 'devices', 'mqtt_status_request_payload', `mqtt_status_request_payload TEXT NOT NULL DEFAULT ''`);
  ensureColumn(sqlite, 'devices', 'mqtt_status_power_path', `mqtt_status_power_path TEXT NOT NULL DEFAULT 'POWER'`);
  ensureColumn(sqlite, 'devices', 'last_status_payload', `last_status_payload TEXT NOT NULL DEFAULT ''`);
  ensureColumn(sqlite, 'devices', 'last_status_error', `last_status_error TEXT NOT NULL DEFAULT ''`);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS device_user (
      device_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      PRIMARY KEY (device_id, user_id),
      FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS action_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      device_id INTEGER,
      action TEXT NOT NULL,
      result TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL
    )
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL DEFAULT ''
    )
  `);

  sqlite.exec(`UPDATE devices SET restart_delay_ms = 15000 WHERE restart_delay_ms = 1000`);
  sqlite.exec(`UPDATE users SET locale = 'de' WHERE locale IS NULL OR locale = ''`);
}

function seedAdmin(sqlite: Database.Database) {
  const count = (sqlite.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number }).count;
  if (count > 0) return;

  const passwordHash = bcrypt.hashSync(config.initialAdmin.password, 10);
  sqlite
    .prepare('INSERT INTO users (username, password_hash, role, locale) VALUES (?, ?, ?, ?)')
    .run(config.initialAdmin.username, passwordHash, 'admin', 'de');
}

export function createSqliteAdapter(): DbAdapter {
  const dbPath = config.database.sqlite.path;
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const sqlite = new Database(dbPath);
  migrate(sqlite);
  seedAdmin(sqlite);

  const adapter: DbAdapter = {
    driver: 'sqlite',
    async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      return sqlite.prepare(sql).all(...params) as T[];
    },
    async get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
      return sqlite.prepare(sql).get(...params) as T | undefined;
    },
    async run(sql: string, params: unknown[] = []): Promise<RunResult> {
      const result = sqlite.prepare(sql).run(...params);
      return { lastInsertRowId: Number(result.lastInsertRowid), changes: result.changes };
    },
    async exec(sql: string): Promise<void> {
      sqlite.exec(sql);
    },
    async transaction<T>(fn: (tx: DbAdapter) => Promise<T>): Promise<T> {
      sqlite.exec('BEGIN');
      try {
        const result = await fn(adapter);
        sqlite.exec('COMMIT');
        return result;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };

  return adapter;
}

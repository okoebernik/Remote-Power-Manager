import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import type { DbAdapter, RunResult } from './db';
import { config } from './config';

async function ensureColumn(
  conn: mysql.Pool | mysql.PoolConnection,
  table: string,
  column: string,
  ddl: string,
) {
  const [rows] = await conn.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column]);
  if ((rows as unknown[]).length === 0) {
    await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN ${ddl}`);
  }
}

async function migrate(pool: mysql.Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(190) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await ensureColumn(pool, 'users', 'locale', `locale VARCHAR(5) NOT NULL DEFAULT 'de'`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS devices (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(190) NOT NULL,
      description TEXT NOT NULL,
      device_ip VARCHAR(255) NOT NULL DEFAULT '',
      mqtt_on_topic VARCHAR(255) NOT NULL,
      mqtt_on_payload VARCHAR(255) NOT NULL DEFAULT 'ON',
      mqtt_off_topic VARCHAR(255) NOT NULL,
      mqtt_off_payload VARCHAR(255) NOT NULL DEFAULT 'OFF',
      mqtt_status_topic VARCHAR(255) NOT NULL DEFAULT '',
      mqtt_status_request_topic VARCHAR(255) NOT NULL DEFAULT '',
      mqtt_status_request_payload VARCHAR(255) NOT NULL DEFAULT '',
      mqtt_status_mode VARCHAR(20) NOT NULL DEFAULT 'plain',
      mqtt_status_power_path VARCHAR(255) NOT NULL DEFAULT 'POWER',
      mqtt_status_on_value VARCHAR(255) NOT NULL DEFAULT 'ON',
      mqtt_status_off_value VARCHAR(255) NOT NULL DEFAULT 'OFF',
      restart_delay_ms INT UNSIGNED NOT NULL DEFAULT 15000,
      last_socket_status VARCHAR(255) NOT NULL DEFAULT 'unknown',
      last_status_payload TEXT NOT NULL,
      last_status_error TEXT NOT NULL,
      last_ping_status VARCHAR(255) NOT NULL DEFAULT 'unknown',
      last_checked_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await ensureColumn(pool, 'devices', 'mqtt_status_mode', `mqtt_status_mode VARCHAR(20) NOT NULL DEFAULT 'plain'`);
  await ensureColumn(pool, 'devices', 'mqtt_status_request_topic', `mqtt_status_request_topic VARCHAR(255) NOT NULL DEFAULT ''`);
  await ensureColumn(pool, 'devices', 'mqtt_status_request_payload', `mqtt_status_request_payload VARCHAR(255) NOT NULL DEFAULT ''`);
  await ensureColumn(pool, 'devices', 'mqtt_status_power_path', `mqtt_status_power_path VARCHAR(255) NOT NULL DEFAULT 'POWER'`);
  await ensureColumn(pool, 'devices', 'last_status_payload', `last_status_payload TEXT NOT NULL`);
  await ensureColumn(pool, 'devices', 'last_status_error', `last_status_error TEXT NOT NULL`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS device_user (
      device_id INT UNSIGNED NOT NULL,
      user_id INT UNSIGNED NOT NULL,
      PRIMARY KEY (device_id, user_id),
      CONSTRAINT fk_device_user_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
      CONSTRAINT fk_device_user_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS action_log (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NULL,
      device_id INT UNSIGNED NULL,
      action VARCHAR(100) NOT NULL,
      result TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_action_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      CONSTRAINT fk_action_log_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      setting_key VARCHAR(190) PRIMARY KEY,
      setting_value TEXT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`UPDATE devices SET restart_delay_ms = 15000 WHERE restart_delay_ms = 1000`);
  await pool.query(`UPDATE users SET locale = 'de' WHERE locale IS NULL OR locale = ''`);
}

async function seedAdmin(pool: mysql.Pool) {
  const [rows] = await pool.query('SELECT COUNT(*) AS count FROM users');
  const count = (rows as { count: number }[])[0].count;
  if (count > 0) return;

  const passwordHash = await bcrypt.hash(config.initialAdmin.password, 10);
  await pool.query('INSERT INTO users (username, password_hash, role, locale) VALUES (?, ?, ?, ?)', [
    config.initialAdmin.username,
    passwordHash,
    'admin',
    'de',
  ]);
}

function wrap(conn: mysql.Pool | mysql.PoolConnection, driver: 'mysql'): DbAdapter {
  const adapter: DbAdapter = {
    driver,
    async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      const [rows] = await conn.query(sql, params);
      return rows as T[];
    },
    async get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
      const [rows] = await conn.query(sql, params);
      return (rows as T[])[0];
    },
    async run(sql: string, params: unknown[] = []): Promise<RunResult> {
      const [result] = await conn.query<mysql.ResultSetHeader>(sql, params);
      return { lastInsertRowId: Number(result.insertId), changes: result.affectedRows };
    },
    async exec(sql: string): Promise<void> {
      await conn.query(sql);
    },
    async transaction<T>(fn: (tx: DbAdapter) => Promise<T>): Promise<T> {
      if (!('getConnection' in conn)) {
        throw new Error('Nested transactions are not supported');
      }
      const pool = conn as mysql.Pool;
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const tx = wrap(connection, driver);
        const result = await fn(tx);
        await connection.commit();
        return result;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },
  };
  return adapter;
}

export async function createMysqlAdapter(): Promise<DbAdapter> {
  const { mysql: mysqlConfig } = config.database;
  const pool = mysql.createPool({
    host: mysqlConfig.host,
    port: mysqlConfig.port,
    database: mysqlConfig.database,
    user: mysqlConfig.username,
    password: mysqlConfig.password,
    charset: mysqlConfig.charset,
    // Return DATETIME/TIMESTAMP/DATE columns as strings, matching SQLite's
    // TEXT storage (and this app's Device/User/ActionLogEntry types) instead
    // of mysql2's default of parsing them into JS Date objects, which broke
    // rendering created_at/last_checked_at directly as JSX text.
    dateStrings: true,
  });

  await migrate(pool);
  await seedAdmin(pool);

  return wrap(pool, 'mysql');
}

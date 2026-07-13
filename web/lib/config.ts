import path from 'node:path';

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  database: {
    driver: (process.env.DB_DRIVER === 'mysql' ? 'mysql' : 'sqlite') as 'sqlite' | 'mysql',
    sqlite: {
      path: process.env.SQLITE_PATH ?? path.join(process.cwd(), '..', 'data', 'app.sqlite'),
    },
    mysql: {
      host: process.env.MYSQL_HOST ?? '127.0.0.1',
      port: envInt('MYSQL_PORT', 3306),
      database: process.env.MYSQL_DATABASE ?? 'remote_power_manager',
      username: process.env.MYSQL_USER ?? 'root',
      password: process.env.MYSQL_PASSWORD ?? '',
      charset: process.env.MYSQL_CHARSET ?? 'utf8mb4',
    },
  },
  mqtt: {
    host: process.env.MQTT_HOST ?? '127.0.0.1',
    port: envInt('MQTT_PORT', 1883),
    username: process.env.MQTT_USERNAME ?? '',
    password: process.env.MQTT_PASSWORD ?? '',
    clientIdPrefix: process.env.MQTT_CLIENT_ID_PREFIX ?? 'remote-power-manager',
    statusTimeoutSeconds: envInt('MQTT_STATUS_TIMEOUT_SECONDS', 2),
  },
  initialAdmin: {
    username: process.env.INITIAL_ADMIN_USERNAME ?? 'admin',
    password: process.env.INITIAL_ADMIN_PASSWORD ?? 'admin123',
  },
  session: {
    password: process.env.SESSION_SECRET ?? 'change-this-session-secret-to-a-random-32-char-value',
  },
} as const;

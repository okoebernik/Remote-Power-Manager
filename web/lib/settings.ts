import { db } from './db';
import { config } from './config';
import type { MqttConfig } from './types';

export async function appSetting(key: string, fallback = ''): Promise<string> {
  const database = await db();
  const row = await database.get<{ setting_value: string }>(
    'SELECT setting_value FROM app_settings WHERE setting_key = ?',
    [key],
  );
  return row?.setting_value ?? fallback;
}

export async function saveAppSetting(key: string, value: string): Promise<void> {
  const database = await db();
  if (database.driver === 'sqlite') {
    await database.run('REPLACE INTO app_settings (setting_key, setting_value) VALUES (?, ?)', [key, value]);
  } else {
    await database.run(
      'INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
      [key, value],
    );
  }
}

export async function mqttConfig(): Promise<MqttConfig> {
  const defaults = config.mqtt;
  const useCredentialsDefault = defaults.username !== '' || defaults.password !== '' ? '1' : '0';

  const [host, port, useCredentials, username, password, statusTimeoutSeconds] = await Promise.all([
    appSetting('mqtt_host', defaults.host),
    appSetting('mqtt_port', String(defaults.port)),
    appSetting('mqtt_use_credentials', useCredentialsDefault),
    appSetting('mqtt_username', defaults.username),
    appSetting('mqtt_password', defaults.password),
    appSetting('mqtt_status_timeout_seconds', String(defaults.statusTimeoutSeconds)),
  ]);

  return {
    host,
    port: Number.parseInt(port, 10) || defaults.port,
    use_credentials: useCredentials === '1',
    username,
    password,
    status_timeout_seconds: Number.parseInt(statusTimeoutSeconds, 10) || defaults.statusTimeoutSeconds,
  };
}

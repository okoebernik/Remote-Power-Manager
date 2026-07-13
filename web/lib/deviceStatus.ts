import { db } from './db';
import { mqttConfig } from './settings';
import { readStatusOnce } from './mqtt';
import { pingHost } from './ping';
import type { Device } from './types';

export { statusLabel, statusText } from './statusDisplay';

export async function refreshDeviceStatus(device: Device): Promise<Device> {
  const config = await mqttConfig();
  const [statusResult, pingStatus] = await Promise.all([
    readStatusOnce(config, device),
    pingHost(device.device_ip),
  ]);

  const database = await db();
  await database.run(
    `UPDATE devices
     SET last_socket_status = ?, last_status_payload = ?, last_status_error = ?, last_ping_status = ?, last_checked_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [statusResult.status, statusResult.payload.slice(0, 4000), statusResult.error.slice(0, 1000), pingStatus, device.id],
  );

  return {
    ...device,
    last_socket_status: statusResult.status,
    last_status_payload: statusResult.payload,
    last_status_error: statusResult.error,
    last_ping_status: pingStatus,
    last_checked_at: new Date().toISOString(),
  };
}

export async function devicesForUser(userId: number, isAdminUser: boolean): Promise<Device[]> {
  const database = await db();
  if (isAdminUser) {
    return database.all<Device>('SELECT * FROM devices ORDER BY name');
  }
  return database.all<Device>(
    `SELECT d.* FROM devices d
     JOIN device_user du ON du.device_id = d.id
     WHERE du.user_id = ?
     ORDER BY d.name`,
    [userId],
  );
}

export async function userCanAccessDevice(userId: number, isAdminUser: boolean, deviceId: number): Promise<boolean> {
  if (isAdminUser) return true;
  const database = await db();
  const row = await database.get('SELECT 1 FROM device_user WHERE device_id = ? AND user_id = ?', [
    deviceId,
    userId,
  ]);
  return row !== undefined;
}

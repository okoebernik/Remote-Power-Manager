import { db } from './db';

export async function logAction(userId: number | null, deviceId: number | null, action: string, result: string): Promise<void> {
  const database = await db();
  await database.run('INSERT INTO action_log (user_id, device_id, action, result) VALUES (?, ?, ?, ?)', [
    userId,
    deviceId,
    action,
    result.slice(0, 1000),
  ]);
}

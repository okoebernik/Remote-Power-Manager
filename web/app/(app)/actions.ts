'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireLogin, logoutUser, getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { normalizeLocale, t } from '@/lib/i18n';
import { userCanAccessDevice, refreshDeviceStatus } from '@/lib/deviceStatus';
import { mqttConfig } from '@/lib/settings';
import { publish, restartDevice } from '@/lib/mqtt';
import { logAction } from '@/lib/actionLog';
import { setFlash } from '@/lib/flash';
import type { Device } from '@/lib/types';

export async function logoutAction(): Promise<void> {
  await logoutUser();
  redirect('/login');
}

export async function saveLanguageAction(formData: FormData): Promise<void> {
  const user = await requireLogin();
  const locale = normalizeLocale(String(formData.get('locale') ?? ''));

  const database = await db();
  await database.run('UPDATE users SET locale = ? WHERE id = ?', [locale, user.id]);

  const session = await getSession();
  session.locale = locale;
  await session.save();

  revalidatePath('/', 'layout');
}

export async function switchAction(formData: FormData): Promise<void> {
  const user = await requireLogin();
  const locale = normalizeLocale(user.locale);
  const deviceId = Number.parseInt(String(formData.get('device_id') ?? '0'), 10);
  const command = String(formData.get('command') ?? '');

  const isAdminUser = user.role === 'admin';
  if (!(await userCanAccessDevice(user.id, isAdminUser, deviceId))) {
    await setFlash(t(locale, 'access_denied'), 'error');
    revalidatePath('/');
    return;
  }

  const database = await db();
  const device = await database.get<Device>('SELECT * FROM devices WHERE id = ?', [deviceId]);
  if (!device) {
    await setFlash(t(locale, 'device_not_found'), 'error');
    revalidatePath('/');
    return;
  }

  const config = await mqttConfig();
  let result = t(locale, 'unknown_command');

  if (command === 'on') {
    result = await publish(config, device.mqtt_on_topic, device.mqtt_on_payload);
    await refreshDeviceStatus(device);
  } else if (command === 'off') {
    result = await publish(config, device.mqtt_off_topic, device.mqtt_off_payload);
    await refreshDeviceStatus(device);
  } else if (command === 'restart') {
    result = await restartDevice(config, device);
    await refreshDeviceStatus(device);
  }

  await logAction(user.id, deviceId, command, result);
  await setFlash(result, result.toLowerCase().includes('fehlgeschlagen') || result.toLowerCase().includes('failed') ? 'error' : 'success');
  revalidatePath('/');
}

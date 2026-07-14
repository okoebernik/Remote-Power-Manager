'use server';

import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { setFlash } from '@/lib/flash';
import { t } from '@/lib/i18n';
import { normalizeLocale } from '@/lib/i18n';
import { isDeviceColor } from '@/lib/deviceColor';

export async function saveDeviceAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const locale = normalizeLocale(admin.locale);

  const id = Number.parseInt(String(formData.get('id') ?? '0'), 10);
  const color = String(formData.get('color') ?? '');
  const values = [
    String(formData.get('name') ?? '').trim(),
    String(formData.get('description') ?? '').trim(),
    isDeviceColor(color) ? color : 'blue',
    String(formData.get('device_ip') ?? '').trim(),
    String(formData.get('mqtt_on_topic') ?? '').trim(),
    String(formData.get('mqtt_on_payload') ?? 'ON').trim() || 'ON',
    String(formData.get('mqtt_off_topic') ?? '').trim(),
    String(formData.get('mqtt_off_payload') ?? 'OFF').trim() || 'OFF',
    String(formData.get('mqtt_status_topic') ?? '').trim(),
    String(formData.get('mqtt_status_request_topic') ?? '').trim(),
    String(formData.get('mqtt_status_request_payload') ?? '').trim(),
    formData.get('mqtt_status_mode') === 'structured' ? 'structured' : 'plain',
    String(formData.get('mqtt_status_power_path') ?? 'POWER').trim() || 'POWER',
    String(formData.get('mqtt_status_on_value') ?? 'ON').trim() || 'ON',
    String(formData.get('mqtt_status_off_value') ?? 'OFF').trim() || 'OFF',
    Math.max(0, Number.parseInt(String(formData.get('restart_delay_ms') ?? '15000'), 10) || 15000),
  ];

  if (values[0] === '' || values[4] === '' || values[6] === '') {
    await setFlash(t(locale, 'required_device_fields'), 'error');
    redirect('/devices');
  }

  const database = await db();

  if (id > 0) {
    await database.run(
      `UPDATE devices
       SET name = ?, description = ?, color = ?, device_ip = ?, mqtt_on_topic = ?, mqtt_on_payload = ?,
           mqtt_off_topic = ?, mqtt_off_payload = ?, mqtt_status_topic = ?, mqtt_status_request_topic = ?,
           mqtt_status_request_payload = ?, mqtt_status_mode = ?, mqtt_status_power_path = ?,
           mqtt_status_on_value = ?, mqtt_status_off_value = ?, restart_delay_ms = ?
       WHERE id = ?`,
      [...values, id],
    );
    await setFlash(t(locale, 'device_saved'));
  } else {
    await database.run(
      `INSERT INTO devices (
        name, description, color, device_ip, mqtt_on_topic, mqtt_on_payload,
        mqtt_off_topic, mqtt_off_payload, mqtt_status_topic, mqtt_status_request_topic,
        mqtt_status_request_payload, mqtt_status_mode, mqtt_status_power_path,
        mqtt_status_on_value, mqtt_status_off_value, restart_delay_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      values,
    );
    await setFlash(t(locale, 'device_created'));
  }

  redirect('/devices');
}

export async function deleteDeviceAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const locale = normalizeLocale(admin.locale);
  const id = Number.parseInt(String(formData.get('id') ?? '0'), 10);

  const database = await db();
  await database.run('DELETE FROM devices WHERE id = ?', [id]);
  await setFlash(t(locale, 'device_deleted'));
  redirect('/devices');
}

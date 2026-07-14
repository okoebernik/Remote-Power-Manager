'use server';

import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { saveAppSetting } from '@/lib/settings';
import { setFlash } from '@/lib/flash';
import { normalizeLocale, t } from '@/lib/i18n';
import { DEVICE_COLORS } from '@/lib/deviceColor';

export async function saveMqttSettingsAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const locale = normalizeLocale(admin.locale);

  const host = String(formData.get('mqtt_host') ?? '').trim();
  const port = Math.max(1, Math.min(65535, Number.parseInt(String(formData.get('mqtt_port') ?? '1883'), 10) || 1883));
  const useCredentials = formData.get('mqtt_use_credentials') ? '1' : '0';
  const username = String(formData.get('mqtt_username') ?? '').trim();
  const password = String(formData.get('mqtt_password') ?? '');
  const timeout = Math.max(
    1,
    Math.min(30, Number.parseInt(String(formData.get('mqtt_status_timeout_seconds') ?? '2'), 10) || 2),
  );
  const showDebugFields = formData.get('show_debug_fields') ? '1' : '0';

  if (host === '') {
    await setFlash(t(locale, 'mqtt_server_required'), 'error');
    redirect('/mqtt');
  }

  await saveAppSetting('mqtt_host', host);
  await saveAppSetting('mqtt_port', String(port));
  await saveAppSetting('mqtt_use_credentials', useCredentials);
  await saveAppSetting('mqtt_username', useCredentials === '1' ? username : '');
  await saveAppSetting('show_debug_fields', showDebugFields);

  if (useCredentials === '1') {
    if (password !== '') {
      await saveAppSetting('mqtt_password', password);
    }
  } else {
    await saveAppSetting('mqtt_password', '');
  }

  await saveAppSetting('mqtt_status_timeout_seconds', String(timeout));

  await setFlash(t(locale, 'mqtt_saved'));
  redirect('/mqtt');
}

export async function saveDeviceGroupsAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const locale = normalizeLocale(admin.locale);

  await Promise.all(
    DEVICE_COLORS.map((color) => {
      const value = String(formData.get(`group_name_${color}`) ?? '').trim();
      return saveAppSetting(`group_name_${color}`, value);
    }),
  );

  await setFlash(t(locale, 'groups_saved'));
  redirect('/mqtt');
}

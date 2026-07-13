'use server';

import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { setFlash } from '@/lib/flash';
import { normalizeLocale, t } from '@/lib/i18n';

export async function saveAssignmentsAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const locale = normalizeLocale(admin.locale);

  const userId = Number.parseInt(String(formData.get('user_id') ?? '0'), 10);
  const deviceIds = formData
    .getAll('device_ids')
    .map((value) => Number.parseInt(String(value), 10))
    .filter((value) => Number.isFinite(value));

  const database = await db();
  await database.transaction(async (tx) => {
    await tx.run('DELETE FROM device_user WHERE user_id = ?', [userId]);
    for (const deviceId of deviceIds) {
      await tx.run('INSERT INTO device_user (device_id, user_id) VALUES (?, ?)', [deviceId, userId]);
    }
  });

  await setFlash(t(locale, 'assignments_saved'));
  redirect(`/assignments?user_id=${userId}`);
}

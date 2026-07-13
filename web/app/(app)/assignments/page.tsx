import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { normalizeLocale, t } from '@/lib/i18n';
import { saveAssignmentsAction } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { UserSelect } from '@/components/UserSelect';
import type { Device, User } from '@/lib/types';

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ user_id?: string }>;
}) {
  const admin = await requireAdmin();
  const locale = normalizeLocale(admin.locale);

  const database = await db();
  const users = await database.all<Pick<User, 'id' | 'username' | 'role'>>(
    'SELECT id, username, role FROM users ORDER BY username',
  );
  const devices = await database.all<Pick<Device, 'id' | 'name'>>('SELECT id, name FROM devices ORDER BY name');

  const { user_id } = await searchParams;
  const selectedUserId = Number.parseInt(user_id ?? '', 10) || users[0]?.id || 0;

  let assigned: number[] = [];
  if (selectedUserId > 0) {
    const rows = await database.all<{ device_id: number }>('SELECT device_id FROM device_user WHERE user_id = ?', [
      selectedUserId,
    ]);
    assigned = rows.map((row) => row.device_id);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(locale, 'assignments')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <UserSelect
          users={users}
          selectedUserId={selectedUserId}
          label={t(locale, 'users')}
          roleLabels={{ admin: t(locale, 'admin'), user: t(locale, 'user') }}
        />

        {selectedUserId > 0 && (
          <form key={selectedUserId} action={saveAssignmentsAction} className="flex flex-col gap-4">
            <input type="hidden" name="user_id" value={selectedUserId} />
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {devices.map((device) => (
                <Label key={device.id} className="flex items-center gap-2 rounded-lg border p-3 font-normal">
                  <Checkbox
                    name="device_ids"
                    value={String(device.id)}
                    defaultChecked={assigned.includes(device.id)}
                  />
                  {device.name}
                </Label>
              ))}
            </div>
            <div>
              <Button type="submit">{t(locale, 'save_assignments')}</Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

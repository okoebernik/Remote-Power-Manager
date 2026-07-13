import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { normalizeLocale, t } from '@/lib/i18n';
import { saveUserAction, deleteUserAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DeleteConfirmButton } from '@/components/DeleteConfirmButton';
import { LabeledSelect } from '@/components/LabeledSelect';
import Link from 'next/link';
import type { User } from '@/lib/types';

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const admin = await requireAdmin();
  const locale = normalizeLocale(admin.locale);
  const { edit } = await searchParams;
  const editId = Number.parseInt(edit ?? '0', 10) || 0;

  const database = await db();
  let editUser: { id: number; username: string; role: 'admin' | 'user' } = { id: 0, username: '', role: 'user' };
  if (editId > 0) {
    const found = await database.get<{ id: number; username: string; role: 'admin' | 'user' }>(
      'SELECT id, username, role FROM users WHERE id = ?',
      [editId],
    );
    if (found) editUser = found;
  }
  const users = await database.all<User & { created_at: string }>(
    'SELECT id, username, role, created_at FROM users ORDER BY username',
  );

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{editId > 0 ? t(locale, 'edit_user') : t(locale, 'create_user')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form key={editUser.id} action={saveUserAction} className="grid gap-4 sm:grid-cols-3">
            <input type="hidden" name="id" value={editUser.id} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">{t(locale, 'username')}</Label>
              <Input id="username" name="username" defaultValue={editUser.username} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="role">{t(locale, 'role')}</Label>
              <LabeledSelect
                id="role"
                name="role"
                defaultValue={editUser.role}
                options={[
                  { value: 'user', label: t(locale, 'user') },
                  { value: 'admin', label: t(locale, 'admin') },
                ]}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">{editId > 0 ? t(locale, 'password_optional') : t(locale, 'password')}</Label>
              <Input id="password" name="password" type="password" required={editId === 0} />
            </div>
            <div className="flex gap-2 sm:col-span-3">
              <Button type="submit">{t(locale, 'save')}</Button>
              {editId > 0 && (
                <Button variant="secondary" render={<Link href="/users" />} nativeButton={false}>
                  {t(locale, 'cancel')}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t(locale, 'users')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t(locale, 'name')}</TableHead>
                <TableHead>{t(locale, 'role')}</TableHead>
                <TableHead>{t(locale, 'created_at')}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{t(locale, user.role)}</TableCell>
                  <TableCell>{user.created_at}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" render={<Link href={`/users?edit=${user.id}`} />} nativeButton={false}>
                        {t(locale, 'edit')}
                      </Button>
                      <DeleteConfirmButton
                        action={deleteUserAction}
                        id={user.id}
                        confirmText={t(locale, 'user_delete_confirm')}
                        triggerText={t(locale, 'delete')}
                        cancelText={t(locale, 'cancel')}
                        disabled={user.id === admin.id}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

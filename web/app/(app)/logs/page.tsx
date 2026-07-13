import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { normalizeLocale, t } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ActionLogEntry } from '@/lib/types';

export default async function LogsPage() {
  const admin = await requireAdmin();
  const locale = normalizeLocale(admin.locale);

  const database = await db();
  const logs = await database.all<ActionLogEntry>(
    `SELECT l.*, u.username, d.name AS device_name
     FROM action_log l
     LEFT JOIN users u ON u.id = l.user_id
     LEFT JOIN devices d ON d.id = l.device_id
     ORDER BY l.created_at DESC
     LIMIT 100`,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(locale, 'logs')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t(locale, 'time')}</TableHead>
              <TableHead>{t(locale, 'users')}</TableHead>
              <TableHead>{t(locale, 'devices')}</TableHead>
              <TableHead>{t(locale, 'action')}</TableHead>
              <TableHead>{t(locale, 'result')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{log.created_at}</TableCell>
                <TableCell>{log.username ?? '-'}</TableCell>
                <TableCell>{log.device_name ?? '-'}</TableCell>
                <TableCell>{log.action}</TableCell>
                <TableCell>{log.result}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

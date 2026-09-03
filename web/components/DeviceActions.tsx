'use client';

import { useTransition } from 'react';
import { switchAction } from '@/app/(app)/actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import type { Locale } from '@/lib/types';

export function DeviceActions({
  deviceId,
  deviceName,
  locale,
}: {
  deviceId: number;
  deviceName: string;
  locale: Locale;
}) {
  const [pending, startTransition] = useTransition();

  function run(command: string) {
    const formData = new FormData();
    formData.set('device_id', String(deviceId));
    formData.set('command', command);
    startTransition(async () => {
      await switchAction(formData);
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" disabled={pending} onClick={() => run('on')}>
        {t(locale, 'on')}
      </Button>

      <AlertDialog>
        <AlertDialogTrigger render={<Button size="sm" variant="secondary" disabled={pending} />}>
          {t(locale, 'off')}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t(locale, 'device_off_confirm', { name: deviceName })}</AlertDialogTitle>
            <AlertDialogDescription />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t(locale, 'cancel')}</AlertDialogCancel>
            <AlertDialogAction variant="secondary" onClick={() => run('off')}>
              {t(locale, 'off')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog>
        <AlertDialogTrigger render={<Button size="sm" variant="destructive" disabled={pending} />}>
          {t(locale, 'restart')}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t(locale, 'device_restart_confirm', { name: deviceName })}</AlertDialogTitle>
            <AlertDialogDescription />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t(locale, 'cancel')}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => run('restart')}>
              {t(locale, 'restart')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

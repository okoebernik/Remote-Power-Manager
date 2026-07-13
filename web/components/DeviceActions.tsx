'use client';

import { useTransition } from 'react';
import { switchAction } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import type { Locale } from '@/lib/types';

export function DeviceActions({ deviceId, locale }: { deviceId: number; locale: Locale }) {
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
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => run('off')}>
        {t(locale, 'off')}
      </Button>
      <Button size="sm" variant="destructive" disabled={pending} onClick={() => run('restart')}>
        {t(locale, 'restart')}
      </Button>
    </div>
  );
}

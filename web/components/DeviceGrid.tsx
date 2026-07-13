'use client';

import { useEffect, useState } from 'react';
import { DeviceCard } from '@/components/DeviceCard';
import { t } from '@/lib/i18n';
import type { Device, Locale } from '@/lib/types';

type StatusUpdate = Pick<
  Device,
  'id' | 'last_socket_status' | 'last_ping_status' | 'last_checked_at' | 'last_status_payload' | 'last_status_error'
>;

export function DeviceGrid({
  initialDevices,
  locale,
  showDebugFields,
}: {
  initialDevices: Device[];
  locale: Locale;
  showDebugFields: boolean;
}) {
  const [devices, setDevices] = useState(initialDevices);

  // initialDevices is a fresh array every time the server re-renders this route
  // (e.g. after a Server Action calls revalidatePath following an on/off/restart
  // click) — sync it in, since useState only consumes its initial value once.
  useEffect(() => {
    setDevices(initialDevices);
  }, [initialDevices]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const response = await fetch('/api/status', { credentials: 'same-origin' });
        if (!response.ok) return;
        const payload: { devices: StatusUpdate[] } = await response.json();
        if (cancelled) return;

        setDevices((current) =>
          current.map((device) => {
            const update = payload.devices.find((d) => d.id === device.id);
            return update ? { ...device, ...update } : device;
          }),
        );
      } catch {
        // ignore transient network errors, next interval will retry
      }
    }

    const interval = setInterval(poll, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (devices.length === 0) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">{t(locale, 'device_none_assigned')}</div>;
  }

  return (
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
      {devices.map((device) => (
        <DeviceCard key={device.id} device={device} locale={locale} showDebugFields={showDebugFields} />
      ))}
    </div>
  );
}

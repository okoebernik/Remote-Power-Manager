'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { DeviceCard } from '@/components/DeviceCard';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { DEVICE_COLORS, DEVICE_COLOR_LABEL_KEYS, DEVICE_COLOR_SWATCH_CLASSES } from '@/lib/deviceColor';
import type { Device, DeviceColor, Locale } from '@/lib/types';

const COLLAPSED_STORAGE_PREFIX = 'rpm_group_collapsed_';

type StatusUpdate = Pick<
  Device,
  'id' | 'last_socket_status' | 'last_ping_status' | 'last_checked_at' | 'last_status_payload' | 'last_status_error'
>;

export function DeviceGrid({
  initialDevices,
  locale,
  showDebugFields,
  groupNames,
}: {
  initialDevices: Device[];
  locale: Locale;
  showDebugFields: boolean;
  groupNames: Record<DeviceColor, string>;
}) {
  const [devices, setDevices] = useState(initialDevices);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<DeviceColor>>(new Set());

  // initialDevices is a fresh array every time the server re-renders this route
  // (e.g. after a Server Action calls revalidatePath following an on/off/restart
  // click) — sync it in, since useState only consumes its initial value once.
  useEffect(() => {
    setDevices(initialDevices);
  }, [initialDevices]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const collapsed = new Set<DeviceColor>();
    for (const color of DEVICE_COLORS) {
      if (window.localStorage.getItem(`${COLLAPSED_STORAGE_PREFIX}${color}`) === '1') {
        collapsed.add(color);
      }
    }
    setCollapsedGroups(collapsed);
  }, []);

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

  function toggleGroup(color: DeviceColor) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(color)) {
        next.delete(color);
        window.localStorage.setItem(`${COLLAPSED_STORAGE_PREFIX}${color}`, '0');
      } else {
        next.add(color);
        window.localStorage.setItem(`${COLLAPSED_STORAGE_PREFIX}${color}`, '1');
      }
      return next;
    });
  }

  if (devices.length === 0) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">{t(locale, 'device_none_assigned')}</div>;
  }

  const groups = DEVICE_COLORS.map((color) => ({
    color,
    devices: devices.filter((device) => device.color === color),
  })).filter((group) => group.devices.length > 0);

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => {
        const isCollapsed = collapsedGroups.has(group.color);
        const label = groupNames[group.color]?.trim() || t(locale, DEVICE_COLOR_LABEL_KEYS[group.color]);

        return (
          <div key={group.color} className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => toggleGroup(group.color)}
              aria-expanded={!isCollapsed}
              className="flex items-center gap-2 text-left text-sm font-semibold text-foreground hover:text-foreground/80"
            >
              {isCollapsed ? <ChevronRight className="size-4 shrink-0" /> : <ChevronDown className="size-4 shrink-0" />}
              <span className={cn('size-2.5 shrink-0 rounded-full', DEVICE_COLOR_SWATCH_CLASSES[group.color])} />
              <span>{label}</span>
              <span className="font-normal text-muted-foreground">({group.devices.length})</span>
            </button>
            {!isCollapsed && (
              <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
                {group.devices.map((device) => (
                  <DeviceCard key={device.id} device={device} locale={locale} showDebugFields={showDebugFields} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

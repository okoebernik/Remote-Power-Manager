export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success';

export function statusLabel(status: string): BadgeVariant {
  if (status === 'online') return 'success';
  if (status === 'offline') return 'destructive';
  if (status === 'on') return 'default';
  if (status === 'off') return 'secondary';
  if (status === 'invalid') return 'destructive';
  return 'outline';
}

const statusTextMap: Record<string, { de: string; en: string }> = {
  on: { de: 'an', en: 'on' },
  off: { de: 'aus', en: 'off' },
  online: { de: 'online', en: 'online' },
  offline: { de: 'offline', en: 'offline' },
  unknown: { de: 'unbekannt', en: 'unknown' },
  invalid: { de: 'ungueltig', en: 'invalid' },
};

export function statusText(status: string, locale: 'de' | 'en'): string {
  return statusTextMap[status]?.[locale] ?? status;
}

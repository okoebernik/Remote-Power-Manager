import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { t } from '@/lib/i18n';
import type { Device, Locale } from '@/lib/types';
import { DeviceActions } from '@/components/DeviceActions';

export function DeviceCard({
  device,
  locale,
  showDebugFields,
}: {
  device: Device;
  locale: Locale;
  showDebugFields: boolean;
}) {
  return (
    <Card data-device-id={device.id} className="flex flex-col justify-between">
      <CardHeader>
        <CardTitle>{device.name}</CardTitle>
        {device.description !== '' && <p className="text-sm text-muted-foreground">{device.description}</p>}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid gap-2 text-sm">
          <div className="flex items-center gap-2">
            <span>{t(locale, 'socket')}:</span>
            <StatusBadge status={device.last_socket_status} locale={locale} dataRole="socket-status" />
          </div>
          <div className="flex items-center gap-2">
            <span>
              {t(locale, 'ping')} {device.device_ip || '-'}:
            </span>
            <StatusBadge status={device.last_ping_status} locale={locale} dataRole="ping-status" />
          </div>
          <div className="text-muted-foreground">
            {t(locale, 'last_check')}: <span data-role="checked-at">{device.last_checked_at || t(locale, 'never')}</span>
          </div>
          {showDebugFields && (
            <>
              <div className="text-muted-foreground">
                MQTT Raw: <span data-role="status-payload">{device.last_status_payload || '-'}</span>
              </div>
              <div className="text-muted-foreground">
                MQTT Info: <span data-role="status-error">{device.last_status_error || '-'}</span>
              </div>
            </>
          )}
        </div>
        <DeviceActions deviceId={device.id} locale={locale} />
      </CardContent>
    </Card>
  );
}

import { requireAdmin } from '@/lib/auth';
import { normalizeLocale, t } from '@/lib/i18n';
import { mqttConfig } from '@/lib/settings';
import { appSetting } from '@/lib/settings';
import { saveMqttSettingsAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function MqttSettingsPage() {
  const admin = await requireAdmin();
  const locale = normalizeLocale(admin.locale);

  const [mqtt, showDebugFields] = await Promise.all([mqttConfig(), appSetting('show_debug_fields', '0')]);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t(locale, 'mqtt_server')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={saveMqttSettingsAction} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="mqtt_host">{t(locale, 'server_host')}</Label>
                <Input id="mqtt_host" name="mqtt_host" defaultValue={mqtt.host} placeholder="127.0.0.1" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="mqtt_port">{t(locale, 'port')}</Label>
                <Input id="mqtt_port" name="mqtt_port" type="number" min={1} max={65535} defaultValue={mqtt.port} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="mqtt_status_timeout_seconds">{t(locale, 'status_timeout_seconds')}</Label>
                <Input
                  id="mqtt_status_timeout_seconds"
                  name="mqtt_status_timeout_seconds"
                  type="number"
                  min={1}
                  max={30}
                  defaultValue={mqtt.status_timeout_seconds}
                />
              </div>
            </div>

            <Label className="flex items-center gap-2 rounded-lg border p-3 font-normal">
              <Checkbox name="mqtt_use_credentials" value="1" defaultChecked={mqtt.use_credentials} />
              {t(locale, 'mqtt_use_credentials')}
            </Label>
            <Label className="flex items-center gap-2 rounded-lg border p-3 font-normal">
              <Checkbox name="show_debug_fields" value="1" defaultChecked={showDebugFields === '1'} />
              {t(locale, 'show_debug_fields')}
            </Label>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="mqtt_username">{t(locale, 'username')}</Label>
                <Input id="mqtt_username" name="mqtt_username" defaultValue={mqtt.username} autoComplete="off" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="mqtt_password">{t(locale, 'password')}</Label>
                <Input
                  id="mqtt_password"
                  name="mqtt_password"
                  type="password"
                  placeholder={mqtt.password !== '' ? t(locale, 'leave_unchanged') : ''}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div>
              <Button type="submit">{t(locale, 'save_mqtt')}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t(locale, 'current_configuration')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <div>
            Broker: <strong>{mqtt.host}:{mqtt.port}</strong>
          </div>
          <div>
            {t(locale, 'credentials')}: <strong>{mqtt.use_credentials ? t(locale, 'active') : t(locale, 'inactive')}</strong>
          </div>
          <div>
            {t(locale, 'status')} Timeout: <strong>{mqtt.status_timeout_seconds} s</strong>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

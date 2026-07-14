import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { normalizeLocale, t } from '@/lib/i18n';
import { saveDeviceAction, deleteDeviceAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DeleteConfirmButton } from '@/components/DeleteConfirmButton';
import { LabeledSelect } from '@/components/LabeledSelect';
import { DeviceColorPicker } from '@/components/DeviceColorPicker';
import Link from 'next/link';
import type { Device } from '@/lib/types';

const emptyDevice: Device = {
  id: 0,
  name: '',
  description: '',
  color: 'blue',
  device_ip: '',
  mqtt_on_topic: '',
  mqtt_on_payload: 'ON',
  mqtt_off_topic: '',
  mqtt_off_payload: 'OFF',
  mqtt_status_topic: '',
  mqtt_status_request_topic: '',
  mqtt_status_request_payload: '',
  mqtt_status_mode: 'plain',
  mqtt_status_power_path: 'POWER',
  mqtt_status_on_value: 'ON',
  mqtt_status_off_value: 'OFF',
  restart_delay_ms: 15000,
  last_socket_status: 'unknown',
  last_status_payload: '',
  last_status_error: '',
  last_ping_status: 'unknown',
  last_checked_at: null,
  created_at: '',
};

export default async function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const admin = await requireAdmin();
  const locale = normalizeLocale(admin.locale);
  const { edit } = await searchParams;
  const editId = Number.parseInt(edit ?? '0', 10) || 0;

  const database = await db();
  let editDevice = emptyDevice;
  if (editId > 0) {
    const found = await database.get<Device>('SELECT * FROM devices WHERE id = ?', [editId]);
    if (found) editDevice = found;
  }
  const devices = await database.all<Device>('SELECT * FROM devices ORDER BY name');

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{editId > 0 ? t(locale, 'edit_device') : t(locale, 'create_device')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form key={editDevice.id} action={saveDeviceAction} className="grid gap-4">
            <input type="hidden" name="id" value={editDevice.id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">{t(locale, 'name')}</Label>
                <Input id="name" name="name" defaultValue={editDevice.name} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="device_ip">{t(locale, 'device_ip')}</Label>
                <Input id="device_ip" name="device_ip" defaultValue={editDevice.device_ip} placeholder="192.168.1.20" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="description">{t(locale, 'description')}</Label>
              <Input id="description" name="description" defaultValue={editDevice.description} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t(locale, 'device_color')}</Label>
              <DeviceColorPicker name="color" defaultValue={editDevice.color} locale={locale} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="mqtt_on_topic">{t(locale, 'mqtt_on_topic')}</Label>
                <Input id="mqtt_on_topic" name="mqtt_on_topic" defaultValue={editDevice.mqtt_on_topic} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="mqtt_on_payload">{t(locale, 'mqtt_on_payload')}</Label>
                <Input id="mqtt_on_payload" name="mqtt_on_payload" defaultValue={editDevice.mqtt_on_payload} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="mqtt_off_topic">{t(locale, 'mqtt_off_topic')}</Label>
                <Input id="mqtt_off_topic" name="mqtt_off_topic" defaultValue={editDevice.mqtt_off_topic} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="mqtt_off_payload">{t(locale, 'mqtt_off_payload')}</Label>
                <Input id="mqtt_off_payload" name="mqtt_off_payload" defaultValue={editDevice.mqtt_off_payload} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="mqtt_status_topic">{t(locale, 'mqtt_status_topic')}</Label>
                <Input id="mqtt_status_topic" name="mqtt_status_topic" defaultValue={editDevice.mqtt_status_topic} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="mqtt_status_request_topic">{t(locale, 'mqtt_status_request_topic')}</Label>
                <Input
                  id="mqtt_status_request_topic"
                  name="mqtt_status_request_topic"
                  defaultValue={editDevice.mqtt_status_request_topic}
                  placeholder="36/Hobbyraum/Lasercutter1/cmnd/STATE"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="mqtt_status_request_payload">{t(locale, 'mqtt_status_request_payload')}</Label>
                <Input
                  id="mqtt_status_request_payload"
                  name="mqtt_status_request_payload"
                  defaultValue={editDevice.mqtt_status_request_payload}
                  placeholder="optional"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="mqtt_status_mode">{t(locale, 'mqtt_status_mode')}</Label>
                <LabeledSelect
                  id="mqtt_status_mode"
                  name="mqtt_status_mode"
                  defaultValue={editDevice.mqtt_status_mode}
                  options={[
                    { value: 'plain', label: t(locale, 'mqtt_status_mode_plain') },
                    { value: 'structured', label: t(locale, 'mqtt_status_mode_structured') },
                  ]}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="mqtt_status_power_path">{t(locale, 'mqtt_status_power_path')}</Label>
                <Input
                  id="mqtt_status_power_path"
                  name="mqtt_status_power_path"
                  defaultValue={editDevice.mqtt_status_power_path}
                  placeholder="POWER"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="restart_delay_ms">{t(locale, 'device_restart_delay_label')}</Label>
                <Input
                  id="restart_delay_ms"
                  name="restart_delay_ms"
                  type="number"
                  min={0}
                  defaultValue={editDevice.restart_delay_ms}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="mqtt_status_on_value">{t(locale, 'mqtt_status_on_value')}</Label>
                <Input id="mqtt_status_on_value" name="mqtt_status_on_value" defaultValue={editDevice.mqtt_status_on_value} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="mqtt_status_off_value">{t(locale, 'mqtt_status_off_value')}</Label>
                <Input id="mqtt_status_off_value" name="mqtt_status_off_value" defaultValue={editDevice.mqtt_status_off_value} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit">{t(locale, 'save')}</Button>
              {editId > 0 && (
                <Button variant="secondary" render={<Link href="/devices" />} nativeButton={false}>
                  {t(locale, 'cancel')}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t(locale, 'devices')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t(locale, 'name')}</TableHead>
                <TableHead>{t(locale, 'ip')}</TableHead>
                <TableHead>MQTT On/Off</TableHead>
                <TableHead>{t(locale, 'status')}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell>{device.name}</TableCell>
                  <TableCell>{device.device_ip}</TableCell>
                  <TableCell>
                    {device.mqtt_on_topic}
                    <br />
                    {device.mqtt_off_topic}
                  </TableCell>
                  <TableCell>{device.mqtt_status_topic || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" render={<Link href={`/devices?edit=${device.id}`} />} nativeButton={false}>
                        {t(locale, 'edit')}
                      </Button>
                      <DeleteConfirmButton
                        action={deleteDeviceAction}
                        id={device.id}
                        confirmText={t(locale, 'device_delete_confirm')}
                        triggerText={t(locale, 'delete')}
                        cancelText={t(locale, 'cancel')}
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

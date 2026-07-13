import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { devicesForUser, refreshDeviceStatus } from '@/lib/deviceStatus';

export async function GET() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const devices = await devicesForUser(user.id, user.role === 'admin');
  const refreshed = await Promise.all(devices.map((device) => refreshDeviceStatus(device)));

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    devices: refreshed.map((device) => ({
      id: device.id,
      last_socket_status: device.last_socket_status,
      last_ping_status: device.last_ping_status,
      last_checked_at: device.last_checked_at,
      last_status_payload: device.last_status_payload,
      last_status_error: device.last_status_error,
    })),
  });
}

import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { mqttConfig } from '@/lib/settings';
import { checkBrokerConnection } from '@/lib/mqtt';

export async function GET() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const config = await mqttConfig();
  const connected = await checkBrokerConnection(config);

  return NextResponse.json({ connected, checked_at: new Date().toISOString() });
}

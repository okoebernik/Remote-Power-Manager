'use client';

import { useEffect, useState } from 'react';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Locale } from '@/lib/types';

type MqttState = 'checking' | 'connected' | 'disconnected';

const MQTT_POLL_INTERVAL_MS = 30000;

export function StatusBar({ locale }: { locale: Locale }) {
  const [now, setNow] = useState<Date | null>(null);
  const [mqttState, setMqttState] = useState<MqttState>('checking');

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function checkMqtt() {
      try {
        const response = await fetch('/api/mqtt-status', { credentials: 'same-origin' });
        if (!response.ok) throw new Error('request failed');
        const data: { connected: boolean } = await response.json();
        if (!cancelled) setMqttState(data.connected ? 'connected' : 'disconnected');
      } catch {
        if (!cancelled) setMqttState('disconnected');
      }
    }

    checkMqtt();
    const interval = setInterval(checkMqtt, MQTT_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (now === null) {
    return <div className="sticky top-0 z-10 h-12 shrink-0 border-b border-white/10 bg-slate-900" />;
  }

  const dotClassName =
    mqttState === 'connected' ? 'bg-green-500' : mqttState === 'disconnected' ? 'bg-red-500' : 'bg-white/40 animate-pulse';
  const stateLabel =
    mqttState === 'connected'
      ? t(locale, 'mqtt_connected')
      : mqttState === 'disconnected'
        ? t(locale, 'mqtt_disconnected')
        : t(locale, 'mqtt_checking');

  return (
    <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-white/10 bg-slate-900 px-4 py-3 text-sm text-white">
      <div className="flex items-center gap-2" title={stateLabel}>
        <span className={cn('size-2.5 shrink-0 rounded-full', dotClassName)} aria-label={stateLabel} />
        <span>{t(locale, 'mqtt_connection')}</span>
      </div>
      <div className="font-mono tabular-nums text-white/70">
        {now.toLocaleTimeString(locale === 'de' ? 'de-DE' : 'en-US')}
      </div>
    </div>
  );
}

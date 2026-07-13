import type { Device } from './types';

function parseStructuredPayload(message: string): Record<string, unknown> | null {
  try {
    const decoded = JSON.parse(message);
    if (decoded && typeof decoded === 'object' && !Array.isArray(decoded)) {
      return decoded as Record<string, unknown>;
    }
  } catch {
    // not JSON; structured YAML payloads are not supported (PHP's yaml_parse fallback
    // relied on a non-default PHP extension rarely present in practice)
  }
  return null;
}

function getPathValue(data: Record<string, unknown>, path: string): unknown {
  let current: unknown = data;
  for (const rawSegment of path.split('.')) {
    const segment = rawSegment.trim();
    if (
      segment === '' ||
      current === null ||
      typeof current !== 'object' ||
      Array.isArray(current) ||
      !(segment in (current as Record<string, unknown>))
    ) {
      return null;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function extractKeyByRegex(message: string, path: string): string | null {
  const segments = path.split('.');
  const key = (segments[segments.length - 1] ?? '').trim();
  if (key === '') return null;

  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`"${escaped}"\\s*:\\s*"([^"]+)"`, 'i'),
    new RegExp(`"${escaped}"\\s*:\\s*([A-Za-z0-9._-]+)`, 'i'),
    new RegExp(`^${escaped}\\s*:\\s*"([^"]+)"`, 'im'),
    new RegExp(`^${escaped}\\s*:\\s*([A-Za-z0-9._-]+)`, 'im'),
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(message);
    if (match) return match[1].trim();
  }
  return null;
}

export function extractStatusValue(device: Device, message: string): string {
  const mode = (device.mqtt_status_mode ?? 'plain').trim();
  if (mode !== 'structured') return message;

  const path = (device.mqtt_status_power_path ?? 'POWER').trim() || 'POWER';

  const parsed = parseStructuredPayload(message);
  if (parsed) {
    const value = getPathValue(parsed, path);
    if (value !== null && typeof value !== 'object') {
      return String(value).trim();
    }
  }

  const fallback = extractKeyByRegex(message, path);
  return fallback ?? message;
}

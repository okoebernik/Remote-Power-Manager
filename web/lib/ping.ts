import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function isValidHost(host: string): boolean {
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  const hostname = /^[a-z0-9.-]+$/i;
  return ipv4.test(host) || hostname.test(host);
}

export async function pingHost(host: string): Promise<'unknown' | 'invalid' | 'online' | 'offline'> {
  const trimmed = host.trim();
  if (trimmed === '') return 'unknown';
  if (!isValidHost(trimmed)) return 'invalid';

  const isWindows = process.platform === 'win32';
  const args = isWindows ? ['-n', '1', '-w', '1000', trimmed] : ['-c', '1', '-W', '1', trimmed];

  try {
    await execFileAsync('ping', args);
    return 'online';
  } catch {
    return 'offline';
  }
}

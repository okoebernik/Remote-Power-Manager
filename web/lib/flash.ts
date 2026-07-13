import { cookies } from 'next/headers';

export interface FlashMessage {
  message: string;
  type: 'success' | 'error';
}

const COOKIE_NAME = 'rpm_flash';

export async function setFlash(message: string, type: FlashMessage['type'] = 'success'): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, JSON.stringify({ message, type }), {
    path: '/',
    maxAge: 10,
    httpOnly: true,
    sameSite: 'lax',
  });
}

// Read-only: safe to call from a Server Component during render. The cookie is
// cleared for subsequent requests by proxy.ts, since Server Components cannot
// write cookies themselves during a GET render.
export async function readFlash(): Promise<FlashMessage | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FlashMessage;
  } catch {
    return null;
  }
}

export { COOKIE_NAME as FLASH_COOKIE_NAME };

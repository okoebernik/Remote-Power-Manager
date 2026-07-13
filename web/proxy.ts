import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { FLASH_COOKIE_NAME } from '@/lib/flash';

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  if (request.cookies.has(FLASH_COOKIE_NAME)) {
    response.cookies.delete(FLASH_COOKIE_NAME);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

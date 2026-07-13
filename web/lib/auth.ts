import { cookies } from 'next/headers';
import { getIronSession, type IronSession } from 'iron-session';
import { redirect } from 'next/navigation';
import bcrypt from 'bcrypt';
import { db } from './db';
import { config } from './config';
import { normalizeLocale } from './i18n';
import type { Locale, Role, User } from './types';

export interface SessionData {
  userId?: number;
  locale?: Locale;
}

const sessionOptions = {
  password: config.session.password,
  cookieName: 'rpm_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function currentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session.userId) return null;

  const database = await db();
  const user = await database.get<User>('SELECT id, username, role, locale FROM users WHERE id = ?', [
    session.userId,
  ]);
  return user ?? null;
}

export async function isAdmin(): Promise<boolean> {
  const user = await currentUser();
  return user !== null && user.role === 'admin';
}

export async function requireLogin(): Promise<User> {
  const user = await currentUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireLogin();
  if (user.role !== 'admin') {
    redirect('/');
  }
  return user;
}

export async function currentLocale(): Promise<Locale> {
  const user = await currentUser();
  if (user) return normalizeLocale(user.locale);

  const session = await getSession();
  if (session.locale) return normalizeLocale(session.locale);

  return 'de';
}

export async function verifyCredentials(username: string, password: string): Promise<User | null> {
  const database = await db();
  const user = await database.get<User>('SELECT * FROM users WHERE username = ?', [username]);
  if (!user) return null;

  // PHP's password_hash() produces $2y$-prefixed bcrypt hashes. Node's bcrypt
  // package only recognizes $2a$/$2b$, and silently fails to verify $2y$
  // hashes (always returns false, even for the correct password) instead of
  // throwing. $2y$ is cryptographically identical to $2b$, so it's safe to
  // normalize the prefix before comparing.
  const normalizedHash = user.password_hash.replace(/^\$2y\$/, '$2b$');
  const valid = await bcrypt.compare(password, normalizedHash);
  return valid ? user : null;
}

export async function loginUser(user: User): Promise<void> {
  const session = await getSession();
  session.userId = user.id;
  session.locale = normalizeLocale(user.locale);
  await session.save();
}

export async function logoutUser(): Promise<void> {
  const session = await getSession();
  session.destroy();
}

export type { Role };

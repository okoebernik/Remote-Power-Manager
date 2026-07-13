'use server';

import { redirect } from 'next/navigation';
import bcrypt from 'bcrypt';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { setFlash } from '@/lib/flash';
import { normalizeLocale, t } from '@/lib/i18n';

export async function saveUserAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const locale = normalizeLocale(admin.locale);

  const id = Number.parseInt(String(formData.get('id') ?? '0'), 10);
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const role = formData.get('role') === 'admin' ? 'admin' : 'user';

  if (username === '') {
    await setFlash(t(locale, 'username_required'), 'error');
    redirect('/users');
  }

  if (id <= 0 && password === '') {
    await setFlash(t(locale, 'password_required_new_user'), 'error');
    redirect('/users');
  }

  const database = await db();
  let flash: { message: string; type: 'success' | 'error' } = { message: t(locale, 'user_saved'), type: 'success' };

  try {
    if (id > 0) {
      if (password !== '') {
        const passwordHash = await bcrypt.hash(password, 10);
        await database.run('UPDATE users SET username = ?, role = ?, password_hash = ? WHERE id = ?', [
          username,
          role,
          passwordHash,
          id,
        ]);
      } else {
        await database.run('UPDATE users SET username = ?, role = ? WHERE id = ?', [username, role, id]);
      }
    } else {
      const passwordHash = await bcrypt.hash(password, 10);
      await database.run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', [
        username,
        passwordHash,
        role,
      ]);
      flash = { message: t(locale, 'user_created'), type: 'success' };
    }
  } catch {
    flash = { message: t(locale, 'username_taken'), type: 'error' };
  }

  await setFlash(flash.message, flash.type);
  redirect('/users');
}

export async function deleteUserAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const locale = normalizeLocale(admin.locale);
  const id = Number.parseInt(String(formData.get('id') ?? '0'), 10);

  if (id === admin.id) {
    await setFlash(t(locale, 'cannot_delete_self'), 'error');
    redirect('/users');
  }

  const database = await db();
  await database.run('DELETE FROM users WHERE id = ?', [id]);
  await setFlash(t(locale, 'user_deleted'));
  redirect('/users');
}

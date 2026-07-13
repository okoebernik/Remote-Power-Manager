'use server';

import { redirect } from 'next/navigation';
import { verifyCredentials, loginUser } from '@/lib/auth';

export interface LoginState {
  error?: string;
}

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  const user = await verifyCredentials(username, password);
  if (!user) {
    return { error: 'login_failed' };
  }

  await loginUser(user);
  redirect('/');
}

import { redirect } from 'next/navigation';
import { currentUser, currentLocale } from '@/lib/auth';
import { t } from '@/lib/i18n';
import { LoginForm } from '@/components/LoginForm';

export default async function LoginPage() {
  const user = await currentUser();
  if (user) {
    redirect('/');
  }

  const locale = await currentLocale();

  return (
    <LoginForm
      labels={{
        title: t(locale, 'login'),
        username: t(locale, 'username'),
        password: t(locale, 'password'),
        signIn: t(locale, 'sign_in'),
        loginFailed: t(locale, 'login_failed'),
      }}
    />
  );
}

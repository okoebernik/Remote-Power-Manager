import { requireLogin } from '@/lib/auth';
import { normalizeLocale } from '@/lib/i18n';
import { readFlash } from '@/lib/flash';
import { Sidebar } from '@/components/Sidebar';
import { FlashMessage } from '@/components/FlashMessage';
import { StatusBar } from '@/components/StatusBar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireLogin();
  const locale = normalizeLocale(user.locale);
  const flash = await readFlash();

  return (
    <div className="flex min-h-screen">
      <Sidebar username={user.username} role={user.role} locale={locale} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <StatusBar locale={locale} />
        {children}
      </main>
      <FlashMessage flash={flash} />
    </div>
  );
}

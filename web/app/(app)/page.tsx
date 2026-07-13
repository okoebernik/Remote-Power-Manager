import { requireLogin } from '@/lib/auth';
import { devicesForUser } from '@/lib/deviceStatus';
import { appSetting } from '@/lib/settings';
import { normalizeLocale, t } from '@/lib/i18n';
import { DeviceGrid } from '@/components/DeviceGrid';

export default async function DashboardPage() {
  const user = await requireLogin();
  const locale = normalizeLocale(user.locale);

  const [devices, showDebugFields] = await Promise.all([
    devicesForUser(user.id, user.role === 'admin'),
    appSetting('show_debug_fields', '0'),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{t(locale, 'dashboard')}</h1>
        <p className="text-muted-foreground">{t(locale, 'dashboard_intro')}</p>
        <p className="text-muted-foreground">{t(locale, 'dashboard_auto_refresh')}</p>
      </div>
      <DeviceGrid initialDevices={devices} locale={locale} showDebugFields={showDebugFields === '1'} />
    </div>
  );
}

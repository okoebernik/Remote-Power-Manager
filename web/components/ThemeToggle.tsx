'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { Locale } from '@/lib/types';

export function ThemeToggle({ locale, collapsed }: { locale: Locale; collapsed: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-8" />;
  }

  const isDark = resolvedTheme === 'dark';
  const label = isDark ? t(locale, 'switch_to_light_mode') : t(locale, 'switch_to_dark_mode');

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={label}
      aria-label={label}
      className="flex h-8 items-center gap-2 rounded-lg px-2 text-sm text-white/80 hover:bg-white/10"
    >
      {isDark ? <Sun className="size-4 shrink-0" /> : <Moon className="size-4 shrink-0" />}
      {!collapsed && <span>{t(locale, 'theme')}</span>}
    </button>
  );
}

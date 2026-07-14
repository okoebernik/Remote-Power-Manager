'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Plug,
  Users as UsersIcon,
  Link2,
  Radio,
  ScrollText,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { logoutAction } from '@/app/(app)/actions';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { supportedLocales, t, type TranslationKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Locale, Role } from '@/lib/types';

const STORAGE_KEY = 'rpm_sidebar_collapsed';

interface NavItem {
  href: string;
  icon: typeof LayoutDashboard;
  labelKey: TranslationKey;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', icon: LayoutDashboard, labelKey: 'dashboard' },
  { href: '/devices', icon: Plug, labelKey: 'devices', adminOnly: true },
  { href: '/users', icon: UsersIcon, labelKey: 'users', adminOnly: true },
  { href: '/assignments', icon: Link2, labelKey: 'assignments', adminOnly: true },
  { href: '/mqtt', icon: Radio, labelKey: 'mqtt', adminOnly: true },
  { href: '/logs', icon: ScrollText, labelKey: 'logs', adminOnly: true },
];

interface SidebarProps {
  username: string;
  role: Role;
  locale: Locale;
}

export function Sidebar({ username, role, locale }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === '1' || stored === '0') {
      setCollapsed(stored === '1');
    } else {
      // No explicit preference yet: default to collapsed on narrow viewports.
      setCollapsed(window.matchMedia('(max-width: 768px)').matches);
    }
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  }

  const isAdmin = role === 'admin';
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside
      className={cn(
        'sticky top-0 flex h-screen flex-col border-r border-white/10 bg-slate-900 text-white transition-[width] duration-150',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div className="flex items-center justify-between gap-2 p-3">
        {!collapsed && <span className="truncate font-bold">Remote Power Manager</span>}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg hover:bg-white/10"
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          const label = t(locale, item.labelKey);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/10',
                active && 'bg-white/15 font-medium',
              )}
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-2 border-t border-white/10 p-2">
        {!collapsed && (
          <div className="px-2 py-1 text-sm text-white/80">
            {username} ({t(locale, role)})
          </div>
        )}
        {!collapsed && (
          <LanguageSwitcher locale={locale} locales={supportedLocales()} label={t(locale, 'settings_language')} />
        )}
        <ThemeToggle locale={locale} collapsed={collapsed} />
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            className="w-full justify-start gap-2"
            title={collapsed ? t(locale, 'logout') : undefined}
          >
            <LogOut className="size-4 shrink-0" />
            {!collapsed && t(locale, 'logout')}
          </Button>
        </form>
      </div>
    </aside>
  );
}

'use client';

import { saveLanguageAction } from '@/app/(app)/actions';
import type { Locale } from '@/lib/types';

interface LanguageSwitcherProps {
  locale: Locale;
  locales: Record<Locale, string>;
  label: string;
}

export function LanguageSwitcher({ locale, locales, label }: LanguageSwitcherProps) {
  return (
    <form action={saveLanguageAction}>
      <label htmlFor="locale" className="sr-only">
        {label}
      </label>
      <select
        id="locale"
        name="locale"
        defaultValue={locale}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
      >
        {Object.entries(locales).map(([code, name]) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
      </select>
    </form>
  );
}

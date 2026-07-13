import { de } from './i18n/de';
import { en } from './i18n/en';
import type { Locale } from './types';

const dictionaries = { de, en } as const;

export type TranslationKey = keyof typeof de;

export function supportedLocales(): Record<Locale, string> {
  return { de: 'Deutsch', en: 'English' };
}

export function normalizeLocale(locale: string | null | undefined): Locale {
  const normalized = (locale ?? '').toLowerCase().trim();
  return normalized === 'en' ? 'en' : 'de';
}

export function t(locale: Locale, key: TranslationKey, replace: Record<string, string> = {}): string {
  const dictionary = dictionaries[locale] ?? dictionaries.de;
  let text: string = dictionary[key] ?? dictionaries.de[key] ?? key;

  for (const [replaceKey, replaceValue] of Object.entries(replace)) {
    text = text.split(`:${replaceKey}`).join(replaceValue);
  }

  return text;
}

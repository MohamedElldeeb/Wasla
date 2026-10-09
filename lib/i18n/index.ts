import { ar, type Dict } from './ar';
import { en } from './en';

export type Locale = 'ar' | 'en';
export const LOCALES: Locale[] = ['ar', 'en'];
export const LOCALE_COOKIE = 'wasla_locale';
export const DEFAULT_LOCALE: Locale = 'ar';

export const dicts: Record<Locale, Dict> = { ar, en };
export const dirOf = (l: Locale) => (l === 'ar' ? 'rtl' : 'ltr');
export const isLocale = (v: unknown): v is Locale => v === 'ar' || v === 'en';
export type { Dict };

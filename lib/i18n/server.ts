import 'server-only';
import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_COOKIE, dicts, isLocale, type Locale } from './index';

export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

/** Dictionary for the current request (server components and server actions). */
export async function getT() {
  const locale = await getLocale();
  return { locale, t: dicts[locale] };
}

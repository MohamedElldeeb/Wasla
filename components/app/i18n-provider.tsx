'use client';

import { createContext, useContext } from 'react';
import { dicts, type Dict, type Locale } from '@/lib/i18n';

const Ctx = createContext<Locale>('ar');

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <Ctx.Provider value={locale}>{children}</Ctx.Provider>;
}

export const useLocale = () => useContext(Ctx);
/** Dictionary for client components. Only the locale string crosses the server/client boundary. */
export const useT = (): Dict => dicts[useContext(Ctx)];

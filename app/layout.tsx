import type { Metadata } from 'next';
import { Readex_Pro, IBM_Plex_Sans_Arabic } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { I18nProvider } from '@/components/app/i18n-provider';
import { getT } from '@/lib/i18n/server';
import { dirOf } from '@/lib/i18n';
import './globals.css';

const readex = Readex_Pro({
  variable: '--font-readex',
  subsets: ['arabic', 'latin'],
  weight: ['400', '600', '700'],
});

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: '--font-plex-arabic',
  subsets: ['arabic', 'latin'],
  weight: ['400', '600', '700'],
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: { default: t.brand.name, template: `%s | ${t.brand.name}` },
    description: t.brand.tagline,
    icons: { icon: '/brand/wasla-logo-mark.svg' },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await getT();
  return (
    <html lang={locale} dir={dirOf(locale)} className={`${readex.variable} ${plexArabic.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <I18nProvider locale={locale}>
          {children}
          <Toaster position="top-center" dir={dirOf(locale)} />
        </I18nProvider>
      </body>
    </html>
  );
}

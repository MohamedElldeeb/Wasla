'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { setLocale } from '@/app/actions/locale';
import { useLocale, useT } from '@/components/app/i18n-provider';

/** Shows the OTHER language's name (in its own language). Used in the auth/landing corner and inside the user menu. */
export function LanguageToggle({ className, variant = 'ghost' }: { className?: string; variant?: 'ghost' | 'secondary' }) {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      loading={pending}
      title={t.lang.label}
      onClick={() => start(async () => { await setLocale(locale === 'ar' ? 'en' : 'ar'); router.refresh(); })}
    >
      <Languages aria-hidden />
      <span lang={locale === 'ar' ? 'en' : 'ar'}>{t.lang.switchTo}</span>
    </Button>
  );
}

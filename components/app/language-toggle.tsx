'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { setLocale } from '@/app/actions/locale';
import { useLocale, useT } from '@/components/app/i18n-provider';

export function LanguageToggle({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={className}
      disabled={pending}
      title={t.lang.label}
      onClick={() => start(async () => { await setLocale(locale === 'ar' ? 'en' : 'ar'); router.refresh(); })}
    >
      <Languages aria-hidden />
      <span lang={locale === 'ar' ? 'en' : 'ar'}>{t.lang.switchTo}</span>
    </Button>
  );
}

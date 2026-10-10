'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/components/app/i18n-provider';

const noop = () => () => {};

/** One-tap light/dark switch for the landing header (the full light / dark / auto control lives in settings). */
export function ThemeIconToggle() {
  const t = useT();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const dark = !mounted || resolvedTheme !== 'light';
  return (
    <Button type="button" variant="ghost" size="icon" title={t.shell.theme} aria-label={t.shell.theme} onClick={() => setTheme(dark ? 'light' : 'dark')}>
      {dark ? <Sun aria-hidden /> : <Moon aria-hidden />}
    </Button>
  );
}

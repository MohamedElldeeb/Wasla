'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '@/components/app/i18n-provider';

const noop = () => () => {};

/** Light / dark / auto. Dark is a real theme (DESIGN.md 2.3), auto follows the system. */
export function ThemeToggle() {
  const t = useT();
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const items = [
    { v: 'light', label: t.shell.light, Icon: Sun },
    { v: 'dark', label: t.shell.dark, Icon: Moon },
    { v: 'system', label: t.shell.system, Icon: Monitor },
  ];
  return (
    <div role="radiogroup" aria-label={t.shell.theme} className="grid grid-cols-3 gap-1 rounded-control bg-surface-muted p-1">
      {items.map(({ v, label, Icon }) => {
        const active = mounted && (theme ?? 'system') === v;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(v)}
            className={cn('transition-ui flex h-12 items-center justify-center gap-2 rounded-control text-body-sm font-medium lg:h-10', active ? 'bg-surface text-fg ring-1 ring-border' : 'text-fg-muted hover:text-fg')}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}

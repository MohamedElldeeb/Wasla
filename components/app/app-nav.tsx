'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSyncExternalStore } from 'react';
import { ChevronsLeft, Coins, LayoutDashboard, Megaphone, Settings, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { num } from '@/lib/format';
import { useT } from '@/components/app/i18n-provider';
import { UserMenu } from '@/components/app/user-menu';

const ITEMS = [
  { href: '/dashboard', key: 'dashboard', Icon: LayoutDashboard },
  { href: '/campaigns', key: 'campaigns', Icon: Megaphone },
  { href: '/leads', key: 'leads', Icon: Users },
  { href: '/settings', key: 'settings', Icon: Settings },
] as const;

const isActive = (path: string, href: string) => path === href || path.startsWith(`${href}/`);

export function CreditsPill({ balance, className }: { balance: number; className?: string }) {
  const t = useT();
  return (
    <span className={cn('num inline-flex h-10 items-center gap-2 rounded-full bg-primary-soft px-3 text-body-sm font-semibold text-primary', className)} title={t.common.credits}>
      <Coins className="size-4" aria-hidden />
      {num(balance)}
      <span className="font-normal text-fg-muted">{t.common.creditUnit}</span>
    </span>
  );
}

type Shell = { balance: number; orgName: string; role: string; initial: string };

/** Mobile bottom navigation: 64px + safe area, 4 items, icon + label, active item in primary with a 2px top indicator. */
export function BottomNav() {
  const t = useT();
  const path = usePathname();
  return (
    <nav aria-label={t.nav.main} className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
      <ul className="grid h-16 grid-cols-4">
        {ITEMS.map(({ href, key, Icon }) => {
          const active = isActive(path, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn('transition-ui relative flex h-16 flex-col items-center justify-center gap-1 text-caption', active ? 'text-primary' : 'text-fg-muted hover:text-fg')}
              >
                {active && <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-primary" aria-hidden />}
                <Icon className="size-6" aria-hidden />
                {t.nav[key]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Mobile top bar (56px): logo mark, page title, credits pill, avatar. */
export function MobileTopBar({ balance, orgName, role, initial }: Shell) {
  const t = useT();
  const path = usePathname();
  const current = ITEMS.find((i) => isActive(path, i.href));
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-surface px-4 lg:hidden">
      <Link href="/dashboard" aria-label={t.brand.name} className="shrink-0">
        <Image src="/brand/wasla-logo-mark.svg" alt="" width={32} height={32} className="size-8 rounded-control" />
      </Link>
      <span className="min-w-0 flex-1 truncate text-h3 text-fg">{current ? t.nav[current.key] : t.brand.name}</span>
      <CreditsPill balance={balance} />
      <UserMenu initial={initial} orgName={orgName} role={role} />
    </header>
  );
}

const subscribe = (cb: () => void) => {
  window.addEventListener('storage', cb);
  window.addEventListener('wasla:sidebar', cb);
  return () => { window.removeEventListener('storage', cb); window.removeEventListener('wasla:sidebar', cb); };
};
const getCollapsed = () => localStorage.getItem('wasla_sidebar') === '1';

/** Desktop sidebar (>= lg): 248px, collapsible to 72px icons. Logo lockup, nav, then credits card and user menu. */
export function Sidebar({ balance, orgName, role, initial }: Shell) {
  const t = useT();
  const path = usePathname();
  const collapsed = useSyncExternalStore(subscribe, getCollapsed, () => false);
  const toggle = () => { localStorage.setItem('wasla_sidebar', collapsed ? '0' : '1'); window.dispatchEvent(new Event('wasla:sidebar')); };
  return (
    <aside className={cn('sticky top-0 hidden h-screen shrink-0 flex-col gap-4 border-e border-border bg-surface p-4 transition-[width] duration-200 ease-ui lg:flex', collapsed ? 'w-[72px]' : 'w-[248px]')}>
      <div className={cn('flex items-center', collapsed ? 'justify-center' : 'justify-between')}>
        <Link href="/dashboard" aria-label={t.brand.name}>
          {collapsed
            ? <Image src="/brand/wasla-logo-mark.svg" alt="" width={40} height={40} className="size-10 rounded-control" />
            : <Image src="/brand/wasla-logo.svg" alt="" width={230} height={96} className="h-12 w-auto" />}
        </Link>
      </div>
      <nav aria-label={t.nav.main} className="flex flex-1 flex-col gap-1">
        {ITEMS.map(({ href, key, Icon }) => {
          const active = isActive(path, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              title={collapsed ? t.nav[key] : undefined}
              className={cn('transition-ui flex h-12 items-center gap-3 rounded-control px-3 text-body font-medium', collapsed && 'justify-center px-0', active ? 'bg-primary-soft text-primary' : 'text-fg-muted hover:bg-surface-muted hover:text-fg')}
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              {!collapsed && t.nav[key]}
            </Link>
          );
        })}
      </nav>
      {!collapsed && (
        <div className="flex flex-col gap-1 rounded-card border border-border p-3">
          <span className="text-caption text-fg-muted">{t.dashboard.balance}</span>
          <span className="num text-h2 text-fg">{num(balance)}</span>
          <span className="text-caption text-fg-muted">{t.common.creditUnit}</span>
        </div>
      )}
      <UserMenu initial={initial} orgName={orgName} role={role} showName={!collapsed} />
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? t.shell.expand : t.shell.collapse}
        title={collapsed ? t.shell.expand : t.shell.collapse}
        className="transition-ui flex h-12 items-center justify-center rounded-control text-fg-muted hover:bg-surface-muted hover:text-fg"
      >
        <ChevronsLeft className={cn('size-5 rtl:-scale-x-100', collapsed && 'rotate-180')} aria-hidden />
      </button>
    </aside>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useT } from '@/components/app/i18n-provider';

export function NavLinks() {
  const t = useT();
  const path = usePathname();
  const items = [
    { href: '/', label: t.nav.dashboard, active: path === '/' },
    { href: '/campaigns', label: t.nav.campaigns, active: path.startsWith('/campaigns') },
  ];
  return (
    <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto text-sm" aria-label="Main">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={i.active ? 'page' : undefined}
          className={cn('whitespace-nowrap rounded-lg px-3 py-2 transition-colors hover:bg-sidebar-accent', i.active && 'bg-sidebar-accent font-semibold')}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

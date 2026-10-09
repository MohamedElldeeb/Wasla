import Image from 'next/image';
import Link from 'next/link';
import { Coins } from 'lucide-react';
import { requireOrg } from '@/lib/org';
import { logout } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { LanguageToggle } from '@/components/app/language-toggle';
import { NavLinks } from '@/components/app/nav-links';
import { getT } from '@/lib/i18n/server';
import { num } from '@/lib/format';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, org } = await requireOrg();
  const { t } = await getT();
  const { data: balance } = await supabase.rpc('org_credit_balance', { org: org.id });
  const ghost = 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground';
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-2 px-4 sm:gap-3">
          <Link href="/" aria-label={t.brand.name} className="shrink-0">
            <Image src="/brand/wasla-logo-mark.svg" alt="" width={36} height={36} className="size-9 rounded-lg" />
          </Link>
          <NavLinks />
          <span className="hidden max-w-40 truncate text-xs opacity-80 md:inline">{org.name}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sidebar-accent px-3 py-1.5 text-sm" title={t.common.credits}>
            <Coins className="size-4" aria-hidden />
            <b>{num(Number(balance ?? 0))}</b>
            <span className="hidden text-xs opacity-80 sm:inline">{t.common.creditUnit}</span>
          </span>
          <LanguageToggle className={ghost} />
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm" className={ghost}>{t.common.signOut}</Button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}

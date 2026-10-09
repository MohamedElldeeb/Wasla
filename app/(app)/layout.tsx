import Image from 'next/image';
import Link from 'next/link';
import { Coins } from 'lucide-react';
import { requireOrg } from '@/lib/org';
import { logout } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { ar } from '@/lib/i18n/ar';
import { num } from '@/lib/format';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, org } = await requireOrg();
  const { data: balance } = await supabase.rpc('org_credit_balance', { org: org.id });
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
          <Link href="/" aria-label={ar.brand.name} className="shrink-0">
            <Image src="/brand/wasla-logo-mark.svg" alt="" width={36} height={36} className="size-9 rounded-lg" />
          </Link>
          <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto text-sm">
            <Link href="/" className="rounded-md px-3 py-2 hover:bg-sidebar-accent">{ar.nav.dashboard}</Link>
            <Link href="/campaigns" className="rounded-md px-3 py-2 hover:bg-sidebar-accent">{ar.nav.campaigns}</Link>
          </nav>
          <span className="hidden max-w-40 truncate text-xs opacity-80 sm:inline">{org.name}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sidebar-accent px-3 py-1 text-sm" title={ar.common.credits}>
            <Coins className="size-4" aria-hidden />
            <b>{num(Number(balance ?? 0))}</b>
          </span>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm" className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground">
              {ar.common.signOut}
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}

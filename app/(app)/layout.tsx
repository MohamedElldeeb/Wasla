import { requireOrg } from '@/lib/org';
import { getT } from '@/lib/i18n/server';
import { BottomNav, MobileTopBar, Sidebar } from '@/components/app/app-nav';

// App shell (DESIGN.md 4.3): mobile = top bar + bottom navigation; desktop = start-side sidebar, no top bar.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, org, user } = await requireOrg();
  const { t } = await getT();
  const { data } = await supabase.rpc('org_credit_balance', { org: org.id });
  const shell = {
    balance: Number(data ?? 0),
    orgName: org.name,
    role: org.role,
    initial: (org.name || user.email || 'W').trim().charAt(0).toUpperCase(),
  };
  return (
    <div className="min-h-screen lg:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-3 focus:text-fg">{t.shell.skip}</a>
      <Sidebar {...shell} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar {...shell} />
        <main id="main" className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-[calc(64px+env(safe-area-inset-bottom)+24px)] pt-6 md:px-6 lg:px-8 lg:pb-12 lg:pt-8">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

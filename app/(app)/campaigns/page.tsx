import Link from 'next/link';
import { ChevronRight, Megaphone } from 'lucide-react';
import { requireOrg } from '@/lib/org';
import { getT } from '@/lib/i18n/server';
import { dateFmt } from '@/lib/format';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/app/empty-state';
import { PageHeader } from '@/components/app/page-header';
import { StatusBadge } from '@/components/app/status-badge';
import type { Campaign } from '@/lib/types';

export default async function CampaignsPage() {
  const { supabase } = await requireOrg();
  const { t, locale } = await getT();
  const { data } = await supabase.from('campaigns').select('id,name,status,created_at,parameters').order('created_at', { ascending: false });
  const list = (data ?? []) as Campaign[];
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t.campaigns.title}
        description={t.campaigns.desc}
        action={<Link href="/campaigns/new" className={buttonVariants({ size: 'lg' })}>{t.campaigns.new}</Link>}
      />
      {list.length === 0 ? (
        <EmptyState icon={Megaphone} title={t.campaigns.empty} body={t.dashboard.emptyBody} href="/campaigns/new" cta={t.dashboard.startFirst} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 md:gap-4">
          {list.map((c) => (
            <li key={c.id}>
              <Link href={`/campaigns/${c.id}`} className="transition-ui flex h-full flex-col gap-3 rounded-card border border-border bg-surface p-4 hover:border-border-strong hover:bg-surface-muted md:p-6">
                <div className="flex items-center justify-between gap-3">
                  <strong className="min-w-0 truncate text-h3 text-fg" dir="auto">{c.name}</strong>
                  <StatusBadge kind="campaign" status={c.status} />
                </div>
                <p className="line-clamp-1 text-body-sm text-fg-muted" dir="auto">{(c.parameters.keywords ?? []).join(' · ')}</p>
                <div className="flex items-center justify-between text-body-sm text-fg-muted">
                  <span>{t.campaigns.created} {dateFmt(c.created_at, locale)}</span>
                  <ChevronRight className="size-5 text-fg-subtle rtl:-scale-x-100" aria-hidden />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import Link from 'next/link';
import { requireOrg } from '@/lib/org';
import { getT } from '@/lib/i18n/server';
import { dateFmt } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/app/empty-state';
import type { Campaign } from '@/lib/types';

export default async function CampaignsPage() {
  const { supabase } = await requireOrg();
  const { t, locale } = await getT();
  const { data } = await supabase.from('campaigns').select('id,name,status,created_at,parameters').order('created_at', { ascending: false });
  const list = (data ?? []) as Campaign[];
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">{t.campaigns.title}</h1>
        <Link href="/campaigns/new" className={buttonVariants({ variant: 'cta', size: 'lg' })}>{t.campaigns.new}</Link>
      </div>
      {list.length === 0 ? (
        <EmptyState title={t.campaigns.empty} body={t.dashboard.emptyBody} href="/campaigns/new" cta={t.dashboard.startFirst} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {list.map((c) => (
            <li key={c.id}>
              <Link href={`/campaigns/${c.id}`} className="flex flex-col gap-2 rounded-xl border bg-card p-5 transition hover:border-primary/40 hover:shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <strong>{c.name}</strong>
                  <Badge variant="secondary">{t.campaigns.status[c.status]}</Badge>
                </div>
                <p className="line-clamp-1 text-sm text-muted-foreground" dir="auto">{(c.parameters.keywords ?? []).join(' · ')}</p>
                <p className="text-xs text-muted-foreground">{t.campaigns.created} {dateFmt(c.created_at, locale)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

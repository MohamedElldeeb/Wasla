import type { Metadata } from 'next';
import Link from 'next/link';
import { requireOrg } from '@/lib/org';
import { ar } from '@/lib/i18n/ar';
import { dateAr } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/app/empty-state';
import type { Campaign } from '@/lib/types';

export const metadata: Metadata = { title: ar.campaigns.title };

export default async function CampaignsPage() {
  const { supabase } = await requireOrg();
  const { data } = await supabase.from('campaigns').select('id,name,status,created_at,parameters').order('created_at', { ascending: false });
  const list = (data ?? []) as Campaign[];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">{ar.campaigns.title}</h1>
        <Link href="/campaigns/new" className={buttonVariants({ variant: 'cta' })}>{ar.campaigns.new}</Link>
      </div>
      {list.length === 0 ? (
        <EmptyState title={ar.campaigns.empty} body={ar.dashboard.emptyBody} href="/campaigns/new" cta={ar.dashboard.startFirst} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {list.map((c) => (
            <li key={c.id}>
              <Link href={`/campaigns/${c.id}`} className="flex flex-col gap-2 rounded-xl border bg-card p-4 transition hover:border-primary/40">
                <div className="flex items-center justify-between gap-2">
                  <strong>{c.name}</strong>
                  <Badge variant="secondary">{ar.campaigns.status[c.status]}</Badge>
                </div>
                <p className="line-clamp-1 text-xs text-muted-foreground">{(c.parameters.keywords ?? []).join('، ')}</p>
                <p className="text-xs text-muted-foreground">{ar.campaigns.created} {dateAr(c.created_at)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { requireOrg } from '@/lib/org';
import { ar } from '@/lib/i18n/ar';
import { num, dateAr } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/app/empty-state';
import { JobProgress } from '@/components/app/job-progress';
import type { Campaign, Job } from '@/lib/types';

export const metadata: Metadata = { title: ar.dashboard.title };

export default async function Dashboard() {
  const { supabase, org } = await requireOrg();
  const [{ data: balance }, { data: jobs }, { data: campaigns }] = await Promise.all([
    supabase.rpc('org_credit_balance', { org: org.id }),
    supabase.from('jobs').select('*').in('status', ['queued', 'running']).order('created_at', { ascending: false }).limit(5),
    supabase.from('campaigns').select('id,name,status,created_at').order('created_at', { ascending: false }).limit(5),
  ]);
  const active = (jobs ?? []) as Job[];
  const recent = (campaigns ?? []) as Pick<Campaign, 'id' | 'name' | 'status' | 'created_at'>[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl">{ar.dashboard.title}</h1>
        <Link href="/campaigns/new" className={buttonVariants({ variant: 'cta' })}>{ar.campaigns.new}</Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{ar.dashboard.balance}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary">{num(Number(balance ?? 0))}</p>
            <p className="text-xs text-muted-foreground">{ar.common.creditUnit}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{ar.dashboard.activeJobs}</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {active.length === 0 && <p className="text-sm text-muted-foreground">{ar.dashboard.nothingRunning}</p>}
            {active.map((j) => <JobProgress key={j.id} initial={j} compact />)}
          </CardContent>
        </Card>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg">{ar.dashboard.recent}</h2>
        {recent.length === 0 ? (
          <EmptyState title={ar.dashboard.emptyTitle} body={ar.dashboard.emptyBody} href="/campaigns/new" cta={ar.dashboard.startFirst} />
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {recent.map((c) => (
              <li key={c.id}>
                <Link href={`/campaigns/${c.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/60">
                  <span className="font-medium">{c.name}</span>
                  <span className="flex items-center gap-3 text-xs text-muted-foreground">
                    {dateAr(c.created_at)}
                    <Badge variant="secondary">{ar.campaigns.status[c.status]}</Badge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

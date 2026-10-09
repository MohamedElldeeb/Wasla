import Link from 'next/link';
import { requireOrg } from '@/lib/org';
import { getT } from '@/lib/i18n/server';
import { num, dateFmt } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/app/empty-state';
import { JobProgress } from '@/components/app/job-progress';
import type { Campaign, Job } from '@/lib/types';

export default async function Dashboard() {
  const { supabase, org } = await requireOrg();
  const { t, locale } = await getT();
  const [{ data: balance }, { data: jobs }, { data: campaigns }] = await Promise.all([
    supabase.rpc('org_credit_balance', { org: org.id }),
    supabase.from('jobs').select('*').in('status', ['queued', 'running']).order('created_at', { ascending: false }).limit(5),
    supabase.from('campaigns').select('id,name,status,created_at').order('created_at', { ascending: false }).limit(5),
  ]);
  const active = (jobs ?? []) as Job[];
  const recent = (campaigns ?? []) as Pick<Campaign, 'id' | 'name' | 'status' | 'created_at'>[];
  const d = t.dashboard;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">{d.title}</h1>
        <Link href="/campaigns/new" className={buttonVariants({ variant: 'cta', size: 'lg' })}>{t.campaigns.new}</Link>
      </div>

      {recent.length === 0 && (
        <section className="rounded-2xl border bg-card p-6">
          <h2 className="mb-4 text-lg">{d.guideTitle}</h2>
          <ol className="grid gap-5 sm:grid-cols-3">
            {d.guide.map((g, i) => (
              <li key={g.t} className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{i + 1}</span>
                <div>
                  <strong className="block">{g.t}</strong>
                  <span className="text-sm text-muted-foreground">{g.d}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{d.balance}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary">{num(Number(balance ?? 0))}</p>
            <p className="text-sm text-muted-foreground">{t.common.creditUnit}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{d.activeJobs}</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {active.length === 0 && <p className="text-sm text-muted-foreground">{d.nothingRunning}</p>}
            {active.map((j) => <JobProgress key={j.id} initial={j} compact />)}
          </CardContent>
        </Card>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg">{d.recent}</h2>
        {recent.length === 0 ? (
          <EmptyState title={d.emptyTitle} body={d.emptyBody} href="/campaigns/new" cta={d.startFirst} />
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {recent.map((c) => (
              <li key={c.id}>
                <Link href={`/campaigns/${c.id}`} className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-muted/60">
                  <span className="font-medium">{c.name}</span>
                  <span className="flex items-center gap-3 text-xs text-muted-foreground">
                    {dateFmt(c.created_at, locale)}
                    <Badge variant="secondary">{t.campaigns.status[c.status]}</Badge>
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

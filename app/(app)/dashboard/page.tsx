import Link from 'next/link';
import { ChevronRight, Megaphone } from 'lucide-react';
import { requireOrg } from '@/lib/org';
import { getT } from '@/lib/i18n/server';
import { num, dateFmt } from '@/lib/format';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/app/empty-state';
import { JobProgress } from '@/components/app/job-progress';
import { DashboardGuide } from '@/components/app/dashboard-guide';
import { PageHeader } from '@/components/app/page-header';
import { StatusBadge } from '@/components/app/status-badge';
import type { Campaign, Job } from '@/lib/types';

export default async function Dashboard() {
  const { supabase, org, user } = await requireOrg();
  const { t, locale } = await getT();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const REPLIED = ['replied', 'interested', 'meeting', 'won'];

  const [{ data: profile }, { data: jobs }, { data: campaigns }, leadsMonth, sentMonth, contacted, replied] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('user_id', user.id).maybeSingle(),
    supabase.from('jobs').select('*').in('status', ['queued', 'running']).order('created_at', { ascending: false }).limit(5),
    supabase.from('campaigns').select('id,name,status,created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
    supabase.from('messages').select('id', { count: 'exact', head: true }).eq('review_status', 'sent').gte('sent_at', monthStart),
    supabase.from('leads').select('id', { count: 'exact', head: true }).neq('status', 'new'),
    supabase.from('leads').select('id', { count: 'exact', head: true }).in('status', REPLIED),
  ]);
  const active = (jobs ?? []) as Job[];
  const recent = (campaigns ?? []) as Pick<Campaign, 'id' | 'name' | 'status' | 'created_at'>[];
  const d = t.dashboard;
  const name = (profile?.full_name || org.name).trim().split(/\s+/)[0];
  const rate = contacted.count ? `${Math.round(((replied.count ?? 0) / contacted.count) * 100)}%` : '—';
  const stats = [
    { label: t.stats.leads, value: num(leadsMonth.count ?? 0) },
    { label: t.stats.sent, value: num(sentMonth.count ?? 0) },
    { label: t.stats.reply, value: rate },
  ];

  return (
    <div className="flex flex-col gap-8 lg:gap-12">
      <PageHeader
        title={d.greeting(name)}
        description={d.greetingDesc}
        action={<Link href="/campaigns/new" className={buttonVariants({ size: 'lg' })}>{t.campaigns.new}</Link>}
      />

      {active.length > 0 && (
        <section aria-label={d.runningTitle} className="flex flex-col gap-3">
          {active.map((j) => <JobProgress key={j.id} initial={j} />)}
        </section>
      )}

      <section aria-label={d.title} className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0">
        {stats.map((s) => (
          <div key={s.label} className="flex min-w-[220px] snap-start flex-col gap-1 rounded-card border border-border bg-surface p-4 md:min-w-0 md:p-6">
            <span className="text-body-sm text-fg-muted">{s.label}</span>
            <span className="num text-display text-fg">{s.value}</span>
          </div>
        ))}
      </section>

      {recent.length === 0 && <DashboardGuide />}

      <section className="flex flex-col gap-3">
        <h2 className="text-h2 text-fg">{d.recent}</h2>
        {recent.length === 0 ? (
          <EmptyState icon={Megaphone} title={d.emptyTitle} body={d.emptyBody} href="/campaigns/new" cta={d.startFirst} />
        ) : (
          <ul className="flex flex-col gap-3 md:gap-4">
            {recent.map((c) => (
              <li key={c.id}>
                <Link href={`/campaigns/${c.id}`} className="transition-ui flex min-h-14 items-center justify-between gap-3 rounded-card border border-border bg-surface p-4 hover:border-border-strong hover:bg-surface-muted md:p-6">
                  <span className="min-w-0">
                    <strong className="block truncate text-body text-fg" dir="auto">{c.name}</strong>
                    <span className="text-body-sm text-fg-muted">{dateFmt(c.created_at, locale)}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <StatusBadge kind="campaign" status={c.status} />
                    <ChevronRight className="size-5 text-fg-subtle rtl:-scale-x-100" aria-hidden />
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

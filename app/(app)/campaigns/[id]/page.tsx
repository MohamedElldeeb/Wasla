import { notFound } from 'next/navigation';
import { requireOrg } from '@/lib/org';
import { getT } from '@/lib/i18n/server';
import { cairoToday, num } from '@/lib/format';
import { JobProgress } from '@/components/app/job-progress';
import { CampaignTabs } from '@/components/app/campaign-tabs';
import { PageHeader } from '@/components/app/page-header';
import { StatusBadge } from '@/components/app/status-badge';
import type { Campaign, CampaignLead, Job, Message } from '@/lib/types';

const LEAD_COLS = 'id,business_name,category,district,city,phone_e164,phone_type,whatsapp_eligible,website,rating,reviews_count,google_maps_url,status';

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, org } = await requireOrg();
  const { t } = await getT();
  const { data: campaign } = await supabase.from('campaigns').select('*').eq('id', id).maybeSingle();
  if (!campaign) notFound();

  const [{ data: jobs }, { data: links }, { data: messages }, { data: counter }] = await Promise.all([
    supabase.from('jobs').select('*').eq('campaign_id', id).order('created_at', { ascending: false }).limit(5),
    supabase
      .from('campaign_leads')
      .select(`id,opportunity_score,score_reasons,score_reason_keys,leads(${LEAD_COLS})`)
      .eq('campaign_id', id)
      .order('opportunity_score', { ascending: false, nullsFirst: false })
      .limit(1000),
    supabase
      .from('messages')
      .select(`id,lead_id,campaign_id,channel,generated_text,edited_text,angle,review_status,regen_count,sent_at,leads(${LEAD_COLS})`)
      .eq('campaign_id', id)
      .order('created_at')
      .limit(2000),
    supabase.from('daily_send_counters').select('count').eq('channel', 'whatsapp').eq('day', cairoToday()).maybeSingle(),
  ]);

  const jobList = (jobs ?? []) as Job[];
  const current = jobList.find((j) => j.status === 'queued' || j.status === 'running') ?? jobList[0] ?? null;
  const showJob = !!current && (current.status === 'queued' || current.status === 'running' || current.status === 'failed');
  const c = campaign as Campaign;
  const msgs = (messages ?? []) as unknown as Message[];
  const numbers = [
    { label: t.campaign.leadsCount, value: (links ?? []).length },
    { label: t.campaign.approvedCount, value: msgs.filter((m) => m.review_status === 'approved' || m.review_status === 'sent').length },
    { label: t.campaign.sentCount, value: msgs.filter((m) => m.review_status === 'sent').length },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={<span className="flex flex-wrap items-center gap-3"><span dir="auto">{c.name}</span><StatusBadge kind="campaign" status={c.status} /></span>} />
      <dl className="flex flex-wrap gap-x-8 gap-y-2">
        {numbers.map((n) => (
          <div key={n.label} className="flex items-baseline gap-2">
            <dd className="num text-h2 text-fg">{num(n.value)}</dd>
            <dt className="text-body-sm text-fg-muted">{n.label}</dt>
          </div>
        ))}
      </dl>
      {showJob && current && <JobProgress initial={current} />}
      <CampaignTabs
        campaign={c}
        leads={(links ?? []) as unknown as CampaignLead[]}
        messages={msgs}
        sentToday={Number(counter?.count ?? 0)}
        dailyCap={org.wa_daily_cap}
        busy={!!current && (current.status === 'queued' || current.status === 'running')}
      />
    </div>
  );
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireOrg } from '@/lib/org';
import { ar } from '@/lib/i18n/ar';
import { cairoToday } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { JobProgress } from '@/components/app/job-progress';
import { CampaignTabs } from '@/components/app/campaign-tabs';
import type { Campaign, CampaignLead, Job, Message } from '@/lib/types';

export const metadata: Metadata = { title: ar.campaigns.title };

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, org } = await requireOrg();
  const { data: campaign } = await supabase.from('campaigns').select('*').eq('id', id).maybeSingle();
  if (!campaign) notFound();

  const [{ data: jobs }, { data: links }, { data: messages }, { data: counter }] = await Promise.all([
    supabase.from('jobs').select('*').eq('campaign_id', id).order('created_at', { ascending: false }).limit(5),
    supabase
      .from('campaign_leads')
      .select('id,opportunity_score,score_reasons,leads(id,business_name,category,district,city,phone_e164,phone_type,whatsapp_eligible,website,rating,reviews_count,google_maps_url,status)')
      .eq('campaign_id', id)
      .order('opportunity_score', { ascending: false, nullsFirst: false })
      .limit(1000),
    supabase
      .from('messages')
      .select('id,lead_id,campaign_id,channel,generated_text,edited_text,angle,review_status,regen_count,sent_at,leads(id,business_name,category,district,city,phone_e164,phone_type,whatsapp_eligible,website,rating,reviews_count,google_maps_url,status)')
      .eq('campaign_id', id)
      .order('created_at')
      .limit(2000),
    supabase.from('daily_send_counters').select('count').eq('channel', 'whatsapp').eq('day', cairoToday()).maybeSingle(),
  ]);

  const jobList = (jobs ?? []) as Job[];
  const current = jobList.find((j) => j.status === 'queued' || j.status === 'running') ?? jobList[0] ?? null;
  const c = campaign as Campaign;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl">{c.name}</h1>
        <Badge variant="secondary">{ar.campaigns.status[c.status]}</Badge>
      </div>
      {current && (current.status !== 'succeeded' || current.type === 'ingest') && <JobProgress initial={current} />}
      <CampaignTabs
        campaign={c}
        leads={(links ?? []) as unknown as CampaignLead[]}
        messages={(messages ?? []) as unknown as Message[]}
        sentToday={Number(counter?.count ?? 0)}
        dailyCap={org.wa_daily_cap}
        busy={!!current && (current.status === 'queued' || current.status === 'running')}
      />
    </div>
  );
}

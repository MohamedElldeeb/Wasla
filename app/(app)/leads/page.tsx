import { requireOrg } from '@/lib/org';
import { getT } from '@/lib/i18n/server';
import { PageHeader } from '@/components/app/page-header';
import { LeadsBrowser } from '@/components/app/leads-browser';
import type { CampaignLead } from '@/lib/types';

const LEAD_COLS = 'id,business_name,category,district,city,phone_e164,phone_type,whatsapp_eligible,website,rating,reviews_count,google_maps_url,status';

export default async function LeadsPage() {
  const { supabase } = await requireOrg();
  const { t } = await getT();
  const { data } = await supabase
    .from('campaign_leads')
    .select(`id,opportunity_score,score_reasons,score_reason_keys,leads(${LEAD_COLS})`)
    .order('opportunity_score', { ascending: false, nullsFirst: false })
    .limit(500);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t.leadsPage.title} description={t.leadsPage.desc} />
      <LeadsBrowser items={(data ?? []) as unknown as CampaignLead[]} />
    </div>
  );
}

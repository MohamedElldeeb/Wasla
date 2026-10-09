import { requireOrg } from '@/lib/org';
import { getT } from '@/lib/i18n/server';
import { CampaignWizard } from '@/components/app/campaign-wizard';
import { PageHeader } from '@/components/app/page-header';
import type { SignalDefinition } from '@/lib/types';

export default async function NewCampaignPage() {
  const { supabase, org } = await requireOrg();
  const { t } = await getT();
  const [{ data: balance }, { data: defs }, { data: templates }] = await Promise.all([
    supabase.rpc('org_credit_balance', { org: org.id }),
    supabase.from('signal_definitions').select('*').order('sort_order'),
    supabase.from('campaign_templates').select('code,name_ar,parameters,offer_text').order('created_at'),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t.wizard.title} />
      <CampaignWizard
        balance={Number(balance ?? 0)}
        signalDefs={(defs ?? []) as SignalDefinition[]}
        templates={(templates ?? []) as never}
        orgRegions={org.offer_profile.regions ?? []}
      />
    </div>
  );
}

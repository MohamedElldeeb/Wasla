import { requireOrg } from '@/lib/org';
import { getT } from '@/lib/i18n/server';
import { regionsToText } from '@/lib/regions';
import { CampaignWizard } from '@/components/app/campaign-wizard';
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
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl">{t.wizard.title}</h1>
      <CampaignWizard
        balance={Number(balance ?? 0)}
        signalDefs={(defs ?? []) as SignalDefinition[]}
        templates={(templates ?? []) as never}
        orgRegions={regionsToText(org.offer_profile.regions)}
      />
    </div>
  );
}

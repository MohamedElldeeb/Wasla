import { BrandLogo } from '@/components/app/brand-logo';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { InterviewFlow } from '@/components/app/interview-flow';
import { LanguageToggle } from '@/components/app/language-toggle';
import { createClient } from '@/lib/supabase/server';
import { getT } from '@/lib/i18n/server';
import type { OfferProfile } from '@/lib/types';

// Onboarding = a short interview (spec 6.0). A user who already has a described business goes to the dashboard;
// one who created the organization but left before confirming resumes with the same name.
export default async function OnboardingPage() {
  const { t } = await getT();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');
  const { data: rows } = await supabase.from('memberships').select('organizations(id, name, offer_profile)').order('created_at');
  const orgs = (rows ?? []).map((r) => r.organizations as unknown as { id: string; name: string; offer_profile: OfferProfile }).filter((o) => o?.id);
  const wanted = (await cookies()).get('wasla_org')?.value;
  const org = orgs.find((o) => o.id === wanted) ?? orgs[0];
  if (org && (org.offer_profile?.what_we_sell ?? '').trim()) redirect('/dashboard');

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 px-4 pb-12 pt-6 md:px-6">
      <div className="flex items-center justify-between">
        <BrandLogo className="h-12" />
        <LanguageToggle />
      </div>
      <main className="flex flex-col gap-6">
        <div>
          <h1 className="text-h1 text-fg">{t.interview.title}</h1>
          <p className="mt-1 text-body text-fg-muted">{t.interview.sub}</p>
        </div>
        <InterviewFlow mode="onboarding" hasOrg={!!org} orgName={org?.name} />
      </main>
    </div>
  );
}

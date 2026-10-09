'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { parseRegions } from '@/lib/regions';
import { getT } from '@/lib/i18n/server';

export type OnboardingState = { error?: string } | undefined;

export async function createOrganization(_: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const { t } = await getT();
  const name = String(formData.get('name') ?? '').trim();
  if (name.length < 2) return { error: t.onboarding.errorOrg };
  const txt = (k: string) => String(formData.get(k) ?? '').trim().slice(0, 2000);
  const profile = {
    what_we_sell: txt('what_we_sell'),
    ideal_customer: txt('ideal_customer'),
    problems_we_solve: txt('problems_we_solve'),
    proof_points: txt('proof_points'),
    regions: parseRegions(txt('regions')),
  };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('create_organization', { p_name: name, p_offer_profile: profile });
  if (error || !data) return { error: t.onboarding.errorGeneric };
  (await cookies()).set('wasla_org', data as string, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 });
  redirect('/dashboard');
}

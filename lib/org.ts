import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { OfferProfile } from '@/lib/types';

export type ActiveOrg = {
  id: string;
  name: string;
  offer_profile: OfferProfile;
  wa_daily_cap: number;
  status: string;
  role: 'owner' | 'member';
};

/** Signed-in user + the active organization (cookie, else the first membership). Redirects as needed. */
export async function requireOrg() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');

  const { data: rows } = await supabase
    .from('memberships')
    .select('role, organizations(id, name, offer_profile, wa_daily_cap, status)')
    .order('created_at');
  const orgs = (rows ?? [])
    .map((r) => ({ ...(r.organizations as unknown as Omit<ActiveOrg, 'role'>), role: r.role as 'owner' | 'member' }))
    .filter((o) => o.id);
  if (!orgs.length) redirect('/onboarding');

  const wanted = (await cookies()).get('wasla_org')?.value;
  const org = orgs.find((o) => o.id === wanted) ?? orgs[0];
  return { supabase, user: auth.user, org, orgs };
}

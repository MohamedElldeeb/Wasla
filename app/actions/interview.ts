'use server';

import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireOrg } from '@/lib/org';
import { startJob, type StartResult } from '@/lib/jobs';
import { defaults, plannerLlmConfig } from '@/lib/config/defaults';
import { getT } from '@/lib/i18n/server';
import { safePublicUrl } from '@/lib/safe-url.mjs';

/** Creates the organization shell (name only) so the interview jobs have an organization; the profile is saved on confirm. */
export async function startOnboardingOrg(name: string): Promise<{ orgId?: string; error?: string }> {
  const { t } = await getT();
  const clean = name.trim();
  if (clean.length < 2) return { error: t.onboarding.errorOrg };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('create_organization', { p_name: clean, p_offer_profile: {} });
  if (error || !data) return { error: t.onboarding.errorGeneric };
  (await cookies()).set('wasla_org', data as string, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 });
  return { orgId: data as string };
}

const turnSchema = z.object({
  transcript: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(1500) })).max(30),
  siteUrl: z.string().max(300).optional(),
  finish: z.boolean().optional(),
  skipped: z.boolean().optional(),
  nonce: z.string().max(100),
});

/** One interview turn = one job (no credits); the reply arrives in jobs.result and is read through Realtime. */
export async function interviewTurn(input: z.infer<typeof turnSchema>): Promise<StartResult> {
  const { t, locale } = await getT();
  const parsed = turnSchema.safeParse(input);
  if (!parsed.success) return { error: t.errors.generic };
  const { supabase, org } = await requireOrg();
  const first = parsed.data.transcript.length === 0;
  const site = first && parsed.data.siteUrl ? safePublicUrl(parsed.data.siteUrl) : null;
  return startJob(supabase, {
    orgId: org.id,
    campaignId: null,
    type: 'interview',
    credits: defaults.interviewCredits,
    idempotencyKey: `interview:${org.id}:${parsed.data.nonce || randomUUID()}`,
    webhook: 'wasla-interview',
    payload: { ...plannerLlmConfig(), locale, transcript: parsed.data.transcript, site_url: site, finish: !!parsed.data.finish, skipped: !!parsed.data.skipped },
  });
}

const profileSchema = z.object({
  what_we_sell: z.string().trim().min(1).max(2000),
  ideal_customer: z.string().trim().max(2000).default(''),
  problems_we_solve: z.string().trim().max(2000).default(''),
  proof_points: z.string().trim().max(2000).default(''),
  regions: z.array(z.object({ governorate: z.string().max(60).optional(), city: z.string().max(60).optional(), district: z.string().max(60).optional() })).max(20).default([]),
  example_customers: z.array(z.string().trim().min(1).max(80)).max(10).default([]),
});

/** Only the confirmed summary card is saved; the chat transcript is never stored as the profile. */
export async function saveOfferProfile(profile: z.input<typeof profileSchema>): Promise<{ error?: string }> {
  const { t } = await getT();
  const parsed = profileSchema.safeParse(profile);
  if (!parsed.success) return { error: t.interview.needSell };
  const { supabase, org } = await requireOrg();
  const { error } = await supabase.from('organizations').update({ offer_profile: parsed.data }).eq('id', org.id);
  if (error) return { error: t.errors.generic };
  revalidatePath('/settings');
  revalidatePath('/dashboard');
  return {};
}

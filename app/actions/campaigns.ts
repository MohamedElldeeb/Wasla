'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireOrg } from '@/lib/org';
import { startJob, type StartResult } from '@/lib/jobs';
import { defaults, llmConfig } from '@/lib/config/defaults';
import { getT } from '@/lib/i18n/server';
import type { CampaignParameters } from '@/lib/types';

const location = z.object({ governorate: z.string().max(60).optional(), city: z.string().max(60).optional(), district: z.string().max(60).optional() });

// Validation messages are keys into the wizard dictionary so they can be shown in the user's language.
const paramsSchema = z.object({
  keywords: z.array(z.string().trim().min(1).max(60)).min(1, 'needKeywords').max(12),
  locations: z.array(location).min(1, 'needLocation').max(12),
  max_results: z.number().int().min(1).max(defaults.maxResultsCap),
  filters: z
    .object({
      min_rating: z.number().min(0).max(5).optional(),
      min_reviews: z.number().int().min(0).optional(),
      must_have_phone: z.boolean().optional(),
      must_have_mobile: z.boolean().optional(),
      must_have_website: z.boolean().optional(),
      exclude_closed: z.boolean().optional(),
    })
    .default({}),
  enrich_emails: z.boolean().default(false),
  channel: z.enum(['whatsapp', 'messenger', 'email']).default('whatsapp'),
  tone: z.enum(['friendly', 'professional', 'direct']).default('friendly'),
  offer_override: z.string().max(2000).optional(),
  llm_model_override: z.string().max(100).optional(),
  signals: z.array(z.object({ key: z.string().max(60), weight: z.number().int().min(-100).max(100) })).max(9).default([]),
  angle: z.object({ title_ar: z.string().max(80), description_ar: z.string().max(300) }).nullable().optional(),
});

const issueText = (issue: string | undefined, wizard: Record<string, unknown>, fallback: string) =>
  (issue && typeof wizard[issue] === 'string' ? (wizard[issue] as string) : fallback);

export type CampaignInput = { id?: string; name: string; parameters: unknown };

export async function startPlanner(offerOverride: string | null, nonce: string): Promise<StartResult> {
  const { locale } = await getT();
  const { supabase, org } = await requireOrg();
  return startJob(supabase, {
    orgId: org.id,
    campaignId: null,
    type: 'plan',
    credits: defaults.plannerCredits,
    idempotencyKey: `plan:${org.id}:${nonce || randomUUID()}`,
    webhook: 'wasla-plan',
    payload: { ...llmConfig(), offer_override: offerOverride?.trim() || null, locale },
  });
}

export async function saveCampaign(input: CampaignInput): Promise<{ id?: string; error?: string }> {
  const { t } = await getT();
  const { supabase, org, user } = await requireOrg();
  const name = String(input.name ?? '').trim();
  if (!name) return { error: t.wizard.needName };
  const parsed = paramsSchema.safeParse(input.parameters);
  if (!parsed.success) return { error: issueText(parsed.error.issues[0]?.message, t.wizard, t.errors.generic) };
  const parameters = parsed.data as CampaignParameters;

  if (input.id) {
    const { error } = await supabase.from('campaigns').update({ name, parameters }).eq('id', input.id).eq('status', 'draft');
    if (error) return { error: t.errors.generic };
    return { id: input.id };
  }
  const { data, error } = await supabase
    .from('campaigns')
    .insert({ organization_id: org.id, created_by: user.id, name, source: 'google_maps', parameters })
    .select('id')
    .single();
  if (error || !data) return { error: t.errors.generic };
  revalidatePath('/campaigns');
  return { id: data.id };
}

export async function runCampaign(campaignId: string, nonce: string): Promise<StartResult> {
  const { t } = await getT();
  const { supabase, org } = await requireOrg();
  const { data: c } = await supabase.from('campaigns').select('id,parameters,status').eq('id', campaignId).single();
  if (!c) return { error: t.errors.generic };
  const parsed = paramsSchema.safeParse(c.parameters);
  if (!parsed.success) return { error: issueText(parsed.error.issues[0]?.message, t.wizard, t.errors.generic) };
  const p = parsed.data;

  const { data: perLead } = await supabase.rpc('signal_credits_per_lead', { p_signals: p.signals });
  const credits = p.max_results * (1 + Number(perLead ?? 0));
  const res = await startJob(supabase, {
    orgId: org.id,
    campaignId,
    type: 'ingest',
    credits,
    idempotencyKey: `ingest:${campaignId}:${nonce || randomUUID()}`,
    webhook: 'wasla-ingest',
    payload: { ...llmConfig(p.llm_model_override), max_results_cap: defaults.maxResultsCap },
  });
  if (res.jobId) await supabase.from('campaigns').update({ status: 'running' }).eq('id', campaignId);
  revalidatePath(`/campaigns/${campaignId}`);
  return res;
}

/** Leads that still need a message for the campaign channel (eligible, not opted out, no message yet). */
export async function countWritable(campaignId: string): Promise<{ count: number; error?: string }> {
  const { t } = await getT();
  const { supabase } = await requireOrg();
  const { data: c } = await supabase.from('campaigns').select('parameters').eq('id', campaignId).single();
  if (!c) return { count: 0, error: t.errors.generic };
  const channel = (c.parameters as CampaignParameters).channel ?? 'whatsapp';
  const [{ data: links }, { data: msgs }] = await Promise.all([
    supabase.from('campaign_leads').select('leads(id,whatsapp_eligible,status)').eq('campaign_id', campaignId).limit(2000),
    supabase.from('messages').select('lead_id').eq('campaign_id', campaignId).eq('channel', channel).limit(5000),
  ]);
  const have = new Set((msgs ?? []).map((m) => m.lead_id));
  const count = (links ?? [])
    .map((l) => l.leads as unknown as { id: string; whatsapp_eligible: boolean; status: string })
    .filter((l) => l && (channel !== 'whatsapp' || l.whatsapp_eligible) && l.status !== 'opted_out' && !have.has(l.id)).length;
  return { count };
}

export async function generateMessages(campaignId: string, nonce: string): Promise<StartResult & { count?: number }> {
  const { t } = await getT();
  const { supabase, org } = await requireOrg();
  const { count } = await countWritable(campaignId);
  if (count < 1) return { error: t.campaign.writeNoneEligible };
  const { data: c } = await supabase.from('campaigns').select('parameters').eq('id', campaignId).single();
  const res = await startJob(supabase, {
    orgId: org.id,
    campaignId,
    type: 'generate',
    credits: count,
    idempotencyKey: `gen:${campaignId}:${nonce || randomUUID()}`,
    webhook: 'wasla-generate',
    payload: llmConfig((c?.parameters as CampaignParameters | undefined)?.llm_model_override),
  });
  revalidatePath(`/campaigns/${campaignId}`);
  return { ...res, count };
}

export async function regenerateMessage(messageId: string, instruction: string, nonce: string): Promise<StartResult> {
  const { t } = await getT();
  const { supabase, org } = await requireOrg();
  const { data: m } = await supabase.from('messages').select('id,campaign_id,review_status').eq('id', messageId).single();
  if (!m || m.review_status === 'sent') return { error: t.errors.generic };
  const { data: c } = await supabase.from('campaigns').select('parameters').eq('id', m.campaign_id).single();
  return startJob(supabase, {
    orgId: org.id,
    campaignId: m.campaign_id,
    type: 'generate',
    credits: defaults.regenerateCredits,
    idempotencyKey: `regen:${messageId}:${nonce || randomUUID()}`,
    webhook: 'wasla-generate',
    payload: { ...llmConfig((c?.parameters as CampaignParameters | undefined)?.llm_model_override), regenerate: { message_id: messageId, instruction: instruction.trim().slice(0, 200) || null } },
  });
}

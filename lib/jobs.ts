import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { triggerWorkflow } from '@/lib/n8n/trigger';
import { getT } from '@/lib/i18n/server';
import type { Job } from '@/lib/types';

export type StartResult = { jobId?: string; error?: string };

/**
 * Validate-already-done → reserve credits and create the job row (atomic RPC) → fire the n8n webhook → return.
 * If n8n cannot be reached the reservation is released immediately (service role, server only).
 * Error strings are returned in the current UI language.
 */
export async function startJob(
  supabase: SupabaseClient,
  args: { orgId: string; campaignId: string | null; type: Job['type']; credits: number; idempotencyKey: string; webhook: string; payload: Record<string, unknown> },
): Promise<StartResult> {
  const { t } = await getT();
  const { data, error } = await supabase.rpc('create_job', {
    p_org: args.orgId,
    p_campaign: args.campaignId,
    p_type: args.type,
    p_credits: args.credits,
    p_idempotency_key: args.idempotencyKey,
  });
  if (error || !data) {
    const m = error?.message ?? '';
    return { error: m.includes('insufficient_credits') ? t.errors.insufficient_credits : m.includes('org_suspended') ? t.errors.org_suspended : t.errors.generic };
  }
  const job = data as Job;
  // Idempotent replay (double click): the job already exists and was already triggered.
  if (job.status !== 'queued') return { jobId: job.id };
  try {
    await triggerWorkflow(args.webhook, { job_id: job.id, organization_id: args.orgId, campaign_id: args.campaignId, ...args.payload });
  } catch {
    await createAdminClient().rpc('settle_job', { p_job_id: job.id, p_credits_used: 0, p_status: 'failed', p_error: 'service_unavailable' });
    return { error: t.jobErrors.service_unavailable };
  }
  return { jobId: job.id };
}

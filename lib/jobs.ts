import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { triggerWorkflow } from '@/lib/n8n/trigger';
import { ar } from '@/lib/i18n/ar';
import type { Job } from '@/lib/types';

export type StartResult = { jobId?: string; error?: string };

function dbError(message: string): string {
  if (message.includes('insufficient_credits')) return ar.errors.insufficient_credits;
  if (message.includes('org_suspended')) return ar.errors.org_suspended;
  return ar.errors.generic;
}

/**
 * Validate-already-done → reserve credits and create the job row (atomic RPC) → fire the n8n webhook → return.
 * If n8n cannot be reached the reservation is released immediately (service role, server only).
 */
export async function startJob(
  supabase: SupabaseClient,
  args: { orgId: string; campaignId: string | null; type: Job['type']; credits: number; idempotencyKey: string; webhook: string; payload: Record<string, unknown> },
): Promise<StartResult> {
  const { data, error } = await supabase.rpc('create_job', {
    p_org: args.orgId,
    p_campaign: args.campaignId,
    p_type: args.type,
    p_credits: args.credits,
    p_idempotency_key: args.idempotencyKey,
  });
  if (error || !data) return { error: dbError(error?.message ?? '') };
  const job = data as Job;
  // Idempotent replay (double click): the job already exists and was already triggered.
  if (job.status !== 'queued') return { jobId: job.id };
  try {
    await triggerWorkflow(args.webhook, { job_id: job.id, organization_id: args.orgId, campaign_id: args.campaignId, ...args.payload });
  } catch {
    await createAdminClient().rpc('settle_job', { p_job_id: job.id, p_credits_used: 0, p_status: 'failed', p_error: ar.errors.n8n });
    return { error: ar.errors.n8n };
  }
  return { jobId: job.id };
}

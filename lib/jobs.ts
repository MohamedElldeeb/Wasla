import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { triggerWorkflow } from '@/lib/n8n/trigger';
import { getT } from '@/lib/i18n/server';
import { classifyDbError, logActionError, type DbErrorCode } from '@/lib/action-errors.mjs';
import type { Dict } from '@/lib/i18n';
import type { Job } from '@/lib/types';

export type StartResult = { jobId?: string; error?: string; code?: DbErrorCode | 'service_unavailable' | 'unexpected' };

/** Plain-language message for a classified error. Unknown codes are logged by the caller and shown with a reference id. */
export function messageForCode(code: DbErrorCode, t: Dict): string | null {
  switch (code) {
    case 'insufficient_credits': return t.errors.insufficient_credits;
    case 'org_suspended': return t.errors.org_suspended;
    case 'forbidden': return t.errors.forbidden;
    case 'session': return t.errors.session;
    case 'campaign_not_found': return t.errors.campaignNotFound;
    case 'invalid_credits': return t.errors.invalidCredits;
    case 'opted_out': return t.send.errors.opted_out;
    default: return null;
  }
}

/** Gives back reservations of starts that never completed (queued for minutes without running, or running for an hour). Safe to call any time. */
export async function releaseStaleJobs(orgId: string): Promise<void> {
  try {
    await createAdminClient().rpc('release_stale_jobs', { p_org: orgId });
  } catch {
    // never blocks a page: create_job runs the same release before it checks the balance
  }
}

/**
 * Validate-already-done → reserve credits and create the job row (atomic RPC) → fire the n8n webhook → return.
 * Whatever goes wrong after the reservation, the reservation is released at once (service role, server only); if even that
 * fails, `release_stale_jobs` gives it back within minutes. Errors are specific (numbers for credits) or carry a reference id
 * that is also written to the server log with the technical cause.
 */
export async function startJob(
  supabase: SupabaseClient,
  args: { orgId: string; campaignId: string | null; type: Job['type']; credits: number; idempotencyKey: string; webhook: string; payload: Record<string, unknown> },
): Promise<StartResult> {
  const { t } = await getT();
  let jobId: string | null = null;
  try {
    const { data, error } = await supabase.rpc('create_job', {
      p_org: args.orgId,
      p_campaign: args.campaignId,
      p_type: args.type,
      p_credits: args.credits,
      p_idempotency_key: args.idempotencyKey,
    });
    if (error || !data) {
      const code = classifyDbError(error?.message);
      if (code === 'insufficient_credits') {
        const { data: bal } = await supabase.rpc('org_credit_balance', { org: args.orgId });
        return { error: t.errors.insufficientDetail(args.credits, Number(bal ?? 0)), code };
      }
      const known = messageForCode(code, t);
      if (known) return { error: known, code };
      const ref = logActionError(`startJob:${args.type}`, error?.message ?? 'create_job returned no row', { org: args.orgId, campaign: args.campaignId, credits: args.credits });
      return { error: t.errors.unexpected(ref), code: 'unexpected' };
    }
    const job = data as Job;
    jobId = job.id;
    // Idempotent replay (double click): the job already exists and was already triggered.
    if (job.status !== 'queued') return { jobId: job.id };
    try {
      await triggerWorkflow(args.webhook, { job_id: job.id, organization_id: args.orgId, campaign_id: args.campaignId, ...args.payload });
    } catch (e) {
      logActionError(`triggerWorkflow:${args.webhook}`, e, { org: args.orgId, job: job.id });
      await createAdminClient().rpc('settle_job', { p_job_id: job.id, p_credits_used: 0, p_status: 'failed', p_error: 'service_unavailable' });
      return { error: t.jobErrors.service_unavailable, code: 'service_unavailable' };
    }
    return { jobId: job.id };
  } catch (e) {
    // Anything unexpected after the reservation: release it now (best effort; the reaper is the safety net).
    if (jobId) {
      try {
        await createAdminClient().rpc('settle_job', { p_job_id: jobId, p_credits_used: 0, p_status: 'failed', p_error: 'start_failed' });
      } catch {
        // release_stale_jobs will do it
      }
    }
    const ref = logActionError(`startJob:${args.type}`, e, { org: args.orgId, campaign: args.campaignId, job: jobId });
    return { error: t.errors.unexpected(ref), code: 'unexpected' };
  }
}

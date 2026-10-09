'use client';

import { useRouter } from 'next/navigation';
import { Progress } from '@/components/ui/progress';
import { Alert } from '@/components/ui/alert';
import { useJob } from '@/components/app/use-job';
import { ar } from '@/lib/i18n/ar';
import type { Job } from '@/lib/types';
import { num } from '@/lib/format';

const num0 = (v: unknown) => (typeof v === 'number' ? v : 0);

function stepLabel(job: Job) {
  if (job.type === 'generate') return ar.campaign.writing;
  if (job.type === 'plan') return ar.wizard.plannerRunning;
  if (job.progress < 40) return ar.campaign.pipeline.search;
  if (job.progress < 70) return ar.campaign.pipeline.clean;
  return ar.campaign.pipeline.signals;
}

/** Active-pipeline state: live progress from Realtime; refreshes the page data when the job finishes. */
export function JobProgress({ initial, compact = false }: { initial: Job; compact?: boolean }) {
  const router = useRouter();
  const job = useJob(initial, () => router.refresh());
  if (!job) return null;
  const active = job.status === 'queued' || job.status === 'running';
  const c = job.counts ?? {};
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-4" aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-sm">
        <strong>{ar.job.types[job.type] ?? job.type}</strong>
        <span className="text-muted-foreground">{ar.job.status[job.status]}</span>
      </div>
      {active && (
        <>
          <Progress value={Math.max(job.progress, 3)} aria-label={stepLabel(job)} />
          <p className="text-xs text-muted-foreground">{stepLabel(job)}…</p>
        </>
      )}
      {!compact && job.type === 'ingest' && (num0(c.found) > 0 || !active) && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
          <div><dt className="text-muted-foreground">{ar.campaign.found}</dt><dd className="font-semibold">{num(num0(c.found))}</dd></div>
          <div><dt className="text-muted-foreground">{ar.campaign.newLeads}</dt><dd className="font-semibold">{num(num0(c.new))}</dd></div>
          <div><dt className="text-muted-foreground">{ar.campaign.known}</dt><dd className="font-semibold">{num(num0(c.already_known))}</dd></div>
          <div><dt className="text-muted-foreground">{ar.campaign.filtered}</dt><dd className="font-semibold">{num(num0(c.filtered_out))}</dd></div>
        </dl>
      )}
      {job.status === 'failed' && (
        <Alert variant="destructive" role="alert">{job.error || ar.campaign.jobFailed}</Alert>
      )}
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { Progress } from '@/components/ui/progress';
import { Alert } from '@/components/ui/alert';
import { useJob } from '@/components/app/use-job';
import { useT } from '@/components/app/i18n-provider';
import type { Job } from '@/lib/types';
import { num } from '@/lib/format';

const num0 = (v: unknown) => (typeof v === 'number' ? v : 0);

/** Active-pipeline state: live progress from Realtime; refreshes the page data when the job finishes. */
export function JobProgress({ initial, compact = false }: { initial: Job; compact?: boolean }) {
  const t = useT();
  const router = useRouter();
  const job = useJob(initial, () => router.refresh());
  if (!job) return null;
  const active = job.status === 'queued' || job.status === 'running';
  const c = job.counts ?? {};
  const step =
    job.type === 'generate' ? t.campaign.writing
    : job.type === 'plan' ? t.wizard.plannerRunning
    : job.progress < 40 ? t.campaign.pipeline.search
    : job.progress < 70 ? t.campaign.pipeline.clean
    : t.campaign.pipeline.signals;
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-4" aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-sm">
        <strong>{t.job.types[job.type] ?? job.type}</strong>
        <span className="text-muted-foreground">{t.job.status[job.status]}</span>
      </div>
      {active && (
        <>
          <Progress value={Math.max(job.progress, 3)} aria-label={step} />
          <p className="text-xs text-muted-foreground">{step}</p>
        </>
      )}
      {!compact && job.type === 'ingest' && (num0(c.found) > 0 || !active) && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
          <div><dt className="text-xs text-muted-foreground">{t.campaign.found}</dt><dd className="font-semibold">{num(num0(c.found))}</dd></div>
          <div><dt className="text-xs text-muted-foreground">{t.campaign.newLeads}</dt><dd className="font-semibold">{num(num0(c.new))}</dd></div>
          <div><dt className="text-xs text-muted-foreground">{t.campaign.known}</dt><dd className="font-semibold">{num(num0(c.already_known))}</dd></div>
          <div><dt className="text-xs text-muted-foreground">{t.campaign.filtered}</dt><dd className="font-semibold">{num(num0(c.filtered_out))}</dd></div>
        </dl>
      )}
      {job.status === 'failed' && (
        <Alert variant="destructive" role="alert">{t.jobErrors[job.error ?? ''] ?? t.campaign.jobFailed}</Alert>
      )}
    </div>
  );
}

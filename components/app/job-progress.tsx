'use client';

import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert } from '@/components/ui/alert';
import { StatusBadge } from '@/components/app/status-badge';
import { useJob } from '@/components/app/use-job';
import { useT } from '@/components/app/i18n-provider';
import type { Job } from '@/lib/types';
import { num } from '@/lib/format';

const num0 = (v: unknown) => (typeof v === 'number' ? v : 0);

/** Active-pipeline state: one live progress card per job (title, bar, counts); refreshes the page data when the job finishes. */
export function JobProgress({ initial }: { initial: Job }) {
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
    <Card className="gap-3" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-h3 text-fg">{t.job.types[job.type] ?? job.type}</h2>
        <StatusBadge kind="job" status={job.status} />
      </div>
      {active && (
        <>
          <Progress value={Math.max(job.progress, 3)} aria-label={step} />
          <p className="text-body-sm text-fg-muted">{step}</p>
        </>
      )}
      {job.type === 'ingest' && (num0(c.found) > 0 || !active) && (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {([[t.campaign.found, c.found], [t.campaign.newLeads, c.new], [t.campaign.known, c.already_known], [t.campaign.filtered, c.filtered_out]] as const).map(([label, val]) => (
            <div key={label}>
              <dt className="text-caption text-fg-muted">{label}</dt>
              <dd className="num text-h3 text-fg">{num(num0(val))}</dd>
            </div>
          ))}
        </dl>
      )}
      {job.status === 'failed' && <Alert variant="danger" role="alert">{t.jobErrors[job.error ?? ''] ?? t.campaign.jobFailed}</Alert>}
    </Card>
  );
}

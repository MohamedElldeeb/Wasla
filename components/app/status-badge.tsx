'use client';

import { Badge } from '@/components/ui/badge';
import { useT } from '@/components/app/i18n-provider';

type Kind = 'campaign' | 'job' | 'message';

const VARIANT: Record<Kind, Record<string, 'neutral' | 'info' | 'success' | 'danger' | 'warning' | 'primary'>> = {
  campaign: { draft: 'neutral', running: 'info', ready: 'success', archived: 'neutral' },
  job: { queued: 'neutral', running: 'info', succeeded: 'success', failed: 'danger', cancelled: 'neutral' },
  message: { pending: 'warning', approved: 'success', sent: 'primary', rejected: 'neutral', failed: 'danger' },
};

/** Status badges follow DESIGN.md 5: running = info with a pulsing dot, ready/approved = success, failed = danger, pending = warning, sent = primary. */
export function StatusBadge({ kind, status }: { kind: Kind; status: string }) {
  const t = useT();
  const label =
    kind === 'campaign' ? t.campaigns.status[status]
    : kind === 'job' ? t.job.status[status]
    : status === 'sent' ? t.send.sentTag
    : t.review.filters[status];
  return (
    <Badge variant={VARIANT[kind][status] ?? 'neutral'}>
      {status === 'running' && <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden />}
      {label ?? status}
    </Badge>
  );
}

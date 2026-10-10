'use client';

import { Card, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { useT } from '@/components/app/i18n-provider';
import { num } from '@/lib/format';
import type { Funnel, Job } from '@/lib/types';

const ORDER: (keyof Funnel)[] = ['queries', 'raw_places', 'removed_category', 'removed_global', 'removed_closed', 'removed_landline', 'removed_filters', 'removed_not_fit', 'duplicates', 'previously_found', 'opted_out', 'cooldown', 'delivered'];

/**
 * The campaign funnel (spec 6.2): every removal reason with its count, so a user who gets fewer leads than requested understands why,
 * plus concrete ways to get more. Rows with 0 are hidden except the first and last.
 */
export function CampaignFunnel({ job, requested }: { job: Job; requested: number }) {
  const t = useT();
  const f = t.funnel;
  const c = job.counts ?? {};
  const funnel = c.funnel;
  if (!funnel) return null;
  const done = job.status === 'succeeded';
  const delivered = funnel.delivered ?? 0;
  const target = Number(c.lead_cap) || requested;
  const empty = delivered === 0 && done ? f.empty[String(c.empty_reason ?? 'all_filtered')] ?? f.empty.all_filtered : null;
  const short = done && delivered > 0 && delivered < target;
  const globalBy = funnel.removed_global_by ?? {};

  return (
    <Card className="gap-4" aria-label={f.title}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <CardTitle>{f.title}</CardTitle>
        <p className="num text-body-sm text-fg-muted">{f.requested}: {num(requested)} · {f.delivered}: <strong className="text-fg">{num(delivered)}</strong></p>
      </div>
      {done && delivered >= target && <p className="text-body-sm text-success">{f.reached}</p>}
      {empty && <Alert variant="warning" role="status"><strong className="block">{empty.title}</strong>{empty.body}</Alert>}
      <dl className="flex flex-col divide-y divide-border">
        {ORDER.filter((k, i) => k === 'queries' || k === 'raw_places' || k === 'delivered' || Number(funnel[k]) > 0 || i === 0).map((k) => (
          <div key={k} className="flex items-baseline justify-between gap-4 py-2">
            <dt className={k === 'delivered' ? 'text-body-sm font-medium text-fg' : 'text-body-sm text-fg-muted'}>
              {f.rows[k]}
              {k === 'removed_global' && Object.keys(globalBy).length > 0 && (
                <span className="block text-caption text-fg-subtle">{Object.entries(globalBy).map(([g, n]) => `${f.globalBy[g] ?? g} ${n}`).join(' · ')}</span>
              )}
            </dt>
            <dd className={k === 'delivered' ? 'num whitespace-nowrap text-h3 text-fg' : 'num whitespace-nowrap text-body text-fg'}>{k === 'queries' || k === 'raw_places' || k === 'delivered' ? num(Number(funnel[k]) || 0) : `− ${num(Number(funnel[k]) || 0)}`}</dd>
          </div>
        ))}
      </dl>
      {(c.not_fit_examples?.length ?? 0) > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="text-caption font-medium text-fg-muted">{f.notFitTitle}</h3>
          <ul className="text-body-sm text-fg-muted">
            {c.not_fit_examples!.slice(0, 5).map((x, i) => <li key={i} dir="auto">{x.name}: {x.reason}</li>)}
          </ul>
        </div>
      )}
      {(short || empty) && (
        <div className="flex flex-col gap-1">
          <h3 className="text-caption font-medium text-fg-muted">{f.howToGetMore}</h3>
          <ul className="list-disc ps-5 text-body-sm text-fg">
            {(Object.values(f.suggestions) as string[]).map((s) => <li key={s}>{s}</li>)}
          </ul>
        </div>
      )}
    </Card>
  );
}

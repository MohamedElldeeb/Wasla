'use client';

import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '@/components/app/i18n-provider';

/** 40px circle. Bands (DESIGN.md 5): 0-39 neutral, 40-69 primary-soft, 70-100 accent-soft with an orange ring. */
export function ScoreBadge({ score, className }: { score: number; className?: string }) {
  const t = useT();
  const band = score >= 70 ? 'high' : score >= 40 ? 'mid' : 'low';
  return (
    <span
      role="img"
      aria-label={`${t.campaign.score}: ${score}`}
      className={cn(
        'num flex size-10 shrink-0 items-center justify-center rounded-full text-body-sm font-semibold',
        band === 'low' && 'bg-surface-muted text-fg-muted',
        band === 'mid' && 'bg-primary-soft text-primary',
        band === 'high' && 'bg-accent-soft text-accent-on-soft ring-2 ring-accent',
        className
      )}
    >
      {score}
    </span>
  );
}

/** Reason chips: neutral soft background, leading icon, max 3 visible then "+N". */
export function ReasonChips({ reasons, max = 3, className }: { reasons: string[]; max?: number; className?: string }) {
  const t = useT();
  const shown = reasons.slice(0, max);
  const rest = reasons.length - shown.length;
  return (
    <ul className={cn('flex flex-wrap gap-1', className)}>
      {shown.map((r) => (
        <li key={r} dir="auto" className="inline-flex h-6 items-center gap-1 rounded-control bg-surface-muted px-2 text-caption text-fg-muted">
          <Sparkles className="size-3.5 shrink-0" aria-hidden />
          {r}
        </li>
      ))}
      {rest > 0 && <li className="inline-flex h-6 items-center rounded-control bg-surface-muted px-2 text-caption text-fg-muted">{t.shell.more(rest)}</li>}
    </ul>
  );
}

/** A score is always shown when it exists; reasons are added when there are favorable ones (a low score may have none). */
export function ScoreWithReasons({ score, reasons, max = 3 }: { score: number | null; reasons: string[]; max?: number }) {
  if (score == null) return null;
  return (
    <div className="flex items-start gap-3">
      <ScoreBadge score={score} />
      {reasons.length > 0 && <ReasonChips reasons={reasons} max={max} className="min-w-0 flex-1 pt-1" />}
    </div>
  );
}

'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

// DESIGN.md 5 Stepper: mobile = "Step 2 of 3" + progress bar + step title; desktop = horizontal numbered steps with titles.
export function Stepper({ steps, current, stepOf }: { steps: string[]; current: number; stepOf: (a: number, b: number) => string }) {
  return (
    <div>
      <div className="flex flex-col gap-2 md:hidden">
        <div className="flex items-baseline justify-between gap-3">
          <strong className="text-h3 text-fg">{steps[current]}</strong>
          <span className="num text-body-sm text-fg-muted">{stepOf(current + 1, steps.length)}</span>
        </div>
        <Progress value={((current + 1) / steps.length) * 100} aria-label={stepOf(current + 1, steps.length)} />
      </div>
      <ol className="hidden items-center gap-3 md:flex" aria-label={stepOf(current + 1, steps.length)}>
        {steps.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-3 last:flex-none" aria-current={i === current ? 'step' : undefined}>
            <span className={cn('num flex size-8 shrink-0 items-center justify-center rounded-full text-body-sm font-semibold', i < current ? 'bg-success text-primary-fg' : i === current ? 'bg-primary text-primary-fg' : 'bg-surface-muted text-fg-muted')}>
              {i < current ? <Check className="size-4" aria-hidden /> : i + 1}
            </span>
            <span className={cn('text-body-sm', i === current ? 'font-semibold text-fg' : 'text-fg-muted')}>{label}</span>
            {i < steps.length - 1 && <span className="h-px flex-1 bg-border-strong" aria-hidden />}
          </li>
        ))}
      </ol>
    </div>
  );
}

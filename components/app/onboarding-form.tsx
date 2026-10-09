'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/app/field';
import { Stepper } from '@/components/app/stepper';
import { StickyBar } from '@/components/app/sticky-bar';
import { useT } from '@/components/app/i18n-provider';
import { createOrganization } from '@/app/actions/org';

// DESIGN.md 6.2: three short steps with the stepper, large inputs, an example under each field, and a summary before finishing.
export function OnboardingForm() {
  const t = useT();
  const o = t.onboarding;
  const [state, run, pending] = useActionState(createOrganization, undefined);
  const [step, setStep] = useState(0);
  const [v, setV] = useState({ name: '', what_we_sell: '', ideal_customer: '', problems_we_solve: '', proof_points: '', regions: '' });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });

  function problem(s: number): string | null {
    if (s === 0 && v.name.trim().length < 2) return o.needName;
    if (s === 0 && !v.what_we_sell.trim()) return o.needSell;
    if (s === 1 && !v.ideal_customer.trim()) return o.needBuyer;
    return null;
  }
  const next = () => {
    const p = problem(step);
    setError(p);
    if (!p) setStep(step + 1);
  };
  const last = step === o.steps.length - 1;

  return (
    <form action={run} className="flex flex-col gap-6">
      <Stepper steps={o.steps} current={step} stepOf={o.stepOf} />
      <h2 className="text-h2 text-fg">{o.stepTitles[step]}</h2>

      {/* Every field stays mounted (hidden when not current) so the final submit carries all values. */}
      <div className={step === 0 ? 'flex flex-col gap-4' : 'hidden'}>
        <Field id="name" label={o.orgName} helper={o.nameExample}>
          <Input id="name" name="name" value={v.name} onChange={set('name')} maxLength={100} dir="auto" />
        </Field>
        <Field id="what_we_sell" label={o.whatWeSell} helper={`${o.exampleLabel} ${o.examplesSell}`}>
          <Textarea id="what_we_sell" name="what_we_sell" value={v.what_we_sell} onChange={set('what_we_sell')} dir="auto" />
        </Field>
      </div>

      <div className={step === 1 ? 'flex flex-col gap-4' : 'hidden'}>
        <Field id="ideal_customer" label={o.idealCustomer} helper={`${o.exampleLabel} ${o.examplesBuyer}`}>
          <Textarea id="ideal_customer" name="ideal_customer" value={v.ideal_customer} onChange={set('ideal_customer')} dir="auto" />
        </Field>
        <Field id="problems_we_solve" label={o.problems} optional={t.common.optional} helper={`${o.exampleLabel} ${o.examplesProblem}`}>
          <Textarea id="problems_we_solve" name="problems_we_solve" value={v.problems_we_solve} onChange={set('problems_we_solve')} dir="auto" className="min-h-24" />
        </Field>
        <Field id="proof_points" label={o.proof} optional={t.common.optional} helper={o.proofHint}>
          <Textarea id="proof_points" name="proof_points" value={v.proof_points} onChange={set('proof_points')} dir="auto" className="min-h-24" />
        </Field>
      </div>

      <div className={step === 2 ? 'flex flex-col gap-4' : 'hidden'}>
        <Field id="regions" label={o.regions} helper={`${o.regionsHint} ${o.regionsExample}`}>
          <Textarea id="regions" name="regions" value={v.regions} onChange={set('regions')} dir="auto" className="min-h-24" />
        </Field>
        <Card className="gap-3">
          <h3 className="text-h3 text-fg">{o.summaryTitle}</h3>
          <dl className="flex flex-col gap-2 text-body-sm">
            {([[o.orgName, v.name], [o.whatWeSell, v.what_we_sell], [o.idealCustomer, v.ideal_customer], [o.regions, v.regions]] as const).map(([k, val]) => (
              <div key={k}>
                <dt className="text-caption text-fg-muted">{k}</dt>
                <dd className="whitespace-pre-line text-fg" dir="auto">{val.trim() || '—'}</dd>
              </div>
            ))}
          </dl>
          <p className="text-caption text-fg-muted">{o.summaryHint}</p>
        </Card>
        <Alert variant="info">
          <strong className="block">{o.waTipTitle}</strong>
          {o.waTip}
        </Alert>
      </div>

      {(error || state?.error) && <Alert variant="danger" role="alert">{error ?? state?.error}</Alert>}

      <StickyBar standalone>
        <Button type="button" variant="secondary" size="lg" className="flex-1 lg:flex-none" onClick={() => { setError(null); setStep(step - 1); }} disabled={step === 0 || pending}>
          {t.common.back}
        </Button>
        {last ? (
          <Button type="submit" variant="primary" size="lg" className="flex-1 lg:flex-none" loading={pending}>{o.finish}</Button>
        ) : (
          <Button type="button" variant="primary" size="lg" className="flex-1 lg:flex-none" onClick={next}>{o.next}</Button>
        )}
      </StickyBar>
    </form>
  );
}

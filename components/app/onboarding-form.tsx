'use client';

import { useActionState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useT } from '@/components/app/i18n-provider';
import { createOrganization } from '@/app/actions/org';

export function OnboardingForm() {
  const t = useT();
  const [state, run, pending] = useActionState(createOrganization, undefined);
  const sellRef = useRef<HTMLTextAreaElement>(null);
  const buyerRef = useRef<HTMLTextAreaElement>(null);
  const o = t.onboarding;
  return (
    <form action={run} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">{o.orgName}</Label>
        <Input id="name" name="name" required minLength={2} maxLength={100} className="h-11" />
      </div>

      <div className="flex flex-col gap-2 rounded-lg bg-muted/60 p-3">
        <span className="text-xs font-semibold text-muted-foreground">{o.examplesTitle}</span>
        <div className="flex flex-wrap gap-2">
          {o.examples.map((e) => (
            <button
              key={e.label}
              type="button"
              className="rounded-full border bg-background px-3 py-1.5 text-xs hover:bg-accent"
              onClick={() => {
                if (sellRef.current) sellRef.current.value = e.sell;
                if (buyerRef.current) buyerRef.current.value = e.buyer;
              }}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="what_we_sell">{o.whatWeSell}</Label>
        <Textarea id="what_we_sell" name="what_we_sell" ref={sellRef} rows={3} placeholder={o.whatWeSellHint} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ideal_customer">{o.idealCustomer}</Label>
        <Textarea id="ideal_customer" name="ideal_customer" ref={buyerRef} rows={2} placeholder={o.idealCustomerHint} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="problems_we_solve">{o.problems}</Label>
        <Textarea id="problems_we_solve" name="problems_we_solve" rows={2} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="proof_points">
          {o.proof} <Badge variant="secondary">{t.common.optional}</Badge>
        </Label>
        <Textarea id="proof_points" name="proof_points" rows={2} placeholder={o.proofHint} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="regions">{o.regions}</Label>
        <Textarea id="regions" name="regions" rows={3} placeholder={'القاهرة، القاهرة، مدينة نصر\nالجيزة، الجيزة'} dir="auto" />
        <p className="text-xs text-muted-foreground">{o.regionsHint}</p>
      </div>

      <Alert>
        <strong className="block">{o.waTipTitle}</strong>
        {o.waTip}
      </Alert>
      {state?.error && <Alert variant="destructive" role="alert">{state.error}</Alert>}
      <Button type="submit" variant="cta" size="lg" disabled={pending}>
        {pending ? t.common.loading : o.submit}
      </Button>
    </form>
  );
}

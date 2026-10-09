'use client';

import { useActionState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ar } from '@/lib/i18n/ar';
import { createOrganization } from '@/app/actions/org';

// Examples only: they prefill the text boxes, nothing is assumed about the user's segment.
const EXAMPLES = [
  { label: 'وكالة تسويق', sell: 'إدارة سوشيال ميديا وإعلانات ممولة ومواقع إلكترونية', buyer: 'مطاعم وكافيهات وعيادات ومحلات محتاجة تزود عملاءها' },
  { label: 'مكتب محاسبة وضرايب', sell: 'محاسبة وضرايب وفاتورة إلكترونية للشركات الصغيرة', buyer: 'شركات صغيرة ومتوسطة ومحلات وعيادات' },
  { label: 'مورد تغليف', sell: 'علب وأكواب تغليف بشعار المكان', buyer: 'مطاعم وكافيهات ومخابز' },
  { label: 'سيستم إدارة', sell: 'برنامج حجوزات وفواتير', buyer: 'عيادات ومعامل وصالونات' },
];

export function OnboardingForm() {
  const [state, run, pending] = useActionState(createOrganization, undefined);
  const sellRef = useRef<HTMLTextAreaElement>(null);
  const buyerRef = useRef<HTMLTextAreaElement>(null);
  return (
    <form action={run} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">{ar.onboarding.orgName}</Label>
        <Input id="name" name="name" required minLength={2} maxLength={100} />
      </div>

      <div className="flex flex-col gap-2 rounded-lg bg-muted/60 p-3">
        <span className="text-xs font-semibold text-muted-foreground">{ar.onboarding.examplesTitle}</span>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((e) => (
            <button
              key={e.label}
              type="button"
              className="rounded-full border bg-background px-3 py-1 text-xs hover:bg-accent"
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
        <Label htmlFor="what_we_sell">{ar.onboarding.whatWeSell}</Label>
        <Textarea id="what_we_sell" name="what_we_sell" ref={sellRef} rows={3} placeholder={ar.onboarding.whatWeSellHint} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ideal_customer">{ar.onboarding.idealCustomer}</Label>
        <Textarea id="ideal_customer" name="ideal_customer" ref={buyerRef} rows={2} placeholder={ar.onboarding.idealCustomerHint} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="problems_we_solve">{ar.onboarding.problems}</Label>
        <Textarea id="problems_we_solve" name="problems_we_solve" rows={2} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="proof_points">
          {ar.onboarding.proof} <Badge variant="secondary">{ar.common.optional}</Badge>
        </Label>
        <Textarea id="proof_points" name="proof_points" rows={2} placeholder={ar.onboarding.proofHint} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="regions">{ar.onboarding.regions}</Label>
        <Textarea id="regions" name="regions" rows={3} placeholder={'القاهرة، القاهرة، مدينة نصر\nالجيزة، الجيزة'} />
        <p className="text-xs text-muted-foreground">{ar.onboarding.regionsHint}</p>
      </div>

      <Alert>
        <strong className="block">{ar.onboarding.waTipTitle}</strong>
        {ar.onboarding.waTip}
      </Alert>
      {state?.error && <Alert variant="destructive" role="alert">{state.error}</Alert>}
      <Button type="submit" variant="cta" size="lg" disabled={pending}>
        {pending ? ar.common.loading : ar.onboarding.submit}
      </Button>
    </form>
  );
}

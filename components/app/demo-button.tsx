'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { useT } from '@/components/app/i18n-provider';
import { startDemo } from '@/app/actions/demo';

export function DemoButton() {
  const t = useT();
  const [state, run, pending] = useActionState(startDemo, undefined);
  return (
    <form action={run} className="flex flex-col items-start gap-2">
      <Button type="submit" variant="cta" size="lg" disabled={pending} data-testid="try-demo">
        {pending ? t.landing.demoBusy : t.landing.tryDemo}
      </Button>
      <span className="text-xs text-muted-foreground">{t.landing.tryDemoHint}</span>
      {state?.error && <Alert variant="destructive" role="alert">{t.landing.demoFailed}</Alert>}
    </form>
  );
}

'use client';

import { Button } from '@/components/ui/button';
import { ar } from '@/lib/i18n/ar';

export default function ErrorState({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto mt-16 flex max-w-sm flex-col items-center gap-3 text-center">
      <h2 className="text-lg">{ar.common.errorTitle}</h2>
      <p className="text-sm text-muted-foreground">{ar.common.errorBody}</p>
      <Button onClick={reset}>{ar.common.retry}</Button>
    </div>
  );
}

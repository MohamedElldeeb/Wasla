'use client';

import { Button } from '@/components/ui/button';
import { useT } from '@/components/app/i18n-provider';

export default function ErrorState({ reset }: { error: Error; reset: () => void }) {
  const t = useT();
  return (
    <div role="alert" className="mx-auto mt-16 flex max-w-sm flex-col items-center gap-3 text-center">
      <h2 className="text-lg">{t.common.errorTitle}</h2>
      <p className="text-sm text-muted-foreground">{t.common.errorBody}</p>
      <Button onClick={reset}>{t.common.retry}</Button>
    </div>
  );
}

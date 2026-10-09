'use client';

import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/components/app/i18n-provider';

export default function ErrorState({ reset }: { error: Error; reset: () => void }) {
  const t = useT();
  return (
    <div role="alert" className="mx-auto flex w-full max-w-[360px] flex-col items-center gap-3 px-4 py-16 text-center">
      <TriangleAlert className="size-12 text-fg-subtle" aria-hidden />
      <h2 className="text-h3 text-fg">{t.common.errorTitle}</h2>
      <p className="text-body text-fg-muted">{t.common.errorBody}</p>
      <Button size="lg" onClick={reset}>{t.common.retry}</Button>
    </div>
  );
}

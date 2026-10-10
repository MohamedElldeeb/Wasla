'use client';

import { useSyncExternalStore } from 'react';
import { X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useT } from '@/components/app/i18n-provider';

const KEY = 'wasla_guide_dismissed';
const subscribe = (cb: () => void) => {
  window.addEventListener('storage', cb);
  window.addEventListener('wasla:guide', cb);
  return () => { window.removeEventListener('storage', cb); window.removeEventListener('wasla:guide', cb); };
};
const getDismissed = () => localStorage.getItem(KEY) === '1';

/** "How Wasla works": three numbered steps in one dismissible card. The page only renders it until the first campaign exists. */
export function DashboardGuide() {
  const t = useT();
  const dismissed = useSyncExternalStore(subscribe, getDismissed, () => true);
  if (dismissed) return null;
  const d = t.dashboard;
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-h2 text-fg">{d.guideTitle}</h2>
        <Button variant="ghost" size="icon" aria-label={d.guideDismiss} title={d.guideDismiss} onClick={() => { localStorage.setItem(KEY, '1'); window.dispatchEvent(new Event('wasla:guide')); }}>
          <X aria-hidden />
        </Button>
      </div>
      <ol className="grid gap-4 md:grid-cols-3">
        {d.guide.map((g, i) => (
          <li key={g.t} className="flex gap-3">
            <span className="num flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-body-sm font-semibold text-brand-fg">{i + 1}</span>
            <div>
              <strong className="block text-body text-fg">{g.t}</strong>
              <span className="text-body-sm text-fg-muted">{g.d}</span>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

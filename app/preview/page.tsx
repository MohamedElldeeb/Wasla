import { notFound } from 'next/navigation';
import { Check, RefreshCw, X } from 'lucide-react';
import { getT } from '@/lib/i18n/server';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScoreBadge } from '@/components/app/score-badge';
import { LeadBriefFull } from '@/components/app/lead-brief';
import { CampaignFunnel } from '@/components/app/campaign-funnel';
import { Badge } from '@/components/ui/badge';
import { PREVIEW_INSIGHT as INSIGHT_EN, PREVIEW_ITEM as ITEM_EN, PREVIEW_JOB, PREVIEW_MESSAGE, PREVIEW_AR } from '@/lib/preview-data';

// Dev/marketing only: renders the real Wasla components with sample data so the landing page can show real UI (DESIGN v2 section 7).
// Disabled unless PREVIEW_ROUTES=1 (never set in production; listed in docs/PRELAUNCH_CHECKLIST.md).
export default async function Preview({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  if (process.env.PREVIEW_ROUTES !== '1') notFound();
  const { show = 'review' } = await searchParams;
  const { t, locale } = await getT();
  const ar = locale !== 'en';
  const PREVIEW_ITEM = ar ? { ...ITEM_EN, leads: { ...ITEM_EN.leads, ...PREVIEW_AR.lead } } : ITEM_EN;
  const PREVIEW_INSIGHT = ar ? { ...INSIGHT_EN, analysis: { ...INSIGHT_EN.analysis!, praised: PREVIEW_AR.praised } } : INSIGHT_EN;
  const l = PREVIEW_ITEM.leads;
  const msg = PREVIEW_MESSAGE[locale === 'en' ? 'en' : 'ar'];

  if (show === 'funnel') {
    return (
      <main className="mx-auto w-full max-w-[560px] p-6" data-shot="funnel">
        <CampaignFunnel job={PREVIEW_JOB} requested={15} />
      </main>
    );
  }
  if (show === 'brief') {
    return (
      <main className="mx-auto w-full max-w-[560px] p-6" data-shot="brief">
        <LeadBriefFull item={PREVIEW_ITEM} insight={PREVIEW_INSIGHT} />
      </main>
    );
  }
  return (
    <main className="mx-auto w-full max-w-[760px] p-6" data-shot="review">
      <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 md:p-6">
        <header className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <ScoreBadge score={PREVIEW_ITEM.opportunity_score ?? 0} />
            <div className="min-w-0">
              <h2 className="truncate text-h2 text-fg" dir="auto">{l.business_name}</h2>
              <p className="text-body-sm text-fg-muted" dir="auto">{[l.category, l.district].filter(Boolean).join(' · ')}</p>
            </div>
          </div>
          <Badge variant="warning">{t.review.filters.pending}</Badge>
        </header>
        <LeadBriefFull item={PREVIEW_ITEM} insight={PREVIEW_INSIGHT} />
        <Textarea defaultValue={msg} rows={5} dir="auto" aria-label={t.review.regenerate} className="min-h-32" />
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost"><X aria-hidden />{t.review.reject}</Button>
          <Button variant="secondary"><RefreshCw aria-hidden />{t.review.regenerate}</Button>
          <Button><Check aria-hidden />{t.review.approve}</Button>
        </div>
      </div>
    </main>
  );
}

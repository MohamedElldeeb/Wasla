'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Ban, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useT, useLocale } from '@/components/app/i18n-provider';
import { markNotRelevant, selectOpportunity } from '@/app/actions/campaigns';
import { cn } from '@/lib/utils';
import type { Dict } from '@/lib/i18n';
import type { CampaignLead, LeadInsight, Opportunity } from '@/lib/types';

/** One line in the user's language for an opportunity, built only from real evidence numbers. */
export function whyText(t: Dict, o: Opportunity): string {
  const f = t.insights.opp[o.type];
  return f ? f(o.evidence) : o.type;
}

/** Evidence chips with real numbers (spec 6.3b step 4). Facts are for the USER; messages never quote weaknesses. */
export function evidenceChips(t: Dict, item: CampaignLead, insight?: LeadInsight): string[] {
  const c = t.insights.chips;
  const l = item.leads;
  const f = insight?.facts;
  const out: string[] = [];
  if (f && f.activity_label !== 'unknown') out.push(c.activity[f.activity_label]);
  if (l.rating != null) out.push(c.rating(l.rating, l.reviews_count ?? 0));
  if (f && f.n_reviews_fetched >= 5 && f.owner_reply_rate != null) out.push(c.replyRate(Math.round(f.owner_reply_rate * 100)));
  if (f && f.n_reviews_fetched >= 5 && f.rating_delta != null && Math.abs(f.rating_delta) >= 0.3) out.push(c.trend(f.rating_delta));
  out.push(l.website ? c.website : c.noWebsite);
  if (f?.unclaimed_listing) out.push(c.unclaimed);
  if (f && f.images_count != null && f.images_count <= 5) out.push(c.photos(f.images_count));
  if (f?.is_new_business) out.push(c.newBusiness);
  if (f && f.branches >= 2) out.push(c.branches(f.branches));
  return out;
}

export function EvidenceRow({ chips, max = 4 }: { chips: string[]; max?: number }) {
  const shown = chips.slice(0, max);
  return (
    <ul className="flex flex-wrap gap-1">
      {shown.map((x) => <li key={x} dir="auto" className="inline-flex h-6 items-center rounded-full border border-border bg-surface-muted px-2.5 text-caption text-fg-body">{x}</li>)}
    </ul>
  );
}

/** "Why now" line + evidence chips, compact enough for a lead card. */
export function LeadBriefCompact({ item, insight }: { item: CampaignLead; insight?: LeadInsight }) {
  const t = useT();
  const top = item.opportunities?.[0];
  return (
    <div className="flex flex-col gap-2">
      {top && (
        <p className="flex items-start gap-2 text-body-sm font-medium text-fg" dir="auto">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span><span className="sr-only">{t.insights.whyNow}: </span>{whyText(t, top)}</span>
        </p>
      )}
      <EvidenceRow chips={evidenceChips(t, item, insight)} max={3} />
      {item.fit === 'maybe' && <p className="text-caption text-fg-muted" title={t.insights.fitMaybeHint}><Badge variant="warning">{t.insights.fitMaybe}</Badge></p>}
    </div>
  );
}

/** Full brief at the top of the review screen: why now, evidence, what customers say, and the angle the message will use. */
export function LeadBriefFull({ item, insight }: { item: CampaignLead; insight?: LeadInsight }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  const i = t.insights;
  const opps = item.opportunities ?? [];
  const [selected, setSelected] = useState(item.selected_opportunity ?? opps[0]?.type ?? null);
  const a = insight?.analysis && !insight.analysis.skipped ? insight.analysis : null;
  const summary = a ? (locale === 'en' ? a.summary_en : a.summary_ar) : null;
  const chosen = opps.find((o) => o.type === selected) ?? opps[0];

  function choose(type: string) {
    setSelected(type);
    start(async () => {
      const res = await selectOpportunity(item.id, type);
      if (res.error) toast.error(res.error);
      else { toast.success(i.angleSwitched); router.refresh(); }
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 md:p-6" aria-label={i.whyNow} data-testid="lead-brief">
      <div className="flex flex-col gap-1">
        <h3 className="text-caption font-medium text-fg-muted">{i.whyNow}</h3>
        <p className="text-body font-medium text-fg" dir="auto">{opps[0] ? whyText(t, opps[0]) : i.noInsights}</p>
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-caption font-medium text-fg-muted">{i.evidence}</h3>
        <EvidenceRow chips={evidenceChips(t, item, insight)} max={8} />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="flex items-center gap-2 text-caption font-medium text-fg-muted">
          {i.customersSay}
          {a?.confidence && <Badge variant={a.confidence === 'low' ? 'warning' : 'neutral'}>{i.confidence[a.confidence]}</Badge>}
        </h3>
        {summary ? (
          <>
            <p className="text-body-sm text-fg" dir="auto">{summary}</p>
            {a?.praised && a.praised.length > 0 && <p className="text-caption text-fg-muted" dir="auto">{i.praised}: {a.praised.map((p) => p.theme).join('، ')}</p>}
            {a?.confidence === 'low' && <p className="text-caption text-fg-muted">{i.lowConfidenceNote}</p>}
          </>
        ) : (
          <p className="text-body-sm text-fg-muted">{insight?.analysis?.skipped ? i.noReviews : i.noInsights}</p>
        )}
      </div>
      {opps.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-caption font-medium text-fg-muted">{i.suggestedAngle}</h3>
          <p className="flex items-start gap-2 text-body-sm text-fg" dir="auto"><span aria-hidden className="mt-2 size-2 shrink-0 rounded-full bg-primary" />{chosen?.angle || whyText(t, chosen!)}</p>
          {opps.length > 1 && (
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={i.suggestedAngle}>
              {opps.map((o) => (
                <button key={o.type} type="button" role="radio" aria-checked={o.type === selected} disabled={pending} onClick={() => choose(o.type)}
                  className={cn('transition-ui min-h-12 rounded-control border px-3 text-start text-body-sm lg:min-h-10', o.type === selected ? 'border-primary bg-primary-soft text-primary-on-soft' : 'border-border-strong bg-surface text-fg-body hover:bg-surface-hover')}>
                  {whyText(t, o)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {item.fit === 'maybe' && <p className="text-caption text-fg-muted"><Badge variant="warning">{i.fitMaybe}</Badge> {item.fit_reason ? <span dir="auto">{item.fit_reason} · </span> : null}{i.fitMaybeHint}</p>}
    </section>
  );
}

/** "Not relevant": removes the lead, refunds its credits once, and teaches future planning for this organization. */
export function NotRelevantButton({ campaignLeadId, name, variant = 'ghost', iconOnly = false }: { campaignLeadId: string; name: string | null; variant?: 'ghost' | 'secondary'; iconOnly?: boolean }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [pending, start] = useTransition();
  const i = t.insights;

  function confirm() {
    start(async () => {
      const res = await markNotRelevant(campaignLeadId, reason);
      if (res.error) { toast.error(res.error); return; }
      toast.success(i.removed(res.refunded ?? 0));
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" variant={variant} size={iconOnly ? 'icon' : 'md'} onClick={() => setOpen(true)} aria-label={`${i.notRelevant}: ${name ?? ''}`}>
        <Ban aria-hidden />{!iconOnly && i.notRelevant}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{i.notRelevantTitle}</DialogTitle>
            <DialogDescription>{i.notRelevantHint}</DialogDescription>
          </DialogHeader>
          <p className="text-body-sm font-medium text-fg" dir="auto">{name}</p>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={i.reasonPlaceholder} maxLength={300} dir="auto" aria-label={i.reasonPlaceholder} />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={confirm} loading={pending}>{i.confirmRemove}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


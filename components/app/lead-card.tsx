'use client';

import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScoreWithReasons } from '@/components/app/score-badge';
import { useT } from '@/components/app/i18n-provider';
import { reasonTexts } from '@/lib/reasons';
import { num } from '@/lib/format';
import { LeadBriefCompact, NotRelevantButton } from '@/components/app/lead-brief';
import type { CampaignLead, LeadInsight } from '@/lib/types';

/** Mobile list item for a lead (tables are desktop only): name, category + district, score + top reasons, phone type, rating. */
export function LeadCard({ item, insight, reasonMax = 2, canRemove = false }: { item: CampaignLead; insight?: LeadInsight; reasonMax?: number; canRemove?: boolean }) {
  const t = useT();
  const l = item.leads;
  const reasons = reasonTexts(item, t);
  return (
    <article className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4" data-testid="lead-card">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-h3 text-fg" dir="auto">{l.business_name}</h3>
          <p className="truncate text-body-sm text-fg-muted" dir="auto">{[l.category, l.district || l.city].filter(Boolean).join(' · ')}</p>
        </div>
        <Badge variant={l.whatsapp_eligible ? 'primary' : 'neutral'}>{l.phone_type === 'mobile' ? t.campaign.mobile : l.phone_type === 'landline' ? t.campaign.landline : t.campaign.unknownPhone}</Badge>
      </header>
      <ScoreWithReasons score={item.opportunity_score} reasons={reasons} max={reasonMax} />
      {(item.opportunities?.length || insight) ? <LeadBriefCompact item={item} insight={insight} /> : null}
      <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-fg-muted">
        {l.rating != null && (
          <span className="num inline-flex items-center gap-1">
            <Star className="size-4 text-fg-subtle" aria-hidden />
            <span dir="ltr">{l.rating}</span>
            <span>({num(l.reviews_count)})</span>
          </span>
        )}
        <span>{l.website ? t.campaign.website : t.campaign.noWebsite}</span>
        {l.phone_e164 && <span className="ltr-iso num">{l.phone_e164}</span>}
        {canRemove && <span className="ms-auto"><NotRelevantButton campaignLeadId={item.id} name={l.business_name} /></span>}
      </footer>
    </article>
  );
}

'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Phone, SlidersHorizontal, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/app/empty-state';
import { LeadCard } from '@/components/app/lead-card';
import { ReasonChips, ScoreBadge } from '@/components/app/score-badge';
import { useT } from '@/components/app/i18n-provider';
import { countWritable, generateMessages } from '@/app/actions/campaigns';
import { reasonTexts } from '@/lib/reasons';
import { newNonce } from '@/lib/nonce';
import { num } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Campaign, CampaignLead } from '@/lib/types';

export type LeadFilters = { score: 'all' | 'high' | 'mid' | 'low'; phone: 'all' | 'mobile' | 'landline'; site: 'all' | 'has' | 'none' };
export const NO_FILTERS: LeadFilters = { score: 'all', phone: 'all', site: 'all' };

export function applyFilters(list: CampaignLead[], f: LeadFilters) {
  return list.filter((cl) => {
    const s = cl.opportunity_score ?? -1;
    if (f.score === 'high' && s < 70) return false;
    if (f.score === 'mid' && (s < 40 || s >= 70)) return false;
    if (f.score === 'low' && (s >= 40 || s < 0)) return false;
    if (f.phone !== 'all' && cl.leads.phone_type !== f.phone) return false;
    if (f.site === 'has' && !cl.leads.website) return false;
    if (f.site === 'none' && cl.leads.website) return false;
    return true;
  });
}

function Choice<T extends string>({ value, options, onChange, label }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o.v} type="button" role="radio" aria-checked={value === o.v} onClick={() => onChange(o.v)}
          className={cn('transition-ui min-h-12 rounded-control border px-4 text-body-sm font-medium lg:min-h-10', value === o.v ? 'border-primary bg-primary-soft text-primary' : 'border-border-strong bg-surface text-fg hover:bg-surface-muted')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Score band, phone type and website filters (DESIGN.md 5: one filter bar; a bottom sheet on mobile). */
export function FilterGroups({ value, onChange }: { value: LeadFilters; onChange: (f: LeadFilters) => void }) {
  const t = useT();
  const p = t.leadsPage;
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:gap-6">
      <div className="flex flex-col gap-2"><span className="text-body-sm font-medium text-fg">{p.score}</span>
        <Choice label={p.score} value={value.score} onChange={(score) => onChange({ ...value, score })} options={[{ v: 'all', label: p.all }, { v: 'high', label: p.high }, { v: 'mid', label: p.mid }, { v: 'low', label: p.low }]} /></div>
      <div className="flex flex-col gap-2"><span className="text-body-sm font-medium text-fg">{p.phoneType}</span>
        <Choice label={p.phoneType} value={value.phone} onChange={(phone) => onChange({ ...value, phone })} options={[{ v: 'all', label: p.all }, { v: 'mobile', label: t.campaign.mobile }, { v: 'landline', label: t.campaign.landline }]} /></div>
      <div className="flex flex-col gap-2"><span className="text-body-sm font-medium text-fg">{p.website}</span>
        <Choice label={p.website} value={value.site} onChange={(site) => onChange({ ...value, site })} options={[{ v: 'all', label: p.all }, { v: 'has', label: p.hasWebsite }, { v: 'none', label: p.noWebsite }]} /></div>
    </div>
  );
}

export function FilterBar({ value, onChange, count }: { value: LeadFilters; onChange: (f: LeadFilters) => void; count: number }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const activeCount = [value.score, value.phone, value.site].filter((x) => x !== 'all').length;
  return (
    <>
      <div className="hidden lg:block"><FilterGroups value={value} onChange={onChange} /></div>
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
          <SlidersHorizontal aria-hidden />{t.leadsPage.filter}{activeCount > 0 && <Badge variant="primary">{activeCount}</Badge>}
        </Button>
        <span className="num text-body-sm text-fg-muted">{num(count)} {t.campaign.leadsCount}</span>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.leadsPage.filter}</DialogTitle></DialogHeader>
          <FilterGroups value={value} onChange={onChange} />
          <DialogFooter>
            <Button variant="secondary" onClick={() => onChange(NO_FILTERS)}>{t.leadsPage.reset}</Button>
            <Button onClick={() => setOpen(false)}>{t.leadsPage.apply}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Desktop table: sticky header, 56px rows, max 6 columns, numbers aligned to the end. */
export function LeadsDesktopTable({ items }: { items: CampaignLead[] }) {
  const t = useT();
  const c = t.campaign;
  return (
    <div className="hidden overflow-x-auto rounded-card border border-border bg-surface lg:block">
      <Table>
        <TableHeader>
          <TableRow className="h-12">
            <TableHead className="w-16">{c.score}</TableHead>
            <TableHead>{c.business}</TableHead>
            <TableHead>{c.reasons}</TableHead>
            <TableHead>{c.phone}</TableHead>
            <TableHead className="text-end">{c.rating}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((cl) => {
            const l = cl.leads;
            const reasons = reasonTexts(cl, t);
            return (
              <TableRow key={cl.id}>
                <TableCell>{cl.opportunity_score != null && reasons.length > 0 ? <ScoreBadge score={cl.opportunity_score} /> : <span className="text-fg-subtle">—</span>}</TableCell>
                <TableCell className="max-w-64">
                  <div className="truncate font-medium text-fg" dir="auto">{l.business_name}</div>
                  <div className="truncate text-caption text-fg-muted" dir="auto">{[l.category, l.district || l.city].filter(Boolean).join(' · ')} · {l.website ? c.website : c.noWebsite}</div>
                </TableCell>
                <TableCell className="max-w-72"><ReasonChips reasons={reasons} max={3} /></TableCell>
                <TableCell>
                  {l.phone_e164 ? (
                    <span className="inline-flex items-center gap-2">
                      <Phone className="size-4 text-fg-subtle" aria-hidden />
                      <span className="ltr-iso num">{l.phone_e164}</span>
                      <Badge variant={l.whatsapp_eligible ? 'primary' : 'neutral'}>{l.phone_type === 'mobile' ? c.mobile : c.landline}</Badge>
                    </span>
                  ) : <span className="text-fg-subtle">{c.unknownPhone}</span>}
                </TableCell>
                <TableCell className="text-end">
                  {l.rating != null && (
                    <span className="num inline-flex items-center gap-1">
                      <Star className="size-4 text-fg-subtle" aria-hidden />
                      <span dir="ltr">{l.rating}</span>
                      <span className="text-fg-muted">({num(l.reviews_count)})</span>
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function LeadsTable({ campaign, leads, hasMessages, busy, onGenerated }: {
  campaign: Campaign; leads: CampaignLead[]; hasMessages: boolean; busy: boolean; onGenerated: () => void;
}) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [filters, setFilters] = useState<LeadFilters>(NO_FILTERS);
  const [pending, start] = useTransition();
  const nonce = useRef(newNonce());
  const c = t.campaign;
  const shown = useMemo(() => applyFilters(leads, filters), [leads, filters]);

  async function openConfirm() {
    setCount(null);
    setOpen(true);
    const res = await countWritable(campaign.id);
    setCount(res.count);
  }

  function confirm() {
    start(async () => {
      const res = await generateMessages(campaign.id, nonce.current);
      setOpen(false);
      if (res.error) { toast.error(res.error); return; }
      nonce.current = newNonce();
      toast.success(c.writing);
      router.refresh();
      onGenerated();
    });
  }

  if (leads.length === 0) {
    return busy
      ? <p className="py-12 text-center text-body text-fg-muted">{t.common.loading}</p>
      : <EmptyState title={c.leadsEmptyTitle} body={c.leadsEmptyBody} href="/campaigns/new" cta={t.campaigns.new} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="num hidden text-body-sm text-fg-muted lg:inline">{num(shown.length)} {c.leadsCount}</span>
        <Button size="lg" onClick={openConfirm} disabled={busy} className="sm:ms-auto">{hasMessages ? c.writeMore : c.writeMessages}</Button>
      </div>

      <FilterBar value={filters} onChange={setFilters} count={shown.length} />

      {shown.length === 0 ? (
        <EmptyState title={t.leadsPage.noResults} body={t.leadsPage.noResultsBody}>
          <Button variant="secondary" onClick={() => setFilters(NO_FILTERS)}>{t.leadsPage.reset}</Button>
        </EmptyState>
      ) : (
        <>
          <ul className="flex flex-col gap-3 lg:hidden">
            {shown.map((cl) => <li key={cl.id}><LeadCard item={cl} /></li>)}
          </ul>
          <LeadsDesktopTable items={shown} />
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{c.writeConfirmTitle}</DialogTitle>
            <DialogDescription>
              {count == null ? t.common.loading : count === 0 ? c.writeNoneEligible : c.writeConfirmBody(count)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={confirm} loading={pending} disabled={!count}>{c.writeMessages}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

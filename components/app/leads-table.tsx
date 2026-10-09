'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Phone, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/app/empty-state';
import { useT } from '@/components/app/i18n-provider';
import { countWritable, generateMessages } from '@/app/actions/campaigns';
import { newNonce } from '@/lib/nonce';
import { num } from '@/lib/format';
import type { Dict } from '@/lib/i18n';
import type { Campaign, CampaignLead } from '@/lib/types';

function ScoreBadge({ score, label }: { score: number | null; label: string }) {
  if (score == null) return <span className="text-muted-foreground">—</span>;
  const tone = score >= 70 ? 'bg-success' : score >= 40 ? 'bg-warning' : 'bg-muted-foreground';
  return (
    <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums" aria-label={`${label} ${score}`}>
      <span className={`size-2.5 rounded-full ${tone}`} aria-hidden />
      {score}
    </span>
  );
}

/** Reasons are stored as keys so they render in the user's language; the free-text label (review complaint) stays as written. */
function reasonTexts(cl: CampaignLead, t: Dict): string[] {
  const keys = cl.score_reason_keys ?? [];
  if (!keys.length) return cl.score_reasons ?? [];
  return keys.map((r) => r.label ?? t.signals[r.k]?.[r.s] ?? r.k);
}

export function LeadsTable({ campaign, leads, hasMessages, busy, onGenerated }: {
  campaign: Campaign; leads: CampaignLead[]; hasMessages: boolean; busy: boolean; onGenerated: () => void;
}) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const nonce = useRef(newNonce());
  const c = t.campaign;

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
      ? <p className="py-10 text-center text-sm text-muted-foreground">{t.common.loading}</p>
      : <EmptyState title={c.leadsEmptyTitle} body={c.leadsEmptyBody} href="/campaigns/new" cta={t.campaigns.new} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{num(leads.length)} {c.leadsCount}</p>
        <Button variant="cta" size="lg" onClick={openConfirm} disabled={busy}>{hasMessages ? c.writeMore : c.writeMessages}</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">{c.score}</TableHead>
              <TableHead>{c.business}</TableHead>
              <TableHead>{c.phone}</TableHead>
              <TableHead>{c.rating}</TableHead>
              <TableHead>{c.reasons}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((cl) => {
              const l = cl.leads;
              return (
                <TableRow key={cl.id}>
                  <TableCell><ScoreBadge score={cl.opportunity_score} label={c.score} /></TableCell>
                  <TableCell className="max-w-60">
                    <div className="truncate font-medium" dir="auto">{l.business_name}</div>
                    <div className="truncate text-xs text-muted-foreground" dir="auto">
                      {[l.category, l.district || l.city].filter(Boolean).join(' · ')} · {l.website ? c.website : c.noWebsite}
                    </div>
                  </TableCell>
                  <TableCell>
                    {l.phone_e164 ? (
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <Phone className="size-3.5" aria-hidden />
                        <bdi dir="ltr">{l.phone_e164}</bdi>
                        <Badge variant={l.whatsapp_eligible ? 'secondary' : 'outline'}>{l.phone_type === 'mobile' ? c.mobile : c.landline}</Badge>
                      </span>
                    ) : <span className="text-xs text-muted-foreground">{c.unknownPhone}</span>}
                  </TableCell>
                  <TableCell>
                    {l.rating != null && (
                      <span className="inline-flex items-center gap-1 text-sm">
                        <Star className="size-3.5 fill-warning text-warning" aria-hidden />
                        <span dir="ltr">{l.rating}</span>
                        <span className="text-xs text-muted-foreground">({num(l.reviews_count)})</span>
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {reasonTexts(cl, t).map((r) => <Badge key={r} variant="secondary" className="font-normal" dir="auto">{r}</Badge>)}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{c.writeConfirmTitle}</DialogTitle>
            <DialogDescription>
              {count == null ? t.common.loading : count === 0 ? c.writeNoneEligible : c.writeConfirmBody(count)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t.common.cancel}</Button>
            <Button variant="cta" onClick={confirm} disabled={pending || !count}>{pending ? t.common.loading : c.writeMessages}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Phone, Globe, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/app/empty-state';
import { countWritable, generateMessages } from '@/app/actions/campaigns';
import { ar } from '@/lib/i18n/ar';
import { num } from '@/lib/format';
import { newNonce } from '@/lib/nonce';
import type { Campaign, CampaignLead } from '@/lib/types';

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-muted-foreground">—</span>;
  const tone = score >= 70 ? 'bg-success' : score >= 40 ? 'bg-warning' : 'bg-muted-foreground';
  return (
    <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums" aria-label={`${ar.campaign.score} ${score}`}>
      <span className={`size-2.5 rounded-full ${tone}`} aria-hidden />
      {score}
    </span>
  );
}

function PhoneCell({ lead }: { lead: CampaignLead['leads'] }) {
  if (!lead.phone_e164) return <span className="text-xs text-muted-foreground">{ar.campaign.unknownPhone}</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <Phone className="size-3.5" aria-hidden />
      <bdi dir="ltr">{lead.phone_e164}</bdi>
      <Badge variant={lead.whatsapp_eligible ? 'secondary' : 'outline'}>{lead.phone_type === 'mobile' ? ar.campaign.mobile : ar.campaign.landline}</Badge>
    </span>
  );
}

export function LeadsTable({ campaign, leads, hasMessages, busy, onGenerated }: {
  campaign: Campaign; leads: CampaignLead[]; hasMessages: boolean; busy: boolean; onGenerated: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const nonce = useRef(newNonce());

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
      toast.success(ar.campaign.writing);
      router.refresh();
      onGenerated();
    });
  }

  if (leads.length === 0) {
    return busy
      ? <p className="py-10 text-center text-sm text-muted-foreground">{ar.common.loading}</p>
      : <EmptyState title={ar.campaign.leadsEmptyTitle} body={ar.campaign.leadsEmptyBody} href="/campaigns/new" cta={ar.campaigns.new} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{num(leads.length)} {ar.campaigns.leads}</p>
        <Button variant="cta" onClick={openConfirm} disabled={busy}>{hasMessages ? ar.campaign.writeMore : ar.campaign.writeMessages}</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">{ar.campaign.score}</TableHead>
              <TableHead>{ar.campaign.business}</TableHead>
              <TableHead>{ar.campaign.district}</TableHead>
              <TableHead>{ar.campaign.phone}</TableHead>
              <TableHead>{ar.campaign.rating}</TableHead>
              <TableHead>{ar.campaign.reasons}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((cl) => {
              const l = cl.leads;
              return (
                <TableRow key={cl.id}>
                  <TableCell><ScoreBadge score={cl.opportunity_score} /></TableCell>
                  <TableCell className="max-w-56">
                    <div className="truncate font-medium">{l.business_name}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="truncate">{l.category}</span>
                      <Globe className="size-3" aria-label={l.website ? ar.campaign.website : ar.campaign.noWebsite} />
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{l.district || l.city}</TableCell>
                  <TableCell><PhoneCell lead={l} /></TableCell>
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
                      {(cl.score_reasons ?? []).map((r) => <Badge key={r} variant="secondary" className="font-normal">{r}</Badge>)}
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
            <DialogTitle>{ar.campaign.writeConfirmTitle}</DialogTitle>
            <DialogDescription>
              {count == null ? ar.common.loading : count === 0 ? ar.campaign.writeNoneEligible : ar.campaign.writeConfirmBody(count)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{ar.common.cancel}</Button>
            <Button variant="cta" onClick={confirm} disabled={pending || !count}>{pending ? ar.common.loading : ar.campaign.writeMessages}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

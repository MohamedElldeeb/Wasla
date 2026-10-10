'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, ChevronLeft, ChevronRight, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/app/empty-state';
import { ScoreWithReasons } from '@/components/app/score-badge';
import { StatusBadge } from '@/components/app/status-badge';
import { StickyBar } from '@/components/app/sticky-bar';
import { useJob } from '@/components/app/use-job';
import { useT } from '@/components/app/i18n-provider';
import { createClient } from '@/lib/supabase/client';
import { regenerateMessage } from '@/app/actions/campaigns';
import { reasonTexts } from '@/lib/reasons';
import { newNonce } from '@/lib/nonce';
import { cn } from '@/lib/utils';
import { LeadBriefFull, NotRelevantButton } from '@/components/app/lead-brief';
import type { CampaignLead, Job, LeadInsight, Message } from '@/lib/types';

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
type Filter = 'pending' | 'approved' | 'rejected' | 'failed';

/** Maps the stored failure code to one of the plain-language reasons (never shows technical codes to the user). */
function failKey(code: string | null | undefined): 'short_long' | 'service' | 'similar' | 'tact' | 'rule' | 'other' {
  const c = code ?? '';
  if (/word_count/.test(c)) return 'short_long';
  if (/bad_json|^http_|empty/.test(c)) return 'service';
  if (/duplicate_opening|too_similar/.test(c)) return 'similar';
  if (/^tact:/.test(c)) return 'tact';
  if (/^style:|contains_link/.test(c)) return 'rule';
  return 'other';
}

function RegenWatcher({ jobId, onDone }: { jobId: string; onDone: () => void }) {
  const t = useT();
  const initial = useMemo(() => ({ id: jobId, status: 'queued' }) as Job, [jobId]);
  useJob(initial, (j) => {
    if (j.status === 'failed') toast.error(t.jobErrors[j.error ?? ''] ?? t.errors.generic);
    onDone();
  });
  return <p className="text-body-sm text-fg-muted" aria-live="polite">{t.review.regenerating}</p>;
}

// DESIGN.md 6.5 Review: mobile = one lead per screen with a counter and a sticky Reject / Regenerate / Approve bar;
// desktop = two panes (list + the selected lead) with keyboard shortcuts A approve, R regenerate, X reject, J/K move.
export function ReviewQueue({ messages, leads, onGoLeads, insights = {} }: { messages: Message[]; leads: CampaignLead[]; onGoLeads: () => void; insights?: Record<string, LeadInsight> }) {
  const t = useT();
  const r = t.review;
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('pending');
  const [idx, setIdx] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [regenOpen, setRegenOpen] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [regenJob, setRegenJob] = useState<{ id: string; messageId: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, start] = useTransition();
  const nonce = useRef(newNonce());

  const counts = useMemo(() => ({
    pending: messages.filter((m) => m.review_status === 'pending').length,
    approved: messages.filter((m) => m.review_status === 'approved' || m.review_status === 'sent').length,
    rejected: messages.filter((m) => m.review_status === 'rejected').length,
    failed: messages.filter((m) => m.review_status === 'failed').length,
  }), [messages]);
  const list = useMemo(() => messages.filter((m) => (filter === 'approved' ? m.review_status === 'approved' || m.review_status === 'sent' : m.review_status === filter)), [messages, filter]);
  const leadById = useMemo(() => new Map(leads.map((l) => [l.leads.id, l])), [leads]);

  const at = Math.min(idx, Math.max(list.length - 1, 0));
  const m = list[at];
  const original = m ? (m.edited_text ?? m.generated_text) : '';
  const text = m ? (drafts[m.id] ?? original) : '';
  const dirty = !!m && text.trim() !== original.trim();

  const go = useCallback((d: number) => setIdx((i) => Math.max(0, Math.min(list.length - 1, Math.min(i, list.length - 1) + d))), [list.length]);

  async function setStatus(status: 'approved' | 'rejected' | 'pending') {
    if (!m) return;
    setBusy(true);
    const edited = text.trim() !== m.generated_text.trim() ? text.trim() : null;
    const { error } = await createClient().from('messages').update({ review_status: status, ...(status === 'approved' ? { edited_text: edited } : {}) }).eq('id', m.id);
    setBusy(false);
    if (error) { toast.error(error.message.includes('opted_out') ? t.send.errors.opted_out : t.errors.generic); return; }
    setDrafts((d) => { const n = { ...d }; delete n[m.id]; return n; });
    toast.success(status === 'approved' ? r.approved : status === 'rejected' ? r.rejected : r.savedEdit);
    router.refresh();
  }

  function regenerate() {
    if (!m) return;
    start(async () => {
      const res = await regenerateMessage(m.id, instruction, nonce.current);
      if (!res.jobId) { toast.error(res.error ?? t.errors.generic); return; }
      nonce.current = newNonce();
      setRegenJob({ id: res.jobId, messageId: m.id });
      setRegenOpen(false);
      setInstruction('');
    });
  }

  // Keyboard shortcuts (ignored while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey || !m) return;
      const k = e.key.toLowerCase();
      if (k === 'j') go(1);
      else if (k === 'k') go(-1);
      else if (k === 'a' && m.review_status !== 'approved' && m.review_status !== 'sent' && m.review_status !== 'failed' && !busy) void setStatus('approved');
      else if (k === 'x' && m.review_status !== 'rejected' && m.review_status !== 'sent' && m.review_status !== 'failed' && !busy) void setStatus('rejected');
      else if (k === 'r' && m.review_status !== 'sent') setRegenOpen((o) => !o);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (messages.length === 0) {
    return (
      <EmptyState title={r.emptyTitle} body={r.emptyBody}>
        <Button variant="secondary" onClick={onGoLeads}>{t.campaign.tabs.leads}</Button>
      </EmptyState>
    );
  }

  const cl = m ? leadById.get(m.lead_id) : undefined;
  const status = m?.review_status;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="tablist">
          {(['pending', 'approved', 'rejected', 'failed'] as const).filter((f) => f !== 'failed' || counts.failed > 0 || filter === 'failed').map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              onClick={() => { setFilter(f); setIdx(0); setRegenOpen(false); }}
              className={cn('transition-ui min-h-12 rounded-control border px-4 text-body-sm font-medium lg:min-h-10', filter === f ? 'border-brand bg-brand-soft text-brand' : f === 'failed' ? 'border-danger bg-surface text-danger hover:bg-danger-soft' : 'border-border-strong bg-surface text-fg hover:bg-surface-hover')}
            >
              {r.filters[f]} <span className="num">({counts[f]})</span>
            </button>
          ))}
        </div>
        <p className="hidden text-caption text-fg-muted lg:block">{r.shortcuts}</p>
      </div>

      {list.length === 0 || !m ? (
        <EmptyState title={filter === 'pending' ? r.allDone : r.nothingHere} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="hidden max-h-[70vh] flex-col gap-2 overflow-y-auto lg:flex" aria-label={r.pendingList}>
            {list.map((x, i) => {
              const xl = leadById.get(x.lead_id);
              return (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => { setIdx(i); setRegenOpen(false); }}
                  aria-current={i === at ? 'true' : undefined}
                  className={cn('transition-ui flex min-h-14 items-center justify-between gap-3 rounded-card border p-3 text-start', i === at ? 'border-brand bg-brand-soft' : 'border-border bg-surface hover:bg-surface-hover')}
                >
                  <span className="min-w-0">
                    <strong className="block truncate text-body-sm text-fg" dir="auto">{x.leads.business_name}</strong>
                    <span className="block truncate text-caption text-fg-muted" dir="auto">{x.leads.district || x.leads.city}</span>
                  </span>
                  {xl?.opportunity_score != null && <Badge variant={xl.opportunity_score >= 70 ? 'accent' : xl.opportunity_score >= 40 ? 'primary' : 'neutral'}><span className="num">{xl.opportunity_score}</span></Badge>}
                </button>
              );
            })}
          </aside>

          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex items-center justify-between gap-3 lg:hidden">
              <Button variant="ghost" size="icon" aria-label={r.prev} onClick={() => go(-1)} disabled={at === 0}><ChevronRight className="ltr:rotate-180" aria-hidden /></Button>
              <span className="num ltr-iso text-h3 text-fg" aria-live="polite">{r.counter(at + 1, list.length)}</span>
              <Button variant="ghost" size="icon" aria-label={r.next} onClick={() => go(1)} disabled={at >= list.length - 1}><ChevronLeft className="ltr:rotate-180" aria-hidden /></Button>
            </div>

            {cl && <LeadBriefFull key={cl.id + (cl.selected_opportunity ?? '')} item={cl} insight={insights[cl.leads.id]} />}

            <Card className="gap-4" data-testid="message-card">
              <header className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-h2 text-fg" dir="auto">{m.leads.business_name}</h2>
                  <p className="truncate text-body-sm text-fg-muted" dir="auto">{[m.leads.category, m.leads.district || m.leads.city].filter(Boolean).join(' · ')}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {cl && m.review_status !== 'sent' && <NotRelevantButton campaignLeadId={cl.id} name={m.leads.business_name} iconOnly />}
                  <StatusBadge kind="message" status={m.review_status} />
                </div>
              </header>
              {cl && <ScoreWithReasons score={cl.opportunity_score} reasons={reasonTexts(cl, t)} />}
              {m.angle && <p className="text-caption text-fg-muted" dir="auto">{r.angle}: {m.angle}</p>}
              {status === 'failed' ? (
                <Alert variant="danger" role="status" data-testid="message-failed">
                  <strong className="block">{r.failedTitle}</strong>
                  {r.failedBody}
                  <span className="mt-1 block text-caption">{r.failedReason}: {r.failReasons[failKey(m.fail_reason)]}</span>
                </Alert>
              ) : (
              <div className="relative">
                <Textarea
                  value={text}
                  onChange={(e) => setDrafts({ ...drafts, [m.id]: e.target.value })}
                  dir="rtl"
                  aria-label={m.leads.business_name ?? ''}
                  className="min-h-44 pb-8 leading-8"
                  disabled={m.review_status === 'sent'}
                />
                <span className="num pointer-events-none absolute bottom-2 end-3 text-caption text-fg-muted">{wordCount(text)} {r.words} · {r.charCount(text.length)}</span>
              </div>
              )}
              {regenJob?.messageId === m.id && (
                <RegenWatcher jobId={regenJob.id} onDone={() => { setRegenJob(null); setDrafts((d) => { const n = { ...d }; delete n[m.id]; return n; }); router.refresh(); }} />
              )}
              {regenOpen && (
                <div className="flex flex-col gap-3 rounded-card bg-surface-muted p-4">
                  <div className="flex flex-wrap gap-2">
                    {r.chips.map((c) => (
                      <button key={c} type="button" onClick={() => setInstruction(c)} className="transition-ui min-h-12 rounded-control border border-border-strong bg-surface px-3 text-body-sm hover:bg-surface-hover lg:min-h-10">{c}</button>
                    ))}
                  </div>
                  <Input value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder={r.instruction} maxLength={200} dir="auto" aria-label={r.instruction} />
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-caption text-fg-muted">{r.regenCost}</span>
                    <Button variant="secondary" onClick={regenerate} loading={pending}>{r.regenerate}</Button>
                  </div>
                </div>
              )}
            </Card>

            <StickyBar className="[&>div]:justify-end">
              {status === 'failed' && <Button size="lg" className="flex-1 sm:flex-none" onClick={regenerate} loading={pending} disabled={!!regenJob} data-testid="retry-message"><RefreshCw className="max-sm:hidden" aria-hidden />{r.failedRetry}</Button>}
              {status !== 'rejected' && status !== 'sent' && status !== 'failed' && <Button variant="ghost" size="lg" className="px-3" onClick={() => setStatus('rejected')} disabled={busy}><X className="max-sm:hidden" aria-hidden />{r.reject}</Button>}
              {status === 'rejected' && <Button variant="secondary" size="lg" onClick={() => setStatus('pending')} disabled={busy}>{r.restore}</Button>}
              {status !== 'sent' && status !== 'failed' && <Button variant="secondary" size="lg" className="px-3" onClick={() => setRegenOpen((o) => !o)} disabled={!!regenJob}><RefreshCw className="max-sm:hidden" aria-hidden />{r.regenerate}</Button>}
              {(status === 'pending' || status === 'rejected') && <Button size="lg" className="flex-1 sm:flex-none" onClick={() => setStatus('approved')} loading={busy} disabled={!!regenJob} data-testid="approve"><Check className="max-sm:hidden" aria-hidden />{r.approve}</Button>}
              {status === 'approved' && <Button size="lg" className="flex-1 sm:flex-none" onClick={() => setStatus('approved')} loading={busy} disabled={!dirty}>{r.edit}</Button>}
            </StickyBar>
          </div>
        </div>
      )}
    </div>
  );
}

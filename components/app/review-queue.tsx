'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/app/empty-state';
import { useJob } from '@/components/app/use-job';
import { useT } from '@/components/app/i18n-provider';
import { createClient } from '@/lib/supabase/client';
import { regenerateMessage } from '@/app/actions/campaigns';
import { newNonce } from '@/lib/nonce';
import type { Job, Message } from '@/lib/types';

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
type Filter = 'pending' | 'approved' | 'rejected';

function RegenWatcher({ jobId, onDone }: { jobId: string; onDone: () => void }) {
  const t = useT();
  const initial = useMemo(() => ({ id: jobId, status: 'queued' }) as Job, [jobId]);
  useJob(initial, (j) => {
    if (j.status === 'failed') toast.error(t.jobErrors[j.error ?? ''] ?? t.errors.generic);
    onDone();
  });
  return <p className="text-xs text-muted-foreground" aria-live="polite">{t.review.regenerating}</p>;
}

function MessageCard({ m, onSeen, onChanged }: { m: Message; onSeen: (id: string) => void; onChanged: () => void }) {
  const t = useT();
  const r = t.review;
  const ref = useRef<HTMLElement>(null);
  const [text, setText] = useState(m.edited_text ?? m.generated_text);
  const [busy, setBusy] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [regenJob, setRegenJob] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const nonce = useRef(newNonce());
  const l = m.leads;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { onSeen(m.id); io.disconnect(); } }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [m.id, onSeen]);

  async function setStatus(status: 'approved' | 'rejected' | 'pending') {
    setBusy(true);
    const supabase = createClient();
    const edited = text.trim() !== m.generated_text.trim() ? text.trim() : null;
    const { error } = await supabase.from('messages').update({ review_status: status, ...(status === 'approved' ? { edited_text: edited } : {}) }).eq('id', m.id);
    setBusy(false);
    if (error) { toast.error(error.message.includes('opted_out') ? t.send.errors.opted_out : t.errors.generic); return; }
    toast.success(status === 'approved' ? r.approved : status === 'rejected' ? r.rejected : r.savedEdit);
    onChanged();
  }

  function regenerate() {
    start(async () => {
      const res = await regenerateMessage(m.id, instruction, nonce.current);
      if (!res.jobId) { toast.error(res.error ?? t.errors.generic); return; }
      nonce.current = newNonce();
      setRegenJob(res.jobId);
      setRegenOpen(false);
    });
  }

  const dirty = text.trim() !== (m.edited_text ?? m.generated_text).trim();
  return (
    <article ref={ref} className="flex flex-col gap-3 rounded-xl border bg-card p-5" data-testid="message-card">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base" dir="auto">{l.business_name}</h3>
          <p className="text-xs text-muted-foreground" dir="auto">{[l.category, l.district || l.city].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="outline">{l.phone_type === 'mobile' ? t.campaign.mobile : t.campaign.landline}</Badge>
          {l.rating != null && <span dir="ltr">★ {l.rating}</span>}
        </div>
      </header>
      {/* Outreach messages are written in Egyptian Arabic for the lead, so the box is always RTL. */}
      <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} dir="rtl" aria-label={l.business_name ?? ''} className="leading-8" disabled={m.review_status === 'sent'} />
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{wordCount(text)} {r.words}</span>
        {m.angle && <span dir="auto">{r.angle}: {m.angle}</span>}
      </div>
      {regenJob && <RegenWatcher jobId={regenJob} onDone={() => { setRegenJob(null); onChanged(); }} />}
      {regenOpen && (
        <div className="flex flex-col gap-2 rounded-lg bg-muted/60 p-3">
          <div className="flex flex-wrap gap-2">
            {r.chips.map((c) => (
              <button key={c} type="button" onClick={() => setInstruction(c)} className="rounded-full border bg-background px-3 py-1.5 text-xs hover:bg-primary-soft">{c}</button>
            ))}
          </div>
          <Input value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder={r.instruction} maxLength={200} dir="auto" />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">{r.regenCost}</span>
            <Button size="sm" onClick={regenerate} disabled={pending}>{r.regenerate}</Button>
          </div>
        </div>
      )}
      <footer className="flex flex-wrap gap-2">
        {m.review_status !== 'approved' && (
          <Button variant="cta" onClick={() => setStatus('approved')} disabled={busy || !!regenJob} data-testid="approve">
            <Check aria-hidden />{r.approve}
          </Button>
        )}
        {m.review_status === 'approved' && dirty && (
          <Button onClick={() => setStatus('approved')} disabled={busy}>{r.edit}</Button>
        )}
        {m.review_status !== 'rejected' && (
          <Button variant="outline" onClick={() => setStatus('rejected')} disabled={busy}><X aria-hidden />{r.reject}</Button>
        )}
        {m.review_status === 'rejected' && <Button variant="outline" onClick={() => setStatus('pending')} disabled={busy}>{r.restore}</Button>}
        {m.review_status !== 'sent' && <Button variant="ghost" onClick={() => setRegenOpen((o) => !o)} disabled={!!regenJob}><RefreshCw aria-hidden />{r.regenerate}</Button>}
      </footer>
    </article>
  );
}

export function ReviewQueue({ messages, onGoLeads }: { messages: Message[]; onGoLeads: () => void }) {
  const t = useT();
  const r = t.review;
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('pending');
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const counts = useMemo(() => ({
    pending: messages.filter((m) => m.review_status === 'pending').length,
    approved: messages.filter((m) => m.review_status === 'approved' || m.review_status === 'sent').length,
    rejected: messages.filter((m) => m.review_status === 'rejected').length,
  }), [messages]);
  const shown = messages.filter((m) => (filter === 'approved' ? m.review_status === 'approved' || m.review_status === 'sent' : m.review_status === filter));
  const markSeen = useMemo(() => (id: string) => setSeen((s) => (s.has(id) ? s : new Set(s).add(id))), []);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3">
        <EmptyState title={r.emptyTitle} body={r.emptyBody} />
        <Button variant="outline" onClick={onGoLeads}>{t.campaign.tabs.leads}</Button>
      </div>
    );
  }

  const pendingMsgs = messages.filter((m) => m.review_status === 'pending');
  const reviewed = pendingMsgs.filter((m) => seen.has(m.id)).length;
  const canBulk = pendingMsgs.length > 1 && reviewed === pendingMsgs.length;

  async function bulkApprove() {
    setBusy(true);
    const { error } = await createClient().from('messages').update({ review_status: 'approved' }).in('id', pendingMsgs.map((m) => m.id));
    setBusy(false);
    if (error) { toast.error(t.errors.generic); return; }
    toast.success(r.approved);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="tablist">
          {(['pending', 'approved', 'rejected'] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)} role="tab" aria-selected={filter === f}>
              {r.filters[f]} ({counts[f]})
            </Button>
          ))}
        </div>
        {filter === 'pending' && pendingMsgs.length > 1 && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-muted-foreground">{canBulk ? '' : r.bulkHint} {r.reviewed(reviewed, pendingMsgs.length)}</span>
            <Button size="sm" variant="cta" disabled={!canBulk || busy} onClick={bulkApprove}>{r.bulk}</Button>
          </div>
        )}
      </div>
      {shown.length === 0 ? (
        <EmptyState title={filter === 'pending' ? r.allDone : r.nothingHere} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {shown.map((m) => <MessageCard key={`${m.id}:${m.edited_text ?? m.generated_text}`} m={m} onSeen={markSeen} onChanged={() => router.refresh()} />)}
        </div>
      )}
    </div>
  );
}

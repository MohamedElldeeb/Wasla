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
import { createClient } from '@/lib/supabase/client';
import { regenerateMessage } from '@/app/actions/campaigns';
import { ar } from '@/lib/i18n/ar';
import { newNonce } from '@/lib/nonce';
import type { Job, Message } from '@/lib/types';

const wordCount = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
type Filter = 'pending' | 'approved' | 'rejected';

function RegenWatcher({ jobId, onDone }: { jobId: string; onDone: () => void }) {
  const initial = useMemo(() => ({ id: jobId, status: 'queued' }) as Job, [jobId]);
  useJob(initial, (j) => { if (j.status === 'failed') toast.error(j.error || ar.errors.generic); onDone(); });
  return <p className="text-xs text-muted-foreground" aria-live="polite">{ar.review.regenerating}</p>;
}

function MessageCard({ m, onSeen, onChanged }: { m: Message; onSeen: (id: string) => void; onChanged: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const initial = m.edited_text ?? m.generated_text;
  const [text, setText] = useState(initial);
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
    if (error) return toast.error(error.message.includes('opted_out') ? ar.send.errors.opted_out : ar.errors.generic);
    toast.success(status === 'approved' ? ar.review.approved : status === 'rejected' ? ar.review.rejected : ar.review.savedEdit);
    onChanged();
  }

  function regenerate() {
    start(async () => {
      const res = await regenerateMessage(m.id, instruction, nonce.current);
      if (!res.jobId) { toast.error(res.error ?? ar.errors.generic); return; }
      nonce.current = newNonce();
      setRegenJob(res.jobId);
      setRegenOpen(false);
    });
  }

  const words = wordCount(text);
  return (
    <article ref={ref} className="flex flex-col gap-3 rounded-xl border bg-card p-4" data-testid="message-card">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base">{l.business_name}</h3>
          <p className="text-xs text-muted-foreground">{[l.category, l.district || l.city].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="outline">{l.phone_type === 'mobile' ? ar.campaign.mobile : ar.campaign.landline}</Badge>
          {l.rating != null && <span dir="ltr">★ {l.rating}</span>}
        </div>
      </header>
      <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} aria-label={l.business_name ?? ''} className="leading-7" disabled={m.review_status === 'sent'} />
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{words} {ar.review.words}</span>
        {m.angle && <span>{ar.review.angle}: {m.angle}</span>}
      </div>
      {regenJob && <RegenWatcher jobId={regenJob} onDone={() => { setRegenJob(null); onChanged(); }} />}
      {regenOpen && (
        <div className="flex flex-col gap-2 rounded-lg bg-muted/60 p-3">
          <div className="flex flex-wrap gap-2">
            {ar.review.chips.map((c) => (
              <button key={c} type="button" onClick={() => setInstruction(c)} className="rounded-full border bg-background px-3 py-1 text-xs hover:bg-accent">{c}</button>
            ))}
          </div>
          <Input value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder={ar.review.instruction} maxLength={200} />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">{ar.review.regenCost}</span>
            <Button size="sm" onClick={regenerate} disabled={pending}>{ar.review.regenerate}</Button>
          </div>
        </div>
      )}
      <footer className="flex flex-wrap gap-2">
        {m.review_status !== 'approved' && (
          <Button variant="cta" onClick={() => setStatus('approved')} disabled={busy || !!regenJob} data-testid="approve">
            <Check aria-hidden />{ar.review.approve}
          </Button>
        )}
        {m.review_status === 'approved' && text.trim() !== (m.edited_text ?? m.generated_text).trim() && (
          <Button variant="default" onClick={() => setStatus('approved')} disabled={busy}>{ar.review.edit}</Button>
        )}
        {m.review_status !== 'rejected' && (
          <Button variant="outline" onClick={() => setStatus('rejected')} disabled={busy}><X aria-hidden />{ar.review.reject}</Button>
        )}
        {m.review_status === 'rejected' && <Button variant="outline" onClick={() => setStatus('pending')} disabled={busy}>{ar.review.restore}</Button>}
        {m.review_status !== 'sent' && <Button variant="ghost" onClick={() => setRegenOpen((o) => !o)} disabled={!!regenJob}><RefreshCw aria-hidden />{ar.review.regenerate}</Button>}
      </footer>
    </article>
  );
}

export function ReviewQueue({ messages, onGoLeads }: { messages: Message[]; onGoLeads: () => void }) {
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
        <EmptyState title={ar.review.emptyTitle} body={ar.review.emptyBody} />
        <Button variant="outline" onClick={onGoLeads}>{ar.campaign.tabs.leads}</Button>
      </div>
    );
  }

  const pendingMsgs = messages.filter((m) => m.review_status === 'pending');
  const reviewed = pendingMsgs.filter((m) => seen.has(m.id)).length;
  const canBulk = pendingMsgs.length > 1 && reviewed === pendingMsgs.length;

  async function bulkApprove() {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from('messages').update({ review_status: 'approved' }).in('id', pendingMsgs.map((m) => m.id));
    setBusy(false);
    if (error) return toast.error(ar.errors.generic);
    toast.success(ar.review.approved);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2" role="tablist">
          {(['pending', 'approved', 'rejected'] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)} role="tab" aria-selected={filter === f}>
              {ar.review.filters[f]} ({counts[f]})
            </Button>
          ))}
        </div>
        {filter === 'pending' && pendingMsgs.length > 1 && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{canBulk ? '' : ar.review.bulkHint} {ar.review.reviewed(reviewed, pendingMsgs.length)}</span>
            <Button size="sm" variant="cta" disabled={!canBulk || busy} onClick={bulkApprove}>{ar.review.bulk}</Button>
          </div>
        )}
      </div>
      {shown.length === 0 ? (
        <EmptyState title={filter === 'pending' ? ar.review.allDone : ar.review.nothingHere} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {shown.map((m) => <MessageCard key={`${m.id}:${m.edited_text ?? m.generated_text}`} m={m} onSeen={markSeen} onChanged={() => router.refresh()} />)}
        </div>
      )}
    </div>
  );
}

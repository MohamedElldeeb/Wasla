'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CheckCheck, ChevronDown, Copy, PhoneCall } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/app/empty-state';
import { WhatsAppIcon } from '@/components/icons';
import { useT } from '@/components/app/i18n-provider';
import { createClient } from '@/lib/supabase/client';
import { whatsappLink, telLink } from '@/lib/phone/egypt.mjs';
import { defaults } from '@/lib/config/defaults';
import { cn } from '@/lib/utils';
import type { Message } from '@/lib/types';

/** Toast with a live countdown and an Undo action (DESIGN.md 5 Feedback). Reduced motion: it is only text. */
function UndoToast({ id, label, undoLabel, seconds, onUndo }: { id: string | number; label: string; undoLabel: (n: number) => string; seconds: number; onUndo: () => void }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    const i = setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(i);
  }, []);
  return (
    <div className="flex w-full items-center justify-between gap-4 rounded-card border border-border-strong bg-surface p-4 text-body-sm text-fg shadow-float" role="status">
      <span className="flex items-center gap-2"><CheckCheck className="size-5 text-success" aria-hidden />{label}</span>
      <Button variant="secondary" disabled={left === 0} onClick={() => { onUndo(); toast.dismiss(id); }}>{undoLabel(left)}</Button>
    </div>
  );
}

export function SendList({ messages, sentToday, dailyCap }: { messages: Message[]; sentToday: number; dailyCap: number }) {
  const t = useT();
  const s = t.send;
  const router = useRouter();
  const [used, setUsed] = useState(sentToday);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toSend = messages.filter((m) => m.review_status === 'approved');
  const sent = messages.filter((m) => m.review_status === 'sent');

  const ratio = dailyCap ? used / dailyCap : 0;
  const capReached = used >= dailyCap;
  const tone = capReached ? 'danger' : ratio >= defaults.capWarnRatio ? 'warning' : 'primary';
  const errText = (msg: string) => {
    const key = Object.keys(s.errors).find((k) => msg.includes(k));
    return key ? s.errors[key] : t.errors.generic;
  };

  async function markSent(m: Message, win: Window | null, url: string | null) {
    setBusyId(m.id);
    const { error } = await createClient().rpc('mark_message_sent', { p_message_id: m.id });
    setBusyId(null);
    if (error) {
      win?.close();
      toast.error(errText(error.message));
      return;
    }
    if (win && url) win.location.href = url;
    if (m.channel === 'whatsapp') setUsed((u) => u + 1);
    router.refresh();
    toast.custom(
      (id) => (
        <UndoToast
          id={id}
          label={s.sentToast}
          undoLabel={s.undoIn}
          seconds={defaults.undoSeconds}
          onUndo={async () => {
            const { error: e } = await createClient().rpc('undo_message_sent', { p_message_id: m.id });
            if (e) { toast.error(errText(e.message)); return; }
            if (m.channel === 'whatsapp') setUsed((u) => Math.max(0, u - 1));
            toast.success(s.undone);
            router.refresh();
          }}
        />
      ),
      { duration: defaults.undoSeconds * 1000 }
    );
  }

  function openWhatsapp(m: Message) {
    const url = whatsappLink(m.leads.phone_e164, m.edited_text ?? m.generated_text);
    if (!url) return;
    // Open the tab synchronously (keeps the user gesture for popup blockers), then mark as sent and navigate it.
    const win = window.open('about:blank', '_blank');
    void markSent(m, win, url);
  }

  async function copy(m: Message) {
    try {
      await navigator.clipboard.writeText(m.edited_text ?? m.generated_text);
      toast.success(s.copied);
    } catch {
      toast.error(t.errors.generic);
    }
  }

  if (toSend.length === 0 && sent.length === 0) return <EmptyState title={s.emptyTitle} body={s.emptyBody} />;

  return (
    <div className="flex flex-col gap-4">
      <Card className="gap-3" data-testid="send-counter">
        <strong className="num text-h3 text-fg">{s.todayCounter(used, dailyCap)}</strong>
        <Progress value={Math.min(100, Math.round(ratio * 100))} tone={tone} aria-label={s.todayCounter(used, dailyCap)} />
        {capReached ? <Alert variant="danger" role="alert">{s.capReached}</Alert> : ratio >= defaults.capWarnRatio ? <Alert variant="warning" role="status">{s.nearCap}</Alert> : null}
      </Card>

      <ul className="grid gap-3 lg:grid-cols-2 lg:gap-4">
        {toSend.map((m) => {
          const l = m.leads;
          const wa = m.channel === 'whatsapp' && l.whatsapp_eligible && l.phone_e164;
          const expanded = !!open[m.id];
          const body = m.edited_text ?? m.generated_text;
          return (
            <li key={m.id}>
              <Card className="h-full gap-3" data-testid="send-card">
                <header className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-h3 text-fg" dir="auto">{l.business_name}</h3>
                    <p className="truncate text-body-sm text-fg-muted" dir="auto">{[l.category, l.district || l.city].filter(Boolean).join(' · ')}</p>
                  </div>
                  <Badge variant={wa ? 'primary' : 'neutral'}>{l.phone_type === 'mobile' ? t.campaign.mobile : t.campaign.landline}</Badge>
                </header>
                <p dir="rtl" className={cn('whitespace-pre-wrap rounded-control bg-surface-muted p-3 text-body-sm', !expanded && 'line-clamp-3')}>{body}</p>
                <button type="button" onClick={() => setOpen({ ...open, [m.id]: !expanded })} aria-expanded={expanded} className="flex min-h-12 items-center gap-1 self-start text-body-sm font-medium text-primary lg:min-h-10">
                  <ChevronDown className={cn('size-4 transition-transform duration-200', expanded && 'rotate-180')} aria-hidden />
                  {expanded ? s.collapse : s.expand}
                </button>
                <footer className="flex flex-col gap-2 sm:flex-row">
                  {wa ? (
                    <Button variant="accent" size="lg" className="w-full sm:flex-1" onClick={() => openWhatsapp(m)} disabled={capReached} loading={busyId === m.id} data-testid="wa-send">
                      <WhatsAppIcon className="size-5" />{s.whatsapp}
                    </Button>
                  ) : l.phone_e164 ? (
                    <a href={telLink(l.phone_e164) ?? undefined} className={cn(buttonVariants({ size: 'lg' }), 'w-full sm:flex-1')}>
                      <PhoneCall aria-hidden />{s.call}
                    </a>
                  ) : null}
                  <Button variant="secondary" size="lg" className="w-full sm:w-auto" onClick={() => copy(m)}><Copy aria-hidden />{s.copy}</Button>
                </footer>
                {wa && (
                  <button type="button" onClick={() => markSent(m, null, null)} disabled={capReached || busyId === m.id} className="min-h-12 self-start text-body-sm font-medium text-primary disabled:opacity-50 lg:min-h-10">{s.sentToggle}</button>
                )}
                {!wa && <p className="text-caption text-fg-muted">{s.notEligible}</p>}
              </Card>
            </li>
          );
        })}
      </ul>

      {sent.length > 0 && (
        <section className="flex flex-col gap-2" aria-label={s.sentRow}>
          <h3 className="text-h3 text-fg">{s.sentRow} <span className="num text-fg-muted">({sent.length})</span></h3>
          <ul className="flex flex-col gap-2">
            {sent.map((m) => (
              <li key={m.id} className="flex min-h-12 items-center justify-between gap-3 rounded-card border border-border bg-surface px-4 py-2">
                <span className="min-w-0 truncate text-body-sm text-fg" dir="auto">{m.leads.business_name}</span>
                <Badge variant="primary"><CheckCheck aria-hidden />{s.sentTag}</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

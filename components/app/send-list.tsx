'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Copy, MessageCircle, PhoneCall, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/app/empty-state';
import { useT } from '@/components/app/i18n-provider';
import { createClient } from '@/lib/supabase/client';
import { whatsappLink, telLink } from '@/lib/phone/egypt.mjs';
import { defaults } from '@/lib/config/defaults';
import type { Message } from '@/lib/types';

export function SendList({ messages, sentToday, dailyCap }: { messages: Message[]; sentToday: number; dailyCap: number }) {
  const t = useT();
  const s = t.send;
  const router = useRouter();
  const [used, setUsed] = useState(sentToday);
  const [busyId, setBusyId] = useState<string | null>(null);
  const list = messages.filter((m) => m.review_status === 'approved' || m.review_status === 'sent');

  const ratio = dailyCap ? used / dailyCap : 0;
  const capReached = used >= dailyCap;
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
    toast(s.sentToast, {
      duration: defaults.undoSeconds * 1000,
      action: {
        label: s.undo,
        onClick: async () => {
          const { error: e } = await createClient().rpc('undo_message_sent', { p_message_id: m.id });
          if (e) { toast.error(errText(e.message)); return; }
          if (m.channel === 'whatsapp') setUsed((u) => Math.max(0, u - 1));
          toast.success(s.undone);
          router.refresh();
        },
      },
    });
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

  if (list.length === 0) return <EmptyState title={s.emptyTitle} body={s.emptyBody} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-xl border bg-card p-4" data-testid="send-counter">
        <strong className="text-sm">{s.todayCounter(used, dailyCap)}</strong>
        <Progress value={Math.min(100, Math.round(ratio * 100))} aria-label={s.todayCounter(used, dailyCap)} />
        {capReached ? <Alert variant="destructive" role="alert">{s.capReached}</Alert> : ratio >= defaults.capWarnRatio ? <Alert role="status">{s.nearCap}</Alert> : null}
      </div>

      <ul className="grid gap-4 lg:grid-cols-2">
        {list.map((m) => {
          const l = m.leads;
          const sent = m.review_status === 'sent';
          const wa = m.channel === 'whatsapp' && l.whatsapp_eligible && l.phone_e164;
          return (
            <li key={m.id} className="flex flex-col gap-3 rounded-xl border bg-card p-5" data-testid="send-card">
              <header className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base" dir="auto">{l.business_name}</h3>
                  <p className="text-xs text-muted-foreground" dir="auto">{[l.category, l.district || l.city].filter(Boolean).join(' · ')}</p>
                </div>
                {sent && <Badge variant="secondary" className="gap-1"><CheckCheck className="size-3.5" aria-hidden />{s.sentTag}</Badge>}
              </header>
              <p dir="rtl" className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm leading-7">{m.edited_text ?? m.generated_text}</p>
              <footer className="flex flex-wrap gap-2">
                {wa && (
                  <Button variant="cta" onClick={() => openWhatsapp(m)} disabled={sent || capReached || busyId === m.id} data-testid="wa-send">
                    <MessageCircle aria-hidden />{s.whatsapp}
                  </Button>
                )}
                {!wa && l.phone_e164 && (
                  <a href={telLink(l.phone_e164) ?? undefined} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
                    <PhoneCall className="size-4" aria-hidden />{s.call}
                  </a>
                )}
                <Button variant="outline" onClick={() => copy(m)}><Copy aria-hidden />{s.copy}</Button>
                {!sent && wa && (
                  <Button variant="ghost" onClick={() => markSent(m, null, null)} disabled={capReached || busyId === m.id}>{s.sentToggle}</Button>
                )}
              </footer>
              {!wa && <p className="text-xs text-muted-foreground">{s.notEligible}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

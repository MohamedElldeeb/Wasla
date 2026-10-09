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
import { createClient } from '@/lib/supabase/client';
import { whatsappLink, telLink } from '@/lib/phone/egypt.mjs';
import { defaults } from '@/lib/config/defaults';
import { ar } from '@/lib/i18n/ar';
import type { Message } from '@/lib/types';

const errText = (msg: string) => {
  const key = Object.keys(ar.send.errors).find((k) => msg.includes(k));
  return key ? ar.send.errors[key] : ar.errors.generic;
};

export function SendList({ messages, sentToday, dailyCap }: { messages: Message[]; sentToday: number; dailyCap: number }) {
  const router = useRouter();
  const [used, setUsed] = useState(sentToday);
  const [busyId, setBusyId] = useState<string | null>(null);
  const list = messages.filter((m) => m.review_status === 'approved' || m.review_status === 'sent');

  const ratio = dailyCap ? used / dailyCap : 0;
  const capReached = used >= dailyCap;

  async function markSent(m: Message, win: Window | null, url: string | null) {
    setBusyId(m.id);
    const supabase = createClient();
    const { error } = await supabase.rpc('mark_message_sent', { p_message_id: m.id });
    setBusyId(null);
    if (error) {
      win?.close();
      return toast.error(errText(error.message));
    }
    if (win && url) win.location.href = url;
    if (m.channel === 'whatsapp') setUsed((u) => u + 1);
    router.refresh();
    toast(ar.send.sentToast, {
      duration: defaults.undoSeconds * 1000,
      action: {
        label: ar.send.undo,
        onClick: async () => {
          const { error: e } = await createClient().rpc('undo_message_sent', { p_message_id: m.id });
          if (e) return toast.error(errText(e.message));
          if (m.channel === 'whatsapp') setUsed((u) => Math.max(0, u - 1));
          toast.success(ar.send.undone);
          router.refresh();
        },
      },
    });
  }

  function openWhatsapp(m: Message) {
    const text = m.edited_text ?? m.generated_text;
    const url = whatsappLink(m.leads.phone_e164, text);
    if (!url) return;
    // Open the tab synchronously (keeps the user gesture for popup blockers), then mark as sent and navigate it.
    const win = window.open('about:blank', '_blank');
    void markSent(m, win, url);
  }

  async function copy(m: Message) {
    try {
      await navigator.clipboard.writeText(m.edited_text ?? m.generated_text);
      toast.success(ar.send.copied);
    } catch {
      toast.error(ar.errors.generic);
    }
  }

  if (list.length === 0) return <EmptyState title={ar.send.emptyTitle} body={ar.send.emptyBody} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-xl border bg-card p-4" data-testid="send-counter">
        <div className="flex items-center justify-between text-sm">
          <strong>{ar.send.todayCounter(used, dailyCap)}</strong>
        </div>
        <Progress value={Math.min(100, Math.round(ratio * 100))} aria-label={ar.send.todayCounter(used, dailyCap)} />
        {capReached ? <Alert variant="destructive" role="alert">{ar.send.capReached}</Alert> : ratio >= defaults.capWarnRatio ? <Alert role="status">{ar.send.nearCap}</Alert> : null}
      </div>

      <ul className="grid gap-4 lg:grid-cols-2">
        {list.map((m) => {
          const l = m.leads;
          const sent = m.review_status === 'sent';
          const wa = m.channel === 'whatsapp' && l.whatsapp_eligible && l.phone_e164;
          return (
            <li key={m.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4" data-testid="send-card">
              <header className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base">{l.business_name}</h3>
                  <p className="text-xs text-muted-foreground">{[l.category, l.district || l.city].filter(Boolean).join(' · ')}</p>
                </div>
                {sent && <Badge variant="secondary" className="gap-1"><CheckCheck className="size-3.5" aria-hidden />{ar.send.sentTag}</Badge>}
              </header>
              <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm leading-7">{m.edited_text ?? m.generated_text}</p>
              <footer className="flex flex-wrap gap-2">
                {wa && (
                  <Button variant="cta" onClick={() => openWhatsapp(m)} disabled={sent || capReached || busyId === m.id} data-testid="wa-send">
                    <MessageCircle aria-hidden />{ar.send.whatsapp}
                  </Button>
                )}
                {!wa && l.phone_e164 && (
                  <a href={telLink(l.phone_e164) ?? undefined} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
                    <PhoneCall className="size-4" aria-hidden />{ar.send.call}
                  </a>
                )}
                <Button variant="outline" onClick={() => copy(m)}><Copy aria-hidden />{ar.send.copy}</Button>
                {!sent && wa && (
                  <Button variant="ghost" onClick={() => markSent(m, null, null)} disabled={capReached || busyId === m.id}>{ar.send.sentToggle}</Button>
                )}
              </footer>
              {!wa && <p className="text-xs text-muted-foreground">{ar.send.notEligible}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

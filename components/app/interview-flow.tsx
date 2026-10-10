'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Send, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/app/field';
import { StickyBar } from '@/components/app/sticky-bar';
import { useJob } from '@/components/app/use-job';
import { useT } from '@/components/app/i18n-provider';
import { interviewTurn, saveOfferProfile, startOnboardingOrg } from '@/app/actions/interview';
import { newNonce } from '@/lib/nonce';
import { parseRegions, regionsToText } from '@/lib/regions';
import type { InterviewTurn, Job, OfferProfile } from '@/lib/types';

type Msg = { role: 'user' | 'assistant'; content: string };
type Mode = 'onboarding' | 'rerun';
const MAX_QUESTIONS = 5;

/**
 * Onboarding interview (spec 6.0): optional website, at most 5 adaptive questions with quick-reply chips, skip and finish early,
 * and a final editable summary card. Only the confirmed card is saved; the chat is never stored as the profile.
 */
export function InterviewFlow({ mode, orgName, initial, hasOrg = false }: { mode: Mode; orgName?: string; initial?: OfferProfile; hasOrg?: boolean }) {
  const t = useT();
  const k = t.interview;
  const router = useRouter();
  const [phase, setPhase] = useState<'start' | 'chat' | 'summary'>('start');
  const [name, setName] = useState(orgName ?? '');
  const [site, setSite] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [turn, setTurn] = useState<InterviewTurn | null>(null);
  const [draft, setDraft] = useState('');
  const [job, setJob] = useState<Job | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [orgReady, setOrgReady] = useState(mode === 'rerun' || hasOrg);
  const nonce = useRef(newNonce());
  const [f, setF] = useState({
    what_we_sell: initial?.what_we_sell ?? '', ideal_customer: initial?.ideal_customer ?? '', problems_we_solve: initial?.problems_we_solve ?? '',
    proof_points: initial?.proof_points ?? '', regions: regionsToText(initial?.regions), example_customers: (initial?.example_customers ?? []).join('\n'),
  });

  const live = useJob(job, (j) => {
    setBusy(false);
    if (j.status !== 'succeeded' || !j.result) { setError(k.failed); return; }
    const r = j.result as InterviewTurn;
    setMsgs((m) => [...m, { role: 'assistant', content: r.reply }]);
    setTurn(r);
    if (r.done && r.profile) {
      setF({ what_we_sell: r.profile.what_we_sell, ideal_customer: r.profile.ideal_customer, problems_we_solve: r.profile.problems_we_solve, proof_points: r.profile.proof_points, regions: regionsToText(r.profile.regions), example_customers: r.profile.example_customers.join('\n') });
      setPhase('summary');
    }
  });
  const thinking = busy || (!!live && (live.status === 'queued' || live.status === 'running'));

  async function ensureOrg(): Promise<boolean> {
    if (orgReady) return true;
    const res = await startOnboardingOrg(name);
    if (!res.orgId) { setError(res.error ?? t.errors.generic); return false; }
    setOrgReady(true);
    return true;
  }

  async function call(transcript: Msg[], opts: { finish?: boolean; skipped?: boolean; siteUrl?: string } = {}) {
    setError(null);
    setBusy(true);
    const res = await interviewTurn({ transcript, siteUrl: opts.siteUrl, finish: opts.finish, skipped: opts.skipped, nonce: nonce.current });
    nonce.current = newNonce();
    if (!res.jobId) { setBusy(false); setError(res.error ?? k.failed); return; }
    setJob({ id: res.jobId, status: 'queued', progress: 0, type: 'interview' } as Job);
  }

  async function begin() {
    if (!(await ensureOrg())) return;
    setPhase('chat');
    await call([], { siteUrl: site });
  }
  async function manual() {
    if (!(await ensureOrg())) return;
    setPhase('summary');
  }
  async function answer(text: string, opts: { finish?: boolean; skipped?: boolean } = {}) {
    const next: Msg[] = text ? [...msgs, { role: 'user', content: text }] : msgs;
    setMsgs(next);
    setDraft('');
    setTurn(null);
    await call(next, opts);
  }

  async function confirm() {
    if (!f.what_we_sell.trim()) { setError(k.needSell); return; }
    setSaving(true);
    const res = await saveOfferProfile({
      what_we_sell: f.what_we_sell, ideal_customer: f.ideal_customer, problems_we_solve: f.problems_we_solve, proof_points: f.proof_points,
      regions: parseRegions(f.regions), example_customers: f.example_customers.split('\n').map((x) => x.trim()).filter(Boolean),
    });
    setSaving(false);
    if (res.error) { setError(res.error); return; }
    toast.success(k.saved);
    router.push(mode === 'onboarding' ? '/dashboard' : '/settings');
    router.refresh();
  }

  const asked = turn?.asked ?? msgs.filter((m) => m.role === 'assistant').length;

  return (
    <div className="flex flex-col gap-6">
      {phase === 'start' && (
        <>
          {mode === 'onboarding' && !orgReady && (
            <Field id="org-name" label={k.nameLabel} helper={k.nameHint}>
              <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} dir="auto" />
            </Field>
          )}
          <Field id="site" label={k.siteLabel} optional={t.common.optional} helper={k.siteHint}>
            <Input id="site" value={site} onChange={(e) => setSite(e.target.value)} dir="ltr" className="text-start" inputMode="url" placeholder="example.com" />
          </Field>
          {error && <Alert variant="danger" role="alert">{error}</Alert>}
          <StickyBar standalone>
            <Button type="button" size="lg" onClick={begin} loading={busy} disabled={!orgReady && name.trim().length < 2}>{k.start}</Button>
          </StickyBar>
          <Button type="button" variant="ghost" onClick={manual} disabled={!orgReady && name.trim().length < 2} className="self-start">{k.manual}</Button>
        </>
      )}

      {phase === 'chat' && (
        <>
          <ol className="flex flex-col gap-4" aria-live="polite" aria-label={k.title}>
            {msgs.map((m, i) => (
              <li key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex'}>
                {m.role === 'user' ? (
                  <p className="max-w-[85%] rounded-card border border-border bg-surface-muted px-4 py-3 text-body text-fg" dir="auto">{m.content}</p>
                ) : (
                  <p className="max-w-[90%] text-body text-fg" dir="auto"><span className="sr-only">{k.agent}: </span>{m.content}</p>
                )}
              </li>
            ))}
            {thinking && <li className="text-body-sm text-fg-muted">{k.thinking}…</li>}
          </ol>
          {error && (
            <Alert variant="danger" role="alert">
              {error}
              <Button type="button" variant="link" onClick={manual}>{k.manual}</Button>
            </Alert>
          )}
          {!thinking && turn && !turn.done && (
            <>
              <p className="num text-caption text-fg-muted">{k.questionOf(Math.min(asked, MAX_QUESTIONS), MAX_QUESTIONS)}</p>
              {turn.quick_replies.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {turn.quick_replies.map((q) => (
                    <button key={q} type="button" onClick={() => answer(q)} dir="auto"
                      className="transition-ui min-h-12 rounded-control border border-border-strong bg-surface px-4 text-body-sm text-fg hover:bg-surface-hover lg:min-h-10">{q}</button>
                  ))}
                </div>
              )}
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) void answer(draft.trim()); }}>
                <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={k.placeholder} aria-label={k.placeholder} dir="auto" className="min-h-12" rows={2} />
                <Button type="submit" size="icon" aria-label={k.send} disabled={!draft.trim()}><Send className="rtl:-scale-x-100" aria-hidden /></Button>
              </form>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="ghost" onClick={() => answer('', { skipped: true })}><SkipForward aria-hidden />{k.skip}</Button>
                <Button type="button" variant="secondary" onClick={() => answer('', { finish: true })}>{k.finishNow}</Button>
              </div>
            </>
          )}
        </>
      )}

      {phase === 'summary' && (
        <Card className="gap-4">
          <div>
            <h2 className="text-h2 text-fg">{k.summaryTitle}</h2>
            <p className="mt-1 text-body-sm text-fg-muted">{k.summaryHint}</p>
          </div>
          {(['what_we_sell', 'ideal_customer', 'problems_we_solve', 'proof_points', 'regions', 'example_customers'] as const).map((key) => (
            <Field key={key} id={`f-${key}`} label={k.fields[key]} optional={key === 'what_we_sell' || key === 'ideal_customer' ? undefined : t.common.optional}>
              <Textarea id={`f-${key}`} value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} dir="auto" className="min-h-24" />
            </Field>
          ))}
          {error && <Alert variant="danger" role="alert">{error}</Alert>}
          <StickyBar standalone>
            <Button type="button" size="lg" onClick={confirm} loading={saving}>{saving ? k.saving : k.confirm}</Button>
          </StickyBar>
        </Card>
      )}
    </div>
  );
}

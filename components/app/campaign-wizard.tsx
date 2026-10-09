'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useJob } from '@/components/app/use-job';
import { runCampaign, saveCampaign, startPlanner } from '@/app/actions/campaigns';
import { ar } from '@/lib/i18n/ar';
import { defaults } from '@/lib/config/defaults';
import { parseRegions, regionsToText } from '@/lib/regions';
import { num } from '@/lib/format';
import { newNonce } from '@/lib/nonce';
import type { CampaignParameters, Job, PlannerDraft, SignalDefinition } from '@/lib/types';

type Template = { code: string; name_ar: string; parameters: CampaignParameters; offer_text: string | null };
type Props = { balance: number; signalDefs: SignalDefinition[]; templates: Template[]; orgRegions: string };


export function CampaignWizard({ balance, signalDefs, templates, orgRegions }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const nonces = useRef({ plan: newNonce(), run: newNonce() });

  const [name, setName] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [kwInput, setKwInput] = useState('');
  const [locationsText, setLocationsText] = useState(orgRegions);
  const [maxResults, setMaxResults] = useState(30);
  const [minRating, setMinRating] = useState<number | ''>('');
  const [minReviews, setMinReviews] = useState<number | ''>('');
  const [mustMobile, setMustMobile] = useState(true);
  const [excludeClosed, setExcludeClosed] = useState(true);
  const [mustWebsite, setMustWebsite] = useState(false);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [tone, setTone] = useState<'friendly' | 'professional' | 'direct'>('friendly');
  const [offerOverride, setOfferOverride] = useState('');
  const [angles, setAngles] = useState<PlannerDraft['angles']>([]);
  const [angleIdx, setAngleIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // AI planner (WF0): one job, result comes back as an editable draft. Nothing starts by itself.
  const [planJob, setPlanJob] = useState<Job | null>(null);
  const [planMsg, setPlanMsg] = useState<string | null>(null);
  const live = useJob(planJob, (j) => {
    if (j.status === 'failed') return setPlanMsg(j.error || ar.wizard.plannerFailed);
    if (j.status === 'succeeded' && j.result) {
      const d = j.result;
      setKeywords(d.keywords ?? []);
      if (d.locations?.length) setLocationsText(regionsToText(d.locations));
      const w: Record<string, number> = {};
      (d.signals ?? []).forEach((s) => { w[s.key] = s.weight; });
      setWeights(w);
      setAngles(d.angles ?? []);
      setPlanMsg(ar.wizard.plannerDone);
    }
  });

  const planning = !!live && (live.status === 'queued' || live.status === 'running');

  function applyTemplate(t: Template) {
    const p = t.parameters;
    setName((n) => n || t.name_ar);
    setKeywords(p.keywords ?? []);
    setTone(p.tone ?? 'friendly');
    setMinRating(p.filters?.min_rating ?? '');
    setMinReviews(p.filters?.min_reviews ?? '');
    setMustMobile(!!p.filters?.must_have_mobile);
    setExcludeClosed(!!p.filters?.exclude_closed);
    const w: Record<string, number> = {};
    (p.signals ?? []).forEach((s) => { w[s.key] = s.weight; });
    setWeights(w);
    if (t.offer_text) setOfferOverride(t.offer_text);
  }

  function addKeyword() {
    const k = kwInput.trim();
    if (k && !keywords.includes(k) && keywords.length < 12) setKeywords([...keywords, k]);
    setKwInput('');
  }

  const locations = useMemo(() => parseRegions(locationsText), [locationsText]);
  const activeSignals = signalDefs.filter((s) => s.enabled && (weights[s.key] ?? 0) !== 0);
  const perLead = useMemo(() => {
    const groups = new Map<string, number>();
    activeSignals.forEach((s) => groups.set(s.cost_group ?? s.key, Math.max(groups.get(s.cost_group ?? s.key) ?? 0, s.credit_cost)));
    return [...groups.values()].reduce((a, b) => a + b, 0);
  }, [activeSignals]);
  const total = maxResults * (1 + perLead);
  const notEnough = total > balance;

  function buildParameters(): CampaignParameters {
    return {
      keywords,
      locations,
      max_results: maxResults,
      filters: {
        ...(minRating !== '' ? { min_rating: Number(minRating) } : {}),
        ...(minReviews !== '' ? { min_reviews: Number(minReviews) } : {}),
        must_have_phone: true,
        must_have_mobile: mustMobile,
        must_have_website: mustWebsite,
        exclude_closed: excludeClosed,
      },
      enrich_emails: false,
      channel: 'whatsapp',
      tone,
      ...(offerOverride.trim() ? { offer_override: offerOverride.trim() } : {}),
      signals: Object.entries(weights).filter(([, w]) => w !== 0).map(([key, weight]) => ({ key, weight })),
      angle: angleIdx != null ? angles[angleIdx] : null,
    };
  }

  function validate(): string | null {
    if (!name.trim()) return ar.wizard.name;
    if (!keywords.length) return ar.wizard.needKeywords;
    if (!locations.length) return ar.wizard.needLocation;
    return null;
  }

  function submit(run: boolean) {
    const v = validate();
    if (v) return setError(v);
    setError(null);
    start(async () => {
      const saved = await saveCampaign({ name, parameters: buildParameters() });
      if (!saved.id) return setError(saved.error ?? ar.errors.generic);
      if (!run) return router.push(`/campaigns/${saved.id}`);
      const res = await runCampaign(saved.id, nonces.current.run);
      if (res.error) {
        toast.error(res.error);
        return router.push(`/campaigns/${saved.id}`);
      }
      router.push(`/campaigns/${saved.id}`);
    });
  }

  function runPlanner() {
    setPlanMsg(null);
    start(async () => {
      const res = await startPlanner(offerOverride, nonces.current.plan);
      if (!res.jobId) return setPlanMsg(res.error ?? ar.wizard.plannerFailed);
      nonces.current.plan = newNonce();
      setPlanJob({ id: res.jobId, status: 'queued', progress: 0, type: 'plan' } as Job);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="size-5 text-cta" aria-hidden />{ar.wizard.plannerTitle}</CardTitle>
            <CardDescription>{ar.wizard.plannerBody}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="cta" onClick={runPlanner} disabled={planning || pending}>
                {planning ? ar.wizard.plannerRunning : ar.wizard.plannerCta}
              </Button>
              <span className="text-xs text-muted-foreground">{ar.wizard.plannerCost(defaults.plannerCredits)}</span>
            </div>
            {planMsg && <Alert role="status">{planMsg}</Alert>}
            {templates.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                <span className="text-xs text-muted-foreground">{ar.wizard.templates}</span>
                {templates.map((t) => (
                  <button key={t.code} type="button" onClick={() => applyTemplate(t)} className="rounded-full border bg-background px-3 py-1 text-xs hover:bg-accent">
                    {t.name_ar}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-4 pt-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">{ar.wizard.name}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="kw">{ar.wizard.keywords}</Label>
              <div className="flex flex-wrap gap-2">
                {keywords.map((k) => (
                  <Badge key={k} variant="secondary" className="gap-1 py-3">
                    {k}
                    <button type="button" aria-label={`${ar.common.remove} ${k}`} onClick={() => setKeywords(keywords.filter((x) => x !== k))} className="px-1 text-base leading-none">×</button>
                  </Badge>
                ))}
              </div>
              <Input
                id="kw"
                value={kwInput}
                onChange={(e) => setKwInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
                onBlur={addKeyword}
                placeholder={ar.wizard.keywordsHint}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="loc">{ar.wizard.locations}</Label>
              <Textarea id="loc" rows={3} value={locationsText} onChange={(e) => setLocationsText(e.target.value)} placeholder={'القاهرة، القاهرة، مدينة نصر'} />
              <p className="text-xs text-muted-foreground">{ar.wizard.locationsHint}</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="max">{ar.wizard.maxResults}: <b>{maxResults}</b></Label>
              <input id="max" type="range" min={5} max={defaults.maxResultsCap} step={5} value={maxResults} onChange={(e) => setMaxResults(Number(e.target.value))} className="accent-[var(--primary)]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{ar.wizard.filters}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rating">{ar.wizard.minRating}</Label>
              <Input id="rating" type="number" min={0} max={5} step={0.5} dir="ltr" className="text-start" value={minRating} onChange={(e) => setMinRating(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reviews">{ar.wizard.minReviews}</Label>
              <Input id="reviews" type="number" min={0} dir="ltr" className="text-start" value={minReviews} onChange={(e) => setMinReviews(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>
            {[
              [ar.wizard.mustHaveMobile, mustMobile, setMustMobile],
              [ar.wizard.excludeClosed, excludeClosed, setExcludeClosed],
              [ar.wizard.mustHaveWebsite, mustWebsite, setMustWebsite],
            ].map(([label, val, set]) => (
              <label key={label as string} className="flex items-center gap-2 text-sm">
                <Checkbox checked={val as boolean} onCheckedChange={(c) => (set as (b: boolean) => void)(!!c)} />
                {label as string}
              </label>
            ))}
            <p className="text-xs text-muted-foreground sm:col-span-2">{ar.wizard.emailsSoon}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{ar.wizard.signals}</CardTitle>
            <CardDescription>{ar.wizard.signalsHint}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {signalDefs.filter((s) => s.enabled).map((s) => {
              const w = weights[s.key] ?? 0;
              const planned = planJob && live?.result?.signals?.find((x) => x.key === s.key);
              return (
                <div key={s.key} className="flex flex-col gap-1 rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-sm">{s.name_ar}</strong>
                    <Badge variant={s.credit_cost ? 'outline' : 'secondary'}>{s.credit_cost ? ar.wizard.signalPaid(s.credit_cost) : ar.wizard.signalFree}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{s.description_ar}</p>
                  {planned?.reason_ar && <p className="text-xs text-primary">{planned.reason_ar}</p>}
                  <div className="flex items-center gap-3">
                    <input
                      type="range" min={-100} max={100} step={10} value={w}
                      aria-label={`${ar.wizard.weight}: ${s.name_ar}`}
                      onChange={(e) => setWeights({ ...weights, [s.key]: Number(e.target.value) })}
                      className="flex-1 accent-[var(--primary)]"
                    />
                    <span className="w-12 text-center text-sm font-semibold tabular-nums" dir="ltr">{w}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {w > 0 ? `بنكافئ: ${s.reason_high_ar}` : w < 0 ? `بنكافئ: ${s.reason_low_ar}` : 'مش داخلة في الحساب'}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-4 pt-4">
            <div className="flex flex-col gap-1.5">
              <Label>{ar.wizard.tone}</Label>
              <div className="flex gap-2">
                {(['friendly', 'professional', 'direct'] as const).map((t) => (
                  <Button key={t} type="button" size="sm" variant={tone === t ? 'default' : 'outline'} onClick={() => setTone(t)}>{ar.wizard.tones[t]}</Button>
                ))}
              </div>
            </div>
            {angles.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label>{ar.wizard.angles}</Label>
                <p className="text-xs text-muted-foreground">{ar.wizard.anglesHint}</p>
                {angles.map((a, i) => (
                  <button key={i} type="button" onClick={() => setAngleIdx(angleIdx === i ? null : i)}
                    className={`rounded-lg border p-3 text-start text-sm transition ${angleIdx === i ? 'border-primary bg-accent' : 'hover:bg-muted/60'}`}>
                    <strong>{a.title_ar}</strong>
                    <span className="block text-xs text-muted-foreground">{a.description_ar}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="override">{ar.wizard.offerOverride}</Label>
              <Textarea id="override" rows={2} value={offerOverride} onChange={(e) => setOfferOverride(e.target.value)} />
              <p className="text-xs text-muted-foreground">{ar.wizard.offerOverrideHint}</p>
            </div>
            <p className="text-xs text-muted-foreground">{ar.wizard.channelNote}</p>
          </CardContent>
        </Card>
      </div>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader><CardTitle>{ar.wizard.estimate}</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <dl className="flex flex-col gap-1.5">
              <div className="flex justify-between"><dt className="text-muted-foreground">{ar.wizard.estLeads}</dt><dd className="font-semibold">{num(maxResults)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">{ar.wizard.estSignals}</dt><dd className="font-semibold">{perLead ? `${perLead} × ${num(maxResults)}` : ar.wizard.signalFree}</dd></div>
              <div className="flex justify-between border-t pt-1.5"><dt>{ar.wizard.estTotal}</dt><dd className="font-bold text-primary">{num(total)} {ar.common.creditUnit}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">{ar.wizard.balance}</dt><dd className="font-semibold">{num(balance)}</dd></div>
            </dl>
            <p className="text-xs text-muted-foreground">{ar.wizard.refundNote}</p>
            {notEnough && <Alert variant="destructive" role="alert">{ar.wizard.notEnough}</Alert>}
            {error && <Alert variant="destructive" role="alert">{error}</Alert>}
            <Button type="button" variant="cta" size="lg" disabled={pending || planning || notEnough} onClick={() => submit(true)}>
              {pending ? ar.common.loading : ar.wizard.run}
            </Button>
            <Button type="button" variant="outline" disabled={pending} onClick={() => submit(false)}>{ar.wizard.saveDraft}</Button>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

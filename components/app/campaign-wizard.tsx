'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useJob } from '@/components/app/use-job';
import { useT } from '@/components/app/i18n-provider';
import { runCampaign, saveCampaign, startPlanner } from '@/app/actions/campaigns';
import { defaults } from '@/lib/config/defaults';
import { parseRegions, regionsToText } from '@/lib/regions';
import { newNonce } from '@/lib/nonce';
import { num } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { CampaignParameters, Job, PlannerDraft, SignalDefinition } from '@/lib/types';

type Template = { code: string; name_ar: string; parameters: CampaignParameters; offer_text: string | null };
type Props = { balance: number; signalDefs: SignalDefinition[]; templates: Template[]; orgRegions: string };

// Each signal is configured with two simple choices that map to a signed weight:
//   which state is preferred (has it / lacks it / doesn't matter) x how important it is.
type Pref = { mode: 'off' | 'high' | 'low'; level: 1 | 2 | 3 };
const LEVEL_WEIGHT = { 1: 30, 2: 60, 3: 100 } as const;
const toWeight = (p: Pref) => (p.mode === 'off' ? 0 : (p.mode === 'high' ? 1 : -1) * LEVEL_WEIGHT[p.level]);
const fromWeight = (w: number): Pref => ({ mode: w === 0 ? 'off' : w > 0 ? 'high' : 'low', level: Math.abs(w) <= 40 ? 1 : Math.abs(w) <= 75 ? 2 : 3 });

function Segmented<T extends string | number>({ value, options, onChange, label }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={String(o.v)}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={cn('rounded-lg border px-3 py-2 text-sm transition-colors', value === o.v ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-primary-soft')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function CampaignWizard({ balance, signalDefs, templates, orgRegions }: Props) {
  const t = useT();
  const w = t.wizard;
  const router = useRouter();
  const [pending, start] = useTransition();
  const nonces = useRef({ plan: newNonce(), run: newNonce() });
  const [step, setStep] = useState(0);

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
  const [prefs, setPrefs] = useState<Record<string, Pref>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [tone, setTone] = useState<'friendly' | 'professional' | 'direct'>('friendly');
  const [offerOverride, setOfferOverride] = useState('');
  const [angles, setAngles] = useState<PlannerDraft['angles']>([]);
  const [angleIdx, setAngleIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // AI planner (WF0): one job; the result is an editable draft. Nothing starts by itself.
  const [planJob, setPlanJob] = useState<Job | null>(null);
  const [planMsg, setPlanMsg] = useState<string | null>(null);
  const live = useJob(planJob, (j) => {
    if (j.status === 'failed') { setPlanMsg(t.jobErrors[j.error ?? ''] ?? w.plannerFailed); return; }
    if (j.status === 'succeeded' && j.result) {
      const d = j.result;
      setKeywords(d.keywords ?? []);
      if (d.locations?.length) setLocationsText(regionsToText(d.locations));
      const next: Record<string, Pref> = {};
      const why: Record<string, string> = {};
      (d.signals ?? []).forEach((s) => { next[s.key] = fromWeight(s.weight); if (s.reason_ar) why[s.key] = s.reason_ar; });
      setPrefs(next);
      setReasons(why);
      setAngles(d.angles ?? []);
      setPlanMsg(w.plannerDone);
    }
  });
  const planning = !!live && (live.status === 'queued' || live.status === 'running');

  function applyTemplate(tpl: Template) {
    const p = tpl.parameters;
    setName((n) => n || (t.templates[tpl.code] ?? tpl.name_ar));
    setKeywords(p.keywords ?? []);
    setTone(p.tone ?? 'friendly');
    setMinRating(p.filters?.min_rating ?? '');
    setMinReviews(p.filters?.min_reviews ?? '');
    setMustMobile(!!p.filters?.must_have_mobile);
    setExcludeClosed(!!p.filters?.exclude_closed);
    const next: Record<string, Pref> = {};
    (p.signals ?? []).forEach((s) => { next[s.key] = fromWeight(s.weight); });
    setPrefs(next);
    setReasons({});
    if (tpl.offer_text) setOfferOverride(tpl.offer_text);
  }

  function addKeyword() {
    const k = kwInput.trim();
    if (k && !keywords.includes(k) && keywords.length < 12) setKeywords([...keywords, k]);
    setKwInput('');
  }

  const locations = useMemo(() => parseRegions(locationsText), [locationsText]);
  const active = signalDefs.filter((s) => s.enabled && (prefs[s.key]?.mode ?? 'off') !== 'off');
  const perLead = useMemo(() => {
    const groups = new Map<string, number>();
    active.forEach((s) => groups.set(s.cost_group ?? s.key, Math.max(groups.get(s.cost_group ?? s.key) ?? 0, s.credit_cost)));
    return [...groups.values()].reduce((a, b) => a + b, 0);
  }, [active]);
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
      signals: Object.entries(prefs).map(([key, p]) => ({ key, weight: toWeight(p) })).filter((s) => s.weight !== 0),
      angle: angleIdx != null ? angles[angleIdx] : null,
    };
  }

  function validate(upTo: number): string | null {
    if (upTo >= 0 && !name.trim()) return w.needName;
    if (upTo >= 1 && !keywords.length) return w.needKeywords;
    if (upTo >= 1 && !locations.length) return w.needLocation;
    return null;
  }

  function goNext() {
    const v = validate(step);
    if (v) return setError(v);
    setError(null);
    setStep(step + 1);
  }

  function submit(run: boolean) {
    const v = validate(2);
    if (v) { setError(v); return; }
    setError(null);
    start(async () => {
      const saved = await saveCampaign({ name, parameters: buildParameters() });
      if (!saved.id) { setError(saved.error ?? t.errors.generic); return; }
      if (!run) { router.push(`/campaigns/${saved.id}`); return; }
      const res = await runCampaign(saved.id, nonces.current.run);
      if (res.error) toast.error(res.error);
      router.push(`/campaigns/${saved.id}`);
    });
  }

  function runPlanner() {
    setPlanMsg(null);
    start(async () => {
      const res = await startPlanner(offerOverride, nonces.current.plan);
      if (!res.jobId) { setPlanMsg(res.error ?? w.plannerFailed); return; }
      nonces.current.plan = newNonce();
      setPlanJob({ id: res.jobId, status: 'queued', progress: 0, type: 'plan' } as Job);
    });
  }

  const levelOptions = [
    { v: 1 as const, label: w.levelLow },
    { v: 2 as const, label: w.levelMid },
    { v: 3 as const, label: w.levelHigh },
  ];

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex items-center gap-2" aria-label={w.stepOf(step + 1, 3)}>
        {w.steps.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2" aria-current={i === step ? 'step' : undefined}>
            <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold', i < step ? 'bg-success text-white' : i === step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
              {i < step ? <Check className="size-4" aria-hidden /> : i + 1}
            </span>
            <span className={cn('hidden text-sm sm:inline', i === step ? 'font-semibold' : 'text-muted-foreground')}>{label}</span>
            {i < 2 && <span className="h-px flex-1 bg-border" aria-hidden />}
          </li>
        ))}
      </ol>

      <section className="flex flex-col gap-6 rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
        {step === 0 && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name" className="text-base">{w.name}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder={w.nameHint} className="h-11" />
            </div>

            <div className="flex flex-col gap-3 rounded-xl bg-primary-soft p-4">
              <h2 className="flex items-center gap-2 text-base"><Sparkles className="size-5 text-cta" aria-hidden />{w.plannerTitle}</h2>
              <p className="text-sm text-muted-foreground">{w.plannerBody}</p>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="cta" onClick={runPlanner} disabled={planning || pending}>
                  {planning ? w.plannerRunning : w.plannerCta}
                </Button>
                <span className="text-xs text-muted-foreground">{w.plannerCost(defaults.plannerCredits)}</span>
              </div>
              {planMsg && <Alert role="status">{planMsg}</Alert>}
            </div>

            {templates.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">{w.templates}</span>
                {templates.map((tpl) => (
                  <button key={tpl.code} type="button" onClick={() => applyTemplate(tpl)} className="rounded-full border bg-background px-3 py-1.5 text-sm hover:bg-primary-soft">
                    {t.templates[tpl.code] ?? tpl.name_ar}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="kw" className="text-base">{w.keywords}</Label>
              <p className="text-sm text-muted-foreground">{w.keywordsHint}</p>
              <div className="flex flex-wrap gap-2">
                {keywords.map((k) => (
                  <Badge key={k} variant="secondary" className="h-8 gap-1 text-sm" dir="auto">
                    {k}
                    <button type="button" aria-label={`${t.common.remove} ${k}`} onClick={() => setKeywords(keywords.filter((x) => x !== k))} className="px-1 text-base leading-none">×</button>
                  </Badge>
                ))}
              </div>
              <Input
                id="kw"
                value={kwInput}
                dir="auto"
                className="h-11"
                onChange={(e) => setKwInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
                onBlur={addKeyword}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="loc" className="text-base">{w.locations}</Label>
              <p className="text-sm text-muted-foreground">{w.locationsHint}</p>
              <Textarea id="loc" rows={3} dir="auto" value={locationsText} onChange={(e) => setLocationsText(e.target.value)} placeholder={'القاهرة، القاهرة، مدينة نصر'} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="max" className="text-base">{w.maxResults}: <b dir="ltr">{maxResults}</b></Label>
              <input id="max" type="range" min={5} max={defaults.maxResultsCap} step={5} value={maxResults} onChange={(e) => setMaxResults(Number(e.target.value))} className="accent-[var(--primary)]" />
            </div>

            <fieldset className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
              <legend className="px-2 text-sm font-semibold">{w.filters}</legend>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rating">{w.minRating}</Label>
                <Input id="rating" type="number" min={0} max={5} step={0.5} dir="ltr" className="h-11 text-start" value={minRating} onChange={(e) => setMinRating(e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reviews">{w.minReviews}</Label>
                <Input id="reviews" type="number" min={0} dir="ltr" className="h-11 text-start" value={minReviews} onChange={(e) => setMinReviews(e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
              {([
                [w.mustHaveMobile, mustMobile, setMustMobile],
                [w.excludeClosed, excludeClosed, setExcludeClosed],
                [w.mustHaveWebsite, mustWebsite, setMustWebsite],
              ] as const).map(([label, val, set]) => (
                <label key={label} className="flex items-center gap-3 text-sm">
                  <Checkbox checked={val} onCheckedChange={(c) => set(!!c)} />
                  {label}
                </label>
              ))}
              <p className="text-xs text-muted-foreground sm:col-span-2">{w.emailsSoon}</p>
            </fieldset>
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex flex-col gap-2">
              <h2 className="text-lg">{w.signals}</h2>
              <p className="text-sm text-muted-foreground">{w.signalsHint}</p>
            </div>
            <div className="flex flex-col gap-4">
              {signalDefs.filter((s) => s.enabled).map((s) => {
                const info = t.signals[s.key] ?? { name: s.name_ar, desc: s.description_ar ?? '', high: s.reason_high_ar ?? '', low: s.reason_low_ar ?? '' };
                const p = prefs[s.key] ?? { mode: 'off', level: 2 };
                const set = (patch: Partial<Pref>) => setPrefs({ ...prefs, [s.key]: { ...p, ...patch } });
                return (
                  <div key={s.key} className="flex flex-col gap-3 rounded-xl border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <strong>{info.name}</strong>
                        <p className="text-sm text-muted-foreground">{info.desc}</p>
                        {reasons[s.key] && <p className="mt-1 text-sm text-primary" dir="auto">{reasons[s.key]}</p>}
                      </div>
                      <Badge variant={s.credit_cost ? 'outline' : 'secondary'}>{s.credit_cost ? w.signalPaid(s.credit_cost) : w.signalFree}</Badge>
                    </div>
                    <p className="text-sm font-medium">{w.prefer}</p>
                    <Segmented
                      label={info.name}
                      value={p.mode}
                      onChange={(mode) => set({ mode })}
                      options={[{ v: 'off', label: w.modeOff }, { v: 'high', label: info.high }, { v: 'low', label: info.low }]}
                    />
                    {p.mode !== 'off' && (
                      <>
                        <p className="text-sm font-medium">{w.importance}</p>
                        <Segmented label={w.importance} value={p.level} onChange={(level) => set({ level })} options={levelOptions} />
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-base">{w.tone}</Label>
              <Segmented label={w.tone} value={tone} onChange={setTone} options={(['friendly', 'professional', 'direct'] as const).map((k) => ({ v: k, label: w.tones[k] }))} />
            </div>

            {angles.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label className="text-base">{w.angles}</Label>
                <p className="text-sm text-muted-foreground">{w.anglesHint}</p>
                {angles.map((a, i) => (
                  <button key={i} type="button" onClick={() => setAngleIdx(angleIdx === i ? null : i)} dir="auto"
                    className={cn('rounded-lg border p-3 text-start text-sm transition', angleIdx === i ? 'border-primary bg-primary-soft' : 'hover:bg-muted/60')}>
                    <strong>{a.title_ar}</strong>
                    <span className="block text-muted-foreground">{a.description_ar}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="override">{w.offerOverride} <Badge variant="secondary">{t.common.optional}</Badge></Label>
              <Textarea id="override" rows={2} dir="auto" value={offerOverride} onChange={(e) => setOfferOverride(e.target.value)} />
              <p className="text-xs text-muted-foreground">{w.offerOverrideHint}</p>
            </div>

            <div className="flex flex-col gap-3 rounded-xl bg-primary-soft p-4">
              <h2 className="text-base">{w.estimate}</h2>
              <dl className="grid gap-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">{w.estLeads}</dt><dd className="font-semibold">{num(maxResults)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">{w.estSignals}</dt><dd className="font-semibold">{perLead ? `${perLead} × ${num(maxResults)}` : w.signalFree}</dd></div>
                <div className="flex justify-between border-t pt-1.5"><dt>{w.estTotal}</dt><dd className="font-bold text-primary">{num(total)} {t.common.creditUnit}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">{w.balance}</dt><dd className="font-semibold">{num(balance)}</dd></div>
              </dl>
              <p className="text-xs text-muted-foreground">{w.refundNote}</p>
              <p className="text-xs text-muted-foreground">{w.channelNote}</p>
              {notEnough && <Alert variant="destructive" role="alert">{w.notEnough}</Alert>}
            </div>
          </>
        )}

        {error && <Alert variant="destructive" role="alert">{error}</Alert>}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
          <Button type="button" variant="ghost" onClick={() => { setError(null); setStep(step - 1); }} disabled={step === 0 || pending}>{t.common.back}</Button>
          {step < 2 ? (
            <Button type="button" variant="cta" size="lg" onClick={goNext} disabled={planning}>{t.common.next}</Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="lg" disabled={pending} onClick={() => submit(false)}>{w.saveDraft}</Button>
              <Button type="button" variant="cta" size="lg" disabled={pending || planning || notEnough} onClick={() => submit(true)}>
                {pending ? t.common.loading : w.run}
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/app/field';
import { Stepper } from '@/components/app/stepper';
import { StickyBar } from '@/components/app/sticky-bar';
import { useJob } from '@/components/app/use-job';
import { useT } from '@/components/app/i18n-provider';
import { runCampaign, saveCampaign, startPlanner } from '@/app/actions/campaigns';
import { defaults } from '@/lib/config/defaults';
import { parseRegions, type Region } from '@/lib/regions';
import { newNonce } from '@/lib/nonce';
import { num } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { CampaignParameters, Job, PlannerDraft, SignalDefinition } from '@/lib/types';

type Template = { code: string; name_ar: string; parameters: CampaignParameters; offer_text: string | null };
type Props = { balance: number; signalDefs: SignalDefinition[]; templates: Template[]; orgRegions: Region[] };

// Each signal is configured with two simple choices that map to a signed weight:
//   which state is preferred (has it / lacks it / doesn't matter) x how important it is.
type Pref = { mode: 'off' | 'high' | 'low'; level: 1 | 2 | 3 };
const LEVEL_WEIGHT = { 1: 30, 2: 60, 3: 100 } as const;
const toWeight = (p: Pref) => (p.mode === 'off' ? 0 : (p.mode === 'high' ? 1 : -1) * LEVEL_WEIGHT[p.level]);
const fromWeight = (w: number): Pref => ({ mode: w === 0 ? 'off' : w > 0 ? 'high' : 'low', level: Math.abs(w) <= 40 ? 1 : Math.abs(w) <= 75 ? 2 : 3 });
const regionLabel = (r: Region) => [r.governorate, r.city, r.district].filter(Boolean).join('، ');

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
          className={cn('transition-ui min-h-12 rounded-control border px-4 text-body-sm font-medium lg:min-h-10', value === o.v ? 'border-primary bg-primary-soft text-primary' : 'border-border-strong bg-surface text-fg hover:bg-surface-muted')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Chip({ children, onRemove, removeLabel }: { children: React.ReactNode; onRemove: () => void; removeLabel: string }) {
  return (
    <span className="inline-flex min-h-10 items-center gap-1 rounded-control bg-primary-soft ps-3 text-body-sm text-primary" dir="auto">
      {children}
      <button type="button" onClick={onRemove} aria-label={removeLabel} className="transition-ui flex size-12 items-center justify-center rounded-control hover:bg-surface-muted lg:size-10">
        <X className="size-4" aria-hidden />
      </button>
    </span>
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
  const [locations, setLocations] = useState<Region[]>(orgRegions);
  const [locInput, setLocInput] = useState('');
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
  const [planMsg, setPlanMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const live = useJob(planJob, (j) => {
    if (j.status === 'failed') { setPlanMsg({ ok: false, text: t.jobErrors[j.error ?? ''] ?? w.plannerFailed }); return; }
    if (j.status === 'succeeded' && j.result) {
      const d = j.result;
      setKeywords(d.keywords ?? []);
      if (d.locations?.length) setLocations(d.locations);
      const next: Record<string, Pref> = {};
      const why: Record<string, string> = {};
      (d.signals ?? []).forEach((s) => { next[s.key] = fromWeight(s.weight); if (s.reason_ar) why[s.key] = s.reason_ar; });
      setPrefs(next);
      setReasons(why);
      setAngles(d.angles ?? []);
      setPlanMsg({ ok: true, text: w.plannerDone });
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
  function addLocation() {
    const [r] = parseRegions(locInput);
    if (r && locations.length < 12) setLocations([...locations, r]);
    setLocInput('');
  }

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

  // Continue stays disabled until the step is valid; the reason is shown above the bar.
  const stepProblem = (s: number): string | null => {
    if (s >= 0 && !name.trim()) return w.needName;
    if (s >= 1 && !keywords.length) return w.needKeywords;
    if (s >= 1 && !locations.length) return w.needLocation;
    return null;
  };
  const blocked = stepProblem(step);

  function submit(run: boolean) {
    const v = stepProblem(2);
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
      if (!res.jobId) { setPlanMsg({ ok: false, text: res.error ?? w.plannerFailed }); return; }
      nonces.current.plan = newNonce();
      setPlanJob({ id: res.jobId, status: 'queued', progress: 0, type: 'plan' } as Job);
    });
  }

  const levelOptions = [
    { v: 1 as const, label: w.levelLow },
    { v: 2 as const, label: w.levelMid },
    { v: 3 as const, label: w.levelHigh },
  ];

  const costCard = (
    <Card className="gap-3">
      <CardTitle>{w.estimate}</CardTitle>
      <dl className="flex flex-col gap-2 text-body-sm">
        <div className="flex justify-between"><dt className="text-fg-muted">{w.estLeads}</dt><dd className="num font-semibold text-fg">{num(maxResults)}</dd></div>
        <div className="flex justify-between"><dt className="text-fg-muted">{w.estSignals}</dt><dd className="num font-semibold text-fg">{perLead ? `${perLead} × ${num(maxResults)}` : w.signalFree}</dd></div>
        <div className="flex justify-between border-t border-border pt-2"><dt className="text-fg">{w.estTotal}</dt><dd className="num text-h3 text-fg">{num(total)} {t.common.creditUnit}</dd></div>
        <div className="flex justify-between"><dt className="text-fg-muted">{w.balance}</dt><dd className="num font-semibold text-fg">{num(balance)}</dd></div>
      </dl>
      <p className="text-caption text-fg-muted">{w.refundNote}</p>
      {notEnough && <Alert variant="danger" role="alert">{w.notEnough}</Alert>}
    </Card>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="flex min-w-0 flex-col gap-6">
        <Stepper steps={w.steps} current={step} stepOf={w.stepOf} />

        {step === 0 && (
          <>
            <Field id="name" label={w.name} helper={w.nameHint}>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} dir="auto" />
            </Field>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle className="flex items-center gap-2"><Sparkles className="size-5 text-fg-muted" aria-hidden />{w.plannerTitle}</CardTitle>
                  <CardDescription className="mt-1">{w.plannerBody}</CardDescription>
                </div>
              </CardHeader>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="secondary" onClick={runPlanner} loading={planning || pending}>{planning ? w.plannerRunning : w.plannerCta}</Button>
                <span className="text-body-sm text-fg-muted">{w.plannerCost(defaults.plannerCredits)}</span>
              </div>
              {planMsg && <Alert variant={planMsg.ok ? 'success' : 'warning'} role="status">{planMsg.text}</Alert>}
            </Card>

            {templates.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-body-sm text-fg-muted">{w.templates}</span>
                <div className="flex flex-wrap gap-2">
                  {templates.map((tpl) => (
                    <button key={tpl.code} type="button" onClick={() => applyTemplate(tpl)} className="transition-ui min-h-12 rounded-control border border-border-strong bg-surface px-4 text-body-sm hover:bg-surface-muted lg:min-h-10">
                      {t.templates[tpl.code] ?? tpl.name_ar}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <Field id="kw" label={w.keywords} helper={w.keywordsHint}>
              <div className="flex flex-wrap gap-2" aria-label={w.suggested}>
                {keywords.map((k) => <Chip key={k} onRemove={() => setKeywords(keywords.filter((x) => x !== k))} removeLabel={`${t.common.remove} ${k}`}>{k}</Chip>)}
              </div>
              <div className="flex gap-2">
                <Input id="kw" value={kwInput} dir="auto" placeholder={w.addKeyword} onChange={(e) => setKwInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }} />
                <Button type="button" variant="secondary" size="icon" onClick={addKeyword} aria-label={w.addKeyword}><Plus aria-hidden /></Button>
              </div>
            </Field>

            <Field id="loc" label={w.locations} helper={w.locationsHint}>
              <div className="flex flex-wrap gap-2">
                {locations.map((r, i) => <Chip key={`${regionLabel(r)}-${i}`} onRemove={() => setLocations(locations.filter((_, j) => j !== i))} removeLabel={`${t.common.remove} ${regionLabel(r)}`}>{regionLabel(r)}</Chip>)}
              </div>
              <div className="flex gap-2">
                <Input id="loc" value={locInput} dir="auto" placeholder="القاهرة، القاهرة، مدينة نصر" onChange={(e) => setLocInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLocation(); } }} />
                <Button type="button" variant="secondary" size="icon" onClick={addLocation} aria-label={t.common.add}><Plus aria-hidden /></Button>
              </div>
            </Field>

            <Field id="max" label={<>{w.maxResults}: <b className="num" dir="ltr">{maxResults}</b></>}>
              <input id="max" type="range" min={5} max={defaults.maxResultsCap} step={5} value={maxResults} onChange={(e) => setMaxResults(Number(e.target.value))} className="h-12 w-full accent-[var(--primary)]" />
            </Field>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>{w.filters}</CardTitle>
                  <CardDescription className="mt-1">{w.filtersHint}</CardDescription>
                </div>
              </CardHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="rating" label={w.minRating}>
                  <Input id="rating" type="number" min={0} max={5} step={0.5} dir="ltr" className="num text-start" value={minRating} onChange={(e) => setMinRating(e.target.value === '' ? '' : Number(e.target.value))} />
                </Field>
                <Field id="reviews" label={w.minReviews}>
                  <Input id="reviews" type="number" min={0} dir="ltr" className="num text-start" value={minReviews} onChange={(e) => setMinReviews(e.target.value === '' ? '' : Number(e.target.value))} />
                </Field>
              </div>
              {([
                [w.mustHaveMobile, mustMobile, setMustMobile],
                [w.excludeClosed, excludeClosed, setExcludeClosed],
                [w.mustHaveWebsite, mustWebsite, setMustWebsite],
              ] as const).map(([label, val, set]) => (
                <label key={label} className="flex min-h-12 items-center gap-3 text-body">
                  <Checkbox checked={val} onCheckedChange={(c) => set(!!c)} />
                  {label}
                </label>
              ))}
              <p className="text-caption text-fg-muted">{w.emailsSoon}</p>
            </Card>
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex flex-col gap-1">
              <h2 className="text-h2 text-fg">{w.signals}</h2>
              <p className="text-body-sm text-fg-muted">{w.signalsHint}</p>
            </div>
            <div className="flex flex-col gap-3">
              {signalDefs.filter((s) => s.enabled).map((s) => {
                const info = t.signals[s.key] ?? { name: s.name_ar, desc: s.description_ar ?? '', high: s.reason_high_ar ?? '', low: s.reason_low_ar ?? '' };
                const p = prefs[s.key] ?? { mode: 'off', level: 2 };
                const set = (patch: Partial<Pref>) => setPrefs({ ...prefs, [s.key]: { ...p, ...patch } });
                return (
                  <Card key={s.key} className="gap-3">
                    <CardHeader>
                      <div className="min-w-0">
                        <CardTitle>{info.name}</CardTitle>
                        <CardDescription className="mt-1">{info.desc}</CardDescription>
                        {reasons[s.key] && <p className="mt-1 text-body-sm text-primary" dir="auto">{reasons[s.key]}</p>}
                      </div>
                      <Badge variant={s.credit_cost ? 'outline' : 'neutral'}>{s.credit_cost ? w.signalPaid(s.credit_cost) : w.signalFree}</Badge>
                    </CardHeader>
                    <p className="text-body-sm font-medium text-fg">{w.prefer}</p>
                    <Segmented label={info.name} value={p.mode} onChange={(mode) => set({ mode })} options={[{ v: 'off', label: w.modeOff }, { v: 'high', label: info.high }, { v: 'low', label: info.low }]} />
                    {p.mode !== 'off' && (
                      <>
                        <p className="text-body-sm font-medium text-fg">{w.importance}</p>
                        <Segmented label={w.importance} value={p.level} onChange={(level) => set({ level })} options={levelOptions} />
                      </>
                    )}
                  </Card>
                );
              })}
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-body-sm font-medium text-fg">{w.tone}</span>
              <Segmented label={w.tone} value={tone} onChange={setTone} options={(['friendly', 'professional', 'direct'] as const).map((k) => ({ v: k, label: w.tones[k] }))} />
            </div>

            {angles.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-body-sm font-medium text-fg">{w.angles}</span>
                <p className="text-caption text-fg-muted">{w.anglesHint}</p>
                {angles.map((a, i) => (
                  <button key={i} type="button" onClick={() => setAngleIdx(angleIdx === i ? null : i)} dir="auto" aria-pressed={angleIdx === i}
                    className={cn('transition-ui rounded-card border p-4 text-start', angleIdx === i ? 'border-primary bg-primary-soft' : 'border-border bg-surface hover:bg-surface-muted')}>
                    <strong className="block text-body text-fg">{a.title_ar}</strong>
                    <span className="text-body-sm text-fg-muted">{a.description_ar}</span>
                  </button>
                ))}
              </div>
            )}

            <Field id="override" label={w.offerOverride} optional={t.common.optional} helper={w.offerOverrideHint}>
              <Textarea id="override" dir="auto" className="min-h-24" value={offerOverride} onChange={(e) => setOfferOverride(e.target.value)} />
            </Field>
            <p className="text-caption text-fg-muted">{w.channelNote}</p>
            <div className="lg:hidden">{costCard}</div>
          </>
        )}

        {error && <Alert variant="danger" role="alert">{error}</Alert>}

        <StickyBar note={blocked ? `${w.continueNeeds} ${blocked}` : notEnough && step === 2 ? w.notEnough : undefined}>
          <span className="num me-auto text-body-sm font-semibold text-fg lg:hidden" title={w.estTotal}>{w.approx(total)} {t.common.creditUnit}</span>
          <Button type="button" variant="secondary" size="lg" onClick={() => { setError(null); setStep(step - 1); }} disabled={step === 0 || pending}>{t.common.back}</Button>
          {step < 2 ? (
            <Button type="button" size="lg" onClick={() => setStep(step + 1)} disabled={!!blocked || planning}>{t.common.next}</Button>
          ) : (
            <Button type="button" size="lg" loading={pending} disabled={!!blocked || planning || notEnough} onClick={() => submit(true)}>{w.run}</Button>
          )}
        </StickyBar>
        {step === 2 && (
          <Button type="button" variant="ghost" onClick={() => submit(false)} disabled={pending || !!blocked} className="self-start">{w.saveDraft}</Button>
        )}
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-8">{costCard}</div>
      </aside>
    </div>
  );
}

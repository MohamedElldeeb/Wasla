// Runs the pipeline steps on the saved real-run fixtures WITHOUT Apify: the REAL n8n Code nodes (planner, normalize, fit check,
// signals, opportunities, message writer, tact validator) execute on the fixture data, with live OpenRouter calls for the LLM steps.
// Output: docs/INSIGHTS_REVIEW.md  (+ docs/samples/fixtures-run.json with the raw results).
// Usage: node --env-file=.env.local scripts/fixtures-run.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { runNode, resetStatic } from '../tests/helpers/n8n-sim.mjs';
import { computeFacts, signalValues, buildOpportunities, scoreLead, globalExclusion, categoryMatch, reviewInsightValue, SCORE } from '../lib/insights/core.mjs';

const KEY = process.env.OPENROUTER_API_KEY;
if (!KEY) throw new Error('OPENROUTER_API_KEY is required');
const MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
const PLANNER = process.env.OPENROUTER_PLANNER_MODEL || MODEL;
const FALLBACK = (process.env.OPENROUTER_FALLBACK_MODELS || '').split(',').map((s) => s.trim()).filter(Boolean);
const NOW = Date.parse(process.env.FIXTURE_NOW || '2026-10-10T12:00:00Z');
const OFFER = 'Wasla: finds B2B clients for agencies and sends personalized WhatsApp messages';
const STYLE_EXAMPLES = [
  'أهلا يا فريق [اسم النشاط]، عملاءكم دايما بيشكروا في الأفكار الجديدة اللي بتقدموها. إحنا عاملين أداة اسمها وصلة بتجيب لوكالات التسويق شركات محتاجة خدماتها فعلا، ومع كل شركة رسالة جاهزة تتبعت على واتساب. تحبوا أبعتلكم 10 شركات مناسبة لشغلكم ببلاش تشوفوها بنفسكم؟ محمد من وصلة',
  'أهلا، بنساعد وكالات التسويق في إسكندرية يلاقوا شركات محتاجة خدماتهم، ونجهز لكل شركة رسالة شخصية تتبعت على واتساب. لو حابين، أبعتلكم 10 شركات مناسبة لتخصصكم ببلاش تجربوا بيها. محمد من وصلة',
];
const OFFER_PROFILE = {
  style_examples: STYLE_EXAMPLES, // the Wasla organization's own style references (per-organization, not in the global prompt)
  what_we_sell: 'وصلة: بتلاقي عملاء B2B للوكالات وبتكتب رسائل واتساب شخصية لكل عميل',
  ideal_customer: 'وكالات تسويق ودعاية وإعلان ومستقلين في مصر',
  problems_we_solve: 'إن الوكالة تلاقي عملاء جدد ومناسبين وتتواصل معاهم بسرعة',
  proof_points: '',
  cta_offer: 'أبعتلكم 10 شركات مناسبة لشغلكم ببلاش',
  sender_name: 'محمد',
  regions: [{ governorate: 'القاهرة' }],
};

const fx = (city, f) => JSON.parse(readFileSync(new URL(`../docs/samples/fixtures/${city}/${f}.json`, import.meta.url), 'utf8'));
const WEBHOOK = { body: { organization_id: 'org', campaign_id: 'camp', job_id: 'job', model: MODEL, planner_model: PLANNER, fallback_models: FALLBACK, locale: 'en' } };

// One OpenRouter call, shaped like the n8n HTTP node's full response.
async function chat(requestBody) {
  // like the n8n node: up to 3 tries on provider errors
  let last = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}`, 'HTTP-Referer': 'https://wasla.app', 'X-Title': 'Wasla' }, body: requestBody,
    });
    const text = await res.text();
    let body = null;
    try { body = JSON.parse(text); } catch { body = null; }
    last = { statusCode: res.status, body };
    if (res.status === 200 && body?.choices) return last;
    console.error('LLM problem', res.status, text.slice(0, 160), `(try ${attempt})`);
    await new Promise((r) => setTimeout(r, 1500 * attempt));
  }
  return last;
}
const calls = { n: 0, cost: 0 };
async function llm(items) { // sequential, like batch size small
  const out = [];
  for (const it of items) { const r = await chat(it.json.requestBody); calls.n++; calls.cost += Number(r.body?.usage?.cost) || 0; out.push({ json: r }); }
  return out;
}

// 1. signal library exactly as migrated (seed) ---------------------------------------------------------
const db = new PGlite();
await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; create schema auth;
create table auth.users (id uuid primary key, instance_id uuid, aud text, role text, email text, raw_user_meta_data jsonb default '{}'::jsonb, created_at timestamptz default now());
create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$; create publication supabase_realtime;`);
import { readdirSync } from 'node:fs';
for (const f of readdirSync(new URL('../supabase/migrations/', import.meta.url)).filter((x) => x.endsWith('.sql')).sort()) await db.exec(readFileSync(new URL(`../supabase/migrations/${f}`, import.meta.url), 'utf8'));
const defs = (await db.query('select key,name_ar,reason_low_ar,reason_high_ar,baseline,credit_cost,cost_group from public.signal_definitions where enabled order by sort_order')).rows;

// 2. the planner (real WF0 code, real LLM) ---------------------------------------------------------------
console.log('planner…');
const planBuilt = await runNode('plan_build.js', { nodes: { Webhook: [WEBHOOK], 'Get org': [{ name: 'وصلة', offer_profile: OFFER_PROFILE }], 'Get signals': defs, 'Get negatives': [] } });
const [planLlm] = await llm(planBuilt);
const planned = await runNode('plan_parse.js', { nodes: { Webhook: [WEBHOOK], 'Get signals': defs }, input: [planLlm.json] });
resetStatic();
if (!planned[0].json.ok) throw new Error('planner failed: ' + planned[0].json.error);
const draft = planned[0].json.draft;
const params = {
  keywords: draft.keywords, synonyms: draft.synonyms, locations: [{ governorate: 'القاهرة' }], ideal_lead_description: draft.ideal_lead_description,
  filters: { categories_include: draft.categories }, signals: draft.signals, opportunities: draft.opportunities, complaint_relevance: draft.complaint_relevance,
  channel: 'whatsapp', tone: 'friendly', max_results: 20, angle: draft.angles[0] || null,
};
const campaign = { id: 'camp', parameters: params };
const org = { name: 'وصلة', offer_profile: OFFER_PROFILE };

const results = { planner: { model: PLANNER, draft }, cities: {} };

async function runCity(city) {
  const places = fx(city, 'places');
  const reviews = fx(city, 'reviews');
  const byPlace = (id) => reviews.filter((r) => r.placeId === id);
  console.log(city, 'normalize + fit…');

  // 3a. every place gets a gate verdict AND an LLM fit label (second opinion), so nothing is hidden
  const norm = await runNode('normalize.js', { nodes: {
    Webhook: [WEBHOOK], 'Get campaign': [campaign], 'Get job': [{ counts: { lead_cap: 20, delivered: 0 } }], 'Get org': [org],
    'Get staging': places.map((p) => ({ external_id: p.placeId, raw: p })), 'Get known leads': [], 'Get cooldown': [], 'Get negatives': [],
  } });
  const gate = new Map();
  for (const p of places) {
    const cats = [p.categoryName, ...(p.categories || [])].filter(Boolean);
    if (p.permanentlyClosed || p.temporarilyClosed) gate.set(p.placeId, { pass: false, why: 'closed' });
    else if (globalExclusion(cats)) gate.set(p.placeId, { pass: false, why: `global:${globalExclusion(cats).group}` });
    else if (!categoryMatch(cats, params.filters.categories_include).ok) gate.set(p.placeId, { pass: true, why: 'outside-categories', outside: true });
    else gate.set(p.placeId, { pass: true, why: '' });
  }
  const judgeLlm = await llm(norm);
  const fitRun = await runNode('fit_apply.js', { nodes: { Webhook: [WEBHOOK], Normalize: norm.map((c) => c.json) }, input: judgeLlm.map((x) => x.json) });
  const kept = fitRun[0].json.p_leads; // passed gates and fit check (fit or maybe)
  const droppedFit = fitRun[0].json.dropped;

  // ONE source of truth: the label the pipeline itself used (fit_apply.judged). Places the gates removed never reached the fit check.
  const judgedBy = new Map(fitRun[0].json.judged.map((x) => [x.place_id, x]));
  const placeTable = places.map((p) => ({ name: p.title, category: p.categoryName, categories: p.categories || [], rating: p.totalScore, reviews: p.reviewsCount, claim: p.claimThisBusiness, gate: gate.get(p.placeId), decision: judgedBy.get(p.placeId) || null, placeId: p.placeId }));

  // 3b. signals, facts, opportunities for the kept leads (real WF2b nodes; real review analysis LLM)
  console.log(city, 'signals…');
  const links = kept.map((l, i) => ({ lead_id: `l${i}`, fit: l.fit, fit_reason: l.fit_reason, leads: { id: `l${i}`, business_name: l.business_name, google_place_id: l.google_place_id, website: l.website, reviews_count: l.reviews_count, rating: l.rating, raw: l.raw } }));
  const names = places.map((p) => ({ business_name: p.title }));
  const sigNodes = { Webhook: [WEBHOOK], 'Get job': [{ credits_reserved: 1000, counts: { new: 0 } }], 'Get campaign': [campaign], 'Get org': [org], 'Reviews cost': [{ data: 1 }], 'Get campaign leads': links, 'Get fresh insights': [], 'Get org names': names };
  const plan = await runNode('signals_plan.js', { nodes: sigNodes });
  const withReviews = plan[0].json.targets.filter((t) => byPlace(t.place_id).length);
  const reviewRows = withReviews.flatMap((t) => byPlace(t.place_id));
  const group = withReviews.length ? await runNode('signals_group_reviews.js', { nodes: { ...sigNodes, 'Plan signals': [{ ...plan[0].json, targets: withReviews }] }, input: [{ statusCode: 200, body: reviewRows }] }) : [];
  const groupJ = group.map((g) => g.json).filter((g) => g.lead_id);
  const llmItems = groupJ.filter((g) => g.llm);
  const insightLlm = await llm(llmItems.map((g) => ({ json: { requestBody: g.requestBody } })));
  const parsed = groupJ.length ? await runNode('signals_parse.js', { nodes: { ...sigNodes, 'Plan signals': [{ ...plan[0].json, targets: withReviews }], 'Group reviews': groupJ, 'OpenRouter insights': insightLlm.map((x) => x.json) } }) : [{ json: { rows: [], insightRows: [], byLead: [] } }];
  const parsedJ = parsed[0].json;
  const opps = await runNode('signals_opps.js', { nodes: { ...sigNodes, 'Parse signals': [parsedJ] } });
  const oppByLead = new Map(opps[0].json.rows.map((r) => [r.lead_id, r]));

  // 3c. score = the SQL function's mirror (same constants), with the campaign weights
  const signalRows = new Map(); // lead -> {key: {value}}
  for (const r of [...plan[0].json.freeRows, ...parsedJ.rows]) { if (!signalRows.has(r.lead_id)) signalRows.set(r.lead_id, {}); signalRows.get(r.lead_id)[r.signal_key] = r.normalized; }
  const baselineKeys = new Set(defs.filter((d) => d.baseline).map((d) => d.key));
  const scored = links.map((l) => {
    const sv = signalRows.get(l.lead_id) || {};
    const sigs = params.signals.filter((s) => sv[s.key]).map((s) => ({ key: s.key, weight: s.weight, value: sv[s.key].value, baseline: baselineKeys.has(s.key), emphasis: !!s.emphasis }));
    return { lead_id: l.lead_id, ...scoreLead({ fit: l.fit, signals: sigs }), sigs };
  });

  // 3d. first messages (real WF3 nodes, real LLM, tact validation + one retry)
  console.log(city, 'messages…');
  const insightsForGen = parsedJ.insightRows.map((r) => ({ lead_id: r.lead_id, facts: r.facts, analysis: r.analysis }));
  const genLinks = links.map((l) => {
    const o = oppByLead.get(l.lead_id);
    const sc = scored.find((s) => s.lead_id === l.lead_id);
    return { opportunity_score: sc?.score ?? null, score_reasons: [], opportunities: o?.opportunities || [], selected_opportunity: o?.selected_opportunity || null, fit: l.fit, leads: { ...l.leads, category: l.leads.raw?.categoryName, district: l.leads.raw?.neighborhood, city: l.leads.raw?.city, status: 'new', whatsapp_eligible: true } };
  });
  const genNodes = { Webhook: [WEBHOOK], 'Claim job': [{ credits_reserved: 100 }], 'Get campaign': [campaign], 'Get org': [org], 'Get campaign leads': genLinks, 'Get messages': [], 'Get insights': insightsForGen, 'Get cooldown': [] };
  const built = genLinks.length ? await runNode('gen_build.js', { nodes: genNodes }) : [];
  const messages = new Map();
  // real WF3 order: build -> OpenRouter -> Validate message -> Dedupe openings (whole batch) -> one retry for rejected ones -> Validate retry
  resetStatic();
  const todo = built.filter((x) => !x.json.noop);
  const first = [];
  for (const item of todo) {
    const r1 = await chat(item.json.requestBody); calls.n++; calls.cost += Number(r1.body?.usage?.cost) || 0;
    const v = await runNode('gen_validate.js', { nodes: { 'Select and build': [item.json] }, input: [r1], prev: 'OpenRouter' });
    first.push(v.json);
  }
  const deduped = todo.length ? (await runNode('gen_dedupe.js', { nodes: { Webhook: [WEBHOOK], 'Select and build': todo.map((x) => x.json) }, input: first })).map((x) => x.json) : [];
  for (let i = 0; i < todo.length; i++) {
    const item = todo[i];
    let v = deduped[i];
    let attempts = 1;
    if (v.retry) {
      const r2 = await chat(v.requestBody); calls.n++; calls.cost += Number(r2.body?.usage?.cost) || 0;
      const second = await runNode('gen_validate.js', { nodes: { 'Select and build': [item.json], 'Validate message': [v] }, input: [r2], prev: 'OpenRouter retry' });
      v = second.json;
      attempts = 2;
    }
    messages.set(item.json.lead_id, { ok: v.ok, message: v.message || null, angle: v.angle || null, reason: v.reason || null, attempts, opportunity: item.json.opportunity_type });
  }

  return { genLinks, insightsForGen, places: placeTable, funnel: { staged: places.length, ...norm[0].json.all.stats, judged: norm[0].json.all.toJudge.length, droppedFit, kept: kept.length }, kept, links, scored, insights: parsedJ.insightRows, opps: opps[0].json.rows, signalRows: Object.fromEntries(signalRows), messages: Object.fromEntries(messages) };
}

for (const city of ['alexandria', 'cairo']) results.cities[city] = await runCity(city);
results.llm = { calls: calls.n, cost_usd: Math.round(calls.cost * 1e5) / 1e5, models: { writer: MODEL, planner: PLANNER } };
writeFileSync(new URL('../docs/samples/fixtures-run.json', import.meta.url), JSON.stringify(results, null, 1));
console.log('done', results.llm);

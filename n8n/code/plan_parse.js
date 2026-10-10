// WF0 "Parse planner": validates the LLM output against the signal library and clamps everything (spec 6.0).
/*__INSIGHTS__*/
const res = $input.first().json;
const defs = $('Get signals').all().map((i) => i.json).filter((d) => d && d.key);
const allowed = new Map(defs.map((d) => [d.key, d]));
const body = $('Webhook').first().json.body;

const fail = (msg) => ({ json: { ok: false, error: msg, job_id: body.job_id } });
if (!res || res.statusCode < 200 || res.statusCode >= 300 || !res.body || !res.body.choices) {
  return [fail('planner_unavailable')];
}
const raw = res.body.choices[0]?.message?.content || '';
let data;
try {
  data = JSON.parse(raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim());
} catch (e) {
  return [fail('planner_bad_output')];
}

const str = (v, n) => (typeof v === 'string' ? stripInvisible(v).slice(0, n) : '');
const strs = (a, max, n) => {
  const seen = new Set();
  const out = [];
  for (const x of Array.isArray(a) ? a : []) {
    const v = str(x, n);
    if (v && !seen.has(norm(v))) { seen.add(norm(v)); out.push(v); }
    if (out.length >= max) break;
  }
  return out;
};
const loc = (arr, max) => (Array.isArray(arr) ? arr : [])
  .map((l) => ({ governorate: str(l?.governorate, 60), city: str(l?.city, 60), district: str(l?.district, 60) }))
  .filter((l) => l.governorate || l.city || l.district)
  .slice(0, max);

const signals = [];
const seen = new Set();
for (const s of Array.isArray(data.signals) ? data.signals : []) {
  const key = str(s?.key, 60);
  let weight = Math.round(Math.max(-100, Math.min(100, Number(s?.weight))));
  if (!allowed.has(key) || seen.has(key) || !Number.isFinite(weight) || weight === 0) continue;
  seen.add(key);
  const baseline = !!allowed.get(key).baseline;
  const emphasis = baseline && s.emphasis === true;
  if (baseline && !emphasis) weight = Math.sign(weight) * Math.min(Math.abs(weight), SCORE.baselineMaxWeight);
  signals.push({ key, weight, reason_ar: str(s.reason_ar, 120), ...(emphasis ? { emphasis: true } : {}) });
}

const opportunities = [];
const seenOpp = new Set();
for (const o of Array.isArray(data.opportunities) ? data.opportunities : []) {
  const type = str(o?.type, 40);
  if (!OPPORTUNITY_TYPES.includes(type) || seenOpp.has(type)) continue;
  seenOpp.add(type);
  // Each opportunity must state the causal link to the offer; one without it (or without an angle) is dropped.
  const why = str(o.why_it_means_they_need_the_offer, 240);
  if (!why || !str(o.angle_ar, 220)) continue;
  opportunities.push({ type, angle_ar: str(o.angle_ar, 220), why_it_means_they_need_the_offer: why });
}
const complaintRelevance = str(data.complaint_relevance, 300) || null;
// A review-theme opportunity without a stated relevance would mention complaints the offer cannot help with.
const oppFinal = opportunities.filter((o) => o.type !== 'review_theme' || complaintRelevance).slice(0, 6);

const queries = strs(data.queries ?? data.keywords, 4, 60);
const draft = {
  keywords: queries,
  ideal_lead_description: str(data.ideal_lead_description, 300),
  synonyms: strs(data.synonyms, 4, 60).filter((x) => !queries.some((q) => norm(q) === norm(x))),
  categories: strs(data.categories, 20, 60),
  locations: loc(data.locations, 8),
  nearby_locations: loc(data.nearby_locations, 4),
  signals: signals.slice(0, 6),
  opportunities: oppFinal,
  complaint_relevance: complaintRelevance,
  angles: (Array.isArray(data.angles) ? data.angles : [])
    .map((a) => ({ title_ar: str(a?.title_ar, 80), description_ar: str(a?.description_ar, 300) }))
    .filter((a) => a.title_ar)
    .slice(0, 3),
};
if (!draft.keywords.length) return [fail('planner_no_keywords')];

const u = res.body.usage || {};
return [{
  json: {
    ok: true,
    draft,
    job_id: body.job_id,
    tokens_in: u.prompt_tokens || 0,
    tokens_out: u.completion_tokens || 0,
    cost: Number(u.cost) || 0,
    model: res.body.model || body.model,
  },
}];

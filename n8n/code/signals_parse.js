// WF2b "Parse signals": review analysis (LLM) + facts -> lead_signals rows (campaign signals only) and lead_insights rows (spec 6.3b).
/*__INSIGHTS__*/
const body = $('Webhook').first().json.body;
const plan = $('Plan signals').first().json;
const groups = $('Group reviews').all().map((i) => i.json).filter((g) => g && g.lead_id);
let llmOut = [];
try { llmOut = $('OpenRouter insights').all(); } catch (e) { llmOut = []; }
const llmGroups = groups.filter((g) => g.llm);

const rows = [];
const insightRows = [];
const usage = { in: 0, out: 0, cost: 0, model: null };
const analysisByLead = new Map();
const on = new Set(plan.on);

const str = (v, n) => (typeof v === 'string' ? stripInvisible(v).slice(0, n) : '');
const themes = (a, withHelp) => (Array.isArray(a) ? a : []).slice(0, 4).map((x) => ({
  theme: str(x && x.theme, 60), count: Math.max(1, Math.min(10, Math.round(Number(x && x.count) || 1))),
  ...(withHelp ? { offer_can_help: x && x.offer_can_help === true } : {}),
})).filter((x) => x.theme);

llmGroups.forEach((g, j) => {
  const r = (llmOut[j] || {}).json || {};
  const u = (r.body && r.body.usage) || {};
  usage.in += u.prompt_tokens || 0;
  usage.out += u.completion_tokens || 0;
  usage.cost += Number(u.cost) || 0;
  usage.model = (r.body && r.body.model) || usage.model;
  if (!(r.statusCode >= 200 && r.statusCode < 300) || !r.body || !r.body.choices) { analysisByLead.set(g.lead_id, { skipped: 'llm_failed' }); return; }
  let d;
  try { d = JSON.parse((r.body.choices[0]?.message?.content || '').replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()); } catch (e) { analysisByLead.set(g.lead_id, { skipped: 'llm_bad_json' }); return; }
  // confidence can only be lowered by us, never raised: few texts => low
  const ours = g.n_texts < 3 ? 'low' : g.n_texts < 6 ? 'medium' : 'high';
  const rank = { low: 0, medium: 1, high: 2 };
  const theirs = ['low', 'medium', 'high'].includes(d.confidence) ? d.confidence : 'low';
  analysisByLead.set(g.lead_id, {
    praised: themes(d.praised, false),
    complaints: themes(d.complaints, true),
    customer_values: str(d.customer_values, 160),
    summary_ar: str(d.summary_ar, 220),
    summary_en: str(d.summary_en, 220),
    confidence: rank[theirs] <= rank[ours] ? theirs : ours,
    n_texts: g.n_texts,
  });
});

const now = new Date().toISOString();
const mk = (lead_id, signal_key, value, raw, extra) => ({
  organization_id: body.organization_id,
  lead_id,
  signal_key,
  raw,
  normalized: { value: Math.max(0, Math.min(1, Math.round(value * 1000) / 1000)), ...(extra || {}) },
  source: 'compass/google-maps-reviews-scraper',
  job_id: body.job_id,
  collected_at: now,
});

for (const g of groups) {
  const analysis = analysisByLead.get(g.lead_id) || (g.skipped ? { skipped: g.skipped } : { skipped: 'no_analysis' });
  insightRows.push({ organization_id: body.organization_id, lead_id: g.lead_id, facts: g.facts, analysis, job_id: body.job_id, computed_at: now });
  const vals = signalValues(g.facts);
  for (const k of ['activity', 'owner_engagement', 'unanswered_low_reviews', 'rating_trend', 'new_business']) {
    if (on.has(k) && vals[k] !== undefined) rows.push(mk(g.lead_id, k, vals[k], { n_reviews: g.facts.n_reviews_fetched }));
  }
  if (on.has('review_insights')) {
    const ri = reviewInsightValue(analysis);
    if (ri) rows.push(mk(g.lead_id, 'review_insights', ri.value, { n_reviews: g.facts.n_reviews_fetched, n_texts: g.n_texts, confidence: analysis.confidence || null }, ri.theme ? { label_ar: `التقييمات تشير إلى: ${String(ri.theme).slice(0, 40)}` } : {}));
  }
}

return [{ json: { rows, insightRows, chargedLeads: groups.length, usage, byLead: groups.map((g) => ({ lead_id: g.lead_id, facts: g.facts, analysis: analysisByLead.get(g.lead_id) || null })) } }];

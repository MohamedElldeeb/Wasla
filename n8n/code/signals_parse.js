// WF2b "Parse signals": collect business_age rows and review_insights rows (LLM) for the paid signals.
const body = $('Webhook').first().json.body;
const groups = $('Group reviews').all().map((i) => i.json);
let llmOut = [];
try { llmOut = $('OpenRouter insights').all(); } catch (e) { llmOut = []; }
const llmGroups = groups.filter((g) => g.llm);

const rows = [];
const usage = { in: 0, out: 0, cost: 0, model: null };
const clamp01 = (v) => Math.max(0, Math.min(1, Number(v) || 0));

groups.forEach((g) => { if (g.ageRow) rows.push(g.ageRow); });

llmGroups.forEach((g, j) => {
  const r = (llmOut[j] || {}).json || {};
  const u = (r.body && r.body.usage) || {};
  usage.in += u.prompt_tokens || 0;
  usage.out += u.completion_tokens || 0;
  usage.cost += Number(u.cost) || 0;
  usage.model = (r.body && r.body.model) || usage.model;
  if (!(r.statusCode >= 200 && r.statusCode < 300) || !r.body || !r.body.choices) return;
  let d;
  try { d = JSON.parse((r.body.choices[0]?.message?.content || '').replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()); } catch (e) { return; }
  const top = typeof d.top_complaint_ar === 'string' && d.top_complaint_ar.trim() ? d.top_complaint_ar.trim().slice(0, 40) : null;
  const normalized = { value: Math.round(clamp01(d.complaint_level) * 1000) / 1000 };
  if (top) normalized.label_ar = `الريفيوهات بتشتكي من ${top}`;
  rows.push({
    organization_id: body.organization_id,
    lead_id: g.lead_id,
    signal_key: 'review_insights',
    raw: {
      summary_ar: String(d.summary_ar || '').slice(0, 200),
      praise: Array.isArray(d.praise) ? d.praise.slice(0, 3).map((x) => String(x).slice(0, 60)) : [],
      complaints: Array.isArray(d.complaints) ? d.complaints.slice(0, 3).map((x) => String(x).slice(0, 60)) : [],
      n_reviews: g.n_reviews,
      n_texts: g.n_texts,
    },
    normalized,
    source: 'compass/google-maps-reviews-scraper+llm',
    job_id: body.job_id,
    collected_at: new Date().toISOString(),
  });
});

return [{ json: { rows, chargedLeads: groups.length, usage } }];

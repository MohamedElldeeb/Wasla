/*__INSIGHTS__*/
// WF2 "Apply fit": merge the LLM fit labels into the candidates, remove "not fit" (never charged), keep "maybe" (marked), cap at what is still needed.
const body = $('Webhook').first().json.body;
const norm0 = $('Normalize').all().map((i) => i.json);
const all = norm0[0].all;
const labels = new Map(); // candidate index -> {fit, reason}
const usage = { in: 0, out: 0, cost: 0, model: null };
let unchecked = 0;

if (!norm0[0].noChunks) {
  const outs = $input.all().map((i) => i.json || {});
  norm0.forEach((chunk, k) => {
    const { data: parsed, usage: u } = parseLlm(outs[k]);
    usage.in += u.in; usage.out += u.out; usage.cost += u.cost; usage.model = u.model || usage.model;
    const byI = new Map(((parsed && parsed.results) || []).map((x) => [Number(x.i), x]));
    for (const i of chunk.idx) {
      const x = byI.get(i);
      if (x && ['fit', 'maybe', 'not_fit'].includes(x.fit)) labels.set(i, { fit: x.fit, reason: String(x.reason || '').slice(0, 200) });
      else { labels.set(i, { fit: 'maybe', reason: 'unchecked' }); unchecked++; } // never silently pass or drop: keep as "maybe" (score capped)
    }
  });
}

const kept = [];
const dropped = [];
let removedNotFit = 0;
let removedCategory = 0;
const learned = new Set();
all.toJudge.forEach((c, i) => {
  const lab = c.probe_fit || labels.get(i) || { fit: 'maybe', reason: 'unchecked' };
  if (lab.fit === 'not_fit') { removedNotFit++; dropped.push({ name: c.lead.business_name, reason: lab.reason }); return; }
  // Outside the allowed categories: only a clear "fit" is kept; the Maps category is then learned so later rounds accept it directly.
  if (c.category_mismatch) {
    if (lab.fit !== 'fit') { removedCategory++; return; }
    const cat = c.lead.category;
    if (cat) learned.add(cat);
  }
  if (kept.length >= all.remaining) return;
  kept.push({ ...c.lead, fit: lab.fit === 'fit' ? 'fit' : 'maybe', fit_reason: lab.reason || null });
});

return [{
  json: {
    p_org: body.organization_id,
    p_campaign: body.campaign_id,
    p_leads: kept,
    p_include_previous: all.includePrevious,
    stats: { ...all.stats, removed_category: all.stats.removed_category + removedCategory, removed_not_fit: removedNotFit, fit_unchecked: unchecked, judged: all.toJudge.length },
    learned_categories: [...learned],
    globalGroups: all.globalGroups,
    dropped: dropped.slice(0, 30),
    usage,
  },
}];

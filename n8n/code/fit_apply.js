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
      if (x && ['fit', 'maybe', 'not_fit'].includes(x.fit)) labels.set(i, { fit: x.fit, evidence: ['category', 'description', 'website', 'name_only', 'none'].includes(x.evidence) ? x.evidence : 'none', reason: String(x.reason || '').slice(0, 200) });
      else { labels.set(i, { fit: 'maybe', reason: 'unchecked' }); unchecked++; } // never silently pass or drop: keep as "maybe" (score capped)
    }
  });
}

const kept = [];
const dropped = [];
let removedNotFit = 0;
let removedCategory = 0;
const judged = []; // every judged place with its label and decision (shown in the review files; kept small)
all.toJudge.forEach((c, i) => {
  const lab = c.probe_fit || labels.get(i) || { fit: 'maybe', evidence: 'none', reason: 'unchecked' };
  // Inside the allowed categories fit or maybe is kept. Outside them only a "fit" backed by the categories, description or website is kept;
  // evidence from the name alone is no evidence, and nothing is ever learned from the model.
  const d = decideFit({ label: lab, inside: !c.category_mismatch });
  judged.push({ name: c.lead.business_name, category: c.lead.category, place_id: c.lead.google_place_id, inside: !c.category_mismatch, fit: lab.fit, evidence: lab.evidence || null, reason: lab.reason, keep: d.keep, why: d.why || null });
  if (!d.keep) {
    if (d.why === 'not_fit') { removedNotFit++; dropped.push({ name: c.lead.business_name, reason: lab.reason }); } else { removedCategory++; }
    return;
  }
  if (kept.length >= all.remaining) return;
  kept.push({ ...c.lead, fit: d.fit, fit_reason: lab.reason || null });
});

return [{
  json: {
    p_org: body.organization_id,
    p_campaign: body.campaign_id,
    p_leads: kept,
    p_include_previous: all.includePrevious,
    stats: { ...all.stats, removed_category: all.stats.removed_category + removedCategory, removed_not_fit: removedNotFit, fit_unchecked: unchecked, judged: all.toJudge.length },
    judged,
    globalGroups: all.globalGroups,
    dropped: dropped.slice(0, 30),
    usage,
  },
}];

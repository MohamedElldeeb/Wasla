// WF0b "Probe judge": labels (fit / maybe / not fit) for the probe places, the fit share, and whether the queries need a rewrite.
/*__INSIGHTS__*/
const chunks = $('Probe collect __N__').all().map((i) => i.json);
const all = chunks[0].all;
const labels = new Map();
const usage = { in: 0, out: 0, cost: 0, model: null };
if (!chunks[0].noChunks) {
  const outs = $input.all().map((i) => i.json || {});
  chunks.forEach((c, k) => {
    const { data, usage: u } = parseLlm(outs[k]);
    usage.in += u.in; usage.out += u.out; usage.cost += u.cost; usage.model = u.model || usage.model;
    const by = new Map(((data && data.results) || []).map((x) => [Number(x.i), x]));
    for (const i of c.idx) {
      const x = by.get(i);
      labels.set(i, x && ['fit', 'maybe', 'not_fit'].includes(x.fit) ? { fit: x.fit, reason: String(x.reason || '').slice(0, 160) } : { fit: 'maybe', reason: 'unchecked' });
    }
  });
}
const places = all.places.map((c, i) => ({ raw: c.raw, name: c.raw.title, category: c.raw.categoryName || null, area: c.ask.area, ...(labels.get(i) || { fit: 'maybe', reason: 'unchecked' }) }));
const fit = places.filter((x) => x.fit === 'fit').length;
const judged = places.length;
const share = judged ? fit / judged : 0;
// Rewrite when fewer than half fit. If the gates already removed most of what was found, that counts as "not fitting" too.
const needsRewrite = judged >= 3 ? share < 0.5 : all.raw >= 3;
return [{ json: { places, share, judged, fit, raw: all.raw, removed: all.removed, ideal: all.ideal, offerText: all.offerText, usage, needsRewrite } }];

// WF0b "Probe final": merge both passes into the job result: the fit sample shown to the user and the fit places kept for the full run.
/*__INSIGHTS__*/
const body = $('Webhook').first().json.body;
const j1 = $('Probe judge 1').first().json;
let j2 = null;
let rw = null;
try { j2 = $('Probe judge 2').first().json; rw = $('Parse rewrite').first().json; } catch (e) { j2 = null; rw = null; }

const merged = new Map();
for (const j of [j1, j2]) for (const x of (j && j.places) || []) if (x.raw && x.raw.placeId && !merged.has(x.raw.placeId)) merged.set(x.raw.placeId, x);
const places = [...merged.values()];
const fit = places.filter((x) => x.fit === 'fit').length;
const raw = (j1.raw || 0) + (j2 ? j2.raw || 0 : 0);
const sum = (k) => j1.usage[k] + (j2 ? j2.usage[k] : 0) + (rw ? rw.usage[k] : 0);
const usage = { in: sum('in'), out: sum('out'), cost: sum('cost'), model: j1.usage.model };
const share = places.length ? fit / places.length : 0;
const result = {
  places: places.map((x) => ({ raw: x.raw, name: x.name, category: x.category, area: x.area, fit: x.fit, reason: x.reason })),
  fit_share: Math.round(share * 100) / 100,
  judged: places.length,
  fit,
  raw_places: raw,
  removed: j1.removed,
  suggested_categories: [...new Set([...(j1.suggested || []), ...(j2 ? j2.suggested || [] : [])])].slice(0, 8),
  rewritten: !!(rw && rw.rewritten),
  queries: rw && rw.rewritten ? rw.queries : null,
};
return [{ json: { job_id: body.job_id, result, usage, empty: raw === 0 } }];

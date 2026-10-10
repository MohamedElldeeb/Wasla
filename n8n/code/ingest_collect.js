// WF1 "Collect": flatten Apify responses into staging rows (trimmed raw, deduped by place id), track which searches hit their depth
// cap (saturated => a deeper round makes sense), and carry the fit-labelled places of the latest probe into the staging area.
/*__INSIGHTS__*/
const body = $('Webhook').first().json.body;
const job = $('Get job').first().json;
const plans = $('Plan queries').all().map((i) => i.json);
const outs = $input.all();
const probeRows = $('Get probe').all().map((i) => i.json).filter((r) => r && r.result);

const KEEP = ['title', 'categoryName', 'categories', 'address', 'neighborhood', 'street', 'city', 'state', 'countryCode',
  'website', 'phone', 'phoneUnformatted', 'location', 'totalScore', 'reviewsCount', 'permanentlyClosed',
  'temporarilyClosed', 'placeId', 'url', 'openingHours', 'claimThisBusiness', 'imagesCount', 'description', 'subTitle', 'ownerDescription'];

const rows = new Map();
const errors = [];
const perQuery = new Map(); // normalized search string -> places returned
let found = 0;

const add = (x, plan, extra) => {
  if (!x || !x.placeId) return;
  if (rows.has(x.placeId)) return;
  const raw = {};
  for (const k of KEEP) if (x[k] !== undefined) raw[k] = x[k];
  raw._district = plan.district;
  raw._city = plan.city;
  raw._governorate = plan.governorate;
  if (extra) Object.assign(raw, extra);
  rows.set(x.placeId, { organization_id: body.organization_id, job_id: body.job_id, source: 'google_maps', external_id: x.placeId, raw });
};

// Places the probe already judged as fit are kept (nothing is wasted); they carry their label.
if ((Number(body.round) || 1) === 1) {
  const pr = probeRows[0] && probeRows[0].result;
  for (const pl of (pr && pr.places) || []) {
    if (pl && pl.raw && (pl.fit === 'fit' || pl.fit === 'maybe')) add(pl.raw, { district: pl.raw._district || null, city: pl.raw._city || null, governorate: pl.raw._governorate || null }, { _fit: { fit: pl.fit, reason: pl.reason || null } });
  }
}

outs.forEach((it, idx) => {
  const r = it.json || {};
  const plan = plans[idx] || {};
  if (typeof r.statusCode === 'number' && r.statusCode >= 200 && r.statusCode < 300 && Array.isArray(r.body)) {
    for (const x of r.body) {
      if (!x || !x.placeId) continue;
      found++;
      const key = norm(x.searchString || '');
      perQuery.set(key, (perQuery.get(key) || 0) + 1);
      add(x, plan);
    }
  } else {
    errors.push(String(r.statusCode || (r.error && (r.error.message || r.error)) || 'unknown'));
  }
});

const counts0 = job.counts || {};
const round = Number(body.round) || (plans[0] && plans[0].round) || 1;
const planRoundUsed = (plans[0] && plans[0].round) || round;
const done = new Set(counts0.done_queries || []);
const saturated = new Set(counts0.saturated || []);
const searchRows = [];
for (const plan of plans) {
  for (const q of plan.queries || []) {
    const n = perQuery.get(norm(q)) || 0;
    done.add(`${norm(q)}|${plan.round}`);
    if (n >= Math.ceil(plan.depth * 0.9)) saturated.add(q);
    searchRows.push({ organization_id: body.organization_id, campaign_id: body.campaign_id, job_id: body.job_id, query: q, area: plan.area, round: plan.round, places_found: n });
  }
}
const mode = counts0.mode || 'normal';
const counts = {
  ...counts0,
  round: planRoundUsed,
  mode,
  lead_cap: plans[0] ? plans[0].leadCap : counts0.lead_cap,
  done_queries: [...done].slice(-200),
  saturated: [...saturated].slice(-50),
  raw_total: (Number(counts0.raw_total) || 0) + rows.size,
  raw_round: rows.size,
  queries: (Number(counts0.queries) || 0) + searchRows.length,
  progress_note: `round_${planRoundUsed}`,
};

return [{
  json: {
    rows: [...rows.values()],
    searchRows,
    found,
    unique: rows.size,
    errors,
    allFailed: outs.length > 0 && errors.length === outs.length,
    counts,
  },
}];

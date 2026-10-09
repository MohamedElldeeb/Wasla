// WF1 "Collect": flatten Apify responses into staging rows (trimmed raw, deduped by place id).
const body = $('Webhook').first().json.body;
const plans = $('Plan queries').all().map((i) => i.json);
const outs = $input.all();

const KEEP = ['title', 'categoryName', 'categories', 'address', 'neighborhood', 'street', 'city', 'state', 'countryCode',
  'website', 'phone', 'phoneUnformatted', 'location', 'totalScore', 'reviewsCount', 'permanentlyClosed',
  'temporarilyClosed', 'placeId', 'url', 'openingHours'];

const rows = new Map();
const errors = [];
let found = 0;
outs.forEach((it, idx) => {
  const r = it.json || {};
  const plan = plans[idx] || {};
  if (typeof r.statusCode === 'number' && r.statusCode >= 200 && r.statusCode < 300 && Array.isArray(r.body)) {
    for (const x of r.body) {
      if (!x || !x.placeId) continue;
      found++;
      if (rows.has(x.placeId)) continue;
      const raw = {};
      for (const k of KEEP) if (x[k] !== undefined) raw[k] = x[k];
      raw._district = plan.district;
      raw._city = plan.city;
      raw._governorate = plan.governorate;
      rows.set(x.placeId, {
        organization_id: body.organization_id,
        job_id: body.job_id,
        source: 'google_maps',
        external_id: x.placeId,
        raw,
      });
    }
  } else {
    errors.push(String(r.statusCode || (r.error && (r.error.message || r.error)) || 'unknown'));
  }
});

return [{ json: { rows: [...rows.values()], found, unique: rows.size, errors, allFailed: outs.length > 0 && errors.length === outs.length } }];

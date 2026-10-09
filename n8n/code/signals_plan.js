// WF2b "Plan signals": compute FREE signals from data already collected and pick leads that need
// the paid review scrape (capped by the credits still reserved on the job).
//
// Normalized value convention: value in 0..1 where 1 = the signal's "high" state
//   has_website : 1 = has a website, 0 = none
//   size_proxy  : 0.60 * reviews (log scale, ~2000 reviews = 1) + 0.15 * rating above 3 + 0.25 * extra branches (3+ = 1)
const body = $('Webhook').first().json.body;
const job = $('Get job').first().json;
const campaign = $('Get campaign').first().json;
const perLeadRes = $('Reviews cost').first().json;
const perLead = Number(perLeadRes !== null && typeof perLeadRes === 'object' ? (perLeadRes.data ?? Object.values(perLeadRes)[0]) : perLeadRes) || 0;

const campaignSignals = ((campaign.parameters || {}).signals || []).filter((s) => s && Number(s.weight) !== 0);
const on = new Set(campaignSignals.map((s) => s.key));
const wantsInsights = on.has('review_insights');
const wantsAge = on.has('business_age');

const links = $('Get campaign leads').all().map((i) => i.json).filter((r) => r.leads);
const fresh = new Set($('Get fresh signals').all().map((i) => `${i.json.lead_id}|${i.json.signal_key}`));

const baseName = (n) => String(n || '').split(/\s[-–|]\s|\(|\|/)[0].toLowerCase().replace(/[^\p{L}\p{N}]+/g, ' ').trim();
const branchCount = new Map();
for (const r of $('Get org names').all()) {
  const k = baseName(r.json.business_name);
  if (k) branchCount.set(k, (branchCount.get(k) || 0) + 1);
}

const now = new Date().toISOString();
const mk = (lead_id, signal_key, value, raw) => ({
  organization_id: body.organization_id,
  lead_id,
  signal_key,
  raw,
  normalized: { value: Math.max(0, Math.min(1, Math.round(value * 1000) / 1000)) },
  source: signal_key === 'has_website' || signal_key === 'size_proxy' ? 'google_maps_data' : 'compass/google-maps-reviews-scraper',
  job_id: body.job_id,
  collected_at: now,
});

const freeRows = [];
for (const r of links) {
  const l = r.leads;
  if (on.has('has_website')) freeRows.push(mk(l.id, 'has_website', l.website ? 1 : 0, { has_website: !!l.website }));
  if (on.has('size_proxy')) {
    const reviews = Number(l.reviews_count) || 0;
    const rating = Number(l.rating) || 0;
    const branches = Math.max(1, branchCount.get(baseName(l.business_name)) || 1);
    const rc = Math.min(1, Math.log10(1 + reviews) / 3.3);
    const rt = Math.max(0, Math.min(1, (rating - 3) / 2));
    const bc = Math.min(1, (branches - 1) / 3);
    freeRows.push(mk(l.id, 'size_proxy', 0.6 * rc + 0.15 * rt + 0.25 * bc, { reviews_count: reviews, rating, branches }));
  }
}

let targets = [];
if ((wantsInsights || wantsAge) && perLead > 0) {
  const stillFresh = (id) => (!wantsInsights || fresh.has(`${id}|review_insights`)) && (!wantsAge || fresh.has(`${id}|business_age`));
  const all = links.map((r) => r.leads).filter((l) => l.google_place_id && !stillFresh(l.id));
  const spent = Number((job.counts || {}).new) || 0;
  const affordable = Math.max(0, Math.floor((job.credits_reserved - spent) / perLead));
  targets = all.slice(0, affordable).map((l) => ({ lead_id: l.id, place_id: l.google_place_id, business_name: l.business_name, reviews_count: l.reviews_count }));
}

const reviewsRequest = {
  placeIds: targets.map((t) => t.place_id),
  maxReviews: 10,
  reviewsSort: 'newest',
  language: 'ar',
  personalData: false,
};

return [{
  json: {
    freeRows,
    targets,
    perLead,
    wantsInsights,
    wantsAge,
    hasTargets: targets.length > 0,
    reviewsRequestBody: JSON.stringify(reviewsRequest),
  },
}];

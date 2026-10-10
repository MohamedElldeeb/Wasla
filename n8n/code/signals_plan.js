// WF2b "Plan signals": compute FREE signals from data already collected and pick the leads that need the paid review scrape
// (capped by the credits still reserved on the job). Values are 0..1 where 1 = the signal's HIGH state (see lib/insights/core.mjs).
/*__INSIGHTS__*/
const body = $('Webhook').first().json.body;
const job = $('Get job').first().json;
const campaign = $('Get campaign').first().json;
const perLeadRes = $('Reviews cost').first().json;
const perLead = Number(perLeadRes !== null && typeof perLeadRes === 'object' ? (perLeadRes.data ?? Object.values(perLeadRes)[0]) : perLeadRes) || 0;

const campaignSignals = ((campaign.parameters || {}).signals || []).filter((s) => s && Number(s.weight) !== 0);
const on = new Set(campaignSignals.map((s) => s.key));
const REVIEW_SIGNALS = ['review_insights', 'activity', 'owner_engagement', 'unanswered_low_reviews', 'rating_trend', 'new_business'];
const wantsReviews = REVIEW_SIGNALS.some((k) => on.has(k));

const links = $('Get campaign leads').all().map((i) => i.json).filter((r) => r.leads);
const freshMap = new Map($('Get fresh insights').all().map((i) => i.json).filter((r) => r && r.lead_id).map((r) => [r.lead_id, r]));
const fresh = new Set(freshMap.keys());

// Branches: same brand name AND same website or phone among the organization's listings (never by name similarity alone).
const orgLeads = $('Get org names').all().map((i) => i.json);
const placeOf = (l) => ({ ...(l.raw || {}), website: l.website, reviewsCount: l.reviews_count, totalScore: l.rating });
const branchesOf = (l) => countBranches(l, orgLeads);

const now = new Date().toISOString();
const mk = (lead_id, signal_key, value, raw) => ({
  organization_id: body.organization_id,
  lead_id,
  signal_key,
  raw,
  normalized: { value: Math.max(0, Math.min(1, Math.round(value * 1000) / 1000)) },
  source: REVIEW_SIGNALS.includes(signal_key) ? 'compass/google-maps-reviews-scraper' : 'google_maps_data',
  job_id: body.job_id,
  collected_at: now,
});

const FREE = ['has_website', 'size_proxy', 'unclaimed_listing', 'profile_completeness'];
const freeRows = [];
for (const r of links) {
  const l = r.leads;
  const facts = computeFacts(placeOf(l), [], { branches: branchesOf(l) });
  const vals = signalValues(facts);
  for (const k of FREE) if (on.has(k) && vals[k] !== undefined) freeRows.push(mk(l.id, k, vals[k], { facts: { has_website: facts.has_website, total_reviews: facts.total_reviews, branches: facts.branches, unclaimed: facts.unclaimed_listing, photos: facts.images_count, has_hours: facts.has_hours } }));
}

// Leads analysed in the last 30 days (maybe for another campaign) are not scraped again and not charged: signals come from stored facts.
for (const r of links) {
  const l = r.leads;
  const st = freshMap.get(l.id);
  if (!st || !st.facts) continue;
  const vals = signalValues(st.facts);
  for (const k of REVIEW_SIGNALS) {
    if (!on.has(k)) continue;
    if (k === 'review_insights') {
      const ri = reviewInsightValue(st.analysis);
      if (ri) freeRows.push({ ...mk(l.id, k, ri.value, { cached: true }), normalized: { value: Math.round(ri.value * 1000) / 1000, ...(ri.theme ? { label_ar: `التقييمات تشير إلى: ${String(ri.theme).slice(0, 40)}` } : {}) } });
    } else if (vals[k] !== undefined) freeRows.push(mk(l.id, k, vals[k], { cached: true }));
  }
}

let targets = [];
if (wantsReviews && perLead > 0) {
  const all = links.map((r) => r.leads).filter((l) => l.google_place_id && !fresh.has(l.id));
  const spent = Number((job.counts || {}).new) || 0;
  const affordable = Math.max(0, Math.floor((job.credits_reserved - spent) / perLead));
  targets = all.slice(0, affordable).map((l) => ({ lead_id: l.id, place_id: l.google_place_id, business_name: l.business_name, reviews_count: l.reviews_count, branches: branchesOf(l), place: placeOf(l) }));
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
    wantsReviews,
    on: [...on],
    hasTargets: targets.length > 0,
    reviewsRequestBody: JSON.stringify(reviewsRequest),
  },
}];

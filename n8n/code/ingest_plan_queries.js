// WF1 "Plan queries": real-depth search rounds (spec 6.2). Requested count = DELIVERED qualified leads, so the engine keeps
// searching in rounds (deeper, synonyms, nearby districts, broad fallback) until the target is reached or results run out.
/*__INSIGHTS__*/
const body = $('Webhook').first().json.body;
const job = $('Get job').first().json;
const campaign = $('Get campaign').first().json;
const sigRes = $('Signal cost').first().json;
const past = $('Get past searches').all().map((i) => i.json).filter((r) => r && r.query);
const perLeadSignals = Number(sigRes !== null && typeof sigRes === 'object' ? (sigRes.data ?? Object.values(sigRes)[0]) : sigRes) || 0;

const p = campaign.parameters || {};
const f = p.filters || {};
const counts = job.counts || {};
const round0 = Number(body.round) || 1;
const keywords = (p.keywords || []).map((k) => stripInvisible(k)).filter(Boolean).slice(0, 4);
const synonyms = (p.synonyms || []).map((k) => stripInvisible(k)).filter(Boolean);
const locations = (p.locations || []).filter((l) => l && (l.district || l.city || l.governorate));
const nearby = (p.nearby_locations || []).filter((l) => l && (l.district || l.city || l.governorate));
const hardMax = Number(body.max_results_cap) || 100;
const wanted = Math.min(Number(p.max_results) || 0, hardMax);
const leadCap = Number(counts.lead_cap) || Math.max(0, Math.min(wanted, Math.floor(job.credits_reserved / (1 + perLeadSignals))));
const delivered = Number(counts.delivered) || 0;
const mode = counts.mode || 'normal';
const rawTotal = Number(counts.raw_total) || 0;

if ((!keywords.length || !locations.length || leadCap < 1) && round0 === 1) {
  return [{ json: { error: 'no_queries', leadCap, requestBody: '{}' } }];
}

const done = Array.isArray(counts.done_queries) ? counts.done_queries : [];
const saturated = Array.isArray(counts.saturated) ? counts.saturated : [];
const avoid = p.include_previous_companies === true ? [] : past.filter((r) => String(r.campaign_id || '') !== String(body.campaign_id)).map((r) => r.query);

// Take the first round (from the requested one on) that still has searches; rounds that have nothing new are skipped.
let round = round0;
let plan = null;
while (round) {
  plan = planRound({ round, target: Math.max(1, leadCap - delivered), keywords, synonyms, locations, nearby, done, saturated, avoid });
  if (plan) break;
  round = decideNext({ round, mode, delivered, target: leadCap, rawTotal: Math.max(rawTotal, 1) }).next;
}
if (!plan) return [{ json: { exhausted: true, round: round0, leadCap, requestBody: '{}' } }];

const stars = (m) => (m >= 4.5 ? 'fourAndHalf' : m >= 4 ? 'four' : m >= 3.5 ? 'threeAndHalf' : m >= 3 ? 'three' : m >= 2.5 ? 'twoAndHalf' : m >= 2 ? 'two' : '');

// One Apify run per (location, depth): every search string of that group shares the geolocation.
const groups = new Map();
for (const s of plan.searches) {
  const k = `${s.locationQuery}|${s.depth}`;
  if (!groups.has(k)) groups.set(k, { locationQuery: s.locationQuery, depth: s.depth, area: s.area, queries: [] });
  groups.get(k).queries.push(s.query);
}
return [...groups.values()].map((g) => {
  const input = {
    searchStringsArray: g.queries,
    locationQuery: g.locationQuery,
    maxCrawledPlacesPerSearch: g.depth,
    language: 'ar',
    countryCode: 'eg',
    skipClosedPlaces: true,
    placeMinimumStars: stars(Number(f.min_rating) || 0),
    website: f.must_have_website ? 'withWebsite' : 'allPlaces',
    scrapePlaceDetailPage: false,
    scrapeContacts: false,
  };
  const loc = locations.concat(nearby).find((l) => cleanPlace(l.district || l.city || l.governorate) === g.area) || {};
  return {
    json: {
      requestBody: JSON.stringify(input),
      round: plan.round,
      queries: g.queries,
      area: g.area,
      depth: g.depth,
      district: loc.district || null,
      city: loc.city || null,
      governorate: loc.governorate || null,
      leadCap,
      mode,
    },
  };
});

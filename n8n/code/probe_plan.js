// WF0b "Probe plan": a cheap sample (about 5 places per search) of what the planned queries really find, before the full run (spec 6.0 step 3).
// Pass 2 uses the rewritten queries from "Parse rewrite".
/*__INSIGHTS__*/
const campaign = $('Get campaign').first().json;
const p = campaign.parameters || {};
const PASS = __N__;
let keywords = (p.keywords || []).map((k) => stripInvisible(k)).filter(Boolean).slice(0, 4);
if (PASS === 2) keywords = $('Parse rewrite').first().json.queries;
const locs = (p.locations || []).filter((l) => l && (l.district || l.city || l.governorate)).slice(0, 2);
if (!keywords.length || !locs.length) return [{ json: { error: 'no_queries', requestBody: '{}' } }];

const grouped = new Map();
for (const l of locs) {
  const { area, locationQuery } = areaOf(l);
  grouped.set(locationQuery, { area, locationQuery, l });
}
return [...grouped.values()].map(({ area, locationQuery, l }) => ({
  json: {
    requestBody: JSON.stringify({
      searchStringsArray: keywords.map((k) => `${k} ${area}`.trim()),
      locationQuery,
      maxCrawledPlacesPerSearch: 5,
      language: 'ar',
      countryCode: 'eg',
      skipClosedPlaces: true,
      website: 'allPlaces',
      scrapePlaceDetailPage: false,
      scrapeContacts: false,
    }),
    queries: keywords,
    area,
    district: l.district || null,
    city: l.city || null,
    governorate: l.governorate || null,
  },
}));

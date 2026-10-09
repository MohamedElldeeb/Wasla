// WF1 "Plan queries": expand keywords x locations into Apify runs (one location per run),
// with per-search caps derived from the reserved credits so a run can never exceed its cap.
const body = $('Webhook').first().json.body;
const job = $('Claim job').first().json;
const campaign = $('Get campaign').first().json;
const sigRes = $('Signal cost').first().json;
const perLeadSignals = Number(sigRes !== null && typeof sigRes === 'object' ? (sigRes.data ?? Object.values(sigRes)[0]) : sigRes) || 0;

const p = campaign.parameters || {};
const f = p.filters || {};
const keywords = (p.keywords || []).map((k) => String(k).trim()).filter(Boolean);
const locations = (p.locations || []).filter((l) => l && (l.district || l.city || l.governorate));
const hardMax = Number(body.max_results_cap) || 100;
const wanted = Math.min(Number(p.max_results) || 0, hardMax);
const leadCap = Math.max(0, Math.min(wanted, Math.floor(job.credits_reserved / (1 + perLeadSignals))));

if (!keywords.length || !locations.length || leadCap < 1) {
  return [{ json: { error: 'no_queries', leadCap, requestBody: '{}' } }];
}

const stars = (m) => (m >= 4.5 ? 'fourAndHalf' : m >= 4 ? 'four' : m >= 3.5 ? 'threeAndHalf' : m >= 3 ? 'three' : m >= 2.5 ? 'twoAndHalf' : m >= 2 ? 'two' : '');
const searches = locations.length * keywords.length;
const perSearch = Math.max(1, Math.ceil(leadCap / searches));

return locations.map((l) => {
  const area = l.district || l.city || l.governorate;
  const input = {
    searchStringsArray: keywords.map((k) => `${k} ${area}`.trim()),
    locationQuery: [l.district, l.city, l.governorate, 'Egypt'].filter(Boolean).join(', '),
    maxCrawledPlacesPerSearch: perSearch,
    language: 'ar',
    countryCode: 'eg',
    skipClosedPlaces: !!f.exclude_closed,
    placeMinimumStars: stars(Number(f.min_rating) || 0),
    website: f.must_have_website ? 'withWebsite' : 'allPlaces',
    scrapePlaceDetailPage: false,
    scrapeContacts: false,
  };
  return {
    json: {
      requestBody: JSON.stringify(input),
      district: l.district || null,
      city: l.city || null,
      governorate: l.governorate || null,
      leadCap,
      perSearch,
    },
  };
});

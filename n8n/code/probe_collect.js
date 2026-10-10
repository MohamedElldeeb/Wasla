// WF0b "Probe collect": flatten the probe results, apply the deterministic gates (closed, global exclusions, allowed categories),
// and build the LLM fit-check requests for the places that survive.
/*__INSIGHTS__*/
const body = $('Webhook').first().json.body;
const campaign = $('Get campaign').first().json;
const org = $('Get org').first().json;
const negatives = $('Get negatives').all().map((i) => i.json).filter((n) => n && (n.business_name || n.reason));
const plans = $('Probe plan __N__').all().map((i) => i.json);
const outs = $input.all();
const p = campaign.parameters || {};
const f = p.filters || {};

const KEEP = ['title', 'categoryName', 'categories', 'address', 'neighborhood', 'street', 'city', 'state', 'countryCode', 'website', 'phone', 'phoneUnformatted', 'location', 'totalScore', 'reviewsCount', 'permanentlyClosed', 'temporarilyClosed', 'placeId', 'url', 'openingHours', 'claimThisBusiness', 'imagesCount', 'description', 'ownerDescription', 'subTitle', 'rank', 'reviewsDistribution'];
const seen = new Map();
const removed = { closed: 0, global: 0, category: 0 };
let raw = 0;
outs.forEach((it, idx) => {
  const r = it.json || {};
  const plan = plans[idx] || {};
  if (!(typeof r.statusCode === 'number' && r.statusCode >= 200 && r.statusCode < 300 && Array.isArray(r.body))) return;
  for (const x of r.body) {
    if (!x || !x.placeId || seen.has(x.placeId)) continue;
    raw++;
    const cats = [x.categoryName, ...(Array.isArray(x.categories) ? x.categories : [])].filter(Boolean);
    if (x.permanentlyClosed || x.temporarilyClosed) { removed.closed++; continue; }
    if (globalExclusion(cats)) { removed.global++; continue; }
    const category_mismatch = !categoryMatch(cats, f.categories_include).ok;
    const place = {};
    for (const k of KEEP) if (x[k] !== undefined) place[k] = x[k];
    place._district = plan.district; place._city = plan.city; place._governorate = plan.governorate;
    seen.set(x.placeId, { raw: place, category_mismatch, ask: fitAsk(x, [x.neighborhood, x.city].filter(Boolean).join(', ')) });
  }
});
const places = [...seen.values()];

const offerProfile = (p.offer_override && String(p.offer_override).trim()) ? { what_we_sell: String(p.offer_override).trim() } : (org.offer_profile || {});
const ideal = String(p.ideal_lead_description || '').trim() || String(offerProfile.ideal_customer || '').trim();
const system = fitSystemPrompt({ ideal, offerText: offerProfile.what_we_sell, negatives });
const model = body.planner_model || body.model;
const items = [];
for (let k = 0; k < places.length; k += 10) {
  const part = places.slice(k, k + 10).map((c, j) => ({ i: k + j, ...c.ask }));
  items.push({ json: { idx: part.map((x) => x.i), requestBody: llmRequest({ system, user: { places: part }, model, fallback: body.fallback_models }) } });
}
const all = { places, raw, removed, ideal, offerText: offerProfile.what_we_sell || '' };
if (!items.length) return [{ json: { noChunks: true, all } }];
items[0].json.all = all;
return items;

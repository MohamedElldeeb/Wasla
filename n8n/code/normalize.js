// WF2 "Normalize": staging rows -> normalized, filtered, deduped candidates (spec 6.3), plus the LLM fit-check requests (spec 6.0 step 4).
// Shared helpers are inlined at build time from lib/phone/egypt.mjs and lib/insights/core.mjs (single source of truth).
/*__PHONE__*/
/*__INSIGHTS__*/

const body = $('Webhook').first().json.body;
const campaign = $('Get campaign').first().json;
const job = $('Get job').first().json;
const org = $('Get org').first().json;
const staging = $('Get staging').all().map((i) => i.json).filter((r) => r.external_id);
const known = new Set($('Get known leads').all().map((i) => i.json.dedupe_key).filter(Boolean));
const cooling = new Set($('Get cooldown').all().map((i) => i.json.leads && i.json.leads.dedupe_key).filter(Boolean));
const negatives = $('Get negatives').all().map((i) => i.json).filter((n) => n && (n.business_name || n.reason));

const p = campaign.parameters || {};
const f = p.filters || {};
const counts = job.counts || {};
const includePrevious = p.include_previous_companies === true;
// Allowed categories = the campaign's list plus categories learned in earlier rounds (places outside the list that the fit check judged clearly fit).
const allowedCats = [...(Array.isArray(f.categories_include) ? f.categories_include : []), ...(Array.isArray(counts.learned_categories) ? counts.learned_categories : [])];
const leadCap = Number(counts.lead_cap) || 100;
const remaining = Math.max(0, leadCap - (Number(counts.delivered) || 0));

const clean = (s) => (s == null ? null : stripInvisible(s) || null);
const gov = (s) => { const c = clean(s); return c ? c.replace(/^محافظة\s+/, '') : null; };
const lc = (s) => String(s || '').toLowerCase();

const stats = {
  staged: staging.length, removed_closed: 0, removed_global: 0, removed_category: 0, removed_landline: 0, removed_filters: 0,
  invalid_phone: 0, duplicates: 0, previously_found: 0, cooldown: 0, capped: 0,
};
const globalGroups = {};
const seen = new Set();
const candidates = [];

for (const row of staging) {
  const x = row.raw || {};
  const ph = normalizeEgyptPhone(x.phoneUnformatted, x.phone);
  if (ph.phone_invalid) stats.invalid_phone++;
  const cats = [x.categoryName, ...(Array.isArray(x.categories) ? x.categories : [])].filter(Boolean);
  const website = clean(x.website);

  // 1. closed places are never leads
  if (x.permanentlyClosed || x.temporarilyClosed) { stats.removed_closed++; continue; }
  // 2. always-on exclusions (government, utilities, education, hospitals, worship, embassies, military): by category, never by name alone
  const ex = globalExclusion(cats);
  if (ex) { stats.removed_global++; globalGroups[ex.group] = (globalGroups[ex.group] || 0) + 1; continue; }
  // 3. the campaign's allowed categories (Arabic and English), matched here and never by the actor. A place OUTSIDE them is not dropped
  // blindly (a model-written list never covers every wording Google Maps uses): it goes to the fit check and is kept only if judged clearly "fit".
  const category_mismatch = !categoryMatch(cats, allowedCats).ok;
  if (Array.isArray(f.categories_exclude) && f.categories_exclude.length && categoryMatch(cats, f.categories_exclude).ok) { stats.removed_category++; continue; }
  // 4. optional user filters (none are on by default: few reviews is a signal, a landline can still be called)
  if (f.min_rating && !(Number(x.totalScore) >= Number(f.min_rating))) { stats.removed_filters++; continue; }
  if (f.min_reviews && !(Number(x.reviewsCount) >= Number(f.min_reviews))) { stats.removed_filters++; continue; }
  if (f.must_have_phone && !ph.phone_e164) { stats.removed_filters++; continue; }
  if (f.must_have_mobile && ph.phone_type !== 'mobile') { stats.removed_landline++; continue; }
  if (f.must_have_website && !website) { stats.removed_filters++; continue; }

  const district = clean(x.neighborhood) || x._district || null;
  const name = clean(x.title);
  // dedupe_key priority: place id, phone, email, name + district
  const dedupe_key = x.placeId ? `place:${x.placeId}`
    : ph.phone_e164 ? `phone:${ph.phone_e164}`
    : `name:${lc(name)}|${lc(district)}`;
  if (seen.has(dedupe_key)) { stats.duplicates++; continue; }
  seen.add(dedupe_key);
  // 5. fresh leads across campaigns: skip companies the org already has; contact cooldown is always on
  if (cooling.has(dedupe_key)) { stats.cooldown++; continue; }
  if (!includePrevious && known.has(dedupe_key)) { stats.previously_found++; continue; }

  candidates.push({
    category_mismatch,
    probe_fit: x._fit || null,
    ask: { name, categories: cats.slice(0, 5), website: website ? 'yes' : 'no', area: [district, clean(x.city)].filter(Boolean).join(', '), rating: x.totalScore ?? null, reviews: x.reviewsCount ?? null },
    lead: {
      business_name: name,
      category: clean(x.categoryName),
      address: clean(x.address),
      governorate: gov(x.state) || gov(x._governorate),
      city: clean(x.city) || x._city || null,
      district,
      lat: x.location?.lat ?? null,
      lng: x.location?.lng ?? null,
      phone_raw: ph.phone_raw,
      phone_e164: ph.phone_e164,
      phone_type: ph.phone_type,
      whatsapp_eligible: ph.whatsapp_eligible,
      website,
      email: null,
      facebook_url: null,
      instagram_url: null,
      linkedin_url: null,
      rating: x.totalScore ?? null,
      reviews_count: x.reviewsCount ?? null,
      opening_hours: x.openingHours ?? null,
      google_place_id: x.placeId || null,
      google_maps_url: x.url || null,
      contact_name: null,
      job_title: null,
      seniority: null,
      company_domain: null,
      source: 'google_maps',
      raw: x,
      dedupe_key,
    },
  });
}

// Candidates to judge: a bit more than we still need (fit removes some), probe-labelled ones first (already judged).
const limit = Math.min(candidates.length, Math.ceil(remaining * 1.6) + 4);
// Probe-labelled first (already judged), then places inside the allowed categories, then the rest.
const rankOf = (c) => (c.probe_fit ? 0 : c.category_mismatch ? 2 : 1);
candidates.sort((a, b) => rankOf(a) - rankOf(b));
const toJudge = candidates.slice(0, limit);
stats.capped = candidates.length - toJudge.length;
const need = toJudge.map((c, i) => ({ c, i })).filter(({ c }) => !c.probe_fit);

const offerProfile = (p.offer_override && String(p.offer_override).trim()) ? { what_we_sell: String(p.offer_override).trim() } : (org.offer_profile || {});
const ideal = String(p.ideal_lead_description || '').trim() || String(offerProfile.ideal_customer || '').trim();
const SYSTEM = fitSystemPrompt({ ideal, offerText: offerProfile.what_we_sell, negatives });
const model = body.planner_model || body.model;
const items = [];
const SIZE = 10;
for (let k = 0; k < need.length; k += SIZE) {
  const part = need.slice(k, k + SIZE);
  items.push({ json: { chunk: k / SIZE, idx: part.map(({ i }) => i), requestBody: llmRequest({ system: SYSTEM, user: { places: part.map(({ c, i }) => ({ i, ...c.ask })) }, model, fallback: body.fallback_models }) } });
}

const all = { toJudge: toJudge.map((c) => ({ lead: c.lead, probe_fit: c.probe_fit, category_mismatch: c.category_mismatch })), stats, globalGroups, remaining, leadCap, includePrevious };
if (!items.length) return [{ json: { noChunks: true, all } }];
items[0].json.all = all;
return items;

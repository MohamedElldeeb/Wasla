// WF2 "Normalize": staging rows -> normalized, filtered, deduped leads (spec 6.3).
// The phone helper below is inlined at build time from lib/phone/egypt.mjs (single source of truth).
/*__PHONE__*/

const body = $('Webhook').first().json.body;
const campaign = $('Get campaign').first().json;
const job = $('Get job').first().json;
const staging = $('Get staging').all().map((i) => i.json).filter((r) => r.external_id);

const f = (campaign.parameters || {}).filters || {};
const cap = Number((job.counts || {}).lead_cap) || 100;

const clean = (s) => (s == null ? null : String(s).replace(/[‎‏‪-‮]/g, '').trim() || null);
const gov = (s) => { const c = clean(s); return c ? c.replace(/^محافظة\s+/, '') : null; };
const lc = (s) => String(s || '').toLowerCase();

const stats = { staged: staging.length, filtered_out: 0, duplicates: 0, capped: 0 };
const seen = new Set();
const leads = [];

for (const row of staging) {
  const x = row.raw || {};
  const ph = normalizeEgyptPhone(x.phoneUnformatted, x.phone);
  const categories = [x.categoryName, ...(Array.isArray(x.categories) ? x.categories : [])].filter(Boolean).map(lc);
  const closed = !!(x.permanentlyClosed || x.temporarilyClosed);
  const website = clean(x.website);

  // campaign filters (spec 6.1)
  if (f.min_rating && !(Number(x.totalScore) >= Number(f.min_rating))) { stats.filtered_out++; continue; }
  if (f.min_reviews && !(Number(x.reviewsCount) >= Number(f.min_reviews))) { stats.filtered_out++; continue; }
  if (f.must_have_phone && !ph.phone_e164) { stats.filtered_out++; continue; }
  if (f.must_have_mobile && ph.phone_type !== 'mobile') { stats.filtered_out++; continue; }
  if (f.must_have_website && !website) { stats.filtered_out++; continue; }
  if (f.exclude_closed && closed) { stats.filtered_out++; continue; }
  if (Array.isArray(f.categories_include) && f.categories_include.length &&
      !f.categories_include.some((c) => categories.some((k) => k.includes(lc(c))))) { stats.filtered_out++; continue; }
  if (Array.isArray(f.categories_exclude) && f.categories_exclude.length &&
      f.categories_exclude.some((c) => categories.some((k) => k.includes(lc(c))))) { stats.filtered_out++; continue; }

  const district = clean(x.neighborhood) || x._district || null;
  const name = clean(x.title);
  // dedupe_key priority: place id, phone, email, name + district
  const dedupe_key = x.placeId ? `place:${x.placeId}`
    : ph.phone_e164 ? `phone:${ph.phone_e164}`
    : `name:${lc(name)}|${lc(district)}`;
  if (seen.has(dedupe_key)) { stats.duplicates++; continue; }
  seen.add(dedupe_key);

  if (leads.length >= cap) { stats.capped++; continue; }
  leads.push({
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
  });
}

return [{ json: { p_org: body.organization_id, p_campaign: body.campaign_id, p_leads: leads, stats } }];

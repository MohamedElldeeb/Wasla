// WF2b "Group reviews": one item per lead that actually has reviews, with the business_age row
// and (when there is enough review text) an OpenRouter request for review_insights.
//
// business_age convention: value 1 = looks NEW, 0 = established.
// Only the 10 newest reviews are fetched, so true age is ESTIMATED from review velocity:
//   spanMonths = months covered by the visible reviews; velocity = visible / spanMonths
//   estAgeMonths = reviews_count / velocity (if the visible window already holds every review, the real oldest date is used)
//   value = 1 - clamp((estAgeMonths - 6) / (30 - 6), 0, 1)
const body = $('Webhook').first().json.body;
const plan = $('Plan signals').first().json;
const res = $input.first().json || {};
const now = Date.now();
const MONTH = 30.44 * 24 * 3600 * 1000;

const ok = typeof res.statusCode === 'number' && res.statusCode >= 200 && res.statusCode < 300 && Array.isArray(res.body);
if (!ok) return [{ json: { empty: true, error: String(res.statusCode || (res.error && (res.error.message || res.error)) || 'unknown') } }];

const byPlace = new Map();
for (const r of res.body) {
  if (!r || !r.placeId) continue;
  if (!byPlace.has(r.placeId)) byPlace.set(r.placeId, []);
  byPlace.get(r.placeId).push(r);
}

const SYSTEM = `You summarize Google Maps reviews of a business. Return ONE JSON object only:
{"summary_ar": string (max 160 chars, Egyptian colloquial Arabic), "praise": [string] (max 3, short Arabic), "complaints": [string] (max 3, short Arabic), "complaint_level": number 0..1 (0 = no complaints, 1 = mostly complaints), "top_complaint_ar": string|null (the single most repeated complaint as a short Arabic noun phrase of up to 4 words, or null if none)}.
Use ONLY what the reviews say. Do not invent anything.`;

const items = [];
for (const t of plan.targets) {
  const rev = byPlace.get(t.place_id);
  if (!rev || !rev.length) continue;
  const dates = rev.map((r) => Date.parse(r.publishedAtDate)).filter(Number.isFinite).sort((a, b) => a - b);
  const texts = rev.map((r) => ({ stars: r.stars ?? null, text: (r.text || r.textTranslated || '').toString().slice(0, 400) })).filter((r) => r.text.trim());

  let ageRow = null;
  if (plan.wantsAge && dates.length) {
    const spanMonths = Math.max(0.25, (now - dates[0]) / MONTH);
    const total = Number(t.reviews_count) || rev.length;
    const complete = total <= rev.length;
    const est = complete ? spanMonths : total / (rev.length / spanMonths);
    const value = 1 - Math.max(0, Math.min(1, (est - 6) / 24));
    ageRow = {
      organization_id: body.organization_id,
      lead_id: t.lead_id,
      signal_key: 'business_age',
      raw: { visible_reviews: rev.length, oldest_visible: new Date(dates[0]).toISOString(), newest_visible: new Date(dates[dates.length - 1]).toISOString(), est_age_months: Math.round(est * 10) / 10, method: complete ? 'oldest_review' : 'velocity_estimate' },
      normalized: { value: Math.round(value * 1000) / 1000 },
      source: 'compass/google-maps-reviews-scraper',
      job_id: body.job_id,
      collected_at: new Date().toISOString(),
    };
  }

  let llm = false;
  let requestBody = '{}';
  if (plan.wantsInsights && texts.length >= 3) {
    llm = true;
    const req = {
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: JSON.stringify({ business: t.business_name, reviews: texts }) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      usage: { include: true },
    };
    const fb = Array.isArray(body.fallback_models) ? body.fallback_models.filter(Boolean) : [];
    if (fb.length) req.models = [body.model, ...fb]; else req.model = body.model;
    requestBody = JSON.stringify(req);
  }
  items.push({ json: { lead_id: t.lead_id, place_id: t.place_id, n_reviews: rev.length, n_texts: texts.length, ageRow, llm, requestBody } });
}
if (!items.length) return [{ json: { empty: true, error: 'no_reviews' } }];
return items;

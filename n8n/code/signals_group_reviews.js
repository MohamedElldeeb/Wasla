// WF2b "Group reviews": one item per lead that was scraped, with its deterministic facts (spec 6.3b step 1) and, when at least one
// review has text, an OpenRouter request for the review analysis (step 2). No text at all => no LLM call (recorded as skipped).
/*__INSIGHTS__*/
const body = $('Webhook').first().json.body;
const plan = $('Plan signals').first().json;
const campaign = $('Get campaign').first().json;
const org = $('Get org').first().json;
const res = $input.first().json || {};

const ok = typeof res.statusCode === 'number' && res.statusCode >= 200 && res.statusCode < 300 && Array.isArray(res.body);
if (!ok) return [{ json: { empty: true, error: String(res.statusCode || (res.error && (res.error.message || res.error)) || 'unknown') } }];

const byPlace = new Map();
for (const r of res.body) {
  if (!r || !r.placeId) continue;
  if (!byPlace.has(r.placeId)) byPlace.set(r.placeId, []);
  byPlace.get(r.placeId).push(r);
}

const p = campaign.parameters || {};
const offerText = (p.offer_override && String(p.offer_override).trim())
  ? { what_we_sell: String(p.offer_override).trim() }
  : { what_we_sell: (org.offer_profile || {}).what_we_sell || '', problems_we_solve: (org.offer_profile || {}).problems_we_solve || '' };
const relevance = String(p.complaint_relevance || '').trim();

const SYSTEM = `You analyse the Google Maps reviews of ONE business (a prospect of a seller). Return ONE JSON object only:
{"praised":[{"theme": string, "count": number}] (max 4, what customers praise),
 "complaints":[{"theme": string, "count": number, "offer_can_help": boolean}] (max 4, what customers complain about),
 "customer_values": string (one short sentence: what this business's customers seem to value),
 "summary_ar": string (1-2 sentences in simple Modern Standard Arabic),
 "summary_en": string (the same in plain English),
 "confidence": "low"|"medium"|"high"}
Rules: themes come ONLY from what the reviews actually say, short noun phrases in Arabic; count = how many of the given reviews mention it. Never invent anything. confidence is "low" when fewer than 3 reviews have text.
offer_can_help is true ONLY if the seller's offer would directly address that complaint. Seller offer: ${JSON.stringify(offerText)}${relevance ? `. Complaints the offer can help with: ${relevance}` : '. If unsure, false.'}`;

const items = [];
for (const t of plan.targets) {
  const rev = byPlace.get(t.place_id) || [];
  const facts = computeFacts(t.place, rev, { branches: t.branches });
  const texts = rev.map((r) => ({ stars: r.stars ?? null, date: String(r.publishedAtDate || '').slice(0, 10), owner_replied: !!(r.responseFromOwnerText && String(r.responseFromOwnerText).trim()), text: (r.text || r.textTranslated || '').toString().slice(0, 400) })).filter((r) => r.text.trim()).slice(0, 10);
  let llm = false;
  let requestBody = '{}';
  let skipped = null;
  if (!rev.length) skipped = 'no_reviews';
  else if (!texts.length) skipped = 'no_review_text';
  else {
    llm = true;
    const req = {
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: JSON.stringify({ business: t.business_name, reviews: texts }) }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      usage: { include: true },
    };
    const fb = Array.isArray(body.fallback_models) ? body.fallback_models.filter(Boolean) : [];
    if (fb.length) req.models = [body.model, ...fb]; else req.model = body.model;
    requestBody = JSON.stringify(req);
  }
  items.push({ json: { lead_id: t.lead_id, place_id: t.place_id, facts, n_texts: texts.length, llm, skipped, requestBody } });
}
if (!items.length) return [{ json: { empty: true, error: 'no_targets' } }];
return items;

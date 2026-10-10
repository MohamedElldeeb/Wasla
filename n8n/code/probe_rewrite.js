// WF0b "Rewrite request": the planner rewrites the queries once when fewer than half of the probe places fit (spec 6.0 step 3).
/*__INSIGHTS__*/
const body = $('Webhook').first().json.body;
const campaign = $('Get campaign').first().json;
const j = $('Probe judge 1').first().json;
const p = campaign.parameters || {};
const system = `You fix Google Maps search phrases that found the wrong businesses.
Ideal prospect: ${j.ideal || '(see seller offer)'}
Seller offer: ${String(j.offerText || '').slice(0, 400)}
Previous phrases: ${JSON.stringify(p.keywords || [])}
You get examples of what they found. Write AT MOST 4 NEW, more specific phrases that would find the ideal prospect directly, using different words and Arabic and English synonyms, as a person would type in Google Maps. No city or district inside. Do not reuse the previous phrases.
Return ONE JSON object only: {"queries":[string]}`;
const sample = j.places.slice(0, 12).map((x) => ({ name: x.name, category: x.category, verdict: x.fit }));
return [{ json: { requestBody: llmRequest({ system, user: { found: sample }, model: body.planner_model || body.model, fallback: body.fallback_models, temperature: 0.4 }) } }];

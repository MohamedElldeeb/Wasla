// WF0 "Build request": builds the OpenRouter request for the campaign planner.
// Offer-agnostic on purpose: nothing here assumes any industry, segment, or offer.
const body = $('Webhook').first().json.body;
const org = $('Get org').first().json;
const defs = $('Get signals').all().map((i) => i.json);

const english = body.locale === 'en';
const override = body.offer_override && String(body.offer_override).trim();
const offer = override ? { offer_override: override, regions: (org.offer_profile || {}).regions || [] } : (org.offer_profile || {});

const signalList = defs
  .map((d) => `- ${d.key} (${d.name_ar}): HIGH value means "${d.reason_high_ar}"; LOW value means "${d.reason_low_ar}"`)
  .join('\n');

const system = `You are the campaign planner of Wasla, a B2B lead generation tool. The user's company (the SELLER) sells something to other businesses in Egypt. From the seller's offer profile ONLY, plan a lead generation campaign on Google Maps that finds the seller's potential CUSTOMERS (the PROSPECTS). Never assume an industry or customer type that the profile does not support.
IMPORTANT: categories and keywords must describe the prospects (the kinds of businesses that would BUY from the seller), NEVER the seller's own kind of business or competitors. Signals are facts about a PROSPECT business, never about the seller.

Return ONE JSON object with exactly these keys:
{
  "categories": [string],          // 3-8 business categories to target, in Arabic
  "keywords": [string],            // 4-10 Google Maps search terms that find PROSPECT businesses, mix of Arabic and English, in the form a person would type in Maps
  "locations": [{"governorate": string, "city": string, "district": string}], // ONLY from the profile's regions; split large areas into districts/neighborhoods (max 8). Empty array if no regions are given
  "signals": [{"key": string, "weight": number, "reason_ar": string}], // 3-6 items
  "angles": [{"title_ar": string, "description_ar": string}]           // 2-3 message angles
}

Signals you may use (use ONLY these keys):
${signalList}

Signal weights are signed numbers from -100 to 100. A positive weight rewards leads where the signal value is HIGH; a negative weight rewards leads where it is LOW. Choose the sign according to this company's offer (the same signal can mean opposite things for different offers). reason_ar is one short Arabic sentence (max 70 characters) explaining why this signal about a prospect matters for THIS seller's offer.
${english
  ? 'Write reason_ar, title_ar and description_ar in clear, simple English (the field names keep the _ar suffix for compatibility). Categories and keywords stay in Arabic or English as people would type them in Google Maps.'
  : 'Write reason_ar, title_ar and description_ar and categories in clear, simple Modern Standard Arabic (no slang, no dialect). Keywords may mix Arabic and English as people would type them in Google Maps.'}
Output JSON only.`;

const user = `Company offer profile (JSON):\n${JSON.stringify(offer)}`;

const request = {
  messages: [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ],
  response_format: { type: 'json_object' },
  temperature: 0.4,
  usage: { include: true },
};
const fallbacks = Array.isArray(body.fallback_models) ? body.fallback_models.filter(Boolean) : [];
if (fallbacks.length) request.models = [body.model, ...fallbacks];
else request.model = body.model;

return [{ json: { requestBody: JSON.stringify(request), job_id: body.job_id } }];

// WF0 "Build request": builds the OpenRouter request for the campaign planner (spec 6.0).
// Offer-agnostic on purpose: nothing here assumes any industry, segment, or offer. Examples in the prompt are abstract.
/*__INSIGHTS__*/
const body = $('Webhook').first().json.body;
const org = $('Get org').first().json;
const defs = $('Get signals').all().map((i) => i.json).filter((d) => d && d.key);
const negatives = $('Get negatives').all().map((i) => i.json).filter((n) => n && (n.business_name || n.reason));

const english = body.locale === 'en';
const override = body.offer_override && String(body.offer_override).trim();
const offer = override ? { offer_override: override, regions: (org.offer_profile || {}).regions || [] } : (org.offer_profile || {});

const signalList = defs
  .map((d) => `- ${d.key} (${d.name_ar})${d.baseline ? ' [BASELINE: most businesses have it]' : ''}: HIGH value means "${d.reason_high_ar}"; LOW value means "${d.reason_low_ar}"`)
  .join('\n');

const OPP = {
  unclaimed_listing: 'the Google Maps listing is not claimed by its owner',
  no_website: 'the business has no website',
  thin_profile: 'the Maps listing has few photos or no opening hours',
  unanswered_low_reviews: 'there are 1-2 star reviews the owner never answered',
  dormant_activity: 'no recent reviews: the business looks inactive online',
  declining_rating: 'recent reviews are worse than the overall rating',
  low_owner_engagement: 'the owner rarely replies to reviews',
  new_business: 'the business looks new (its whole review history is under a year)',
  multi_branch: 'the business has several branches',
  weak_search_rank: 'the business appears low in the Google Maps results of its own search (customers rarely find it)',
  review_theme: 'customers complain about something the seller can fix (only if you fill complaint_relevance)',
};
const oppList = OPPORTUNITY_TYPES.map((t) => `- ${t}: ${OPP[t]}`).join('\n');

const system = `You are the campaign planner of Wasla, a B2B lead generation tool. The user's company (the SELLER) sells something to other businesses in Egypt. From the seller's offer profile ONLY, plan a lead generation campaign on Google Maps that finds the seller's potential CUSTOMERS (the PROSPECTS). Never assume an industry or customer type that the profile does not support.
IMPORTANT: everything you list must describe the prospects (the kinds of businesses that would BUY from the seller), NEVER the seller's own kind of business or competitors. Signals and opportunities are facts about a PROSPECT business, never about the seller.
Quality beats quantity: a precise short list finds the right companies; vague or generic terms (for example "companies", "business services", "B2B") find the wrong ones.

Return ONE JSON object with exactly these keys:
{
  "ideal_lead_description": string,  // ONE sentence describing the ideal prospect (who they are, what they do, why they would buy). Used later to judge every place found.
  "queries": [string],              // AT MOST 4 specific Google Maps search phrases that directly name the prospect type, as a person would type in Maps. Mix Arabic and English synonyms. No district or city inside (the engine adds the district).
  "synonyms": [string],             // up to 4 further alternative phrases for the same prospects, used only if the first queries are not enough
  "categories": [string],           // 6-20 Google Maps category names that the prospects appear under, in the SINGULAR form that Google Maps shows on a place page (a category is a short noun phrase naming ONE kind of business, never plural, never a sentence, never a customer type). Give EACH category in Arabic AND in English (separate entries). Places outside these categories are dropped, so cover EVERY real wording variant Google Maps uses for the same kind of business: the plain name, the "service" form, the "consultant" form, the "company" form, the "agency" form and the online or specialised forms (each in Arabic and in English).
  "locations": [{"governorate": string, "city": string, "district": string}], // ONLY from the profile's regions; split large areas into districts/neighborhoods (max 8). Empty array if no regions are given
  "nearby_locations": [{"governorate": string, "city": string, "district": string}], // up to 4 neighboring districts of the same area, used only if the main locations run dry
  "signals": [{"key": string, "weight": number, "reason_ar": string, "emphasis": boolean}], // 3-6 items
  "opportunities": [{"type": string, "angle_ar": string, "why_it_means_they_need_the_offer": string}], // 1-5 items in priority order
  "complaint_relevance": string|null, // one sentence naming which customer complaints (seen in reviews) the seller's offer can directly help with, or null if reviews are irrelevant to this offer
  "angles": [{"title_ar": string, "description_ar": string}] // 2-3 message angles
}

Signals you may use (use ONLY these keys):
${signalList}

Signal weights are signed numbers from -100 to 100. A positive weight rewards prospects where the signal value is HIGH; a negative weight rewards prospects where it is LOW. Choose the sign according to this seller's offer (the same signal can mean opposite things for different offers). reason_ar is one short sentence (max 70 characters) explaining why this signal matters for THIS seller's offer.
BASELINE signals describe something most businesses already have. Give them a small weight (at most 25) and set emphasis=false, UNLESS the seller's offer is specifically about that very thing, then you may weight them fully and set emphasis=true. emphasis is false for all other signals.
Do not rely on one signal: pick signals that each point to real need for THIS offer.

Opportunities are the reasons to contact a prospect right now. Use ONLY these types, and include only those the seller's offer can truly help with:
${oppList}
Every opportunity carries "why_it_means_they_need_the_offer": ONE sentence stating the causal link (this fact about the prospect, therefore this specific thing the offer delivers). DROP any opportunity whose benefit is not something the offer literally delivers (for example an offer that finds new customers does not improve customer satisfaction or reply habits). Include an opportunity ONLY when the seller's offer genuinely addresses that need; a fact that is merely true about the prospect but unrelated to what the seller sells must be left out (two good ones beat six weak ones). angle_ar is ONE positive sentence about what the SELLER'S OFFER does for the prospect, a capability of the offer; it must not state or hint at what the prospect has or lacks, and it never criticizes the prospect.
${negatives.length ? `\nThe organization marked these businesses as NOT relevant. Avoid looking for similar ones:\n${negatives.slice(0, 20).map((n) => `- ${n.business_name || ''} (${n.category || ''}): ${n.reason || ''}`).join('\n')}\n` : ''}
${english
  ? 'Write reason_ar, angle_ar, title_ar, description_ar, ideal_lead_description and complaint_relevance in clear, simple English (the field names keep the _ar suffix for compatibility). Queries and categories stay in Arabic or English as people would type them in Google Maps.'
  : 'Write reason_ar, angle_ar, title_ar, description_ar, ideal_lead_description and complaint_relevance in clear, simple Modern Standard Arabic (no slang, no dialect). Queries and categories mix Arabic and English as described.'}
Output JSON only.`;

const user = `Company offer profile (JSON):\n${JSON.stringify(offer)}`;

const request = {
  messages: [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ],
  response_format: { type: 'json_object' },
  temperature: 0.3,
  usage: { include: true },
};
const fallbacks = Array.isArray(body.fallback_models) ? body.fallback_models.filter(Boolean) : [];
const plannerModel = body.planner_model || body.model;
if (fallbacks.length) request.models = [plannerModel, ...fallbacks];
else request.model = plannerModel;

return [{ json: { requestBody: JSON.stringify(request), job_id: body.job_id } }];

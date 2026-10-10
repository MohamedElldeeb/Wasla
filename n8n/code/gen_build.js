// WF3 "Select and build": pick leads that need a message and build one OpenRouter request per lead.
// Offer-agnostic: the offer, the lead facts and the collected insights are the only inputs.
// Tact (spec 6.3b step 5): the model NEVER receives complaints or weaknesses as something to mention. Insights only choose the angle.
// Round 2: when the seller's product writes messages, the first message IS the product demo, so it must not read like a template:
// no rating, no micro-district, no jargon, no time-of-day greeting, one personal detail at most (from the lead's specialty or what its
// customers praise), only benefits the offer really delivers (the model must quote them from the offer), a concrete call to action, a signature.
/*__INSIGHTS__*/
const body = $('Webhook').first().json.body;
const job = $('Claim job').first().json;
const campaign = $('Get campaign').first().json;
const org = $('Get org').first().json;
const links = $('Get campaign leads').all().map((i) => i.json).filter((r) => r.leads);
const messages = $('Get messages').all().map((i) => i.json);
const insightsByLead = new Map($('Get insights').all().map((i) => i.json).filter((r) => r && r.lead_id).map((r) => [r.lead_id, r]));
const cooling = new Set($('Get cooldown').all().map((i) => i.json.lead_id).filter(Boolean));

const p = campaign.parameters || {};
const channel = p.channel || 'whatsapp';
const tone = p.tone || 'friendly';
const TONES = {
  friendly: 'ودود وخفيف، زي زميل بيكلم زميل',
  professional: 'مهذب ومحترم وجاد من غير تكلف',
  direct: 'مباشر وواضح وقصير من غير لف ودوران',
};
const profile = org.offer_profile || {};
const offer = (p.offer_override && String(p.offer_override).trim())
  ? { what_we_sell: String(p.offer_override).trim(), problems_we_solve: profile.problems_we_solve || '', proof_points: profile.proof_points || '', cta_offer: profile.cta_offer || '' }
  : { what_we_sell: profile.what_we_sell || '', problems_we_solve: profile.problems_we_solve || '', proof_points: profile.proof_points || '', cta_offer: profile.cta_offer || '' };
const senderName = String(profile.sender_name || '').trim() || null;
const signature = senderName ? (org.name ? `${senderName} من ${org.name}` : senderName) : null;
const offerText = [offer.what_we_sell, offer.problems_we_solve, offer.proof_points, offer.cta_offer].filter(Boolean).join('. ');
const generalAngle = p.angle && typeof p.angle === 'object' ? p.angle : null;
const oppMap = new Map(((p.opportunities) || []).map((o) => [o.type, o]));

const EXAMPLES = [
  'أهلا يا فريق [اسم النشاط]، عملاءكم دايما بيشكروا في الأفكار الجديدة اللي بتقدموها. إحنا عاملين أداة اسمها وصلة بتجيب لوكالات التسويق شركات محتاجة خدماتها فعلا، ومع كل شركة رسالة جاهزة تتبعت على واتساب. تحبوا أبعتلكم 10 شركات مناسبة لشغلكم ببلاش تشوفوها بنفسكم؟ محمد من وصلة',
  'أهلا، بنساعد وكالات التسويق في إسكندرية يلاقوا شركات محتاجة خدماتهم، ونجهز لكل شركة رسالة شخصية تتبعت على واتساب. لو حابين، أبعتلكم 10 شركات مناسبة لتخصصكم ببلاش تجربوا بيها. محمد من وصلة',
];

const SYSTEM = `You write the FIRST outreach message that one company sends to another business, in natural Egyptian colloquial Arabic. A busy owner reads it on their phone: it must sound like one real person wrote it for THIS business, never like a template or an ad.
Return ONE JSON object only: ${channel === 'email' ? '{"subject": string, "message": string, "angle": string, "offer_quote": string}' : '{"message": string, "angle": string, "offer_quote": string}'}.
- "angle": a short Arabic note (max 80 chars) naming the hook you used.
- "offer_quote": an EXACT phrase of 3 to 12 words copied word for word from sender_offer (what_we_sell, problems_we_solve, proof_points or cta_offer) that states the benefit your message promises. The message may promise NOTHING that this phrase does not support.
Rules:
1. Length: ${channel === 'email' ? 'email body 60 to 120 words, plain text, subject up to 70 characters.' : 'aim for 50 to 60 words (never fewer than 35, never more than 70; count them, short drafts are rejected). Use four short sentences: the opening, what the offer does, why that fits them, then the call to action; the signature comes after. No links, no URLs, no phone numbers.'}
2. NEVER mention the business's rating, stars or number of reviews. NEVER mention any district, neighborhood or street. You may name the city at most once, or not at all.
3. NEVER use jargon or English business words (no "B2B", "leads", "outreach", "pipeline", "CRM"). Use plain Egyptian words (شركات، عملاء جداد، رسايل).
4. No time-of-day greeting (no صباح الخير, مساء الخير, صباح الفل or similar): you do not know when it will be read. Start directly or with a short "أهلا".
5. At most ONE personal detail, and only from personal_hook (the business's specialty, or what its customers praise), phrased naturally, for example "عملاءكم دايما بيشكروا في ..." or "شغلكم في ...". If personal_hook is empty or weak, open with the offer in a clean general way. Never invent a detail. You have NOT seen their work: never say you heard about them, liked their work, followed them, or that they are great.
6. NEVER invent benefits, numbers, results, prices or clients. Promise only what your offer_quote supports. Do not add lines about customer satisfaction, better communication, growth or quality unless the offer itself says so.
7. Ending: a concrete, low-friction call to action. If sender_offer.cta_offer exists, offer exactly that in your own words. Otherwise end with ONE short question about how they find clients today (or how they handle the thing the offer is about). NEVER end with "ممكن نتكلم؟" or any "can we talk / meet / connect" question.
8. If required_signature is given, the message ends with exactly those words (the last words of the text).
9. No emoji (zero by default).
10. TACT: never mention complaints, low ratings, missing things or any weakness of the business, not even politely. help_angle (when present) is what OUR offer does; present it as a capability of the offer, never as a gap of theirs.
11. Variety: follow opening_style. Do NOT start with any of avoid_openings. Never use the skeleton "greeting + I saw you in X + we help companies like you + can we talk".
12. Address them as a team in the plural (انتم، شغلكم، تحبوا), never in the singular. Short sentences, natural Egyptian words (إزاي، دلوقتي، كده، ممكن), not formal Arabic.
13. Never praise their work yourself (no مميز، ممتاز، رائع، شاطرين، احترافي، متميز), and never assume what they need or want (no "أكيد محتاجين", "أكيد بتدوروا", "واضح إنكم"). Praise may appear only as what THEIR CUSTOMERS say, taken from personal_hook.customers_praise. Never promise or guarantee anything (no نضمن، مضمون). Never add benefits such as saving their time or letting them focus on their core work: only what offer_quote says.
14. Word the concrete call to action in a fresh way each time (keep the substance of cta_offer: what, how many, that it is free); do not reuse one fixed sentence.
Style references (written for a DIFFERENT seller with a different offer: copy only the tone, the length and the shape, NEVER their words, topic, offer or numbers):
- ${EXAMPLES[0]}
- ${EXAMPLES[1]}`;

// One opening per lead, rotating, so the messages of one campaign do not share a skeleton (the validator also rejects shared openings and near-copies).
const STYLES = [
  'Begin with "أهلا يا فريق" and their business name, then the single personal detail from personal_hook (if there is none, one plain line about their field), then the offer, then the call to action.',
  'Begin with the words "سؤال سريع:" and one short question about how they handle the thing the offer is about today, then the offer, then the call to action.',
  'Begin with the words "لو بتدوروا على" and finish the thought with what the offer gives them, then who you are, then the call to action.',
  'Begin with the name of the sender company as the subject of one plain sentence about what its tool does; no greeting; then why it fits a business like theirs; then the call to action.',
  'Begin with the words "فكرة سريعة:" followed by what the offer would do for a business like theirs, then the call to action.',
  'Begin with the personal detail from personal_hook as a short remark (if there is none, a remark about the kind of work they do), then "عشان كده" and the offer, then the call to action.',
  'Begin with the words "بعد إذنكم،" then who you are and what you do in one sentence, then the call to action.',
  'Begin with one short honest sentence saying you are writing because their field is the one the offer is built for, then the offer, then the call to action.',
];

// Targets: explicit lead ids, a regeneration, or every eligible lead that has no message yet.
const haveMsg = new Set(messages.filter((m) => m.channel === channel).map((m) => m.lead_id));
let chosen;
let regen = null;
let skippedCooldown = 0;
if (body.regenerate && body.regenerate.message_id) {
  regen = messages.find((m) => m.id === body.regenerate.message_id);
  chosen = regen ? links.filter((r) => r.leads.id === regen.lead_id) : [];
} else {
  const ids = Array.isArray(body.lead_ids) && body.lead_ids.length ? new Set(body.lead_ids) : null;
  chosen = links.filter((r) => {
    const l = r.leads;
    if (ids && !ids.has(l.id)) return false;
    if (haveMsg.has(l.id)) return false;
    if (l.status === 'opted_out') return false;
    if (cooling.has(l.id)) { skippedCooldown++; return false; } // 30-day contact cooldown (also enforced by a DB trigger)
    if (channel === 'whatsapp' && !l.whatsapp_eligible) return false;
    return true;
  });
}
chosen = chosen.slice(0, Math.max(0, job.credits_reserved));

if (!chosen.length) return [{ json: { noop: true, skippedCooldown } }];

// Openings already used in this campaign: a new message may not start the same way (first five words).
const usedOpenings = [...new Set(messages.map((m) => m.edited_text || m.generated_text).filter(Boolean).map(openingKey).filter(Boolean))].slice(-40);

return chosen.map((r, idx) => {
  const l = r.leads;
  const ins = insightsByLead.get(l.id) || {};
  const analysis = ins.analysis && !ins.analysis.skipped ? ins.analysis : null;
  const confident = analysis && analysis.confidence && analysis.confidence !== 'low';

  // The opportunity the message is built on: the one chosen on the lead (user can switch it), only if the planner tied it to the offer.
  const opps = Array.isArray(r.opportunities) ? r.opportunities : [];
  const sel = opps.find((o) => o.type === r.selected_opportunity) || opps[0] || null;
  const mapped = sel ? oppMap.get(sel.type) : null;
  const linked = !!(sel && mapped && (mapped.why_it_means_they_need_the_offer || mapped.angle_ar || mapped.angle));
  const helpAngle = linked ? (mapped.angle_ar || mapped.angle || sel.angle || null) : null;
  const usable = linked && !(sel.type === 'review_theme' && !confident);

  // Personal hook (only neutral or positive, true things): the lead's other Maps categories (its specialty) and what its customers praise.
  const rawCats = Array.isArray(l.raw_categories) ? l.raw_categories : (l.raw && Array.isArray(l.raw.categories) ? l.raw.categories : []);
  const factCats = ins.facts && Array.isArray(ins.facts.categories) ? ins.facts.categories : [];
  const main = norm(l.category || '');
  const specialty = [...new Set([...rawCats, ...factCats].map((c) => String(c || '').trim()).filter((c) => c && norm(c) !== main))].slice(0, 3);
  const description = String(l.raw_description || (l.raw && (l.raw.description || l.raw.ownerDescription)) || '').trim().slice(0, 160) || null;
  const hook = {};
  if (specialty.length) hook.specialty = specialty;
  if (confident && analysis.praised && analysis.praised.length) hook.customers_praise = analysis.praised.slice(0, 2).map((x) => x.theme);
  if (description) hook.description = description;

  const areas = [l.district, l.raw_neighborhood, l.raw && l.raw.neighborhood, l.raw && l.raw.street ? String(l.raw.street).split(',')[0] : null].filter(Boolean);
  const user = {
    tone: TONES[tone] || TONES.friendly,
    channel,
    opening_style: STYLES[idx % STYLES.length],
    avoid_openings: usedOpenings,
    business_name: l.business_name,
    business_type: l.category || null,
    city: l.city || null,
    personal_hook: hook,
    sender_company_name: org.name || null,
    sender_name: senderName,
    required_signature: signature,
    sender_offer: offer,
    help_angle: usable ? helpAngle : null,
    help_angle_reason: usable && mapped ? (mapped.why_it_means_they_need_the_offer || null) : null,
    general_angle: generalAngle,
    extra_instruction: regen ? (body.regenerate.instruction || null) : null,
  };
  const req = {
    messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: JSON.stringify(user) }],
    response_format: { type: 'json_object' },
    temperature: 0.8,
    usage: { include: true },
  };
  const fb = Array.isArray(body.fallback_models) ? body.fallback_models.filter(Boolean) : [];
  if (fb.length) req.models = [body.model, ...fb]; else req.model = body.model;
  return {
    json: {
      lead_id: l.id,
      message_id: regen ? regen.id : null,
      regen_count: regen ? (regen.regen_count || 0) + 1 : 0,
      channel,
      organization_id: body.organization_id,
      campaign_id: body.campaign_id,
      job_id: body.job_id,
      requestBody: JSON.stringify(req),
      // kept ONLY for validation and the learning loop; never sent to the model
      complaints: analysis ? (analysis.complaints || []).map((c) => c.theme) : [],
      opportunity_type: usable && sel ? sel.type : null,
      offer_text: offerText,
      cta_offer: offer.cta_offer || null,
      sender_name: senderName,
      signature,
      areas,
      city: l.city || null,
      used_openings: usedOpenings,
      total: chosen.length,
      skippedCooldown,
    },
  };
});

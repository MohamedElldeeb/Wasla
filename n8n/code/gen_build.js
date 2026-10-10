// WF3 "Select and build": pick leads that need a message and build one OpenRouter request per lead.
// Offer-agnostic: the offer, the lead facts and the collected insights are the only inputs.
// Tact (spec 6.3b step 5): the model NEVER receives complaints or weaknesses as something to mention. Insights only choose the angle.
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
const offer = (p.offer_override && String(p.offer_override).trim())
  ? { what_we_sell: String(p.offer_override).trim(), regions: (org.offer_profile || {}).regions || [] }
  : (org.offer_profile || {});
const generalAngle = p.angle && typeof p.angle === 'object' ? p.angle : null;
const oppAngles = new Map(((p.opportunities) || []).map((o) => [o.type, o.angle_ar || o.angle]));

const SYSTEM = `You write the FIRST outreach message from a company to another business, in Egyptian colloquial Arabic (respectful, sounds like a real person, not an ad).
Return ONE JSON object only: {"message": string, "angle": string}. "angle" is a short Arabic note (max 80 chars) naming the personalization hook you used.
Hard rules:
- ${channel === 'email' ? 'Email: add "subject" (max 70 chars) to the JSON; body 60-120 words, plain text.' : 'WhatsApp/Messenger text: between 40 and 90 words. No links, no URLs, no phone numbers.'}
- End with ONE clear, soft question.
- Mention at most ONE specific fact about the business, taken ONLY from "safe_facts" (never anything else). NEVER invent facts, numbers, clients, results, prices, or offers.
- TACT: never mention complaints, negative reviews, low ratings, missing things, problems or any weakness of the business, not even indirectly or politely. Open with something neutral or positive and true (their field, their area, something customers like about them, or a way to grow), then the offer. "help_angle" is the reason for writing; express it only as a way the offer helps them grow, never as something they lack.
- If "help_angle" is null, use the general offer description only. Do not quote or mention any review or reviewer.
- No pressure or exaggeration (no "limited time", no "guaranteed"). At most ONE emoji in total.
- Introduce the sender's offer briefly using ONLY the offer profile provided. If proof_points are given you may use them, otherwise do not claim any.
- Follow the requested structure hint so messages differ from each other. Do not start every message with a greeting plus the business name only.
- Do NOT invent a sender name, a person name, or a company name. If "sender_company_name" is given you may use it once, otherwise speak as "إحنا" without any name.
- Do not claim you visited, used, or heard about them. State only what you actually saw in the provided data (for example that they are on Google Maps).
- Use natural Egyptian dialect words (إزاي، دلوقتي، كده، عايز، ممكن)، not formal Modern Standard Arabic. Keep sentences short.
- Write in the requested tone.`;

const HINTS = [
  'ابدأ بملاحظة قصيرة عن نشاطهم أو منطقتهم.',
  'ابدأ بسؤال قصير عن حاجة مرتبطة بشغلهم.',
  'ابدأ بتقدير حاجة حقيقية وإيجابية في بياناتهم.',
  'ابدأ بتعريف نفسك في جملة واحدة وبعدين اربطها بحالتهم.',
  'ابدأ بالفرصة اللي بتساعدهم تكبر وإزاي بتخص نشاطهم.',
  'ابدأ بجملة بسيطة إنك لقيتهم وانت بتدور على شغل في منطقتهم.',
  'اكتب الرسالة في سطرين قصيرين ثم السؤال.',
  'ابدأ بالسؤال الأول وبعدين وضّح ليه بتسأل.',
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

return chosen.map((r, idx) => {
  const l = r.leads;
  const ins = insightsByLead.get(l.id) || {};
  const analysis = ins.analysis && !ins.analysis.skipped ? ins.analysis : null;
  const confident = analysis && analysis.confidence && analysis.confidence !== 'low';

  // The opportunity the message is built on: the one chosen on the lead (user can switch it), only if its angle exists.
  const opps = Array.isArray(r.opportunities) ? r.opportunities : [];
  const sel = opps.find((o) => o.type === r.selected_opportunity) || opps[0] || null;
  const helpAngle = sel ? (oppAngles.get(sel.type) || sel.angle || null) : null;

  // Only neutral or positive, true facts may be mentioned.
  const safe = { name: l.business_name, category: l.category, area: l.district || l.city };
  if (Number(l.rating) >= 4.2) safe.rating = l.rating;
  if (Number(l.reviews_count) >= 20) safe.reviews_count = l.reviews_count;
  if (confident && analysis.praised && analysis.praised.length) safe.customers_praise = analysis.praised.slice(0, 2).map((x) => x.theme);
  if (ins.facts && ins.facts.activity_label === 'active') safe.recently_reviewed_on_maps = true;

  const user = {
    tone: TONES[tone] || TONES.friendly,
    channel,
    structure_hint: HINTS[idx % HINTS.length],
    sender_company_name: org.name || null,
    sender_offer: offer,
    help_angle: sel && sel.type === 'review_theme' && !confident ? null : helpAngle,
    general_angle: generalAngle,
    extra_instruction: regen ? (body.regenerate.instruction || null) : null,
    safe_facts: safe,
  };
  const req = {
    messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: JSON.stringify(user) }],
    response_format: { type: 'json_object' },
    temperature: 0.9,
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
      opportunity_type: sel ? sel.type : null,
      total: chosen.length,
      skippedCooldown,
    },
  };
});

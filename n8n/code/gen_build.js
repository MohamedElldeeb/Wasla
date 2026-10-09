// WF3 "Select and build": pick leads that need a message and build one OpenRouter request per lead.
// Offer-agnostic: the offer, the lead facts and the collected signals are the only inputs.
const body = $('Webhook').first().json.body;
const job = $('Claim job').first().json;
const campaign = $('Get campaign').first().json;
const org = $('Get org').first().json;
const links = $('Get campaign leads').all().map((i) => i.json).filter((r) => r.leads);
const messages = $('Get messages').all().map((i) => i.json);
const insights = new Map($('Get insights').all().map((i) => [i.json.lead_id, i.json.raw]));

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
const angle = p.angle && typeof p.angle === 'object' ? p.angle : null;

const SYSTEM = `You write the FIRST outreach message from a company to another business, in Egyptian colloquial Arabic (respectful, sounds like a real person, not an ad).
Return ONE JSON object only: {"message": string, "angle": string}. "angle" is a short Arabic note (max 80 chars) naming the personalization hook you used.
Hard rules:
- ${channel === 'email' ? 'Email: add "subject" (max 70 chars) to the JSON; body 60-120 words, plain text.' : 'WhatsApp/Messenger text: between 40 and 90 words. No links, no URLs, no phone numbers.'}
- End with ONE clear, soft question.
- Mention at least ONE real detail taken from the business facts or collected signals below. NEVER invent facts, numbers, clients, results, prices, or offers. Never mention a fact that is not given.
- No pressure or exaggeration (no "limited time", no "guaranteed"). At most ONE emoji in total.
- Introduce the sender's offer briefly using ONLY the offer profile provided. If proof_points are given you may use them, otherwise do not claim any.
- Build the opening on the strongest real signal when one is given. Follow the requested structure hint so messages differ from each other. Do not start every message with a greeting plus the business name only.
- Do NOT invent a sender name, a person name, or a company name. If "sender_company_name" is given you may use it once, otherwise speak as "إحنا" without any name.
- Do not claim you visited, used, or heard about them. State only what you actually saw in the provided data (for example "شفت إنكم على خرائط جوجل" or the rating).
- Use natural Egyptian dialect words (إزاي، دلوقتي، كده، عايز، ممكن)، not formal Modern Standard Arabic. Keep sentences short.
- Write in the requested tone.`;

const HINTS = [
  'ابدأ بملاحظة قصيرة عن نشاطهم أو منطقتهم.',
  'ابدأ بسؤال قصير عن حاجة مرتبطة بشغلهم.',
  'ابدأ بتقدير حاجة حقيقية في بياناتهم (زي التقييم أو الريفيوهات).',
  'ابدأ بتعريف نفسك في جملة واحدة وبعدين اربطها بحالتهم.',
  'ابدأ بالمشكلة اللي بتحلها وإزاي بتخص نشاطهم.',
  'ابدأ بجملة بسيطة إنك لقيتهم وانت بتدور على شغل في منطقتهم.',
  'اكتب الرسالة في سطرين قصيرين ثم السؤال.',
  'ابدأ بالسؤال الأول وبعدين وضّح ليه بتسأل.',
];

// Targets: explicit lead ids, a regeneration, or every eligible lead that has no message yet.
const haveMsg = new Set(messages.filter((m) => m.channel === channel).map((m) => m.lead_id));
let chosen;
let regen = null;
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
    if (channel === 'whatsapp' && !l.whatsapp_eligible) return false;
    return true;
  });
}
chosen = chosen.slice(0, Math.max(0, job.credits_reserved));

if (!chosen.length) return [{ json: { noop: true } }];

return chosen.map((r, idx) => {
  const l = r.leads;
  const ins = insights.get(l.id);
  const facts = {
    name: l.business_name,
    category: l.category,
    district: l.district || l.city,
    rating: l.rating,
    reviews_count: l.reviews_count,
    has_website: !!l.website,
  };
  const user = {
    tone: TONES[tone] || TONES.friendly,
    channel,
    structure_hint: HINTS[idx % HINTS.length],
    sender_company_name: org.name || null,
    sender_offer: offer,
    message_angle: angle,
    extra_instruction: regen ? (body.regenerate.instruction || null) : null,
    business_facts: facts,
    collected_signals: Array.isArray(r.score_reasons) ? r.score_reasons : [],
    review_summary: ins ? { summary_ar: ins.summary_ar, praise: ins.praise, complaints: ins.complaints } : null,
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
      total: chosen.length,
    },
  };
});

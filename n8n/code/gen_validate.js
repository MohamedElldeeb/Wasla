// WF3 "Validate message": parse the LLM JSON and enforce the message rules (spec 6.4 and 6.3b step 5). Runs once per item.
// Used by two nodes: "Validate message" (first attempt) and "Validate retry" (the single automatic retry, with feedback).
/*__INSIGHTS__*/
const meta = $('Select and build').item.json;
const res = $input.item.json;
const attempt = $prevNode.name === 'OpenRouter retry' ? 2 : 1;
const first = attempt === 2 ? $('Validate message').item.json : null;

const base = { lead_id: meta.lead_id, message_id: meta.message_id, regen_count: meta.regen_count, channel: meta.channel,
  organization_id: meta.organization_id, campaign_id: meta.campaign_id, job_id: meta.job_id, total: meta.total };
const body = res && res.body;
const u = (body && body.usage) || {};
const prevU = first || { tokens_in: 0, tokens_out: 0, cost: 0 };
const usage = { tokens_in: (u.prompt_tokens || 0) + prevU.tokens_in, tokens_out: (u.completion_tokens || 0) + prevU.tokens_out,
  cost: (Number(u.cost) || 0) + prevU.cost, model: (body && body.model) || (first && first.model) || null };
// Save instruction for the single "Save message" HTTP node: invalid items become a harmless no-op PATCH (matches no row).
const NOOP = { method: 'PATCH', path: 'messages?id=eq.00000000-0000-0000-0000-000000000000', prefer: 'return=minimal', body: { review_status: 'pending' } };

// A failed first attempt is retried ONCE with the reasons as feedback; a failed retry is final.
const bad = (reason, raw) => {
  const retryable = attempt === 1 && !/^http_/.test(reason);
  let retryBody = '{}';
  if (retryable) {
    const req = JSON.parse(meta.requestBody);
    req.messages = [...req.messages, { role: 'assistant', content: raw || '{}' }, { role: 'user', content: `Your reply was rejected (${reason}). Rewrite it and return the JSON again. Remember: between 40 and 90 words for chat, no links, one soft question at the end, at most one emoji, mention at most one fact from safe_facts, and NEVER mention complaints, low ratings or any weakness of the business.` }];
    req.temperature = 0.5;
    retryBody = JSON.stringify(req);
  }
  return { json: { ...base, ...usage, ok: false, reason, retry: retryable, requestBody: retryBody, save: NOOP } };
};

if (!res || res.statusCode < 200 || res.statusCode >= 300 || !body || !body.choices) return bad(`http_${res && res.statusCode}`);
const content = body.choices[0]?.message?.content || '';
let d;
try { d = JSON.parse(content.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()); } catch (e) { return bad('bad_json', content); }
let message = typeof d.message === 'string' ? d.message.trim() : '';
if (!message) return bad('empty', content);

const words = message.split(/\s+/).filter(Boolean).length;
const chat = meta.channel !== 'email';
if (chat && (words < 30 || words > 110)) return bad(`word_count_${words}`, content);
if (!chat && (words < 50 || words > 150)) return bad(`word_count_${words}`, content);
if (chat && /https?:|www\.|\.com\b|\.net\b|\.eg\b|wa\.me/i.test(message)) return bad('contains_link', content);
// Tact: no complaints, low ratings or weaknesses in the first message (this lead's own complaint themes are checked too).
const tact = checkTact(message, meta.complaints || []);
if (!tact.ok) return bad(`tact:${tact.reasons.slice(0, 3).join(',')}`, content);
// At most ONE emoji (spec 6.4): keep the first, drop the rest instead of wasting the generation.
let seenEmoji = 0;
message = message.replace(/\p{Extended_Pictographic}️?/gu, (m) => (seenEmoji++ === 0 ? m : '')).replace(/[ \t]{2,}/g, ' ').trim();

const angle = typeof d.angle === 'string' ? d.angle.trim().slice(0, 120) : null;
const subject = typeof d.subject === 'string' ? d.subject.trim().slice(0, 100) : null;
const save = meta.message_id
  ? { method: 'PATCH', path: `messages?id=eq.${meta.message_id}&review_status=neq.sent`, prefer: 'return=minimal',
      body: { generated_text: message, edited_text: null, angle, subject, opportunity_type: meta.opportunity_type, review_status: 'pending', regen_count: meta.regen_count, llm_model: usage.model, job_id: meta.job_id } }
  : { method: 'POST', path: 'messages?on_conflict=lead_id,campaign_id,channel', prefer: 'resolution=ignore-duplicates,return=minimal',
      body: { organization_id: meta.organization_id, lead_id: meta.lead_id, campaign_id: meta.campaign_id, job_id: meta.job_id, channel: meta.channel,
        subject, generated_text: message, angle, opportunity_type: meta.opportunity_type, llm_model: usage.model } };
return { json: { ...base, ...usage, ok: true, retry: false, retried: attempt === 2, message, angle, subject, save } };

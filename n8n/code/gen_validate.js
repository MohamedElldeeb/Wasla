// WF3 "Validate message": parse the LLM JSON and enforce the message rules (spec 6.4). Runs once per item.
const meta = $('Select and build').item.json;
const res = $input.item.json;

const base = { lead_id: meta.lead_id, message_id: meta.message_id, regen_count: meta.regen_count, channel: meta.channel,
  organization_id: meta.organization_id, campaign_id: meta.campaign_id, job_id: meta.job_id, total: meta.total };
const body = res && res.body;
const u = (body && body.usage) || {};
const usage = { tokens_in: u.prompt_tokens || 0, tokens_out: u.completion_tokens || 0, cost: Number(u.cost) || 0, model: (body && body.model) || null };
// Save instruction for the single "Save message" HTTP node: invalid items become a harmless no-op PATCH (matches no row).
const NOOP = { method: 'PATCH', path: 'messages?id=eq.00000000-0000-0000-0000-000000000000', prefer: 'return=minimal', body: { review_status: 'pending' } };
const bad = (reason) => ({ json: { ...base, ...usage, ok: false, reason, save: NOOP } });

if (!res || res.statusCode < 200 || res.statusCode >= 300 || !body || !body.choices) return bad(`http_${res && res.statusCode}`);
let d;
try { d = JSON.parse((body.choices[0]?.message?.content || '').replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()); } catch (e) { return bad('bad_json'); }
let message = typeof d.message === 'string' ? d.message.trim() : '';
if (!message) return bad('empty');

const words = message.split(/\s+/).filter(Boolean).length;
const chat = meta.channel !== 'email';
if (chat && (words < 30 || words > 110)) return bad(`word_count_${words}`);
if (!chat && (words < 50 || words > 150)) return bad(`word_count_${words}`);
if (chat && /https?:|www\.|\.com\b|\.net\b|\.eg\b|wa\.me/i.test(message)) return bad('contains_link');
// At most ONE emoji (spec 6.4): keep the first, drop the rest instead of wasting the generation.
let seenEmoji = 0;
message = message.replace(/\p{Extended_Pictographic}️?/gu, (m) => (seenEmoji++ === 0 ? m : '')).replace(/[ 	]{2,}/g, ' ').trim();

const angle = typeof d.angle === 'string' ? d.angle.trim().slice(0, 120) : null;
const subject = typeof d.subject === 'string' ? d.subject.trim().slice(0, 100) : null;
const save = meta.message_id
  ? { method: 'PATCH', path: `messages?id=eq.${meta.message_id}&review_status=neq.sent`, prefer: 'return=minimal',
      body: { generated_text: message, edited_text: null, angle, subject, review_status: 'pending', regen_count: meta.regen_count, llm_model: usage.model, job_id: meta.job_id } }
  : { method: 'POST', path: 'messages?on_conflict=lead_id,campaign_id,channel', prefer: 'resolution=ignore-duplicates,return=minimal',
      body: { organization_id: meta.organization_id, lead_id: meta.lead_id, campaign_id: meta.campaign_id, job_id: meta.job_id, channel: meta.channel,
        subject, generated_text: message, angle, llm_model: usage.model } };
return { json: { ...base, ...usage, ok: true, message, angle, subject, save } };

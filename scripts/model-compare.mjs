// Model comparison for the first outreach message (round 2): the same 10 fixture leads, the same real WF3 prompt and validator, two models via OpenRouter.
// Reads docs/samples/fixtures-run.json (produced by scripts/fixtures-run.mjs) and writes docs/MODEL_COMPARISON.md. No Apify.
// Usage: node --env-file=.env.local scripts/model-compare.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { runNode, resetStatic } from '../tests/helpers/n8n-sim.mjs';
import { checkMessage, openingKey } from '../lib/insights/core.mjs';

const KEY = process.env.OPENROUTER_API_KEY;
const MODELS = [
  ['google/gemini-2.5-flash', 'Gemini 2.5 Flash'],
  ['anthropic/claude-haiku-4.5', 'Claude Haiku 4.5'],
];
const run = JSON.parse(readFileSync(new URL('../docs/samples/fixtures-run.json', import.meta.url), 'utf8'));
const draft = run.planner.draft;
const WEBHOOK = (model) => ({ body: { organization_id: 'org', campaign_id: 'camp', job_id: 'job', model, fallback_models: [] } });
const campaign = { id: 'camp', parameters: { opportunities: draft.opportunities, complaint_relevance: draft.complaint_relevance, channel: 'whatsapp', tone: 'friendly', angle: draft.angles[0] || null } };
const STYLE_EXAMPLES = [
  'أهلا يا فريق [اسم النشاط]، عملاءكم دايما بيشكروا في الأفكار الجديدة اللي بتقدموها. إحنا عاملين أداة اسمها وصلة بتجيب لوكالات التسويق شركات محتاجة خدماتها فعلا، ومع كل شركة رسالة جاهزة تتبعت على واتساب. تحبوا أبعتلكم 10 شركات مناسبة لشغلكم ببلاش تشوفوها بنفسكم؟ محمد من وصلة',
  'أهلا، بنساعد وكالات التسويق في إسكندرية يلاقوا شركات محتاجة خدماتهم، ونجهز لكل شركة رسالة شخصية تتبعت على واتساب. لو حابين، أبعتلكم 10 شركات مناسبة لتخصصكم ببلاش تجربوا بيها. محمد من وصلة',
];
const PROFILE = {
  style_examples: STYLE_EXAMPLES,
  what_we_sell: 'وصلة: بتلاقي عملاء B2B للوكالات وبتكتب رسائل واتساب شخصية لكل عميل', ideal_customer: 'وكالات تسويق ودعاية وإعلان ومستقلين في مصر',
  problems_we_solve: 'إن الوكالة تلاقي عملاء جدد ومناسبين وتتواصل معاهم بسرعة', proof_points: '', cta_offer: 'أبعتلكم 10 شركات مناسبة لشغلكم ببلاش', sender_name: 'محمد', regions: [{ governorate: 'القاهرة' }],
};
const org = { name: 'وصلة', offer_profile: PROFILE };

async function chat(body) {
  let last = null;
  for (let a = 1; a <= 3; a++) {
    const t0 = Date.now();
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}`, 'X-Title': 'Wasla' }, body });
    const text = await r.text();
    let j = null;
    try { j = JSON.parse(text); } catch { j = null; }
    last = { statusCode: r.status, body: j, ms: Date.now() - t0 };
    if (r.status === 200 && j?.choices) return last;
    await new Promise((x) => setTimeout(x, 1500 * a));
  }
  return last;
}

// 10 leads: the kept leads of both fixtures that have a generated request (Cairo first: it is the main test)
const picks = [];
for (const city of ['cairo', 'alexandria']) {
  const c = run.cities[city];
  c.genLinks.forEach((gl) => picks.push({ city, gl, c }));
}
const chosen = picks.slice(0, 10);

const rows = [];
for (const p of chosen) {
  const nodes = { Webhook: [WEBHOOK(MODELS[0][0])], 'Claim job': [{ credits_reserved: 100 }], 'Get campaign': [campaign], 'Get org': [org], 'Get campaign leads': [p.gl], 'Get messages': [], 'Get insights': p.c.insightsForGen, 'Get cooldown': [] };
  const out = { lead: p.gl.leads.business_name, city: p.city, opp: p.gl.selected_opportunity, per: {} };
  for (const [model, label] of MODELS) {
    resetStatic();
    const built = await runNode('gen_build.js', { nodes: { ...nodes, Webhook: [WEBHOOK(model)] } });
    const req = JSON.parse(built[0].json.requestBody);
    req.model = model;
    const res = await chat(JSON.stringify(req));
    const v = await runNode('gen_validate.js', { nodes: { 'Select and build': [{ ...built[0].json, requestBody: JSON.stringify(req) }] }, input: [res], prev: 'OpenRouter' });
    const content = (() => { try { return JSON.parse(res.body.choices[0].message.content.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()); } catch { return null; } })();
    const text = v.json.message || (content && content.message) || '';
    out.per[model] = {
      label, ok: v.json.ok, reason: v.json.reason || null, text, words: text.split(/\s+/).filter(Boolean).length,
      emojis: (text.match(/\p{Extended_Pictographic}/gu) || []).length, ms: res.ms, cost: Number(res.body?.usage?.cost) || 0,
      tokens: (res.body?.usage?.prompt_tokens || 0) + (res.body?.usage?.completion_tokens || 0),
      // style audit on the produced text (also for texts the validator rejected, so the failure is visible)
      audit: text ? checkMessage(text, { channel: 'whatsapp', areas: built[0].json.areas, city: built[0].json.city, ctaOffer: PROFILE.cta_offer, senderName: PROFILE.sender_name }).reasons : ['empty'],
      opening: text ? openingKey(text) : '',
    };
    console.log(out.lead.slice(0, 24), label, v.json.ok ? 'ok' : v.json.reason);
  }
  rows.push(out);
}

const sum = (m, f) => rows.reduce((a, r) => a + f(r.per[m]), 0);
let md = `# Model comparison: first WhatsApp message (round 2)

Generated ${new Date().toISOString().slice(0, 10)} by \`scripts/model-compare.mjs\` (no Apify).

## What changed in round 2
- The generation prompt and validator were rewritten (rules: no rating or stars, no micro-district, no jargon, no time-of-day greeting, one personal detail at most from the lead's specialty or praised themes, benefits only from the offer with an \`offer_quote\` check, a concrete CTA from the offer profile, a signature, 35 to 70 words, variety of openings). The two reference messages are no longer in the global prompt: they are the Wasla organization's own style_examples (optional per-organization field, empty by default).
- The offer profile for Wasla now has \`cta_offer\` ("${PROFILE.cta_offer}") and \`sender_name\` ("${PROFILE.sender_name}").
- Only the two models you asked for are compared, on the same ${rows.length} fixture leads (Cairo and Alexandria marketing agencies kept by the new fit logic). The planner is fixed to Gemini 2.5 Flash, so the planner comparison is dropped.
- Each model got **one attempt** (the real workflow adds one automatic retry on top). "Style audit" re-checks every produced text, including rejected ones, against the rules.

I did not rank the models. The numbers below are objective; the texts are for you to judge.

## Objective results

| | ${MODELS.map(([, l]) => l).join(' | ')} |
|---|${MODELS.map(() => '---').join('|')}|
`;
md += `| Passed validation first time | ${MODELS.map(([m]) => `${sum(m, (x) => (x.ok ? 1 : 0))} / ${rows.length}`).join(' | ')} |\n`;
md += `| Texts with at least one style violation | ${MODELS.map(([m]) => `${sum(m, (x) => (x.audit.length ? 1 : 0))} / ${rows.length}`).join(' | ')} |\n`;
md += `| Different openings (first 5 words) | ${MODELS.map(([m]) => `${new Set(rows.map((r) => r.per[m].opening).filter(Boolean)).size} / ${rows.length}`).join(' | ')} |\n`;
md += `| Average words | ${MODELS.map(([m]) => Math.round(sum(m, (x) => x.words) / rows.length)).join(' | ')} |\n`;
md += `| Average latency (s) | ${MODELS.map(([m]) => (sum(m, (x) => x.ms) / rows.length / 1000).toFixed(1)).join(' | ')} |\n`;
md += `| Cost for ${rows.length} messages (USD) | ${MODELS.map(([m]) => sum(m, (x) => x.cost).toFixed(4)).join(' | ')} |\n`;
md += `| Tokens per message (avg) | ${MODELS.map(([m]) => Math.round(sum(m, (x) => x.tokens) / rows.length)).join(' | ')} |\n\n`;
md += `## Side by side\n\nFor each lead: the angle the pipeline chose (if any opportunity is tied to the offer), then the text from each model.\n\n`;
rows.forEach((r, i) => {
  md += `### ${i + 1}. ${r.lead} (${r.city}${r.opp ? `, angle: ${r.opp}` : ', general opening / hook'})\n\n`;
  for (const [m, l] of MODELS) {
    const x = r.per[m];
    md += `**${l}** — ${x.ok ? 'valid' : `rejected: ${x.reason}`} · ${x.words} words${x.audit.length ? ` · audit: ${x.audit.join(', ')}` : ''}\n\n> ${(x.text || '(no text)').replace(/\n/g, '\n> ')}\n\n`;
  }
});
writeFileSync(new URL('../docs/MODEL_COMPARISON.md', import.meta.url), md);
console.log('wrote docs/MODEL_COMPARISON.md');

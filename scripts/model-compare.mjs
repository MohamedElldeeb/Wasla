// Model comparison for the first outreach message (Part 5b): the same 10 fixture leads, the same real WF3 prompt, three models via OpenRouter.
// Reads docs/samples/fixtures-run.json (produced by scripts/fixtures-run.mjs) and writes docs/MODEL_COMPARISON.md. No Apify.
// Usage: node --env-file=.env.local scripts/model-compare.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { runNode } from '../tests/helpers/n8n-sim.mjs';

const KEY = process.env.OPENROUTER_API_KEY;
const MODELS = [
  ['openai/gpt-4o-mini', 'GPT-4o mini'],
  ['google/gemini-2.5-flash', 'Gemini 2.5 Flash'],
  ['anthropic/claude-haiku-4.5', 'Claude Haiku 4.5'],
];
const run = JSON.parse(readFileSync(new URL('../docs/samples/fixtures-run.json', import.meta.url), 'utf8'));
const WEBHOOK = (model) => ({ body: { organization_id: 'org', campaign_id: 'camp', job_id: 'job', model, fallback_models: [] } });
const campaign = { id: 'camp', parameters: { ...run.planner.draft && { opportunities: run.planner.draft.opportunities, complaint_relevance: run.planner.draft.complaint_relevance }, channel: 'whatsapp', tone: 'friendly', angle: run.planner.draft.angles[0] || null } };
const org = { name: 'Wasla', offer_profile: { what_we_sell: 'وصلة: بتلاقي عملاء B2B للوكالات وبتكتب رسائل واتساب شخصية لكل عميل', ideal_customer: 'وكالات تسويق ودعاية وإعلان ومستقلين في مصر', problems_we_solve: 'إن الوكالة تلاقي عملاء جدد ومناسبين وتتواصل معاهم بسرعة', regions: [{ governorate: 'القاهرة' }] } };

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

// 10 leads: the kept agencies of both fixtures that have a generated request (Cairo first: it is the main test)
const picks = [];
for (const city of ['cairo', 'alexandria']) {
  const c = run.cities[city];
  c.genLinks.forEach((gl) => picks.push({ city, gl, c }));
}
const chosen = picks.slice(0, 10);

const rows = [];
for (const p of chosen) {
  const nodes = { Webhook: [WEBHOOK(MODELS[0][0])], 'Claim job': [{ credits_reserved: 100 }], 'Get campaign': [campaign], 'Get org': [org], 'Get campaign leads': [p.gl], 'Get messages': [], 'Get insights': p.c.insightsForGen, 'Get cooldown': [] };
  const complaints = (p.c.insightsForGen.find((i) => i.lead_id === p.gl.leads.id)?.analysis?.complaints || []).map((x) => x.theme);
  const out = { lead: p.gl.leads.business_name, city: p.city, opp: p.gl.selected_opportunity, per: {} };
  for (const [model, label] of MODELS) {
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
    };
    console.log(out.lead.slice(0, 24), label, v.json.ok ? 'ok' : v.json.reason);
  }
  rows.push(out);
}

const sum = (m, f) => rows.reduce((a, r) => a + f(r.per[m]), 0);
let md = `# Model comparison: first WhatsApp message\n\nGenerated ${new Date().toISOString().slice(0, 10)} by \`scripts/model-compare.mjs\` (no Apify). The same ${rows.length} fixture leads (Cairo and Alexandria marketing agencies from \`docs/samples/fixtures/\`), the same production prompt (\`n8n/code/gen_build.js\`) and the same validator (\`gen_validate.js\`: 30 to 110 words, no links, at most one emoji kept, and the tact check: no complaints, low ratings or weaknesses). Each model got **one attempt** (the real workflow adds one automatic retry on top). Offer used: "${'Wasla finds B2B clients for agencies and sends personalized WhatsApp messages'}".\n\nI did not rank the models. The numbers below are objective; the texts are for you to judge.\n\n## Objective results\n\n| | ${MODELS.map(([, l]) => l).join(' | ')} |\n|---|${MODELS.map(() => '---').join('|')}|\n`;
md += `| Passed validation first time | ${MODELS.map(([m]) => `${sum(m, (x) => (x.ok ? 1 : 0))} / ${rows.length}`).join(' | ')} |\n`;
md += `| Average words | ${MODELS.map(([m]) => Math.round(sum(m, (x) => x.words) / rows.length)).join(' | ')} |\n`;
md += `| Average latency (s) | ${MODELS.map(([m]) => (sum(m, (x) => x.ms) / rows.length / 1000).toFixed(1)).join(' | ')} |\n`;
md += `| Cost for ${rows.length} messages (USD) | ${MODELS.map(([m]) => sum(m, (x) => x.cost).toFixed(4)).join(' | ')} |\n`;
md += `| Tokens per message (avg) | ${MODELS.map(([m]) => Math.round(sum(m, (x) => x.tokens) / rows.length)).join(' | ')} |\n\n`;
md += `## Side by side\n\nOpportunity = the angle the lead's message is built on (chosen from the lead's real data, never shown as a complaint in the text).\n\n`;
rows.forEach((r, i) => {
  md += `### ${i + 1}. ${r.lead} (${r.city}${r.opp ? `, angle: ${r.opp}` : ''})\n\n`;
  for (const [m, l] of MODELS) {
    const x = r.per[m];
    md += `**${l}** — ${x.ok ? 'valid' : `rejected: ${x.reason}`} · ${x.words} words\n\n> ${(x.text || '(no text)').replace(/\n/g, '\n> ')}\n\n`;
  }
});

// ───────────── planner comparison (same offers, three models) ─────────────
const OFFERS = [
  ['Wasla (finds B2B clients for agencies)', org.offer_profile],
  ['Tax and accounting firm', { what_we_sell: 'خدمات الضرايب والفاتورة الإلكترونية والدفاتر للشركات الصغيرة', ideal_customer: 'مطاعم وعيادات وصيدليات ومحلات ومصانع صغيرة في القاهرة', problems_we_solve: 'الغرامات وتعقيد الفاتورة الإلكترونية وعدم وجود محاسب متفرغ', proof_points: '', regions: [{ governorate: 'القاهرة' }] }],
];
const defs = (await (async () => {
  const { PGlite } = await import('@electric-sql/pglite');
  const { readdirSync } = await import('node:fs');
  const db = new PGlite();
  await db.exec("create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; create schema auth; create table auth.users (id uuid primary key, instance_id uuid, aud text, role text, email text, raw_user_meta_data jsonb default '{}'::jsonb, created_at timestamptz default now()); create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$; create publication supabase_realtime;");
  for (const f of readdirSync(new URL('../supabase/migrations/', import.meta.url)).filter((x) => x.endsWith('.sql')).sort()) await db.exec(readFileSync(new URL(`../supabase/migrations/${f}`, import.meta.url), 'utf8'));
  return (await db.query('select key,name_ar,reason_low_ar,reason_high_ar,baseline from public.signal_definitions where enabled order by sort_order')).rows;
})());
let planMd = `
## Planner comparison

The campaign planner (WF0) writes the search phrases, the allowed Google Maps categories, the signals and the opportunity map from the offer profile. It runs on \`OPENROUTER_PLANNER_MODEL\`, which can differ from the message model. Same prompt (\`n8n/code/plan_build.js\`), same two unrelated offers, three models, one attempt each.
`;
for (const [offerName, profile] of OFFERS) {
  planMd += `
### Offer: ${offerName}

`;
  for (const [model, label] of MODELS) {
    const WH = { body: { organization_id: 'o', job_id: 'j', model, planner_model: model, fallback_models: [], locale: 'en' } };
    const built = await runNode('plan_build.js', { nodes: { Webhook: [WH], 'Get org': [{ name: 'X', offer_profile: profile }], 'Get signals': defs, 'Get negatives': [] } });
    const res = await chat(built[0].json.requestBody);
    const parsed = await runNode('plan_parse.js', { nodes: { Webhook: [WH], 'Get signals': defs }, input: [res] });
    const j = parsed[0].json;
    if (!j.ok) { planMd += `**${label}** failed: ${j.error}

`; continue; }
    const d = j.draft;
    planMd += `**${label}** (${(res.ms / 1000).toFixed(1)}s, $${(Number(res.body?.usage?.cost) || 0).toFixed(4)})

- Ideal prospect: ${d.ideal_lead_description}
- Search phrases: ${d.keywords.join(' · ')}
- Allowed categories: ${d.categories.join(' · ')}
- Signals: ${d.signals.map((s) => `${s.key} ${s.weight}${s.emphasis ? ' (emphasis)' : ''}`).join(', ')}
- Opportunities: ${d.opportunities.map((o) => `${o.type}: ${o.angle_ar}`).join(' | ') || '—'}
- Complaints the offer can help with: ${d.complaint_relevance || '—'}

`;
    console.log('planner', offerName, label);
  }
}
md += planMd;
writeFileSync(new URL('../docs/MODEL_COMPARISON.md', import.meta.url), md);
console.log('wrote docs/MODEL_COMPARISON.md');

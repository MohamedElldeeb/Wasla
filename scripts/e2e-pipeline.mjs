// Integration test of the whole backend pipeline against the DEV project + n8n (no UI):
// user -> org -> planner (WF0) -> campaign -> ingest (WF1/WF2/WF2b) -> generate (WF3) -> mark sent.
// Costs real (small) Apify/OpenRouter credits: max_results is capped to MAX.
// Usage: node --env-file=.env.local scripts/e2e-pipeline.mjs [step...]   steps: user plan campaign ingest generate send (default: all)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const SB = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const N8N = process.env.N8N_BASE_URL.replace(/\/$/, '');
const SECRET = process.env.N8N_WEBHOOK_SECRET;
const MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
const FALLBACKS = (process.env.OPENROUTER_FALLBACK_MODELS || '').split(',').map((s) => s.trim()).filter(Boolean);
const MAX = Number(process.env.E2E_MAX_RESULTS || 6);
const stateFile = new URL('./.e2e-state.local.json', import.meta.url);
const st = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : {};
const save = () => writeFileSync(stateFile, JSON.stringify(st, null, 2));
const steps = process.argv.slice(2).length ? process.argv.slice(2) : ['user', 'plan', 'campaign', 'ingest', 'generate', 'send'];
const log = (...a) => console.log(...a);

async function rest(path, { method = 'GET', body, token, prefer, service } = {}) {
  const res = await fetch(`${SB}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: service ? SERVICE : ANON,
      ...(service ? {} : { authorization: `Bearer ${token}` }),
      'content-type': 'application/json',
      ...(prefer ? { prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}
const rpc = (fn, args, token) => rest(`rpc/${fn}`, { method: 'POST', body: args, token });

async function webhook(path, body) {
  const res = await fetch(`${N8N}/webhook/${path}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-wasla-secret': SECRET }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`webhook ${path} -> ${res.status} ${await res.text()}`);
}
async function waitJob(id, token, label, timeoutMs = 600000) {
  const t0 = Date.now();
  let last = '';
  while (Date.now() - t0 < timeoutMs) {
    const [j] = await rest(`jobs?id=eq.${id}&select=*`, { token });
    const line = `${j.status} ${j.progress}%`;
    if (line !== last) { log(`  [${label}] ${line}`); last = line; }
    if (['succeeded', 'failed', 'cancelled'].includes(j.status)) return j;
    await new Promise((r) => setTimeout(r, 4000));
  }
  throw new Error(`job ${id} timed out`);
}
const token = async () => {
  const res = await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'content-type': 'application/json' }, body: JSON.stringify({ email: st.email, password: st.password }) });
  const j = await res.json();
  if (!j.access_token) throw new Error('login failed ' + JSON.stringify(j));
  return j.access_token;
};

if (steps.includes('user')) {
  st.email = `e2e+${Date.now()}@wasla.test`;
  st.password = `Wasla-${Math.random().toString(36).slice(2, 10)}!x1`;
  const res = await fetch(`${SB}/auth/v1/admin/users`, { method: 'POST', headers: { apikey: SERVICE, 'content-type': 'application/json' }, body: JSON.stringify({ email: st.email, password: st.password, email_confirm: true, user_metadata: { full_name: 'E2E Tester' } }) });
  if (!res.ok) throw new Error('create user ' + (await res.text()));
  const t = await token();
  st.org = await rpc('create_organization', {
    p_name: 'مكتب الأمل للمحاسبة (E2E)',
    p_offer_profile: {
      what_we_sell: 'خدمات محاسبة وضرايب وفاتورة إلكترونية للشركات الصغيرة والمتوسطة',
      ideal_customer: 'أصحاب مطاعم وعيادات ومحلات وشركات صغيرة محتاجين دفاتر ومتابعة ضريبية',
      problems_we_solve: 'غرامات الضرايب، تأخير الإقرارات، تعقيد الفاتورة الإلكترونية، ودفاتر مش منظمة',
      proof_points: 'خبرة ١٠ سنين مع أكتر من ٢٠٠ شركة صغيرة',
      regions: [{ governorate: 'القاهرة', city: 'القاهرة', district: 'مدينة نصر' }],
    },
  }, t);
  log('user', st.email, 'org', st.org);
  save();
}

if (steps.includes('plan')) {
  const t = await token();
  const job = await rpc('create_job', { p_org: st.org, p_campaign: null, p_type: 'plan', p_credits: 2, p_idempotency_key: `plan:${st.org}:${Date.now()}` }, t);
  await webhook('wasla-plan', { job_id: job.id, organization_id: st.org, model: MODEL, fallback_models: FALLBACKS });
  const done = await waitJob(job.id, t, 'plan');
  if (done.status !== 'succeeded') throw new Error('planner failed: ' + done.error);
  st.draft = done.result;
  log('draft:', JSON.stringify(done.result, null, 1).slice(0, 1800));
  log('tokens', done.tokens_in, done.tokens_out, 'cost', done.cost_usd, 'model', done.llm_model);
  save();
}

if (steps.includes('campaign')) {
  const t = await token();
  const sigs = [{ key: 'has_website', weight: -40 }, { key: 'business_age', weight: 50 }, { key: 'size_proxy', weight: 30 }, { key: 'review_insights', weight: 40 }];
  const [c] = await rest('campaigns', { method: 'POST', token: t, prefer: 'return=representation', body: {
    organization_id: st.org, created_by: (JSON.parse(Buffer.from(t.split('.')[1], 'base64url')).sub), name: 'E2E مطاعم مدينة نصر', source: 'google_maps',
    parameters: {
      keywords: ['مطاعم'], locations: [{ governorate: 'القاهرة', city: 'القاهرة', district: 'مدينة نصر' }], max_results: MAX,
      filters: { must_have_phone: true, must_have_mobile: true, exclude_closed: true },
      channel: 'whatsapp', tone: 'friendly', signals: sigs,
    } } });
  st.campaign = c.id;
  log('campaign', c.id);
  save();
}

if (steps.includes('ingest')) {
  const t = await token();
  const sigCost = await rpc('signal_credits_per_lead', { p_signals: [{ key: 'has_website' }, { key: 'business_age' }, { key: 'size_proxy' }, { key: 'review_insights' }] }, t);
  const credits = MAX * (1 + sigCost);
  const bal = await rpc('org_credit_balance', { org: st.org }, t);
  log('balance', bal, 'reserve', credits, 'sigCost/lead', sigCost);
  const job = await rpc('create_job', { p_org: st.org, p_campaign: st.campaign, p_type: 'ingest', p_credits: credits, p_idempotency_key: `ingest:${st.campaign}:${Date.now()}` }, t);
  await rest(`campaigns?id=eq.${st.campaign}`, { method: 'PATCH', token: t, body: { status: 'running' } });
  await webhook('wasla-ingest', { job_id: job.id, organization_id: st.org, campaign_id: st.campaign, model: MODEL, fallback_models: FALLBACKS, max_results_cap: 100 });
  st.ingestJob = job.id;
  const done = await waitJob(job.id, t, 'ingest');
  log('ingest result', done.status, done.error, JSON.stringify(done.counts), 'credits used', done.credits_used, 'of', done.credits_reserved);
  log('balance after', await rpc('org_credit_balance', { org: st.org }, t));
  const rows = await rest(`campaign_leads?campaign_id=eq.${st.campaign}&select=opportunity_score,score_reasons,leads(business_name,phone_e164,phone_type,whatsapp_eligible,website,rating,reviews_count)&order=opportunity_score.desc.nullslast`, { token: t });
  for (const r of rows) log(' ', r.opportunity_score, JSON.stringify(r.score_reasons), '|', r.leads.business_name, r.leads.phone_e164, r.leads.phone_type, r.leads.website ? 'web' : 'noweb');
  save();
}

if (steps.includes('generate')) {
  const t = await token();
  const links = await rest(`campaign_leads?campaign_id=eq.${st.campaign}&select=leads(id,whatsapp_eligible,status)`, { token: t });
  const have = await rest(`messages?campaign_id=eq.${st.campaign}&select=lead_id`, { token: t });
  const haveSet = new Set(have.map((m) => m.lead_id));
  const eligible = links.map((l) => l.leads).filter((l) => l.whatsapp_eligible && l.status !== 'opted_out' && !haveSet.has(l.id));
  log('eligible leads without message', eligible.length);
  const job = await rpc('create_job', { p_org: st.org, p_campaign: st.campaign, p_type: 'generate', p_credits: eligible.length, p_idempotency_key: `gen:${st.campaign}:${Date.now()}` }, t);
  await webhook('wasla-generate', { job_id: job.id, organization_id: st.org, campaign_id: st.campaign, model: MODEL, fallback_models: FALLBACKS });
  const done = await waitJob(job.id, t, 'generate');
  log('generate result', done.status, done.error, JSON.stringify(done.counts), 'credits', done.credits_used, '/', done.credits_reserved, 'cost', done.cost_usd, 'model', done.llm_model);
  const msgs = await rest(`messages?campaign_id=eq.${st.campaign}&select=id,generated_text,angle,review_status,leads(business_name)`, { token: t });
  for (const m of msgs) log('\n---', m.leads.business_name, '|', m.review_status, '|', m.angle, '\n' + m.generated_text, `\n(${m.generated_text.split(/\s+/).length} words)`);
  save();
}

if (steps.includes('send')) {
  const t = await token();
  const [m] = await rest(`messages?campaign_id=eq.${st.campaign}&select=id&review_status=eq.pending&limit=1`, { token: t });
  if (!m) throw new Error('no pending message');
  try { await rpc('mark_message_sent', { p_message_id: m.id }, t); log('UNEXPECTED: sent without approval'); } catch (e) { log('unreviewed send blocked:', String(e.message).slice(0, 120)); }
  await rest(`messages?id=eq.${m.id}`, { method: 'PATCH', token: t, body: { review_status: 'approved' } });
  const sent = await rpc('mark_message_sent', { p_message_id: m.id }, t);
  log('sent ->', sent.review_status, 'counter ok');
}

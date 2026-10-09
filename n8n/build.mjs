// Generates the n8n workflow JSON files in n8n/workflows/ from n8n/code/*.js.
// Credentials are referenced by placeholder (__CRED_*__) and substituted by n8n/deploy.mjs. No secrets here.
// Usage: node n8n/build.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const code = (f) => {
  // Normalize line endings so the generated JSON is identical on Windows and Linux (CI checks for drift).
  const lf = (t) => t.replace(/\r\n/g, '\n');
  let s = lf(readFileSync(new URL(`./code/${f}`, import.meta.url), 'utf8'));
  if (s.includes('/*__PHONE__*/')) {
    const phone = lf(readFileSync(new URL('../lib/phone/egypt.mjs', import.meta.url), 'utf8')).replace(/^export /gm, '');
    s = s.replace('/*__PHONE__*/', phone);
  }
  return s;
};

const CRED = {
  supabase: { httpHeaderAuth: { id: '__CRED_SUPABASE__', name: 'Wasla Supabase' } },
  secret: { httpHeaderAuth: { id: '__CRED_SECRET__', name: 'Wasla Webhook Secret' } },
  openrouter: { httpHeaderAuth: { id: '__CRED_OPENROUTER__', name: 'Wasla OpenRouter' } },
  apify: { httpQueryAuth: { id: '__CRED_APIFY__', name: 'Wasla Apify' } },
};

class Workflow {
  constructor(name) { this.name = name; this.nodes = []; this.connections = {}; this.x = 0; this.row = 0; }
  id(name) { const h = createHash('sha1').update(this.name + name).digest('hex'); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`; }
  add(name, type, typeVersion, parameters, extra = {}, at) {
    const position = at || [this.x += 240, 300 + this.row * 160];
    this.nodes.push({ id: this.id(name), name, type, typeVersion, position, parameters, ...extra });
    return name;
  }
  connect(from, to, out = 0, inIdx = 0) {
    ((this.connections[from] ??= { main: [] }).main[out] ??= []).push({ node: to, type: 'main', index: inIdx });
  }
  merge(name) { return this.add(name, 'n8n-nodes-base.merge', 3, { mode: 'append' }); }
  chain(...names) { for (let i = 0; i < names.length - 1; i++) this.connect(names[i], names[i + 1]); }
  json() { return { name: this.name, nodes: this.nodes, connections: this.connections, settings: { executionOrder: 'v1' } }; }

  webhook(path, name = 'Webhook') {
    return this.add(name, 'n8n-nodes-base.webhook', 2, { httpMethod: 'POST', path, authentication: 'headerAuth', responseMode: 'onReceived', options: {} },
      { credentials: CRED.secret, webhookId: this.id('wh-' + path) });
  }
  // Supabase REST. `path` may contain {{ expressions }}. body: JS expression string (without ={{ }}).
  sb(name, method, path, { body, prefer, extra = {}, node = {} } = {}) {
    const headers = [];
    if (prefer) headers.push({ name: 'Prefer', value: prefer });
    const p = {
      method,
      url: `=__SUPABASE_URL__/rest/v1/${path}`,
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendHeaders: headers.length > 0,
      ...(headers.length ? { headerParameters: { parameters: headers } } : {}),
      sendBody: body !== undefined,
      ...(body !== undefined ? { specifyBody: 'json', jsonBody: `={{ ${body} }}` } : {}),
      options: { response: { response: { neverError: true } }, timeout: 60000 },
      ...extra,
    };
    return this.add(name, 'n8n-nodes-base.httpRequest', 4.2, p, { credentials: CRED.supabase, retryOnFail: true, maxTries: 3, waitBetweenTries: 1500, ...node });
  }
  rpc(name, fn, body, node = {}) { return this.sb(name, 'POST', `rpc/${fn}`, { body, node }); }
  openrouter(name, { batch, node = {} } = {}) {
    const options = { response: { response: { fullResponse: true, neverError: true } }, timeout: 120000 };
    if (batch) options.batching = { batch: { batchSize: batch, batchInterval: 1200 } };
    return this.add(name, 'n8n-nodes-base.httpRequest', 4.2, {
      method: 'POST', url: 'https://openrouter.ai/api/v1/chat/completions',
      authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth',
      sendHeaders: true, headerParameters: { parameters: [{ name: 'HTTP-Referer', value: '__APP_URL__' }, { name: 'X-Title', value: 'Wasla' }] },
      sendBody: true, specifyBody: 'json', jsonBody: '={{ $json.requestBody }}', options,
    }, { credentials: CRED.openrouter, ...node });
  }
  apify(name, actor, bodyExpr, timeoutMs = 320000) {
    return this.add(name, 'n8n-nodes-base.httpRequest', 4.2, {
      method: 'POST', url: `https://api.apify.com/v2/acts/${actor.replace('/', '~')}/run-sync-get-dataset-items?timeout=300&format=json`,
      authentication: 'genericCredentialType', genericAuthType: 'httpQueryAuth',
      sendBody: true, specifyBody: 'json', jsonBody: `={{ ${bodyExpr} }}`,
      options: { response: { response: { fullResponse: true, neverError: true } }, timeout: timeoutMs },
    }, { credentials: CRED.apify, onError: 'continueRegularOutput' });
  }
  callWebhook(name, path, bodyExpr) {
    return this.add(name, 'n8n-nodes-base.httpRequest', 4.2, {
      method: 'POST', url: `=__N8N_BASE__/webhook/${path}`,
      authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth',
      sendBody: true, specifyBody: 'json', jsonBody: `={{ ${bodyExpr} }}`,
      options: { response: { response: { neverError: true } }, timeout: 30000 },
    }, { credentials: CRED.secret, retryOnFail: true, maxTries: 3, waitBetweenTries: 2000 });
  }
  code(name, file, mode = 'runOnceForAllItems', extra = {}) {
    return this.add(name, 'n8n-nodes-base.code', 2, { mode, jsCode: code(file) }, extra);
  }
  codeInline(name, js, mode = 'runOnceForAllItems') { return this.add(name, 'n8n-nodes-base.code', 2, { mode, jsCode: js }); }
  iff(name, leftExpr, at) {
    return this.add(name, 'n8n-nodes-base.if', 2.2, {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [{ id: this.id('c-' + name), leftValue: `={{ ${leftExpr} }}`, rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }],
        combinator: 'and',
      },
      options: {},
    }, {}, at);
  }
  loop(name, size) { return this.add(name, 'n8n-nodes-base.splitInBatches', 3, { batchSize: size, options: {} }); }
}

const JOB = '$("Webhook").first().json.body.job_id';
const CAMPAIGN = '$("Webhook").first().json.body.campaign_id';
const ORG = '$("Webhook").first().json.body.organization_id';
const settle = (w, name, fields) => w.rpc(name, 'settle_job', `JSON.stringify({ ${fields} })`);
const out = [];

// ───────────────────────── WF0 Planner ─────────────────────────
{
  const w = new Workflow('Wasla WF0 - Campaign planner');
  const hook = w.webhook('wasla-plan');
  const claim = w.sb('Claim job', 'PATCH', `jobs?id=eq.{{ ${JOB} }}&status=eq.queued`,
    { prefer: 'return=representation', body: 'JSON.stringify({ status: "running", started_at: new Date().toISOString(), progress: 10 })' });
  const org = w.sb('Get org', 'GET', `organizations?id=eq.{{ ${ORG} }}&select=name,offer_profile`);
  const sig = w.sb('Get signals', 'GET', 'signal_definitions?enabled=eq.true&select=key,name_ar,reason_low_ar,reason_high_ar&order=sort_order');
  const build = w.code('Build request', 'plan_build.js');
  const llm = w.openrouter('OpenRouter');
  const parse = w.code('Parse planner', 'plan_parse.js');
  const ok = w.iff('OK?', '$json.ok');
  w.row = -1; const save = w.sb('Save draft', 'PATCH', 'jobs?id=eq.{{ $json.job_id }}', { body: 'JSON.stringify({ result: $json.draft })' });
  const done = settle(w, 'Settle ok', 'p_job_id: $("Parse planner").first().json.job_id, p_credits_used: $("Claim job").first().json.credits_reserved, p_status: "succeeded", p_cost_usd: $("Parse planner").first().json.cost, p_llm_model: $("Parse planner").first().json.model, p_tokens_in: $("Parse planner").first().json.tokens_in, p_tokens_out: $("Parse planner").first().json.tokens_out');
  w.row = 1; w.x -= 240; const fail = settle(w, 'Settle failed', 'p_job_id: $json.job_id, p_credits_used: 0, p_status: "failed", p_error: $json.error');
  w.chain(hook, claim, org, sig, build, llm, parse, ok);
  w.connect(ok, save, 0); w.connect(save, done); w.connect(ok, fail, 1);
  out.push(['WF0_planner', w]);
}

// ───────────────────────── WF1 Ingestion ─────────────────────────
{
  const w = new Workflow('Wasla WF1 - Campaign ingestion');
  const hook = w.webhook('wasla-ingest');
  const claim = w.sb('Claim job', 'PATCH', `jobs?id=eq.{{ ${JOB} }}&status=eq.queued`,
    { prefer: 'return=representation', body: 'JSON.stringify({ status: "running", started_at: new Date().toISOString(), progress: 5 })' });
  const camp = w.sb('Get campaign', 'GET', `campaigns?id=eq.{{ ${CAMPAIGN} }}&select=id,organization_id,parameters,source`);
  const sig = w.rpc('Signal cost', 'signal_credits_per_lead', 'JSON.stringify({ p_signals: $json.parameters.signals || [] })');
  const plan = w.code('Plan queries', 'ingest_plan_queries.js');
  const has = w.iff('Has queries?', '!$json.error');
  const apify = w.apify('Apify places', 'compass/crawler-google-places', '$json.requestBody');
  const collect = w.code('Collect', 'ingest_collect.js');
  const found = w.iff('Rows found?', '$json.rows.length > 0');
  const stage = w.sb('Save staging', 'POST', 'lead_staging?on_conflict=job_id,external_id',
    { prefer: 'resolution=ignore-duplicates,return=minimal', body: 'JSON.stringify($json.rows)' });
  const prog = w.sb('Save lead cap', 'PATCH', `jobs?id=eq.{{ ${JOB} }}`,
    { body: 'JSON.stringify({ progress: 40, counts: { found: $("Collect").first().json.found, unique: $("Collect").first().json.unique, lead_cap: $("Plan queries").first().json.leadCap, queries: $("Plan queries").all().length } })' });
  const next = w.callWebhook('Call normalize', 'wasla-normalize', '$("Webhook").first().json.body');
  w.row = 1; w.x -= 480;
  const emptySettle = settle(w, 'Settle empty or failed', 'p_job_id: ' + JOB + ', p_credits_used: 0, p_status: $("Collect").first().json.allFailed ? "failed" : "succeeded", p_error: $("Collect").first().json.allFailed ? "البحث على خرائط جوجل ماشتغلش. جرّب تاني بعد شوية." : null, p_counts: { found: 0, lead_cap: $("Plan queries").first().json.leadCap }');
  w.row = 2; const noq = settle(w, 'Settle no queries', 'p_job_id: ' + JOB + ', p_credits_used: 0, p_status: "failed", p_error: "الحملة محتاجة كلمات بحث ومنطقة على الأقل."');
  w.chain(hook, claim, camp, sig, plan, has);
  w.connect(has, apify, 0); w.connect(has, noq, 1);
  w.chain(apify, collect, found);
  w.connect(found, stage, 0); w.connect(found, emptySettle, 1);
  w.chain(stage, prog, next);
  out.push(['WF1_ingest', w]);
}

// ───────────────────────── WF2 Normalize and dedupe ─────────────────────────
{
  const w = new Workflow('Wasla WF2 - Normalize and dedupe');
  const hook = w.webhook('wasla-normalize');
  const job = w.sb('Get job', 'GET', `jobs?id=eq.{{ ${JOB} }}&status=eq.running&select=*`);
  const camp = w.sb('Get campaign', 'GET', `campaigns?id=eq.{{ ${CAMPAIGN} }}&select=id,parameters`);
  const stg = w.sb('Get staging', 'GET', `lead_staging?job_id=eq.{{ ${JOB} }}&select=external_id,raw&limit=5000`, { node: { alwaysOutputData: true } });
  const norm = w.code('Normalize', 'normalize.js');
  const ing = w.rpc('Ingest leads', 'ingest_leads', 'JSON.stringify({ p_org: $json.p_org, p_campaign: $json.p_campaign, p_leads: $json.p_leads })');
  const counts = w.code('Counts', 'normalize_counts.js');
  const upd = w.sb('Update counts', 'PATCH', 'jobs?id=eq.{{ $json.job_id }}', { body: 'JSON.stringify({ progress: 70, counts: $json.counts })' });
  const del = w.sb('Delete staging', 'DELETE', `lead_staging?job_id=eq.{{ ${JOB} }}`);
  const sigOn = w.iff('Signals on?', '$("Counts").first().json.signals_on');
  const callSig = w.callWebhook('Call signals', 'wasla-signals', '$("Webhook").first().json.body');
  w.row = 1; w.x -= 240;
  const done = settle(w, 'Settle', 'p_job_id: $("Counts").first().json.job_id, p_credits_used: $("Counts").first().json.credits_used, p_status: "succeeded", p_counts: $("Counts").first().json.counts');
  const ready = w.sb('Campaign ready', 'PATCH', 'campaigns?id=eq.{{ $("Counts").first().json.campaign_id }}', { body: 'JSON.stringify({ status: "ready" })' });
  w.chain(hook, job, camp, stg, norm, ing, counts, upd, del, sigOn);
  w.connect(sigOn, callSig, 0); w.connect(sigOn, done, 1); w.connect(done, ready);
  out.push(['WF2_normalize', w]);
}

// ───────────────────────── WF2b Signals and score ─────────────────────────
{
  const w = new Workflow('Wasla WF2b - Signals and score');
  const hook = w.webhook('wasla-signals');
  const job = w.sb('Get job', 'GET', `jobs?id=eq.{{ ${JOB} }}&status=eq.running&select=*`);
  const camp = w.sb('Get campaign', 'GET', `campaigns?id=eq.{{ ${CAMPAIGN} }}&select=id,parameters`);
  const links = w.sb('Get campaign leads', 'GET', `campaign_leads?campaign_id=eq.{{ ${CAMPAIGN} }}&select=lead_id,leads(id,business_name,google_place_id,website,reviews_count,rating)&limit=5000`, { node: { alwaysOutputData: true } });
  const fresh = w.sb('Get fresh signals', 'GET', `lead_signals?organization_id=eq.{{ ${ORG} }}&collected_at=gte.{{ new Date(Date.now() - 30 * 86400000).toISOString() }}&select=lead_id,signal_key&limit=20000`, { node: { alwaysOutputData: true } });
  const names = w.sb('Get org names', 'GET', `leads?organization_id=eq.{{ ${ORG} }}&select=business_name&limit=20000`, { node: { alwaysOutputData: true } });
  const cost = w.rpc('Reviews cost', 'signal_credits_per_lead', 'JSON.stringify({ p_signals: $("Get campaign").first().json.parameters.signals || [] })');
  const plan = w.code('Plan signals', 'signals_plan.js');
  const saveFree = w.sb('Save free signals', 'POST', 'lead_signals?on_conflict=lead_id,signal_key',
    { prefer: 'resolution=merge-duplicates,return=minimal', body: 'JSON.stringify($json.freeRows)' });
  const has = w.iff('Has targets?', '$("Plan signals").first().json.hasTargets');
  const apify = w.apify('Apify reviews', 'compass/google-maps-reviews-scraper', '$("Plan signals").first().json.reviewsRequestBody');
  const group = w.code('Group reviews', 'signals_group_reviews.js');
  const needs = w.iff('Needs LLM?', '$json.llm === true');
  const llm = w.openrouter('OpenRouter insights', { batch: 3 });
  const mrg = w.merge('Merge reviews');
  const parse = w.code('Parse signals', 'signals_parse.js');
  const savePaid = w.sb('Save paid signals', 'POST', 'lead_signals?on_conflict=lead_id,signal_key',
    { prefer: 'resolution=merge-duplicates,return=minimal', body: 'JSON.stringify($json.rows)' });
  w.row = 1; w.x -= 480;
  const score = w.rpc('Score', 'recompute_campaign_scores', 'JSON.stringify({ p_campaign: ' + CAMPAIGN + ' })');
  const fin = w.code('Finish', 'signals_finish.js');
  const upd = w.sb('Update counts', 'PATCH', 'jobs?id=eq.{{ $json.job_id }}', { body: 'JSON.stringify({ progress: 95, counts: $json.counts })' });
  const done = settle(w, 'Settle', 'p_job_id: $("Finish").first().json.job_id, p_credits_used: $("Finish").first().json.credits_used, p_status: "succeeded", p_counts: $("Finish").first().json.counts, p_cost_usd: $("Finish").first().json.usage.cost, p_llm_model: $("Finish").first().json.usage.model, p_tokens_in: $("Finish").first().json.usage.in, p_tokens_out: $("Finish").first().json.usage.out');
  const ready = w.sb('Campaign ready', 'PATCH', 'campaigns?id=eq.{{ $("Finish").first().json.campaign_id }}', { body: 'JSON.stringify({ status: "ready" })' });
  w.chain(hook, job, camp, links, fresh, names, cost, plan, saveFree, has);
  w.connect(has, apify, 0); w.connect(has, score, 1);
  w.chain(apify, group, needs);
  w.connect(needs, llm, 0); w.connect(needs, mrg, 1, 1); w.connect(llm, mrg, 0, 0);
  w.chain(mrg, parse, savePaid, score, fin, upd, done, ready);
  out.push(['WF2b_signals', w]);
}

// ───────────────────────── WF3 Message generation ─────────────────────────
{
  const w = new Workflow('Wasla WF3 - Message generation');
  const hook = w.webhook('wasla-generate');
  const claim = w.sb('Claim job', 'PATCH', `jobs?id=eq.{{ ${JOB} }}&status=eq.queued`,
    { prefer: 'return=representation', body: 'JSON.stringify({ status: "running", started_at: new Date().toISOString(), progress: 5 })' });
  const camp = w.sb('Get campaign', 'GET', `campaigns?id=eq.{{ ${CAMPAIGN} }}&select=id,parameters`);
  const org = w.sb('Get org', 'GET', `organizations?id=eq.{{ ${ORG} }}&select=name,offer_profile`);
  const links = w.sb('Get campaign leads', 'GET', `campaign_leads?campaign_id=eq.{{ ${CAMPAIGN} }}&select=opportunity_score,score_reasons,leads(id,business_name,category,district,city,rating,reviews_count,website,whatsapp_eligible,status)&order=opportunity_score.desc.nullslast&limit=2000`, { node: { alwaysOutputData: true } });
  const msgs = w.sb('Get messages', 'GET', `messages?campaign_id=eq.{{ ${CAMPAIGN} }}&select=id,lead_id,channel,regen_count,review_status&limit=5000`, { node: { alwaysOutputData: true } });
  const ins = w.sb('Get insights', 'GET', `lead_signals?organization_id=eq.{{ ${ORG} }}&signal_key=eq.review_insights&select=lead_id,raw&limit=5000`, { node: { alwaysOutputData: true } });
  const build = w.code('Select and build', 'gen_build.js');
  const nothing = w.iff('Nothing to do?', '$json.noop === true');
  const loop = w.loop('Loop', 5);
  const llm = w.openrouter('OpenRouter', { batch: 5 });
  const val = w.code('Validate message', 'gen_validate.js', 'runOnceForEachItem');
  const save = w.add('Save message', 'n8n-nodes-base.httpRequest', 4.2, {
    method: '={{ $json.save.method }}',
    url: '=__SUPABASE_URL__/rest/v1/{{ $json.save.path }}',
    authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth',
    sendHeaders: true, headerParameters: { parameters: [{ name: 'Prefer', value: '={{ $json.save.prefer }}' }] },
    sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.save.body) }}',
    options: { response: { response: { neverError: true } }, timeout: 60000 },
  }, { credentials: CRED.supabase, retryOnFail: true, maxTries: 3, waitBetweenTries: 1500 });
  const sum = w.codeInline('Summarize', `// per item: keep validate meta; flag DB errors from the save step
const m = $('Validate message').item.json;
const inp = $input.item.json || {};
const saveErr = m.ok && (inp.code || inp.hint || inp.details);
return { json: { ok: m.ok && !saveErr, reason: saveErr ? String(inp.message || inp.code).slice(0, 80) : m.reason, tokens_in: m.tokens_in, tokens_out: m.tokens_out, cost: m.cost, model: m.model } };`, 'runOnceForEachItem');
  const prog = w.sb('Progress', 'PATCH', `jobs?id=eq.{{ ${JOB} }}`, {
    body: 'JSON.stringify({ progress: Math.min(95, Math.round(((($runIndex + 1) * 5) / ($("Select and build").all().length || 1)) * 100)) })',
    node: { executeOnce: true },
  });
  const fin = w.code('Final', 'gen_final.js');
  const done = settle(w, 'Settle', 'p_job_id: $json.job_id, p_credits_used: $json.credits_used, p_status: $json.status, p_error: $json.error, p_counts: $json.counts, p_cost_usd: $json.cost_usd, p_llm_model: $json.model, p_tokens_in: $json.tokens_in, p_tokens_out: $json.tokens_out');
  const empty = settle(w, 'Settle nothing to do', 'p_job_id: ' + JOB + ', p_credits_used: 0, p_status: "succeeded", p_counts: { generated: 0, note: "no eligible leads without a message" }');
  w.chain(hook, claim, camp, org, links, msgs, ins, build, nothing);
  w.connect(nothing, empty, 0); w.connect(nothing, loop, 1);
  w.connect(loop, fin, 0); w.connect(loop, llm, 1);
  w.chain(llm, val, save, sum);
  w.connect(sum, prog); w.connect(sum, loop);
  w.connect(fin, done);
  out.push(['WF3_generate', w]);
}

mkdirSync(new URL('./workflows/', import.meta.url), { recursive: true });
for (const [file, w] of out) {
  writeFileSync(new URL(`./workflows/${file}.json`, import.meta.url), JSON.stringify(w.json(), null, 2) + '\n');
  console.log('wrote', file, w.nodes.length, 'nodes');
}

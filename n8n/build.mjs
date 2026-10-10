// Generates the n8n workflow JSON files in n8n/workflows/ from n8n/code/*.js.
// Credentials are referenced by placeholder (__CRED_*__) and substituted by n8n/deploy.mjs. No secrets here.
// Usage: node n8n/build.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

import { code } from './inline.mjs';

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
    // Provider errors (429, 5xx, a transient 400) throw so the node retries; after 3 tries the item continues with an error and the Code nodes treat it as a failed call.
    const options = { response: { response: { fullResponse: true } }, timeout: 120000 };
    if (batch) options.batching = { batch: { batchSize: batch, batchInterval: 1200 } };
    return this.add(name, 'n8n-nodes-base.httpRequest', 4.2, {
      method: 'POST', url: 'https://openrouter.ai/api/v1/chat/completions',
      authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth',
      sendHeaders: true, headerParameters: { parameters: [{ name: 'HTTP-Referer', value: '__APP_URL__' }, { name: 'X-Title', value: 'Wasla' }] },
      sendBody: true, specifyBody: 'json', jsonBody: '={{ $json.requestBody }}', options,
    }, { credentials: CRED.openrouter, retryOnFail: true, maxTries: 3, waitBetweenTries: 2000, onError: 'continueRegularOutput', ...node });
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
  code(name, file, mode = 'runOnceForAllItems', extra = {}, vars = {}) {
    return this.add(name, 'n8n-nodes-base.code', 2, { mode, jsCode: code(file, vars) }, extra);
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
  const sig = w.sb('Get signals', 'GET', 'signal_definitions?enabled=eq.true&select=key,name_ar,reason_low_ar,reason_high_ar,baseline&order=sort_order');
  const neg = w.sb('Get negatives', 'GET', `negative_examples?organization_id=eq.{{ ${ORG} }}&select=business_name,category,reason&order=created_at.desc&limit=20`, { node: { alwaysOutputData: true } });
  const build = w.code('Build request', 'plan_build.js');
  const llm = w.openrouter('OpenRouter');
  const parse = w.code('Parse planner', 'plan_parse.js');
  const ok = w.iff('OK?', '$json.ok');
  w.row = -1; const save = w.sb('Save draft', 'PATCH', 'jobs?id=eq.{{ $json.job_id }}', { body: 'JSON.stringify({ result: $json.draft })' });
  const done = settle(w, 'Settle ok', 'p_job_id: $("Parse planner").first().json.job_id, p_credits_used: $("Claim job").first().json.credits_reserved, p_status: "succeeded", p_cost_usd: $("Parse planner").first().json.cost, p_llm_model: $("Parse planner").first().json.model, p_tokens_in: $("Parse planner").first().json.tokens_in, p_tokens_out: $("Parse planner").first().json.tokens_out');
  w.row = 1; w.x -= 240; const fail = settle(w, 'Settle failed', 'p_job_id: $json.job_id, p_credits_used: 0, p_status: "failed", p_error: $json.error');
  w.chain(hook, claim, org, sig, neg, build, llm, parse, ok);
  w.connect(ok, save, 0); w.connect(save, done); w.connect(ok, fail, 1);
  out.push(['WF0_planner', w]);
}

// ───────────────────────── WF0b Probe (cheap sample before the full run) ─────────────────────────
{
  const w = new Workflow('Wasla WF0b - Probe');
  const hook = w.webhook('wasla-probe');
  const claim = w.sb('Claim job', 'PATCH', `jobs?id=eq.{{ ${JOB} }}&status=eq.queued`,
    { prefer: 'return=representation', body: 'JSON.stringify({ status: "running", started_at: new Date().toISOString(), progress: 10 })' });
  const camp = w.sb('Get campaign', 'GET', `campaigns?id=eq.{{ ${CAMPAIGN} }}&select=id,organization_id,parameters`);
  const org = w.sb('Get org', 'GET', `organizations?id=eq.{{ ${ORG} }}&select=name,offer_profile`);
  const neg = w.sb('Get negatives', 'GET', `negative_examples?organization_id=eq.{{ ${ORG} }}&select=business_name,category,reason&order=created_at.desc&limit=20`, { node: { alwaysOutputData: true } });
  const pass = (n) => {
    const plan = w.code(`Probe plan ${n}`, 'probe_plan.js', 'runOnceForAllItems', {}, { __N__: n });
    const hasq = w.iff(`Has queries ${n}?`, '!$json.error');
    const apify = w.apify(`Apify probe ${n}`, 'compass/crawler-google-places', '$json.requestBody', 200000);
    const coll = w.code(`Probe collect ${n}`, 'probe_collect.js', 'runOnceForAllItems', {}, { __N__: n });
    const hasp = w.iff(`Has places ${n}?`, '$json.noChunks !== true');
    const fit = w.openrouter(`OpenRouter fit ${n}`, { batch: 3 });
    const judge = w.code(`Probe judge ${n}`, 'probe_judge.js', 'runOnceForAllItems', {}, { __N__: n });
    w.connect(plan, hasq); w.connect(hasq, apify, 0); w.chain(apify, coll, hasp);
    w.connect(hasp, fit, 0); w.connect(hasp, judge, 1); w.connect(fit, judge);
    return { plan, hasq, judge };
  };
  const p1 = pass(1);
  const needs = w.iff('Needs rewrite?', '$json.needsRewrite === true');
  const rwReq = w.code('Rewrite request', 'probe_rewrite.js');
  const rwLlm = w.openrouter('OpenRouter rewrite');
  const rwParse = w.code('Parse rewrite', 'probe_parse_rewrite.js');
  const p2 = pass(2);
  const fin = w.code('Probe final', 'probe_final.js');
  const save = w.sb('Save result', 'PATCH', 'jobs?id=eq.{{ $json.job_id }}', { body: 'JSON.stringify({ result: $json.result })' });
  const done = settle(w, 'Settle ok', 'p_job_id: $("Probe final").first().json.job_id, p_credits_used: 0, p_status: "succeeded", p_counts: { probe_places: $("Probe final").first().json.result.judged, probe_fit: $("Probe final").first().json.result.fit }, p_cost_usd: $("Probe final").first().json.usage.cost, p_llm_model: $("Probe final").first().json.usage.model, p_tokens_in: $("Probe final").first().json.usage.in, p_tokens_out: $("Probe final").first().json.usage.out');
  w.row = 2; const noq = settle(w, 'Settle no queries', 'p_job_id: ' + JOB + ', p_credits_used: 0, p_status: "failed", p_error: "no_queries"');
  w.chain(hook, claim, camp, org, neg, p1.plan);
  w.connect(p1.hasq, noq, 1);
  w.connect(p1.judge, needs);
  w.connect(needs, rwReq, 0); w.connect(needs, fin, 1);
  w.chain(rwReq, rwLlm, rwParse, p2.plan);
  w.connect(p2.hasq, fin, 1); // cannot happen (queries exist), kept for safety
  w.connect(p2.judge, fin);
  w.chain(fin, save, done);
  out.push(['WF0b_probe', w]);
}

// ───────────────────────── WF-interview (onboarding interview, one job per turn) ─────────────────────────
{
  const w = new Workflow('Wasla WF-interview - Onboarding interview');
  const hook = w.webhook('wasla-interview');
  const claim = w.sb('Claim job', 'PATCH', `jobs?id=eq.{{ ${JOB} }}&status=eq.queued`,
    { prefer: 'return=representation', body: 'JSON.stringify({ status: "running", started_at: new Date().toISOString(), progress: 10 })' });
  const hasSite = w.iff('Has site?', '!!$("Webhook").first().json.body.site_url && ($("Webhook").first().json.body.transcript || []).length === 0');
  const fetchSite = w.add('Fetch site', 'n8n-nodes-base.httpRequest', 4.2, {
    method: 'GET', url: '={{ $("Webhook").first().json.body.site_url }}',
    options: { response: { response: { fullResponse: true, neverError: true } }, timeout: 15000, redirect: { redirect: { maxRedirects: 3 } } },
  }, { onError: 'continueRegularOutput' });
  const siteText = w.code('Site text', 'interview_site.js');
  const build = w.code('Build turn', 'interview_build.js');
  const llm = w.openrouter('OpenRouter interview');
  const parse = w.code('Parse turn', 'interview_parse.js');
  const ok = w.iff('OK?', '$json.ok');
  w.row = -1; const save = w.sb('Save turn', 'PATCH', 'jobs?id=eq.{{ $json.job_id }}', { body: 'JSON.stringify({ result: $json.result })' });
  const done = settle(w, 'Settle ok', 'p_job_id: $("Parse turn").first().json.job_id, p_credits_used: 0, p_status: "succeeded", p_cost_usd: $("Parse turn").first().json.usage.cost, p_llm_model: $("Parse turn").first().json.usage.model, p_tokens_in: $("Parse turn").first().json.usage.in, p_tokens_out: $("Parse turn").first().json.usage.out');
  w.row = 1; w.x -= 240; const fail = settle(w, 'Settle failed', 'p_job_id: $json.job_id, p_credits_used: 0, p_status: "failed", p_error: $json.error');
  w.connect(hook, claim); w.connect(claim, hasSite);
  w.connect(hasSite, fetchSite, 0); w.connect(hasSite, build, 1);
  w.chain(fetchSite, siteText, build);
  w.chain(build, llm, parse, ok);
  w.connect(ok, save, 0); w.connect(save, done); w.connect(ok, fail, 1);
  out.push(['WF_interview', w]);
}

// ───────────────────────── WF1 Ingestion (search rounds) ─────────────────────────
{
  const w = new Workflow('Wasla WF1 - Campaign ingestion');
  const hook = w.webhook('wasla-ingest');
  const job = w.sb('Get job', 'GET', `jobs?id=eq.{{ ${JOB} }}&select=*`);
  const mark = w.sb('Mark running', 'PATCH', `jobs?id=eq.{{ ${JOB} }}&status=eq.queued`,
    { prefer: 'return=minimal', body: 'JSON.stringify({ status: "running", started_at: new Date().toISOString(), progress: 5 })' });
  const camp = w.sb('Get campaign', 'GET', `campaigns?id=eq.{{ ${CAMPAIGN} }}&select=id,organization_id,parameters,source`);
  const sig = w.rpc('Signal cost', 'signal_credits_per_lead', 'JSON.stringify({ p_signals: $json.parameters.signals || [] })');
  const past = w.sb('Get past searches', 'GET', `search_queries?organization_id=eq.{{ ${ORG} }}&select=query,campaign_id&order=created_at.desc&limit=1500`, { node: { alwaysOutputData: true } });
  const probe = w.sb('Get probe', 'GET', `jobs?campaign_id=eq.{{ ${CAMPAIGN} }}&type=eq.probe&status=eq.succeeded&order=created_at.desc&limit=1&select=result`, { node: { alwaysOutputData: true } });
  const plan = w.code('Plan queries', 'ingest_plan_queries.js');
  const has = w.iff('Has queries?', '!$json.error && !$json.exhausted');
  const apify = w.apify('Apify places', 'compass/crawler-google-places', '$json.requestBody');
  const collect = w.code('Collect', 'ingest_collect.js');
  const failed = w.iff('Maps failed on round 1?', '$json.allFailed === true && ($("Plan queries").first().json.round || 1) === 1');
  const stage = w.sb('Save staging', 'POST', 'lead_staging?on_conflict=job_id,external_id',
    { prefer: 'resolution=ignore-duplicates,return=minimal', body: 'JSON.stringify($json.rows)' });
  const searches = w.sb('Save searches', 'POST', 'search_queries', { prefer: 'return=minimal', body: 'JSON.stringify($("Collect").first().json.searchRows)' });
  const prog = w.sb('Save round state', 'PATCH', `jobs?id=eq.{{ ${JOB} }}`,
    { body: 'JSON.stringify({ progress: Math.min(60, 20 + 10 * ($("Collect").first().json.counts.round || 1)), counts: $("Collect").first().json.counts })' });
  const next = w.callWebhook('Call normalize', 'wasla-normalize', 'Object.assign({}, $("Webhook").first().json.body, { round: $("Collect").first().json.counts.round })');
  w.row = 1; w.x -= 480;
  const why = w.iff('No queries at all?', '$json.error === "no_queries"');
  const noq = settle(w, 'Settle no queries', 'p_job_id: ' + JOB + ', p_credits_used: 0, p_status: "failed", p_error: "no_queries"');
  const exhausted = w.callWebhook('Call normalize final', 'wasla-normalize', 'Object.assign({}, $("Webhook").first().json.body, { final: true })');
  w.row = 2; const mapsFail = settle(w, 'Settle maps failed', 'p_job_id: ' + JOB + ', p_credits_used: 0, p_status: "failed", p_error: "maps_failed"');
  w.chain(hook, job, mark, camp, sig, past, probe, plan, has);
  w.connect(has, apify, 0); w.connect(has, why, 1);
  w.connect(why, noq, 0); w.connect(why, exhausted, 1);
  w.chain(apify, collect, failed);
  w.connect(failed, mapsFail, 0); w.connect(failed, stage, 1);
  w.chain(stage, searches, prog, next);
  out.push(['WF1_ingest', w]);
}

// ───────────────────────── WF2 Normalize, fit check, dedupe ─────────────────────────
{
  const w = new Workflow('Wasla WF2 - Normalize and dedupe');
  const hook = w.webhook('wasla-normalize');
  const job = w.sb('Get job', 'GET', `jobs?id=eq.{{ ${JOB} }}&status=eq.running&select=*`);
  const camp = w.sb('Get campaign', 'GET', `campaigns?id=eq.{{ ${CAMPAIGN} }}&select=id,parameters`);
  const org = w.sb('Get org', 'GET', `organizations?id=eq.{{ ${ORG} }}&select=name,offer_profile`);
  const stg = w.sb('Get staging', 'GET', `lead_staging?job_id=eq.{{ ${JOB} }}&select=external_id,raw&limit=5000`, { node: { alwaysOutputData: true } });
  const known = w.sb('Get known leads', 'GET', `leads?organization_id=eq.{{ ${ORG} }}&select=dedupe_key&limit=20000`, { node: { alwaysOutputData: true } });
  const cool = w.sb('Get cooldown', 'GET', `messages?organization_id=eq.{{ ${ORG} }}&review_status=eq.sent&sent_at=gte.{{ new Date(Date.now() - 30 * 86400000).toISOString() }}&select=leads(dedupe_key)&limit=5000`, { node: { alwaysOutputData: true } });
  const neg = w.sb('Get negatives', 'GET', `negative_examples?organization_id=eq.{{ ${ORG} }}&select=business_name,category,reason&order=created_at.desc&limit=20`, { node: { alwaysOutputData: true } });
  const norm = w.code('Normalize', 'normalize.js');
  const hasc = w.iff('Has candidates?', '$json.noChunks !== true');
  const fit = w.openrouter('OpenRouter fit', { batch: 3 });
  const apply = w.code('Apply fit', 'fit_apply.js');
  const ing = w.rpc('Ingest leads', 'ingest_leads', 'JSON.stringify({ p_org: $json.p_org, p_campaign: $json.p_campaign, p_leads: $json.p_leads, p_include_previous: $json.p_include_previous })');
  const counts = w.code('Counts', 'normalize_counts.js');
  const upd = w.sb('Update counts', 'PATCH', 'jobs?id=eq.{{ $json.job_id }}', { body: 'JSON.stringify({ progress: Math.min(85, 40 + 10 * ($json.counts.round || 1)), counts: $json.counts })' });
  const del = w.sb('Delete staging', 'DELETE', `lead_staging?job_id=eq.{{ ${JOB} }}`);
  const more = w.iff('More rounds?', '$("Counts").first().json.next_round !== null && $("Counts").first().json.next_round !== undefined');
  const callNext = w.callWebhook('Call next round', 'wasla-ingest', 'Object.assign({}, $("Webhook").first().json.body, { round: $("Counts").first().json.next_round })');
  const sigOn = w.iff('Signals on?', '$("Counts").first().json.signals_on');
  const callSig = w.callWebhook('Call signals', 'wasla-signals', '$("Webhook").first().json.body');
  w.row = 1; w.x -= 240;
  const done = settle(w, 'Settle', 'p_job_id: $("Counts").first().json.job_id, p_credits_used: $("Counts").first().json.credits_used, p_status: "succeeded", p_counts: $("Counts").first().json.counts, p_cost_usd: $("Counts").first().json.counts.fit_usage.cost, p_llm_model: $("Counts").first().json.counts.fit_usage.model, p_tokens_in: $("Counts").first().json.counts.fit_usage.in, p_tokens_out: $("Counts").first().json.counts.fit_usage.out');
  const ready = w.sb('Campaign ready', 'PATCH', 'campaigns?id=eq.{{ $("Counts").first().json.campaign_id }}', { body: 'JSON.stringify({ status: "ready" })' });
  w.chain(hook, job, camp, org, stg, known, cool, neg, norm, hasc);
  w.connect(hasc, fit, 0); w.connect(hasc, apply, 1); w.connect(fit, apply);
  w.chain(apply, ing, counts, upd, del, more);
  w.connect(more, callNext, 0); w.connect(more, sigOn, 1);
  w.connect(sigOn, callSig, 0); w.connect(sigOn, done, 1); w.connect(done, ready);
  out.push(['WF2_normalize', w]);
}

// ───────────────────────── WF2b Signals, insights and score ─────────────────────────
{
  const w = new Workflow('Wasla WF2b - Signals and score');
  const hook = w.webhook('wasla-signals');
  const job = w.sb('Get job', 'GET', `jobs?id=eq.{{ ${JOB} }}&status=eq.running&select=*`);
  const camp = w.sb('Get campaign', 'GET', `campaigns?id=eq.{{ ${CAMPAIGN} }}&select=id,parameters`);
  const org = w.sb('Get org', 'GET', `organizations?id=eq.{{ ${ORG} }}&select=name,offer_profile`);
  const links = w.sb('Get campaign leads', 'GET', `campaign_leads?campaign_id=eq.{{ ${CAMPAIGN} }}&removed_at=is.null&select=lead_id,fit,leads(id,business_name,google_place_id,website,reviews_count,rating,raw)&limit=5000`, { node: { alwaysOutputData: true } });
  const fresh = w.sb('Get fresh insights', 'GET', `lead_insights?organization_id=eq.{{ ${ORG} }}&computed_at=gte.{{ new Date(Date.now() - 30 * 86400000).toISOString() }}&select=lead_id,facts,analysis&limit=20000`, { node: { alwaysOutputData: true } });
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
  const saveIns = w.sb('Save insights', 'POST', 'lead_insights?on_conflict=lead_id',
    { prefer: 'resolution=merge-duplicates,return=minimal', body: 'JSON.stringify($("Parse signals").first().json.insightRows)' });
  w.row = 1; w.x -= 480;
  const opps = w.code('Opportunities', 'signals_opps.js');
  const saveOpps = w.sb('Save opportunities', 'POST', 'campaign_leads?on_conflict=campaign_id,lead_id',
    { prefer: 'resolution=merge-duplicates,return=minimal', body: 'JSON.stringify($json.rows)' });
  const score = w.rpc('Score', 'recompute_campaign_scores', 'JSON.stringify({ p_campaign: ' + CAMPAIGN + ' })');
  const fin = w.code('Finish', 'signals_finish.js');
  const upd = w.sb('Update counts', 'PATCH', 'jobs?id=eq.{{ $json.job_id }}', { body: 'JSON.stringify({ progress: 95, counts: $json.counts })' });
  const done = settle(w, 'Settle', 'p_job_id: $("Finish").first().json.job_id, p_credits_used: $("Finish").first().json.credits_used, p_status: "succeeded", p_counts: $("Finish").first().json.counts, p_cost_usd: $("Finish").first().json.usage.cost, p_llm_model: $("Finish").first().json.usage.model, p_tokens_in: $("Finish").first().json.usage.in, p_tokens_out: $("Finish").first().json.usage.out');
  const ready = w.sb('Campaign ready', 'PATCH', 'campaigns?id=eq.{{ $("Finish").first().json.campaign_id }}', { body: 'JSON.stringify({ status: "ready" })' });
  w.chain(hook, job, camp, org, links, fresh, names, cost, plan, saveFree, has);
  w.connect(has, apify, 0); w.connect(has, opps, 1);
  w.chain(apify, group, needs);
  w.connect(needs, llm, 0); w.connect(needs, mrg, 1, 1); w.connect(llm, mrg, 0, 0);
  w.chain(mrg, parse, savePaid, saveIns, opps);
  w.chain(opps, saveOpps, score, fin, upd, done, ready);
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
  const links = w.sb('Get campaign leads', 'GET', `campaign_leads?campaign_id=eq.{{ ${CAMPAIGN} }}&removed_at=is.null&select=opportunity_score,score_reasons,opportunities,selected_opportunity,fit,leads(id,business_name,category,district,city,rating,reviews_count,website,whatsapp_eligible,status)&order=opportunity_score.desc.nullslast&limit=2000`, { node: { alwaysOutputData: true } });
  const msgs = w.sb('Get messages', 'GET', `messages?campaign_id=eq.{{ ${CAMPAIGN} }}&select=id,lead_id,channel,regen_count,review_status&limit=5000`, { node: { alwaysOutputData: true } });
  const ins = w.sb('Get insights', 'GET', `lead_insights?organization_id=eq.{{ ${ORG} }}&select=lead_id,facts,analysis&limit=5000`, { node: { alwaysOutputData: true } });
  const cool = w.sb('Get cooldown', 'GET', `messages?organization_id=eq.{{ ${ORG} }}&review_status=eq.sent&sent_at=gte.{{ new Date(Date.now() - 30 * 86400000).toISOString() }}&select=lead_id&limit=5000`, { node: { alwaysOutputData: true } });
  const build = w.code('Select and build', 'gen_build.js');
  const nothing = w.iff('Nothing to do?', '$json.noop === true');
  const loop = w.loop('Loop', 5);
  const llm = w.openrouter('OpenRouter', { batch: 5 });
  const val = w.code('Validate message', 'gen_validate.js', 'runOnceForEachItem');
  const retry = w.iff('Retry?', '$json.retry === true');
  const llm2 = w.openrouter('OpenRouter retry');
  const val2 = w.code('Validate retry', 'gen_validate.js', 'runOnceForEachItem');
  const save = w.add('Save message', 'n8n-nodes-base.httpRequest', 4.2, {
    method: '={{ $json.save.method }}',
    url: '=__SUPABASE_URL__/rest/v1/{{ $json.save.path }}',
    authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth',
    sendHeaders: true, headerParameters: { parameters: [{ name: 'Prefer', value: '={{ $json.save.prefer }}' }] },
    sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.save.body) }}',
    options: { response: { response: { neverError: true } }, timeout: 60000 },
  }, { credentials: CRED.supabase, retryOnFail: true, maxTries: 3, waitBetweenTries: 1500 });
  const sum = w.codeInline('Summarize', `// per item: keep validate meta; flag DB errors from the save step
let m;
try { m = $('Validate retry').item.json; } catch (e) { m = $('Validate message').item.json; }
const inp = $input.item.json || {};
const saveErr = m.ok && (inp.code || inp.hint || inp.details);
return { json: { ok: m.ok && !saveErr, retried: !!m.retried, reason: saveErr ? String(inp.message || inp.code).slice(0, 80) : m.reason, tokens_in: m.tokens_in, tokens_out: m.tokens_out, cost: m.cost, model: m.model } };`, 'runOnceForEachItem');
  const prog = w.sb('Progress', 'PATCH', `jobs?id=eq.{{ ${JOB} }}`, {
    body: 'JSON.stringify({ progress: Math.min(95, Math.round(((($runIndex + 1) * 5) / ($("Select and build").all().length || 1)) * 100)) })',
    node: { executeOnce: true },
  });
  const fin = w.code('Final', 'gen_final.js');
  const done = settle(w, 'Settle', 'p_job_id: $json.job_id, p_credits_used: $json.credits_used, p_status: $json.status, p_error: $json.error, p_counts: $json.counts, p_cost_usd: $json.cost_usd, p_llm_model: $json.model, p_tokens_in: $json.tokens_in, p_tokens_out: $json.tokens_out');
  const empty = settle(w, 'Settle nothing to do', 'p_job_id: ' + JOB + ', p_credits_used: 0, p_status: "succeeded", p_counts: { generated: 0, skipped_cooldown: $json.skippedCooldown || 0, note: "no eligible leads without a message" }');
  w.chain(hook, claim, camp, org, links, msgs, ins, cool, build, nothing);
  w.connect(nothing, empty, 0); w.connect(nothing, loop, 1);
  w.connect(loop, fin, 0); w.connect(loop, llm, 1);
  w.chain(llm, val, retry);
  w.connect(retry, llm2, 0); w.connect(retry, save, 1);
  w.chain(llm2, val2, save);
  w.connect(save, sum);
  w.connect(sum, prog); w.connect(sum, loop);
  w.connect(fin, done);
  out.push(['WF3_generate', w]);
}

mkdirSync(new URL('./workflows/', import.meta.url), { recursive: true });
for (const [file, w] of out) {
  writeFileSync(new URL(`./workflows/${file}.json`, import.meta.url), JSON.stringify(w.json(), null, 2) + '\n');
  console.log('wrote', file, w.nodes.length, 'nodes');
}

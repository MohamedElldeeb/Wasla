// Offline tests of the generated n8n Code nodes against the real-run fixtures (no Apify, no LLM, no network).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { runNode, compiles } from './helpers/n8n-sim.mjs';

const fx = (city, f) => JSON.parse(readFileSync(new URL(`../docs/samples/fixtures/${city}/${f}.json`, import.meta.url), 'utf8'));
const cairo = fx('cairo', 'places');
const cairoRev = fx('cairo', 'reviews');
const ALLOWED = ['وكالة تسويق', 'وكالة إعلانية', 'خدمة التسويق عبر الإنترنت', 'مستشار تسويق', 'مصمم مواقع ويب', 'marketing agency', 'advertising agency', 'internet marketing service'];
const WEBHOOK = { body: { organization_id: 'org', campaign_id: 'camp', job_id: 'job', model: 'm', planner_model: 'pm', fallback_models: [] } };
const llmItem = (data, usage = {}) => ({ statusCode: 200, body: { model: 'x', usage: { prompt_tokens: 10, completion_tokens: 5, cost: 0.001, ...usage }, choices: [{ message: { content: JSON.stringify(data) } }] } });

test('every generated workflow compiles and every Code node is valid JavaScript', () => {
  const dir = new URL('../n8n/workflows/', import.meta.url);
  let n = 0;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const wf = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
    for (const node of wf.nodes.filter((x) => x.type === 'n8n-nodes-base.code')) {
      assert.ok(compiles(node.parameters.jsCode), `${f}: ${node.name}`);
      assert.ok(!node.parameters.jsCode.includes('__N__'), `${f}: ${node.name} still has a placeholder`);
      n++;
    }
    // every connection points at a node that exists
    const names = new Set(wf.nodes.map((x) => x.name));
    for (const [from, c] of Object.entries(wf.connections)) {
      assert.ok(names.has(from), `${f}: connection from unknown ${from}`);
      for (const outs of c.main) for (const t of outs || []) assert.ok(names.has(t.node), `${f}: connection to unknown ${t.node}`);
    }
  }
  assert.ok(n >= 25, `checked ${n} code nodes`);
});

async function normalizeCairo(over = {}) {
  return runNode('normalize.js', {
    nodes: {
      Webhook: [WEBHOOK],
      'Get campaign': [{ parameters: { filters: { categories_include: ALLOWED }, ideal_lead_description: 'Marketing agencies', max_results: 20, ...over.params } }],
      'Get job': [{ counts: { lead_cap: 20, delivered: 0, ...over.counts } }],
      'Get org': [{ name: 'Wasla', offer_profile: { what_we_sell: 'lead generation tool for agencies' } }],
      'Get staging': cairo.map((p) => ({ external_id: p.placeId, raw: p })),
      'Get known leads': over.known || [],
      'Get cooldown': over.cooldown || [],
      'Get negatives': [],
    },
  });
}

test('Part 2c on the Cairo fixture: government, utilities, education and off-category places never reach the fit check', async () => {
  const out = await normalizeCairo();
  const all = out[0].json.all;
  assert.equal(all.stats.staged, 20);
  assert.equal(all.stats.removed_global, 2); // power station + school
  assert.deepEqual(all.globalGroups, { utility: 1, education: 1 });
  assert.equal(all.stats.removed_category, 10); // government agency, car dealer, electronics, equipment supplier, ...
  const names = all.toJudge.map((c) => c.lead.business_name);
  assert.equal(names.length, 8);
  for (const bad of ['جهاز تنمية', 'محطة كهرباء', 'BDR', 'Cairo Marketing Company', '2B', 'Asd Business']) assert.ok(!names.some((n) => n.includes(bad)), bad);
  assert.equal(all.stats.invalid_phone, 0);
  // the LLM fit request asks for every candidate and is offer-agnostic
  const req = JSON.parse(out[0].json.requestBody);
  assert.equal(req.model, 'pm');
  assert.match(req.messages[0].content, /Ideal prospect: Marketing agencies/);
});

test('Part 3 fresh leads: known companies and companies in cooldown are skipped before the cap, unless included', async () => {
  const eng = cairo.find((p) => p.title.includes('إنجاز'));
  const ess = cairo.find((p) => p.title.includes('Essence'));
  const out = await normalizeCairo({ known: [{ dedupe_key: `place:${eng.placeId}` }], cooldown: [{ leads: { dedupe_key: `place:${ess.placeId}` } }] });
  const s = out[0].json.all.stats;
  assert.equal(s.previously_found, 1);
  assert.equal(s.cooldown, 1);
  assert.equal(out[0].json.all.toJudge.length, 6);
  const inc = await normalizeCairo({ params: { include_previous_companies: true }, known: [{ dedupe_key: `place:${eng.placeId}` }] });
  assert.equal(inc[0].json.all.stats.previously_found, 0);
  assert.equal(inc[0].json.all.toJudge.length, 8);
});

test('1: requested count = delivered: the fit check drops "not fit", keeps "maybe", and the cap applies after it', async () => {
  const out = await normalizeCairo({ counts: { lead_cap: 5 } });
  const chunks = out;
  const labels = new Map();
  const n = out[0].json.all.toJudge.length;
  for (let i = 0; i < n; i++) labels.set(i, i === 3 ? { fit: 'not_fit', reason: 'real estate brokerage' } : i === 4 ? { fit: 'maybe', reason: 'adjacent' } : { fit: 'fit', reason: 'agency' });
  const llm = chunks.map((c) => llmItem({ results: c.json.idx.map((i) => ({ i, ...labels.get(i) })) }));
  const res = await runNode('fit_apply.js', { nodes: { Webhook: [WEBHOOK], Normalize: chunks.map((c) => c.json) }, input: llm });
  const j = res[0].json;
  assert.equal(j.stats.removed_not_fit, 1);
  assert.equal(j.p_leads.length, 5, 'capped at what is still needed');
  assert.ok(j.p_leads.every((l) => l.fit === 'fit' || l.fit === 'maybe'));
  assert.equal(j.p_include_previous, false);
});

test('fit check failure never silently passes or drops: unchecked => "maybe"', async () => {
  const out = await normalizeCairo();
  const res = await runNode('fit_apply.js', { nodes: { Webhook: [WEBHOOK], Normalize: out.map((c) => c.json) }, input: out.map(() => ({ statusCode: 500, body: {} })) });
  assert.equal(res[0].json.stats.fit_unchecked, 8);
  assert.ok(res[0].json.p_leads.every((l) => l.fit === 'maybe' && l.fit_reason === 'unchecked'));
});

test('Part 2b: the exact campaign that returned zero results now produces a clean location query', async () => {
  const out = await runNode('ingest_plan_queries.js', {
    nodes: {
      Webhook: [{ body: { ...WEBHOOK.body, round: 1, max_results_cap: 100 } }],
      'Get job': [{ credits_reserved: 20, counts: {} }],
      'Get campaign': [{ parameters: { keywords: ['شركة تسويق الكتروني', 'Digital Marketing Agency', 'وكالة إعلانات', 'شركة تصميم مواقع وسيو'], locations: [{ city: 'القاهرة', district: 'التجمع الخامس ​القاهرة', governorate: 'القاهرة' }], max_results: 20, filters: { min_rating: 3.5 } } }],
      'Signal cost': [{ data: 0 }],
      'Get past searches': [],
    },
  });
  const input = JSON.parse(out[0].json.requestBody);
  assert.equal(input.locationQuery, 'التجمع الخامس القاهرة, Egypt');
  assert.ok(!/[​-‏]/.test(JSON.stringify(input)));
  assert.ok(input.maxCrawledPlacesPerSearch >= 20, 'real depth, not target / queries');
  assert.equal(input.skipClosedPlaces, true);
});

test('Part 3: searches already run by the org in earlier campaigns are avoided; rounds move on to synonyms and nearby districts', async () => {
  const base = {
    Webhook: [{ body: { ...WEBHOOK.body, round: 1, max_results_cap: 100 } }],
    'Get job': [{ credits_reserved: 20, counts: {} }],
    'Signal cost': [{ data: 0 }],
    'Get campaign': [{ parameters: { keywords: ['شركة تسويق'], synonyms: ['marketing agency'], locations: [{ governorate: 'القاهرة', city: 'القاهرة', district: 'مدينة نصر' }], max_results: 20 } }],
  };
  const fresh = await runNode('ingest_plan_queries.js', { nodes: { ...base, 'Get past searches': [] } });
  assert.deepEqual(JSON.parse(fresh[0].json.requestBody).searchStringsArray, ['شركة تسويق مدينة نصر']);
  const stale = await runNode('ingest_plan_queries.js', { nodes: { ...base, 'Get past searches': [{ query: 'شركة تسويق مدينة نصر', campaign_id: 'older' }] } });
  assert.equal(stale[0].json.round, 3, 'round 1 skipped, synonyms first');
  assert.deepEqual(JSON.parse(stale[0].json.requestBody).searchStringsArray, ['marketing agency مدينة نصر']);
});

test('Part 2 #5/#6: facts, signals and opportunities from the Cairo reviews fixture, with a stubbed review analysis', async () => {
  const links = ['فيرست ماركتس', 'إنجاز ميديا', 'Essence Adverts', 'المصرى للتسويق العقارى'].map((n, i) => {
    const p = cairo.find((x) => x.title.includes(n));
    return { lead_id: `l${i}`, fit: 'fit', leads: { id: `l${i}`, business_name: p.title, google_place_id: p.placeId, website: p.website || null, reviews_count: p.reviewsCount, rating: p.totalScore, raw: p } };
  });
  const campaign = { id: 'camp', parameters: {
    signals: [{ key: 'unclaimed_listing', weight: 60 }, { key: 'activity', weight: 40 }, { key: 'review_insights', weight: 30 }, { key: 'has_website', weight: -100 }],
    opportunities: [{ type: 'unclaimed_listing', angle_ar: 'a1' }, { type: 'dormant_activity', angle_ar: 'a2' }, { type: 'unanswered_low_reviews', angle_ar: 'a3' }, { type: 'review_theme', angle_ar: 'a4' }],
    complaint_relevance: 'slow replies to customers',
  } };
  const nodes = {
    Webhook: [WEBHOOK],
    'Get job': [{ credits_reserved: 100, counts: { new: 4 } }],
    'Get campaign': [campaign],
    'Get org': [{ name: 'W', offer_profile: { what_we_sell: 'lead gen' } }],
    'Reviews cost': [{ data: 1 }],
    'Get campaign leads': links,
    'Get fresh insights': [],
    'Get org names': links.map((l) => ({ business_name: l.leads.business_name })),
  };
  const plan = await runNode('signals_plan.js', { nodes });
  const pj = plan[0].json;
  assert.equal(pj.targets.length, 4);
  assert.ok(pj.freeRows.some((r) => r.signal_key === 'has_website'));
  assert.ok(!pj.freeRows.some((r) => r.signal_key === 'business_age'));
  assert.equal(pj.freeRows.filter((r) => r.signal_key === 'unclaimed_listing').length, 4);

  const group = await runNode('signals_group_reviews.js', { nodes: { ...nodes, 'Plan signals': [pj] }, input: [{ statusCode: 200, body: cairoRev }] });
  const g = group.map((x) => x.json);
  assert.equal(g.length, 4);
  const engaz = g.find((x) => x.facts.total_reviews === 100);
  assert.equal(engaz.facts.low_reviews, 3);
  assert.ok(engaz.llm, 'has review text => one LLM call');
  const req = JSON.parse(engaz.requestBody);
  assert.match(req.messages[0].content, /slow replies to customers/);

  const analysis = { praised: [{ theme: 'الالتزام', count: 4 }], complaints: [{ theme: 'بطء الرد', count: 2, offer_can_help: true }, { theme: 'السعر', count: 1, offer_can_help: false }], customer_values: 'x', summary_ar: 'ملخص', summary_en: 'summary', confidence: 'high' };
  const llmOut = g.filter((x) => x.llm).map(() => llmItem(analysis));
  const parsed = await runNode('signals_parse.js', { nodes: { ...nodes, 'Plan signals': [pj], 'Group reviews': g, 'OpenRouter insights': llmOut.map((o) => o) } });
  const pr = parsed[0].json;
  assert.equal(pr.insightRows.length, 4);
  const eng = pr.insightRows.find((r) => r.facts.total_reviews === 100);
  assert.equal(eng.analysis.confidence, 'high');
  assert.equal(eng.analysis.complaints.find((c) => c.theme === 'بطء الرد').offer_can_help, true);
  assert.ok(pr.rows.some((r) => r.signal_key === 'review_insights' && r.normalized.label_ar));
  assert.ok(pr.rows.some((r) => r.signal_key === 'activity'));
  assert.ok(!pr.rows.some((r) => r.signal_key === 'business_age'));

  const opps = await runNode('signals_opps.js', { nodes: { ...nodes, 'Parse signals': [pr] } });
  const rows = opps[0].json.rows;
  const realEstate = rows.find((r) => r.lead_id === 'l3'); // unclaimed + dormant
  assert.deepEqual(realEstate.opportunities.map((o) => o.type).sort(), ['dormant_activity', 'review_theme', 'unanswered_low_reviews', 'unclaimed_listing'].filter((t) => realEstate.opportunities.some((o) => o.type === t)).sort());
  assert.ok(realEstate.opportunities.length <= 3);
  assert.ok(realEstate.opportunities.some((o) => o.type === 'unclaimed_listing'));
  assert.equal(realEstate.selected_opportunity, realEstate.opportunities[0].type);
});

test('review analysis: no review text => no LLM call, recorded as skipped (never charged twice, never invented)', async () => {
  const p = cairo.find((x) => x.title.includes('ماركترمارت'));
  const target = { lead_id: 'l', place_id: p.placeId, business_name: p.title, reviews_count: p.reviewsCount, branches: 1, place: p };
  const onlyEmpty = cairoRev.filter((r) => r.placeId === p.placeId).map((r) => ({ ...r, text: null, textTranslated: null }));
  const group = await runNode('signals_group_reviews.js', { nodes: { Webhook: [WEBHOOK], 'Plan signals': [{ targets: [target] }], 'Get campaign': [{ parameters: {} }], 'Get org': [{ offer_profile: {} }] }, input: [{ statusCode: 200, body: onlyEmpty }] });
  assert.equal(group[0].json.llm, false);
  assert.equal(group[0].json.skipped, 'no_review_text');
});

const SEL = { lead_id: 'l1', message_id: null, regen_count: 0, channel: 'whatsapp', organization_id: 'o', campaign_id: 'c', job_id: 'j', total: 1, requestBody: JSON.stringify({ messages: [{ role: 'system', content: 's' }, { role: 'user', content: 'u' }], model: 'm' }), complaints: ['تأخير التسليم'], opportunity_type: 'unclaimed_listing' };
const GOOD = 'أهلا، شفت إن عملاءكم بيحبوا التزامكم بالمواعيد وجودة الشغل. إحنا بنساعد الوكالات تلاقي عملاء جدد وتبعتلهم رسائل شخصية على واتساب بسهولة من غير ما تضيعوا وقت في البحث. ممكن نعرض عليكم الفكرة في دقيقتين؟';
const validate = (content, prev = 'OpenRouter', extra = {}) => runNode('gen_validate.js', {
  nodes: { 'Select and build': [SEL], ...extra },
  input: [llmItem({ message: content, angle: 'التزام' })],
  prev,
});

test('2c/5b: a tactful message passes; a message about complaints is rejected and retried once with feedback', async () => {
  const ok = (await validate(GOOD)).json;
  assert.equal(ok.ok, true);
  assert.equal(ok.save.body.opportunity_type, 'unclaimed_listing');
  const bad = (await validate('أهلا، لاحظت إن في مشكلة في تأخير التسليم عندكم وإن ناس بتشتكي. إحنا بنساعد الوكالات تلاقي عملاء جدد وتبعتلهم رسائل شخصية على واتساب بسهولة من غير ما تضيعوا وقت في البحث والمتابعة. تحبوا نتكلم؟')).json;
  assert.equal(bad.ok, false);
  assert.equal(bad.retry, true);
  assert.match(bad.reason, /^tact:/);
  const retryReq = JSON.parse(bad.requestBody);
  assert.equal(retryReq.messages.length, 4);
  assert.match(retryReq.messages[3].content, /NEVER mention complaints/);
  // second attempt: fixed => ok and marked retried; still bad => final failure, no further retry
  const fixed = (await validate(GOOD, 'OpenRouter retry', { 'Validate message': [bad] })).json;
  assert.equal(fixed.ok, true);
  assert.equal(fixed.retried, true);
  assert.equal(fixed.tokens_in, 20);
  const still = (await validate('لاحظت إن تقييمكم منخفض وفيه شكاوى كتير من الخدمة. إحنا بنساعد الوكالات تلاقي عملاء جدد وتبعتلهم رسائل شخصية على واتساب بسهولة من غير ما تضيعوا وقت في البحث. تحبوا نتكلم؟', 'OpenRouter retry', { 'Validate message': [bad] })).json;
  assert.equal(still.ok, false);
  assert.equal(still.retry, false);
});

test('5b: invalid JSON and word-count violations are retryable once; http errors are not', async () => {
  const j = (await runNode('gen_validate.js', { nodes: { 'Select and build': [SEL] }, input: [{ statusCode: 200, body: { choices: [{ message: { content: 'not json' } }] } }], prev: 'OpenRouter' })).json;
  assert.equal(j.reason, 'bad_json');
  assert.equal(j.retry, true);
  const short = (await validate('أهلا، ممكن نتكلم؟')).json;
  assert.match(short.reason, /^word_count_/);
  assert.equal(short.retry, true);
  const http = (await runNode('gen_validate.js', { nodes: { 'Select and build': [SEL] }, input: [{ statusCode: 500, body: {} }], prev: 'OpenRouter' })).json;
  assert.equal(http.retry, false);
});

test('2c: the message prompt never contains complaints or weaknesses', async () => {
  const lead = { id: 'l1', business_name: 'شركة إنجاز', category: 'خدمة التسويق', district: 'مدينة نصر', city: 'القاهرة', rating: 4.1, reviews_count: 100, website: 'x', whatsapp_eligible: true, status: 'new' };
  const out = await runNode('gen_build.js', {
    nodes: {
      Webhook: [WEBHOOK],
      'Claim job': [{ credits_reserved: 5 }],
      'Get campaign': [{ parameters: { channel: 'whatsapp', opportunities: [{ type: 'review_theme', angle_ar: 'نساعدكم تردوا بسرعة' }] } }],
      'Get org': [{ name: 'Wasla', offer_profile: { what_we_sell: 'tool' } }],
      'Get campaign leads': [{ opportunities: [{ type: 'review_theme', strength: 3, evidence: { theme: 'بطء الرد', count: 3 } }], selected_opportunity: 'review_theme', leads: lead }],
      'Get messages': [],
      'Get insights': [{ lead_id: 'l1', facts: { activity_label: 'active' }, analysis: { confidence: 'high', praised: [{ theme: 'الالتزام', count: 3 }], complaints: [{ theme: 'بطء الرد', count: 3, offer_can_help: true }] } }],
      'Get cooldown': [],
    },
  });
  const req = out[0].json.requestBody;
  assert.ok(!req.includes('بطء الرد'), 'complaint theme must not be sent to the writer');
  assert.ok(!/complaints/.test(JSON.parse(req).messages[1].content));
  assert.ok(req.includes('الالتزام'), 'praise may be used');
  assert.ok(req.includes('نساعدكم تردوا بسرعة'), 'the help angle is sent');
  assert.deepEqual(out[0].json.complaints, ['بطء الرد'], 'kept only for validation');
});

test('3: leads in the 30-day contact cooldown get no message', async () => {
  const mk = (id) => ({ opportunities: [], leads: { id, business_name: id, whatsapp_eligible: true, status: 'new' } });
  const out = await runNode('gen_build.js', {
    nodes: {
      Webhook: [WEBHOOK], 'Claim job': [{ credits_reserved: 5 }], 'Get campaign': [{ parameters: {} }], 'Get org': [{ offer_profile: {} }],
      'Get campaign leads': [mk('a'), mk('b')], 'Get messages': [], 'Get insights': [], 'Get cooldown': [{ lead_id: 'b' }],
    },
  });
  assert.equal(out.length, 1);
  assert.equal(out[0].json.lead_id, 'a');
  assert.equal(out[0].json.skippedCooldown, 1);
});

test('planner output: baseline signals are clamped, review_theme needs a stated relevance, queries are capped at 4', async () => {
  const defs = [{ key: 'has_website', baseline: true }, { key: 'activity', baseline: false }, { key: 'unclaimed_listing', baseline: false }];
  const draft = { ideal_lead_description: 'x', queries: ['a', 'b', 'c', 'd', 'e'], synonyms: ['a', 'z'], categories: ['وكالة تسويق', 'Marketing agency', 'وكالة   تسويق'], locations: [], signals: [{ key: 'has_website', weight: 100, reason_ar: 'r' }, { key: 'activity', weight: -40, reason_ar: 'r' }, { key: 'bogus', weight: 50 }], opportunities: [{ type: 'review_theme', angle_ar: 'x' }, { type: 'unclaimed_listing', angle_ar: 'y' }, { type: 'nope', angle_ar: 'z' }], complaint_relevance: null };
  const res = await runNode('plan_parse.js', { nodes: { 'Get signals': defs, Webhook: [WEBHOOK] }, input: [llmItem(draft)] });
  const d = res[0].json.draft;
  assert.equal(d.keywords.length, 4);
  assert.deepEqual(d.synonyms, ['z'], 'a synonym equal to a query is dropped');
  assert.equal(d.categories.length, 2, 'duplicates removed');
  assert.deepEqual(d.signals.map((s) => [s.key, s.weight]), [['has_website', 25], ['activity', -40]]);
  assert.deepEqual(d.opportunities.map((o) => o.type), ['unclaimed_listing']);
  const emph = await runNode('plan_parse.js', { nodes: { 'Get signals': defs, Webhook: [WEBHOOK] }, input: [llmItem({ ...draft, signals: [{ key: 'has_website', weight: 100, emphasis: true }] })] });
  assert.equal(emph[0].json.draft.signals[0].weight, 100);
  assert.equal(emph[0].json.draft.signals[0].emphasis, true);
});

test('counts: funnel accumulates across rounds and the engine stops when the target is reached or rounds run out', async () => {
  const mk = (prevFunnel, round, ing, st) => runNode('normalize_counts.js', {
    input: [ing],
    nodes: {
      'Apply fit': [{ stats: { staged: 20, removed_closed: 0, removed_global: 2, removed_category: 10, removed_landline: 0, removed_filters: 0, removed_not_fit: 1, duplicates: 0, previously_found: 0, cooldown: 0, capped: 0, fit_unchecked: 0, ...st }, globalGroups: { utility: 1, education: 1 }, usage: { in: 1, out: 1, cost: 0.01, model: 'm' }, dropped: [{ name: 'x', reason: 'r' }] }],
      'Get job': [{ counts: { lead_cap: 20, delivered: prevFunnel.delivered || 0, raw_total: 20, funnel: prevFunnel, new: prevFunnel.delivered || 0, queries: 4 } }],
      'Get campaign': [{ parameters: { signals: [{ key: 'a', weight: 5 }] } }],
      Webhook: [{ body: { ...WEBHOOK.body, round } }],
    },
  });
  const r1 = (await mk({}, 1, { newly_linked: 7, new: 7, already_known: 0, dropped_opted_out: 0 })).at(0).json;
  assert.equal(r1.counts.delivered, 7);
  assert.equal(r1.next_round, 2);
  assert.equal(r1.counts.funnel.removed_not_fit, 1);
  const r2 = (await mk(r1.counts.funnel, 2, { newly_linked: 13, new: 13, already_known: 0, dropped_opted_out: 0 })).at(0).json;
  assert.equal(r2.counts.delivered, 20);
  assert.equal(r2.next_round, null);
  assert.equal(r2.counts.reached_target, true);
  assert.equal(r2.counts.funnel.raw_places, 40);
  const none = (await mk({}, 5, { newly_linked: 0, new: 0, already_known: 0, dropped_opted_out: 0 }, { removed_category: 18, removed_global: 2, removed_not_fit: 0 })).at(0).json;
  assert.equal(none.next_round, null);
  assert.equal(none.counts.empty_reason, 'all_category');
  assert.equal(none.signals_on, false);
});

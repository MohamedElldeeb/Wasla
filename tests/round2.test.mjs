// Round 2 tests: message style rules, opening variety, offer-quote honesty, hooks instead of weak angles, facts from free Maps data,
// and the review's concrete fit bugs. Offline: no LLM, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { runNode, resetStatic } from './helpers/n8n-sim.mjs';
import { checkMessage, openingKey, quoteInOffer, computeFacts, buildOpportunities, isSocialUrl, signalValues } from '../lib/insights/core.mjs';

const WEBHOOK = { body: { organization_id: 'org', campaign_id: 'camp', job_id: 'job', model: 'm', planner_model: 'pm', fallback_models: [] } };
const llmItem = (data) => ({ statusCode: 200, body: { model: 'x', usage: { prompt_tokens: 10, completion_tokens: 5, cost: 0.001 }, choices: [{ message: { content: JSON.stringify(data) } }] } });

const CTA = 'أبعتلكم 10 شركات مناسبة لشغلكم ببلاش';
const OFFER_TEXT = `وصلة: بتلاقي عملاء للوكالات وبتكتب رسالة واتساب شخصية لكل عميل. ${CTA}`;
const QUOTE = 'بتلاقي عملاء للوكالات وبتكتب رسالة واتساب شخصية لكل عميل';
const SEL = {
  lead_id: 'l1', message_id: null, regen_count: 0, channel: 'whatsapp', organization_id: 'o', campaign_id: 'c', job_id: 'job', total: 1,
  requestBody: JSON.stringify({ messages: [{ role: 'system', content: 's' }, { role: 'user', content: 'u' }], model: 'm' }), complaints: [], opportunity_type: null,
  offer_text: OFFER_TEXT, cta_offer: CTA, sender_name: 'محمد', areas: ['مدينة نصر'], city: 'القاهرة', used_openings: [],
};
const GOOD = 'أهلا يا فريق الإنجاز، عملاءكم دايما بيشكروا في التزامكم بالمواعيد. إحنا عاملين أداة اسمها وصلة بتلاقي عملاء للوكالات وبتكتب رسالة واتساب شخصية لكل عميل، من غير ما تضيعوا وقت في البحث والكتابة. لو حابين، أبعتلكم 10 شركات مناسبة لشغلكم ببلاش تشوفوها بنفسكم. محمد من وصلة';
const BODY = 'إحنا عاملين أداة اسمها وصلة بتلاقي عملاء للوكالات وبتكتب رسالة واتساب شخصية لكل عميل، من غير ما تضيعوا وقت في البحث والكتابة.';
const END = 'لو حابين، أبعتلكم 10 شركات مناسبة لشغلكم ببلاش تشوفوها بنفسكم. محمد من وصلة';

const validate = (content, { prev = 'OpenRouter', sel = {}, quote = QUOTE, nodes = {} } = {}) => runNode('gen_validate.js', {
  nodes: { 'Select and build': [{ ...SEL, ...sel }], ...nodes },
  input: [llmItem({ message: content, angle: 'x', offer_quote: quote })],
  prev,
});

test('round 2 message rules: the good message passes, every template habit is rejected with its reason and gets one retry', async () => {
  assert.equal((await validate(GOOD)).json.ok, true);
  const cases = [
    ['rating and stars', `أهلا، شفت إن تقييمكم 4.5 نجوم. ${BODY} ${END}`, /mentions_rating/],
    ['review count', `أهلا، عندكم 40 ريفيو حلوين. ${BODY} ${END}`, /mentions_rating/],
    ['micro-district', `أهلا يا فريق مدينة نصر، ${BODY} ${END}`, /micro_district/],
    ['ordinal micro-district', `أهلا يا فريق المنطقة الأولى، ${BODY} ${END}`, /micro_district/],
    ['jargon B2B', `أهلا، ${BODY.replace('عملاء', 'عملاء B2B')} ${END}`, /jargon/],
    ['time-of-day greeting', `صباح الفل عليكم، ${BODY} ${END}`, /time_greeting/],
    ['weak CTA', `أهلا، ${BODY} ممكن نتكلم أكتر عن الفكرة دي لو عندكم وقت وبعدين نشوف؟ أبعتلكم 10 شركات. محمد من وصلة`, /weak_cta/],
    ['no signature', `أهلا، ${BODY} لو حابين، أبعتلكم 10 شركات مناسبة لشغلكم ببلاش تشوفوها بنفسكم وتقرروا بعد كده لوحدكم.`, /missing_signature/],
    ['no concrete offer', `أهلا، ${BODY} تحبوا نعرف إزاي بتلاقوا عملاءكم دلوقتي وإزاي بتتواصلوا معاهم كل يوم عشان نظبط الموضوع؟ محمد من وصلة`, /cta_offer_missing/],
    ['invented benefit', `أهلا، ${BODY} وده بيزود رضا العملاء ويقوي التواصل. ${END}`, /invented_benefit/],
    ['"focus on your core work" benefit', `أهلا، ${BODY} كده تركزوا في شغلكم الأساسي. ${END}`, /invented_benefit/],
    ['own praise', `أهلا، شغلكم مميز جدا. ${BODY} ${END}`, /own_praise/],
    ['own praise, other wording', `أهلا، شغلكم في التصميم دايما بيتميز بالاحترافية والخبرة. ${BODY} ${END}`, /own_praise/],
    ['assumed need', `أهلا، أكيد بتدوروا على عملاء جدد. ${BODY} ${END}`, /assumes_need/],
    ['praise wrongly "attributed" by the word clients', `أهلا، بنساعد وكالات التسويق تلاقي عملاء جدد. خدمة التسويق عندكم ممتازة. ${BODY} ${END}`, /own_praise/],
    ['claims they need something', `أهلا، ${BODY} وده بيخليكم محتاجين فرص أكتر. ${END}`, /assumes_need/],
    ['guarantee', `أهلا، ${BODY} واحنا بنضمن النتيجة. ${END}`, /guarantee/],
  ];
  for (const [name, msg, re] of cases) {
    const r = (await validate(msg)).json;
    assert.equal(r.ok, false, name);
    assert.match(r.reason, re, name);
    assert.equal(r.retry, true, `${name}: one automatic retry`);
  }
  // praise attributed to their customers is allowed (it comes from the review themes)
  assert.equal((await validate(`أهلا يا فريق الإنجاز، عملاءكم دايما بيشكروا في احترافيتكم وأفكاركم المختلفة. ${BODY} ${END}`)).json.ok, true);
  // naming the city is fine (only micro-districts are banned)
  assert.equal((await validate(GOOD.replace('أهلا يا فريق الإنجاز', 'أهلا يا فريق الإنجاز في القاهرة'))).json.ok, true);
  // length: 35 to 70 words for chat
  assert.match((await validate(`أهلا. ${END}`)).json.reason, /word_count_/);
  assert.match((await validate(`أهلا، ${(`${BODY} `).repeat(4)}${END}`)).json.reason, /word_count_/);
});

test('round 2 honesty: the benefit must be quoted from the offer, and invented benefit phrases are rejected', async () => {
  assert.match((await validate(GOOD, { quote: 'بنزود رضا العملاء بنسبة كبيرة جدا' })).json.reason, /offer_quote_not_in_offer/);
  assert.match((await validate(GOOD, { quote: null })).json.reason, /offer_quote_missing/);
  assert.equal(quoteInOffer('بتلاقي عملاء للوكالات', OFFER_TEXT), true);
  assert.equal(quoteInOffer('بتحسن رضا العملاء وتقوي التواصل', OFFER_TEXT), false);
  assert.equal(quoteInOffer('عملاء', OFFER_TEXT), false, 'a quote needs at least three words');
  // a benefit phrase the offer itself contains is allowed
  const own = checkMessage('أهلا، أداتنا بتزود رضا العملاء فعلا حسب وصف عرضنا كامل هنا وده كلام طويل كفاية عشان نعدي الحد الأدنى للكلمات ونشوف النتيجة بوضوح في الاختبار ده تماما', { offerText: 'بتزود رضا العملاء فعلا', offerQuote: 'بتزود رضا العملاء فعلا' });
  assert.ok(!own.reasons.some((r) => r.startsWith('invented_benefit')));
});

test('round 2: with no CTA offer and no sender in the profile those two checks are skipped (older organizations keep working)', async () => {
  const msg = `أهلا يا فريق الإنجاز، ${BODY} تحبوا نعرف إزاي بتلاقوا عملاءكم دلوقتي، وإذا كان فيه حاجة ممكن تسهل عليكم الموضوع ده نفكر فيها سوا؟`;
  const r = (await validate(msg, { sel: { cta_offer: null, sender_name: null } })).json;
  assert.equal(r.ok, true, r.reason);
});

test('round 2 variety: a duplicate opening of the campaign is rejected; in one run the later duplicate is sent back for its single retry and the retry cannot duplicate either', async () => {
  resetStatic();
  const dup = (await validate(GOOD, { sel: { used_openings: [openingKey(GOOD)] } })).json;
  assert.equal(dup.reason, 'duplicate_opening');
  const mk = (id, text) => ({ lead_id: id, ok: true, opening: openingKey(text), message: text, raw_content: '{}', retry: false, tokens_in: 1, tokens_out: 1, cost: 0, save: {} });
  const selects = ['a', 'b', 'c'].map((id) => ({ ...SEL, lead_id: id }));
  const res = await runNode('gen_dedupe.js', {
    nodes: { Webhook: [WEBHOOK], 'Select and build': selects },
    input: [mk('a', 'أهلا يا فريق الإنجاز عملاءكم'), mk('b', 'أهلا يا فريق الإنجاز عملاءكم دايما'), mk('c', 'بنساعد وكالات التسويق يلاقوا شركات')],
  });
  assert.deepEqual(res.map((r) => [r.json.lead_id, r.json.ok, r.json.reason || null, r.json.retry]), [['a', true, null, false], ['b', false, 'duplicate_opening', true], ['c', true, null, false]]);
  assert.equal(JSON.parse(res[1].json.requestBody).messages.length, 4, 'the duplicate gets feedback for its one retry');
  // the retry result must differ from what was accepted in the run: GOOD opens like "a", so it is rejected and final
  const again = await validate(GOOD, { prev: 'OpenRouter retry', sel: { lead_id: 'b' }, nodes: { 'Validate message': [res[1].json] } });
  assert.equal(again.json.reason, 'duplicate_opening');
  assert.equal(again.json.retry, false, 'the retry is final');
  // and a different opening passes and is remembered
  const other = await validate(GOOD.replace('أهلا يا فريق الإنجاز، عملاءكم دايما', 'فريقكم شغال في مجال بيكبر، وعملاءكم'), { prev: 'OpenRouter retry', sel: { lead_id: 'b' }, nodes: { 'Validate message': [res[1].json] } });
  assert.equal(other.json.ok, true, other.json.reason);
});

test('round 2 variety: near-copies of one run (same sentences, different first words) are sent back as too similar', async () => {
  resetStatic();
  const { messageSimilarity } = await import('../lib/insights/core.mjs');
  const a = 'إزاي بتلاقوا عملاء جدد لشغلكم دلوقتي؟ إحنا في وصلة بنساعد وكالات التسويق تلاقي شركات محتاجة خدماتها، وبنجهز لكل شركة رسالة واتساب شخصية. لو تحبوا، أبعتلكم 10 شركات مناسبة لشغلكم ببلاش تشوفوها. محمد من وصلة';
  const b = 'ازاي بتلاقوا عملاء جداد لشغلكم دلوقتي؟ إحنا في وصلة بنساعد وكالات التسويق تلاقي شركات محتاجة خدماتها، ونجهز لكل شركة رسالة واتساب شخصية. لو تحبوا، أبعتلكم 10 شركات مناسبة لشغلكم ببلاش تشوفوها. محمد من وصلة';
  const c = 'سؤال سريع: بتتعاملوا إزاي مع دورة البحث عن عملاء؟ وصلة بتجيب شركات محتاجة خدمات الوكالات ومعاها رسالة جاهزة. تحبوا نبعتلكم عينة؟ محمد';
  assert.ok(messageSimilarity(a, b) >= 0.6);
  assert.ok(messageSimilarity(a, c) < 0.6);
  const mk = (id, text) => ({ lead_id: id, ok: true, opening: openingKey(text), message: text, raw_content: '{}', retry: false, tokens_in: 1, tokens_out: 1, cost: 0, save: {} });
  const selects = ['a', 'b', 'c'].map((id) => ({ ...SEL, lead_id: id }));
  const res = await runNode('gen_dedupe.js', { nodes: { Webhook: [WEBHOOK], 'Select and build': selects }, input: [mk('a', a), mk('b', b), mk('c', c)] });
  assert.deepEqual(res.map((r) => [r.json.lead_id, r.json.ok, r.json.reason || null]), [['a', true, null], ['b', false, 'too_similar'], ['c', true, null]]);
});

test('round 2 prompt: the writer gets the rules, the personal hook (specialty and praise) but never rating, district or complaints', async () => {
  const lead = { id: 'l1', business_name: 'Plus One Up', category: 'وكالة تسويق', district: 'المنطقة الأولى', city: 'القاهرة', rating: 4.9, reviews_count: 300, website: 'x', whatsapp_eligible: true, status: 'new', raw_categories: ['وكالة تسويق', 'مصمم مواقع ويب', 'وكالة تصميم'] };
  const out = await runNode('gen_build.js', {
    nodes: {
      Webhook: [WEBHOOK], 'Claim job': [{ credits_reserved: 5 }],
      'Get campaign': [{ parameters: { channel: 'whatsapp', opportunities: [{ type: 'low_owner_engagement', angle_ar: 'نلاقي لك عملاء جداد', why_it_means_they_need_the_offer: 'busy agencies need new clients' }] } }],
      'Get org': [{ name: 'وصلة', offer_profile: { what_we_sell: 'أداة بتلاقي عملاء للوكالات', cta_offer: CTA, sender_name: 'محمد' } }],
      'Get campaign leads': [{ opportunities: [], leads: lead }],
      'Get messages': [{ id: 'm0', lead_id: 'z', channel: 'whatsapp', generated_text: 'أهلا يا فريق الإنجاز عملاءكم دايما بيشكروا' }],
      'Get insights': [{ lead_id: 'l1', facts: { categories: ['وكالة تسويق'] }, analysis: { confidence: 'high', praised: [{ theme: 'الأفكار الجديدة', count: 3 }], complaints: [] } }],
      'Get cooldown': [],
    },
  });
  const j = out[0].json;
  const req = JSON.parse(j.requestBody);
  const user = JSON.parse(req.messages[1].content);
  assert.deepEqual(user.personal_hook.specialty, ['مصمم مواقع ويب', 'وكالة تصميم'], 'specialty = the other Maps categories');
  assert.deepEqual(user.personal_hook.customers_praise, ['الأفكار الجديدة']);
  assert.equal(user.sender_name, 'محمد');
  assert.equal(user.sender_offer.cta_offer, CTA);
  assert.deepEqual(user.avoid_openings, [openingKey('أهلا يا فريق الإنجاز عملاءكم دايما بيشكروا')], 'openings already used in the campaign');
  const flat = JSON.stringify(user);
  assert.ok(!('rating' in user) && !flat.includes('4.9') && !flat.includes('المنطقة الأولى'), 'rating and micro-district never reach the model');
  for (const rule of [/NEVER mention the business's rating/, /NEVER use jargon/, /No time-of-day greeting/, /offer_quote/, /NEVER end with/, /signature/, /style_examples/]) assert.match(req.messages[0].content, rule);
  assert.ok(j.areas.includes('المنطقة الأولى'), 'the micro-district is kept only for validation');
  assert.equal(j.sender_name, 'محمد');
});

test('round 2 opportunities: an opportunity the planner did not tie to the offer is not used; the message falls back to a hook or a clean general opening', async () => {
  const lead = { id: 'l1', business_name: 'X', category: 'وكالة تسويق', city: 'القاهرة', whatsapp_eligible: true, status: 'new' };
  const out = await runNode('gen_build.js', {
    nodes: {
      Webhook: [WEBHOOK], 'Claim job': [{ credits_reserved: 5 }], 'Get campaign': [{ parameters: { opportunities: [] } }], 'Get org': [{ name: 'W', offer_profile: { what_we_sell: 't' } }],
      'Get campaign leads': [{ opportunities: [{ type: 'low_owner_engagement', strength: 3, evidence: {} }], selected_opportunity: 'low_owner_engagement', leads: lead }],
      'Get messages': [], 'Get insights': [], 'Get cooldown': [],
    },
  });
  const user = JSON.parse(JSON.parse(out[0].json.requestBody).messages[1].content);
  assert.equal(user.help_angle, null);
  assert.deepEqual(user.personal_hook, {});
  assert.equal(out[0].json.opportunity_type, null);
});

test('round 2 free Maps data: search rank, all categories, star distribution; a social page is not a website', () => {
  const place = { title: 'X', categoryName: 'وكالة تسويق', categories: ['وكالة تسويق', 'مصمم مواقع ويب'], website: 'https://www.facebook.com/x', rank: 8, totalScore: 4.5, reviewsCount: 20, reviewsDistribution: { oneStar: 2, twoStar: 0, threeStar: 0, fourStar: 3, fiveStar: 15 } };
  const f = computeFacts(place, []);
  assert.equal(f.has_website, false);
  assert.equal(f.website_social, true);
  assert.equal(f.search_rank, 8);
  assert.deepEqual(f.categories, ['وكالة تسويق', 'مصمم مواقع ويب']);
  assert.equal(f.low_star_share, 0.1);
  assert.equal(signalValues(f).has_website, 0);
  assert.equal(isSocialUrl('instagram.com/shop'), true);
  assert.equal(isSocialUrl('https://shop.example.com'), false);
  assert.equal(computeFacts({ ...place, website: 'https://example.com' }, []).has_website, true);
  const opps = buildOpportunities(f, null, [{ type: 'weak_search_rank', angle: 'a' }, { type: 'no_website', angle: 'b' }]);
  assert.deepEqual(opps.map((o) => o.type).sort(), ['no_website', 'weak_search_rank']);
  assert.equal(opps.find((o) => o.type === 'weak_search_rank').evidence.rank, 8);
  assert.equal(buildOpportunities(computeFacts({ ...place, rank: 2 }, []), null, [{ type: 'weak_search_rank', angle: 'a' }]).length, 0, 'a top result is not a visibility problem');
});

test('round 2: the interview and the writer know the CTA offer and the sender name; the planner demands a causal link per opportunity', async () => {
  const build = await runNode('interview_build.js', { nodes: { Webhook: [{ body: { ...WEBHOOK.body, transcript: [], locale: 'ar' } }] } });
  const sys = JSON.parse(build[0].json.requestBody).messages[0].content;
  assert.match(sys, /cta_offer/);
  assert.match(sys, /sender_name/);
  const plan = await runNode('plan_build.js', { nodes: { Webhook: [{ body: { ...WEBHOOK.body, locale: 'en' } }], 'Get org': [{ offer_profile: { what_we_sell: 'x' } }], 'Get signals': [], 'Get negatives': [] } });
  const psys = JSON.parse(plan[0].json.requestBody).messages[0].content;
  assert.match(psys, /why_it_means_they_need_the_offer/);
  assert.match(psys, /service" form, the "consultant" form/);
});

test('no Code node or shared source contains stray control characters (a regex with a literal backspace once slipped into gen_validate)', async () => {
  const { readdirSync, readFileSync } = await import('node:fs');
  const dirs = ['../n8n/code/', '../lib/insights/', '../lib/phone/'];
  for (const d of dirs) {
    for (const f of readdirSync(new URL(d, import.meta.url)).filter((n) => /\.(js|mjs)$/.test(n))) {
      const src = readFileSync(new URL(d + f, import.meta.url), 'utf8');
      assert.ok(!/[ --]/.test(src), `${d}${f} has a control character`);
    }
  }
});

test('style examples belong to the organization: absent from the global prompt, sent only when the profile has them', async () => {
  const mk = (profile) => runNode('gen_build.js', {
    nodes: {
      Webhook: [WEBHOOK], 'Claim job': [{ credits_reserved: 5 }], 'Get campaign': [{ parameters: {} }], 'Get org': [{ name: 'W', offer_profile: { what_we_sell: 't', ...profile } }],
      'Get campaign leads': [{ opportunities: [], leads: { id: 'l1', business_name: 'X', whatsapp_eligible: true, status: 'new' } }], 'Get messages': [], 'Get insights': [], 'Get cooldown': [],
    },
  });
  const none = JSON.parse((await mk({}))[0].json.requestBody);
  assert.ok(!('style_examples' in JSON.parse(none.messages[1].content)), 'empty by default');
  // the old global examples are gone from the system prompt
  assert.ok(!none.messages[0].content.includes('أبعتلكم 10 شركات'));
  assert.ok(!none.messages[0].content.includes('محمد من وصلة'));
  const withEx = JSON.parse((await mk({ style_examples: ['رسالة مثال أولى', '  ', 'رسالة مثال ثانية', 'ثالثة', 'رابعة تتجاهل'] }))[0].json.requestBody);
  assert.deepEqual(JSON.parse(withEx.messages[1].content).style_examples, ['رسالة مثال أولى', 'رسالة مثال ثانية', 'ثالثة'], 'blank ones dropped, at most three');
});

test('a message that fails after the retry is saved as a visible failed row (no text); a later run regenerates that same row', async () => {
  const bad = (await validate('أهلا. قصيرة.', { prev: 'OpenRouter retry', nodes: { 'Validate message': [{ tokens_in: 0, tokens_out: 0, cost: 0 }] } })).json;
  assert.equal(bad.ok, false);
  assert.equal(bad.retry, false);
  assert.equal(bad.save.method, 'POST');
  assert.equal(bad.save.body.review_status, 'failed');
  assert.equal(bad.save.body.generated_text, '');
  assert.match(bad.save.body.fail_reason, /^style:word_count_/);
  // when the lead already has a message row (regenerate or an earlier failure) the failure updates that row
  const upd = (await validate('أهلا. قصيرة.', { prev: 'OpenRouter retry', sel: { message_id: 'm-1' }, nodes: { 'Validate message': [{ tokens_in: 0, tokens_out: 0, cost: 0 }] } })).json;
  assert.equal(upd.save.method, 'PATCH');
  assert.match(upd.save.path, /id=eq\.m-1/);
  assert.equal(upd.save.body.review_status, 'failed');
  // success clears the failure
  const ok = (await validate(GOOD, { sel: { message_id: 'm-1' } })).json;
  assert.equal(ok.save.body.fail_reason, null);
  assert.equal(ok.save.body.review_status, 'pending');
  // a normal "generate" run picks the failed lead up again and targets its row
  const lead = { id: 'l1', business_name: 'X', whatsapp_eligible: true, status: 'new' };
  const out = await runNode('gen_build.js', {
    nodes: {
      Webhook: [WEBHOOK], 'Claim job': [{ credits_reserved: 5 }], 'Get campaign': [{ parameters: {} }], 'Get org': [{ name: 'W', offer_profile: { what_we_sell: 't' } }],
      'Get campaign leads': [{ opportunities: [], leads: lead }, { opportunities: [], leads: { ...lead, id: 'l2' } }],
      'Get messages': [{ id: 'f1', lead_id: 'l1', channel: 'whatsapp', review_status: 'failed', regen_count: 1 }, { id: 'p1', lead_id: 'l2', channel: 'whatsapp', review_status: 'pending', regen_count: 0 }],
      'Get insights': [], 'Get cooldown': [],
    },
  });
  assert.equal(out.length, 1, 'only the failed lead needs a new message');
  assert.equal(out[0].json.message_id, 'f1');
  assert.equal(out[0].json.regen_count, 2);
  // a duplicate-opening failure from the dedupe node is stored the same way
  resetStatic();
  const mkd = (id, text) => ({ lead_id: id, organization_id: 'o', campaign_id: 'c', job_id: 'job', channel: 'whatsapp', ok: true, opening: openingKey(text), message: text, raw_content: '{}', save: {} });
  const res = await runNode('gen_dedupe.js', { nodes: { Webhook: [WEBHOOK], 'Select and build': [{ ...SEL, lead_id: 'a' }, { ...SEL, lead_id: 'b', message_id: 'm-b' }] }, input: [mkd('a', 'أهلا يا فريق الإنجاز عملاءكم'), mkd('b', 'أهلا يا فريق الإنجاز عملاءكم')] });
  assert.equal(res[1].json.save.body.review_status, 'failed');
  assert.match(res[1].json.save.path, /id=eq\.m-b/);
});

// Round 3 tests: praise needs 2+ reviews and never "دايما", one signature, assumed needs, no copying of style examples, quiet score reasons,
// branch counting by brand + website/phone, weak dormant angle. Offline: no LLM, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runNode, resetStatic } from './helpers/n8n-sim.mjs';
import { checkMessage, copiedRun, countBranches, brandKey, scoreLead } from '../lib/insights/core.mjs';

const WEBHOOK = { body: { organization_id: 'org', campaign_id: 'camp', job_id: 'job', model: 'm', fallback_models: [] } };
const llmItem = (data) => ({ statusCode: 200, body: { model: 'x', usage: { prompt_tokens: 10, completion_tokens: 5, cost: 0.001 }, choices: [{ message: { content: JSON.stringify(data) } }] } });
const CTA = 'أبعتلكم 10 شركات مناسبة لشغلكم ببلاش';
const OFFER_TEXT = `وصلة: بتلاقي عملاء للوكالات وبتكتب رسالة واتساب شخصية لكل عميل. ${CTA}`;
const QUOTE = 'بتلاقي عملاء للوكالات وبتكتب رسالة واتساب شخصية لكل عميل';
const SEL = {
  lead_id: 'l1', message_id: null, regen_count: 0, channel: 'whatsapp', organization_id: 'o', campaign_id: 'c', job_id: 'job', total: 1,
  requestBody: JSON.stringify({ messages: [{ role: 'system', content: 's' }, { role: 'user', content: 'u' }], model: 'm' }), complaints: [], opportunity_type: null,
  offer_text: OFFER_TEXT, cta_offer: CTA, sender_name: 'محمد', signature: 'محمد من وصلة', areas: [], city: 'القاهرة', used_openings: [], style_examples: [],
};
const BODY = 'إحنا عاملين أداة اسمها وصلة بتلاقي عملاء للوكالات وبتكتب رسالة واتساب شخصية لكل عميل، من غير ما تضيعوا وقت في البحث والكتابة.';
const END = 'لو حابين، أبعتلكم 10 شركات مناسبة لشغلكم ببلاش تشوفوها بنفسكم. محمد من وصلة';
const GOOD = `أهلا يا فريق الإنجاز، عملاءكم بيشكروا في التزامكم بالمواعيد. ${BODY} ${END}`;
const validate = (content, { sel = {} } = {}) => runNode('gen_validate.js', {
  nodes: { 'Select and build': [{ ...SEL, ...sel }] }, input: [llmItem({ message: content, angle: 'x', offer_quote: QUOTE })], prev: 'OpenRouter',
});

// ── 1. praise ──
test('B1: a praise hook needs the theme in at least 2 reviews; "دايما" is rejected', async () => {
  const mk = (praised) => runNode('gen_build.js', {
    nodes: {
      Webhook: [WEBHOOK], 'Claim job': [{ credits_reserved: 5 }], 'Get campaign': [{ parameters: {} }], 'Get org': [{ name: 'W', offer_profile: { what_we_sell: 't' } }],
      'Get campaign leads': [{ opportunities: [], leads: { id: 'l1', business_name: 'X', whatsapp_eligible: true, status: 'new' } }], 'Get messages': [],
      'Get insights': [{ lead_id: 'l1', facts: {}, analysis: { confidence: 'high', praised, complaints: [] } }], 'Get cooldown': [],
    },
  });
  const hook = async (p) => JSON.parse(JSON.parse((await mk(p))[0].json.requestBody).messages[1].content).personal_hook;
  assert.deepEqual((await hook([{ theme: 'الأفكار الجديدة', count: 1 }, { theme: 'الالتزام بالمواعيد', count: 3 }])).customers_praise, ['الالتزام بالمواعيد'], 'the single mention is dropped');
  assert.equal((await hook([{ theme: 'الأفكار الجديدة', count: 1 }])).customers_praise, undefined, 'one review is not a praise hook');
  const r = (await validate(GOOD.replace('عملاءكم بيشكروا', 'عملاءكم دايما بيشكروا'))).json;
  assert.match(r.reason, /overclaim_always/);
  assert.equal((await validate(GOOD.replace('عملاءكم بيشكروا', 'عملاءكم دايماً بيشكروا'))).json.ok, false);
  assert.equal((await validate(GOOD)).json.ok, true);
});

// ── 2. one signature ──
test('B2: the sender name appears once, in the signature (no "معاكم محمد من وصلة" at the start)', async () => {
  const start = `بعد إذنكم، معاكم محمد من وصلة. ${BODY} ${END}`;
  assert.match((await validate(start)).json.reason, /double_signature/);
  // the model left the end signature out but introduced itself at the start: the automatic signature would double it, so it is rejected
  const noEnd = `أنا محمد من وصلة. ${BODY} لو حابين، أبعتلكم 10 شركات مناسبة لشغلكم ببلاش تشوفوها بنفسكم وتقرروا بعد كده.`;
  assert.match((await validate(noEnd)).json.reason, /double_signature/);
  assert.equal((await validate(GOOD)).json.ok, true);
  assert.ok(!checkMessage(GOOD, { senderName: 'محمد' }).reasons.includes('double_signature'));
});

// ── 3. assumed needs ──
test('B3: claims about the lead\'s own needs are rejected (both texts from the review), needs of other companies are fine', async () => {
  const marketing = `أهلا، شغلكم في التسويق دايماً بيحتاج عملاء جدد. ${BODY} ${END}`;
  const aitSystems = `أهلا يا فريق AIT Systems، شغلكم في خدمة أمان الكمبيوتر بيحتاج سرعة استجابة عالية. ${BODY} ${END}`;
  assert.match((await validate(marketing)).json.reason, /assumes_need/);
  assert.match((await validate(aitSystems)).json.reason, /assumes_need/);
  for (const t of ['شغلكم محتاج عملاء جداد', 'نشاطكم بيحتاج تسويق مستمر', 'وكالتكم بتحتاج شركات جديدة']) assert.ok(checkMessage(`أهلا ${t} ${BODY} ${END}`, {}).reasons.includes('assumes_need'), t);
  assert.ok(checkMessage(`أهلا يا فريق AIT Systems، واضح إن شغلكم في خدمة أمان الكمبيوتر مهم جداً. ${BODY} ${END}`, {}).reasons.includes('assumes_need'), '"واضح إن ..." is a claim about the lead');
  // companies that need the lead's service are the point of the offer, not an assumption about the lead
  assert.ok(!checkMessage(`أهلا، بنجيب شركات محتاجة خدماتكم فعلا. ${BODY} ${END}`, {}).reasons.includes('assumes_need'));
  assert.ok(!checkMessage(`أهلا، ${END}`, {}).reasons.includes('assumes_need'), '"لشغلكم" inside another word is not a claim');
});

// ── 4. style examples are not copied ──
test('B4: a run of 8 or more words copied from a style example is rejected; words from the offer itself are allowed', async () => {
  const example = 'أهلا يا فريق، عملاءكم بيشكروا في الأفكار الجديدة اللي بتقدموها وإحنا عاملين أداة بتجيب لوكالات التسويق شركات محتاجة خدماتها فعلا ومع كل شركة رسالة جاهزة تتبعت على واتساب';
  const copy = `أهلا، شغلكم واضح. إحنا عاملين أداة بتجيب لوكالات التسويق شركات محتاجة خدماتها فعلا ومع كل شركة رسالة جاهزة تتبعت على واتساب. ${CTA}. محمد من وصلة. ${BODY}`;
  assert.equal(copiedRun(copy, [example], OFFER_TEXT), true);
  const fresh = `أهلا يا فريق الإنجاز، ${BODY} ${END}`;
  assert.equal(copiedRun(fresh, [example], OFFER_TEXT), false);
  // 7 shared words only: allowed
  assert.equal(copiedRun('وإحنا عاملين أداة بتجيب لوكالات التسويق شركات', [example], ''), false);
  // the run is inside the seller's own offer text: allowed
  assert.equal(copiedRun(copy, [example], example), false);
  const r = (await validate(copy, { sel: { style_examples: [example] } })).json;
  assert.match(r.reason, /copies_style_example/);
  assert.equal((await validate(GOOD, { sel: { style_examples: [example] } })).json.ok, true);
  // the prompt tells the writer to match tone and length, not sentences
  const out = await runNode('gen_build.js', {
    nodes: {
      Webhook: [WEBHOOK], 'Claim job': [{ credits_reserved: 5 }], 'Get campaign': [{ parameters: {} }], 'Get org': [{ name: 'W', offer_profile: { what_we_sell: 't', style_examples: [example] } }],
      'Get campaign leads': [{ opportunities: [], leads: { id: 'l1', business_name: 'X', whatsapp_eligible: true, status: 'new' } }], 'Get messages': [], 'Get insights': [], 'Get cooldown': [],
    },
  });
  const req = JSON.parse(out[0].json.requestBody);
  assert.match(req.messages[0].content, /match their tone and length, NOT their sentences/);
  assert.match(req.messages[0].content, /8 or more consecutive words/);
  assert.deepEqual(out[0].json.style_examples, [example], 'kept for the validator');
});

// ── 5. score reasons ──
test('B5: reasons from signals weighing 15 or less are hidden unless nothing stronger exists', () => {
  const sigs = (w1) => [{ key: 'has_website', weight: w1, value: 0, baseline: true }, { key: 'size_proxy', weight: 30, value: 1 }];
  assert.deepEqual(scoreLead({ fit: 'fit', signals: sigs(-10) }).favorable.map((f) => f.key), ['size_proxy']);
  assert.deepEqual(scoreLead({ fit: 'fit', signals: sigs(-40) }).favorable.map((f) => f.key).sort(), ['has_website', 'size_proxy']);
  assert.deepEqual(scoreLead({ fit: 'fit', signals: [{ key: 'has_website', weight: -10, value: 0, baseline: true }] }).favorable.map((f) => f.key), ['has_website'], 'the only reason stays');
  assert.equal(scoreLead({ fit: 'fit', signals: sigs(-10) }).score, scoreLead({ fit: 'fit', signals: sigs(-10) }).score, 'the score itself is not changed by hiding reasons');
});

// ── 6. branches ──
test('B6: branches = same brand name AND same website or phone; name similarity alone never counts; the fixtures show no fake chains', async () => {
  const L = (name, website, phone) => ({ business_name: name, website, phone_e164: phone });
  assert.equal(brandKey('Digitopia Agency - Smouha'), brandKey('Digitopia Agency (Maadi)'));
  const all = [L('Nova Cafe - Nasr City', 'https://novacafe.com', '+201000000001'), L('Nova Cafe (Maadi)', 'https://www.novacafe.com/maadi', '+201000000002'), L('Nova Cafe Zamalek', 'https://novacafe.com', '+201000000003'), L('Nova Cafe', 'https://other.com', '+201000000009')];
  assert.equal(countBranches(all[0], all), 2, 'two listings with the brand name and the same website');
  assert.equal(countBranches(all[3], all), 1, 'same name, different website and phone: not a branch');
  assert.equal(countBranches(L('Shop', 'https://facebook.com/shop', null), [L('Shop', 'https://facebook.com/shop', null), L('Shop', 'https://facebook.com/shop', null)]), 1, 'a social page is not a shared website');
  assert.equal(countBranches(L('Shop', null, '+201111111111'), [L('Shop', null, '+201111111111'), L('Shop', null, '+201111111111')]), 2, 'same name and phone');
  assert.equal(countBranches(L('', 'x.com', null), all), 1);
  // the real fixtures: Promo Marketing Agency and Digitopia Agency used to show 5 branches (the name regex lacked the unicode flag)
  const places = JSON.parse(readFileSync(new URL('../docs/samples/fixtures/alexandria/places.json', import.meta.url), 'utf8'));
  const run = JSON.parse(readFileSync(new URL('../docs/samples/fixtures-run.json', import.meta.url), 'utf8'));
  const org = places.map((p) => ({ business_name: p.title, website: p.website, phone_e164: p.phoneUnformatted }));
  const links = run.cities.alexandria.links.map((l) => ({ ...l, leads: { ...l.leads, phone_e164: (places.find((p) => p.placeId === l.leads.google_place_id) || {}).phoneUnformatted } }));
  const out = await runNode('signals_plan.js', { nodes: { Webhook: [WEBHOOK], 'Get job': [{ credits_reserved: 1000, counts: {} }], 'Get campaign': [{ parameters: { signals: [{ key: 'review_insights', weight: 10 }] } }], 'Get org': [{ offer_profile: {} }], 'Reviews cost': [{ data: 1 }], 'Get campaign leads': links, 'Get fresh insights': [], 'Get org names': org } });
  const by = Object.fromEntries(out[0].json.targets.map((t) => [t.business_name, t.branches]));
  assert.equal(by['Promo Marketing Agency'], 1);
  assert.equal(by['Digitopia Agency'], 1);
  assert.ok(Object.values(by).every((n) => n === 1));
});

// ── 7. weak dormant angle ──
test('B7: dormant_activity at strength 1 is never the message angle; at strength 2 or more it can be', async () => {
  const lead = { id: 'l1', business_name: 'X', whatsapp_eligible: true, status: 'new' };
  const map = [{ type: 'dormant_activity', angle_ar: 'نرجّع لك النشاط', why_it_means_they_need_the_offer: 'w' }, { type: 'new_business', angle_ar: 'نبني لك قاعدة عملاء', why_it_means_they_need_the_offer: 'w' }];
  const run = async (opps, selected = null) => {
    const out = await runNode('gen_build.js', {
      nodes: {
        Webhook: [WEBHOOK], 'Claim job': [{ credits_reserved: 5 }], 'Get campaign': [{ parameters: { opportunities: map } }], 'Get org': [{ name: 'W', offer_profile: { what_we_sell: 't' } }],
        'Get campaign leads': [{ opportunities: opps, selected_opportunity: selected, leads: lead }], 'Get messages': [], 'Get insights': [], 'Get cooldown': [],
      },
    });
    return { user: JSON.parse(JSON.parse(out[0].json.requestBody).messages[1].content), meta: out[0].json };
  };
  const weak = { type: 'dormant_activity', strength: 1, evidence: {} };
  const strong = { type: 'dormant_activity', strength: 2, evidence: {} };
  const nb = { type: 'new_business', strength: 1, evidence: {} };
  assert.equal((await run([weak])).user.help_angle, null, 'only a weak dormant angle: general opening');
  assert.equal((await run([weak, nb])).meta.opportunity_type, 'new_business', 'the next opportunity is used');
  assert.equal((await run([weak, nb], 'dormant_activity')).meta.opportunity_type, 'new_business', 'even when it was selected');
  assert.equal((await run([strong])).meta.opportunity_type, 'dormant_activity');
  resetStatic();
});

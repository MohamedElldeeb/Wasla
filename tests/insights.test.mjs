import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { norm, cleanPlace, globalExclusion, categoryMatch, computeFacts, signalValues, buildOpportunities, scoreLead, checkTact, planRound, SCORE } from '../lib/insights/core.mjs';

const fx = (city, f) => JSON.parse(readFileSync(new URL(`../docs/samples/fixtures/${city}/${f}.json`, import.meta.url), 'utf8'));
const cairo = fx('cairo', 'places');
const cairoRev = fx('cairo', 'reviews');
const alex = fx('alexandria', 'places');
const alexRev = fx('alexandria', 'reviews');
const byName = (arr, s) => arr.find((p) => p.title.includes(s));
const revFor = (all, place) => all.filter((r) => r.placeId === place.placeId);
const NOW = Date.parse('2026-10-10T12:00:00Z');

// A marketing-agency target, as the planner would output it (Arabic + English, from the offer, not hardcoded in code).
const ALLOWED = ['وكالة تسويق', 'وكالة إعلانية', 'خدمة التسويق عبر الإنترنت', 'مستشار تسويق', 'مصمم مواقع ويب', 'marketing agency', 'advertising agency', 'internet marketing service'];

test('norm strips invisible marks, diacritics and unifies letters', () => {
  assert.equal(norm('التجمّع​ الخامس'), 'التجمع الخامس');
  assert.equal(norm('مستشفى'), norm('مستشفي'));
  assert.equal(norm('وكالة إعلانية'), norm('وكاله اعلانيه'));
});

test('Part 2b cause: the zero-width char and repeated city in the location are cleaned', () => {
  assert.equal(cleanPlace('التجمع الخامس ​القاهرة'), 'التجمع الخامس القاهرة');
  assert.equal(cleanPlace('القاهرة القاهرة'), 'القاهرة');
  const r = planRound({ round: 1, target: 20, keywords: ['شركة تسويق الكتروني'], locations: [{ governorate: 'القاهرة', city: 'القاهرة', district: 'التجمع الخامس ​القاهرة' }] });
  const s = r.searches[0];
  assert.ok(!/[​-‏]/.test(s.query + s.locationQuery));
  assert.equal(s.locationQuery, 'التجمع الخامس القاهرة, Egypt'); // no repeated Cairo, no hidden char
});

test('2c: global exclusions remove government, utilities, education, hospitals, worship, embassies, military', () => {
  for (const [cat, group] of [['محطة كهرباء', 'utility'], ['Power station', 'utility'], ['مكتب حكومي', 'government'], ['Government office', 'government'], ['جامعة', 'education'], ['كلية', 'education'], ['School', 'education'], ['مستشفى', 'health'], ['Hospital', 'health'], ['مسجد', 'worship'], ['Church', 'worship'], ['سفارة', 'embassy'], ['Military base', 'military']]) {
    assert.equal(globalExclusion([cat])?.group, group, cat);
  }
  // Clinics, labs, pharmacies, agencies and "hospitality" are NOT excluded.
  for (const cat of ['عيادة أسنان', 'صيدلية', 'وكالة تسويق', 'Hospitality service', 'مطعم']) assert.equal(globalExclusion([cat]), null, cat);
});

test('2c fixtures: the power station is excluded by category; the real agencies are not', () => {
  const power = byName(cairo, 'محطة كهرباء');
  assert.equal(globalExclusion([power.categoryName, ...power.categories])?.group, 'utility');
  const keep = ['فيرست ماركتس', 'ماركترمارت', 'Essence Adverts', 'Plus One Up', 'ripplemark', 'The Creative Zone'];
  for (const n of keep) {
    const p = byName(cairo, n);
    assert.equal(globalExclusion([p.categoryName, ...p.categories]), null, n);
    assert.ok(categoryMatch([p.categoryName, ...p.categories], ALLOWED).ok, n);
  }
});

test('2c fixtures: category mismatch drops the government body, car dealer, electronics store and the equipment supplier', () => {
  for (const n of ['جهاز تنمية المشروعات', 'BDR auto', '2B', 'Cairo Marketing Company CMC', 'Asd Business Solutions']) {
    const p = byName(cairo, n);
    assert.equal(categoryMatch([p.categoryName, ...p.categories], ALLOWED).ok, false, `${n} (${p.categoryName})`);
  }
});

test('2c: never match on the name alone ("Marketing" in the name does not make an equipment supplier an agency)', () => {
  const cmc = byName(cairo, 'Cairo Marketing Company CMC');
  assert.ok(/marketing/i.test(cmc.title));
  assert.equal(categoryMatch(cmc.categories, ALLOWED).ok, false);
});

test('empty allow-list means no category restriction (old campaigns)', () => {
  assert.equal(categoryMatch(['أي حاجة'], []).ok, true);
});

test('3: no minimum-reviews default; few reviews is a signal, not a reason to drop (Alexandria agencies with 1-4 reviews survive category check)', () => {
  for (const n of ['Promo Marketing Agency', 'The Marketing house', 'Ocd', 'Talent Idea', 'Scitecs']) {
    const p = byName(alex, n);
    assert.ok(categoryMatch([p.categoryName, ...p.categories], ALLOWED).ok, n);
  }
});

test('facts: Lavinos (latest review Aug 2024) is dormant; Jenica is active and NOT labelled new (16 reviews, only 10 fetched)', () => {
  const lav = byName(alex, 'لافينوس');
  const f = computeFacts(lav, revFor(alexRev, lav), { now: NOW });
  assert.equal(f.activity_label, 'dormant');
  assert.equal(f.last_review_at.slice(0, 10), '2024-08-03');
  const jen = byName(alex, 'Jenica');
  const g = computeFacts(jen, revFor(alexRev, jen), { now: NOW });
  assert.equal(g.activity_label, 'active');
  assert.equal(g.is_new_business, null); // unknown, never "old and stable"
  assert.equal(g.low_reviews, 1);
  assert.equal(g.unanswered_low_reviews, 0); // the owner replied to its only 1-star review
});

test('facts: owner replies, unanswered low reviews, unclaimed listing', () => {
  const eng = byName(cairo, 'إنجاز ميديا');
  const f = computeFacts(eng, revFor(cairoRev, eng), { now: NOW });
  assert.equal(f.low_reviews, 3); // three 1-star reviews in the fetched set
  assert.equal(f.unanswered_low_reviews, 0); // the owner answered all three
  const pm = byName(cairo, 'المصرى للتسويق العقارى');
  const g = computeFacts(pm, revFor(cairoRev, pm), { now: NOW });
  assert.equal(g.unclaimed_listing, true);
  assert.equal(g.activity_label, 'dormant'); // last review 2023
  assert.equal(g.unanswered_low_reviews, 1);
});

test('facts: new business needs the fetched window to cover the whole history', () => {
  const tt = byName(cairo, 'TeleTarget'); // 21 reviews, 10 fetched => not provably new
  assert.equal(computeFacts(tt, revFor(cairoRev, tt), { now: NOW }).is_new_business, null);
  const f = computeFacts({ reviewsCount: 3, totalScore: 5 }, [{ reviewId: 'a', publishedAtDate: '2026-08-01T00:00:00Z', stars: 5 }, { reviewId: 'b', publishedAtDate: '2026-09-01T00:00:00Z', stars: 5 }, { reviewId: 'c', publishedAtDate: '2026-09-20T00:00:00Z', stars: 5 }], { now: NOW });
  assert.equal(f.is_new_business, true);
});

test('signalValues only emits what is known', () => {
  const f = computeFacts({ reviewsCount: 0, totalScore: 0 }, [], { now: NOW });
  const v = signalValues(f);
  assert.equal(v.activity, undefined);
  assert.equal(v.owner_engagement, undefined);
  assert.equal(v.rating_trend, undefined);
  assert.equal(v.has_website, 0);
});

const MAP = [
  { type: 'unclaimed_listing', angle: 'a1' },
  { type: 'no_website', angle: 'a2' },
  { type: 'unanswered_low_reviews', angle: 'a3' },
  { type: 'dormant_activity', angle: 'a4' },
  { type: 'review_theme', angle: 'a5' },
];

test('opportunities: ordered by strength, only types the campaign listed, evidence carries real numbers', () => {
  const pm = byName(cairo, 'المصرى للتسويق العقارى');
  const f = computeFacts(pm, revFor(cairoRev, pm), { now: NOW });
  const o = buildOpportunities(f, null, MAP);
  assert.ok(o.length <= 3);
  assert.equal(o[0].type, 'dormant_activity');
  assert.ok(o.every((x) => x.angle));
  assert.equal(buildOpportunities(f, null, [{ type: 'new_business', angle: 'x' }]).length, 0);
});

test('opportunities: a complaint theme is an opportunity only if the offer can help and confidence is not low', () => {
  const f = computeFacts({ reviewsCount: 5, totalScore: 4 }, [], { now: NOW });
  const complaints = [{ theme: 'بطء الرد', count: 3, offer_can_help: true }];
  const THEME = MAP.filter((m) => m.type === 'review_theme');
  assert.equal(buildOpportunities(f, { confidence: 'low', complaints }, THEME).length, 0);
  assert.equal(buildOpportunities(f, { confidence: 'medium', complaints: [{ theme: 'x', count: 3, offer_can_help: false }] }, MAP.filter((m) => m.type === 'review_theme')).length, 0);
  const ok = buildOpportunities(f, { confidence: 'medium', complaints }, MAP.filter((m) => m.type === 'review_theme'));
  assert.equal(ok[0].evidence.theme, 'بطء الرد');
});

test('2c score: "has website" alone can never produce a high score', () => {
  const r = scoreLead({ fit: 'fit', signals: [{ key: 'has_website', weight: 100, value: 1, baseline: true }] });
  assert.ok(r.score <= SCORE.noBaseCap, `score ${r.score}`);
  assert.equal(r.relevant, 0);
});

test('2c score: a single strong relevant signal is capped below 70; two relevant signals can exceed it', () => {
  const one = scoreLead({ fit: 'fit', signals: [{ key: 'unclaimed_listing', weight: 80, value: 1 }, { key: 'activity', weight: 40, value: 1 }] });
  assert.equal(one.relevant, 2);
  assert.equal(one.score, 100);
  const alone = scoreLead({ fit: 'fit', signals: [{ key: 'unclaimed_listing', weight: 80, value: 1 }, { key: 'activity', weight: 40, value: 0.5 }] });
  assert.equal(alone.relevant, 1);
  assert.ok(alone.score <= 69);
});

test('2c score: baseline weight is clamped unless the planner emphasized it (offer about websites)', () => {
  const a = scoreLead({ fit: 'fit', signals: [{ key: 'has_website', weight: -100, value: 0, baseline: true }, { key: 'activity', weight: 20, value: 0 }] });
  const b = scoreLead({ fit: 'fit', signals: [{ key: 'has_website', weight: -100, value: 0, baseline: true, emphasis: true }, { key: 'activity', weight: 20, value: 0 }] });
  assert.ok(b.score > a.score);
  assert.ok(b.relevant >= 1);
});

test('2c score: not fit gets no score at all; maybe is capped at 60', () => {
  assert.equal(scoreLead({ fit: 'not_fit', signals: [{ key: 'a', weight: 50, value: 1 }] }).score, null);
  const m = scoreLead({ fit: 'maybe', signals: [{ key: 'a', weight: 50, value: 1 }, { key: 'b', weight: 50, value: 1 }] });
  assert.equal(m.score, 60);
});

test('Part 2 #5: a lead with signals but no reasons still gets a score (reasons may be empty)', () => {
  const r = scoreLead({ fit: 'fit', signals: [{ key: 'review_insights', weight: 100, value: 0.1 }, { key: 'new_business', weight: -100, value: 1 }] });
  assert.equal(typeof r.score, 'number');
  assert.deepEqual(r.favorable, []);
});

test('2c tact: the first message never mentions complaints, low ratings or weaknesses', () => {
  const complaints = [{ theme: 'تأخير التسليم' }, { theme: 'قلة الثقة' }];
  for (const bad of [
    'شفت إن فيه مشكلة في التأخير وقلة الثقة عند العملاء',
    'لاحظت إن في ناس بتشتكي من الخدمة',
    'تقييمكم منخفض وعايزين نساعدكم',
    'فيه ريفيوهات وحشه على صفحتكم',
  ]) assert.equal(checkTact(bad, complaints).ok, false, bad);
  assert.equal(checkTact('أهلا، شفت إن عملاءكم بيمدحوا جودة الشغل والتزامكم. عندنا أداة بتساعد الوكالات تلاقي عملاء جدد، تحبوا أعرض عليكم فكرة؟', complaints).ok, true);
});

test('1: requested count = delivered: rounds go deeper, then synonyms, then nearby, then exhausted', () => {
  const base = { target: 20, keywords: ['شركة تسويق'], synonyms: ['marketing agency'], locations: [{ governorate: 'القاهرة', city: 'القاهرة', district: 'مدينة نصر' }], nearby: [{ governorate: 'القاهرة', city: 'القاهرة', district: 'مصر الجديدة' }] };
  const r1 = planRound({ ...base, round: 1 });
  assert.ok(r1.searches.every((s) => s.depth >= 20), 'real depth, not target/queries');
  const r2 = planRound({ ...base, round: 2, saturated: [r1.searches[0].query] });
  assert.ok(r2.searches[0].depth > r1.searches[0].depth);
  assert.equal(planRound({ ...base, round: 2, saturated: [] }), null); // nothing hit its cap, deeper makes no sense
  assert.equal(planRound({ ...base, round: 3 }).searches[0].query, 'marketing agency مدينة نصر');
  assert.equal(planRound({ ...base, round: 4 }).searches.every((s) => s.area === 'مصر الجديدة'), true);
  assert.equal(planRound({ ...base, round: 6 }), null);
});

test('2b: zero-result fallback is city level with the simplest keywords', () => {
  const r = planRound({ round: 5, target: 20, keywords: ['شركة تسويق الكتروني', 'Digital Marketing Agency', 'وكالة إعلانات'], locations: [{ governorate: 'القاهرة', city: 'القاهرة', district: 'التجمع الخامس' }] });
  assert.equal(r.searches.length, 2);
  assert.equal(r.searches[0].locationQuery, 'القاهرة, Egypt');
});

test('interview: only public http(s) URLs are fetched (the page is read by our n8n server)', async () => {
  const { safePublicUrl } = await import('../lib/safe-url.mjs');
  assert.equal(safePublicUrl('example.com/about'), 'https://example.com/about');
  assert.equal(safePublicUrl('https://www.facebook.com/somepage'), 'https://www.facebook.com/somepage');
  for (const bad of ['http://localhost:3000', 'http://127.0.0.1', 'http://10.0.0.5/admin', 'ftp://example.com', 'javascript:alert(1)', 'https://user:pw@example.com', 'http://[::1]/', 'http://intranet', 'http://printer.local', '', '   ']) assert.equal(safePublicUrl(bad), null, bad);
});

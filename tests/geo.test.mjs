// Locations: the list of Egyptian places (Arabic and English), autocomplete, resolution of free text, and WF1 skipping unresolvable locations.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runNode } from './helpers/n8n-sim.mjs';
import { PLACES, GOVERNORATE_COUNT, searchPlaces, resolveRegion, resolvePlace, regionFromPlace, geocoderQuery, regionLabelAr, normPlace } from '../lib/geo/egypt.mjs';
import { areaOf } from '../lib/insights/core.mjs';

test('the list covers all 27 governorates, every entry has Arabic and English names, and there are no duplicates', () => {
  assert.equal(GOVERNORATE_COUNT, 27);
  assert.equal(PLACES.filter((p) => p.kind === 'governorate').length, 27);
  for (const p of PLACES) {
    assert.ok(p.ar && p.en, `${p.label} needs both names`);
    assert.match(p.ar, /[؀-ۿ]/, `${p.label}: the Arabic name is Arabic`);
    assert.match(p.en, /[A-Za-z]/, `${p.label}: the English name is English`);
  }
  const seen = new Set();
  for (const p of PLACES) {
    const id = [p.kind, p.governorate.en, p.city && p.city.en, p.district && p.district.en].join('|');
    assert.ok(!seen.has(id), `duplicate entry ${id}`);
    seen.add(id);
  }
  assert.ok(PLACES.length > 300);
  for (const g of ['Cairo', 'Giza', 'Alexandria', 'Sharqia', 'Aswan', 'Matrouh', 'South Sinai']) assert.ok(PLACES.some((p) => p.kind === 'governorate' && p.en === g), g);
});

test('autocomplete finds places by Arabic or English name, spelling variants and partial words', () => {
  const top = (q) => (searchPlaces(q, 1)[0] || {}).en;
  assert.equal(top('maadi'), 'Maadi');
  assert.equal(top('المعادي'), 'Maadi');
  assert.equal(top('المعادى'), 'Maadi', 'ى and ي are the same letter');
  assert.equal(top('سموح'), 'Smouha');
  assert.equal(top('5th'), 'Fifth Settlement');
  assert.equal(top('الاسك'), 'Alexandria', 'without the hamza and partial');
  assert.equal(top('iskandariya'), 'Alexandria');
  assert.equal(top('hurghada'), 'Hurghada');
  assert.equal(top('الغردقة'), 'Hurghada');
  assert.ok(searchPlaces('giza').some((p) => p.en === 'Giza'));
  assert.deepEqual(searchPlaces('xyzzyq'), []);
  assert.deepEqual(searchPlaces('   '), []);
  const gouna = searchPlaces('gouna')[0];
  assert.equal(gouna.sub, 'البحر الأحمر · Red Sea', 'a city shows its governorate');
  assert.equal(searchPlaces('smouha')[0].sub, 'الإسكندرية · Alexandria');
});

test('free text resolves to the list only when it is a real place; typos and invented places do not', () => {
  assert.equal(resolveRegion({ governorate: 'Alexa' }), null, 'the "Alexa, Egypt" input that broke a real campaign');
  assert.equal(resolveRegion({ governorate: 'Alexa', city: 'Egypt' }), null);
  assert.equal(resolveRegion({ city: 'مدينة غير موجودة' }), null);
  assert.equal(resolveRegion({}), null);
  assert.equal(resolveRegion(null), null);
  const r = resolveRegion({ governorate: 'الاسكندرية', city: 'الاسكندرية', district: 'سموحة' });
  assert.deepEqual(r, { governorate: 'الإسكندرية', governorate_en: 'Alexandria', city: 'الإسكندرية', city_en: 'Alexandria', district: 'سموحة', district_en: 'Smouha' });
  // the planner often puts a new-city district under "Cairo": the list's own placement wins
  assert.equal(resolveRegion({ governorate: 'القاهرة', city: 'القاهرة', district: 'التجمع الخامس' }).city_en, 'New Cairo');
  assert.equal(resolveRegion({ governorate: 'Cairo' }).governorate_en, 'Cairo');
  assert.equal(resolveRegion({ governorate: 'القاهرة' }).city, undefined, 'a governorate stays a governorate');
  // the same name in two governorates: the region's governorate decides
  assert.equal(resolvePlace({ governorate: 'سوهاج', city: 'دار السلام' }).governorate.en, 'Sohag');
  assert.equal(resolvePlace({ governorate: 'القاهرة', district: 'دار السلام' }).governorate.en, 'Cairo');
  // already canonical regions resolve to themselves
  assert.deepEqual(resolveRegion(r), r);
  assert.equal(normPlace('  الإسكندرية  '), normPlace('الاسكندريه'));
});

test('every planner suggestion in the real fixtures and every list entry can be geocoded by name', () => {
  const places = JSON.parse(readFileSync(new URL('../docs/samples/fixtures-run.json', import.meta.url), 'utf8'));
  const locs = [{ governorate: 'القاهرة', city: 'القاهرة', district: 'مدينة نصر' }, { governorate: 'القاهرة' }, ...(places.planner.draft.locations || [])];
  for (const l of locs) assert.ok(resolveRegion(l), JSON.stringify(l));
  for (const p of PLACES) {
    const q = geocoderQuery(regionFromPlace(p));
    assert.match(q, /, Egypt$/);
    assert.ok(!/undefined|null/.test(q), q);
  }
  assert.equal(geocoderQuery(resolveRegion({ governorate: 'الاسكندرية', district: 'سموحة' })), 'Smouha, Alexandria, Egypt');
  assert.equal(geocoderQuery(resolveRegion({ governorate: 'القاهرة' })), 'Cairo, Egypt');
  assert.equal(geocoderQuery(resolveRegion({ governorate: 'القاهرة', city: 'القاهرة', district: 'المعادي' })), 'Maadi, Cairo, Egypt');
  assert.equal(geocoderQuery({ governorate: 'x' }), null, 'a region without English names falls back to the Arabic text');
  assert.equal(regionLabelAr(resolveRegion({ governorate: 'الاسكندرية', city: 'الاسكندرية', district: 'سموحة' })), 'سموحة، الإسكندرية');
});

test('the search engine geocodes the English names of a picked region, and keeps Arabic text for old campaigns', () => {
  const picked = resolveRegion({ governorate: 'الاسكندرية', district: 'سموحة' });
  const a = areaOf(picked);
  assert.equal(a.locationQuery, 'Smouha, Alexandria, Egypt');
  assert.equal(a.area, 'سموحة', 'the search phrase keeps the Arabic area name');
  const legacy = areaOf({ governorate: 'القاهرة', city: 'القاهرة', district: 'مدينة نصر' });
  assert.match(legacy.locationQuery, /Egypt$/);
  assert.match(legacy.locationQuery, /مدينة نصر/);
});

// ── WF1 ──
const PLAN = (area, q) => ({ requestBody: '{}', round: 1, queries: ['مطاعم'], area, depth: 20, location_query: q, district: area, city: null, governorate: null, leadCap: 10, mode: 'normal' });
const ok = { statusCode: 200, body: [{ lat: '30.0', lon: '31.0' }] };
const notFound = { statusCode: 200, body: [] };

test('WF1: a location the geocoder cannot find is skipped and recorded, the others continue', async () => {
  const plans = [PLAN('سموحة', 'Smouha, Alexandria, Egypt'), PLAN('Alexa', 'Alexa, Egypt'), PLAN('المعادي', 'Maadi, Cairo, Egypt')];
  const out = await runNode('ingest_filter_locations.js', { nodes: { 'Plan queries': plans }, input: [ok, notFound, ok] });
  assert.equal(out.length, 2);
  assert.deepEqual(out.map((o) => o.json.area), ['سموحة', 'المعادي']);
  assert.deepEqual(out[0].json.skipped_locations, ['Alexa']);
  assert.deepEqual(out[1].json.skipped_locations, []);
});

test('WF1: a geocoder that is down (429, 5xx, timeout) never removes a location', async () => {
  const plans = [PLAN('سموحة', 'Smouha, Alexandria, Egypt'), PLAN('المعادي', 'Maadi, Cairo, Egypt'), PLAN('الزمالك', 'Zamalek, Cairo, Egypt')];
  const out = await runNode('ingest_filter_locations.js', { nodes: { 'Plan queries': plans }, input: [{ statusCode: 429, body: 'slow down' }, { error: { message: 'timeout' } }, {}] });
  assert.equal(out.length, 3);
  assert.deepEqual(out[0].json.skipped_locations, []);
});

test('WF1: when no location can be found the round has nothing to search (the job fails with location_not_found and is refunded)', async () => {
  const out = await runNode('ingest_filter_locations.js', { nodes: { 'Plan queries': [PLAN('Alexa', 'Alexa, Egypt'), PLAN('Cairoo', 'Cairoo, Egypt')] }, input: [notFound, notFound] });
  assert.equal(out.length, 1);
  assert.equal(out[0].json.allLocationsSkipped, true);
  assert.deepEqual(out[0].json.skipped_locations, ['Alexa', 'Cairoo']);
  // the workflow routes that item to a settle call with p_status failed, 0 credits used (everything reserved is refunded) and the names in the counts
  const wf = JSON.parse(readFileSync(new URL('../n8n/workflows/WF1_ingest.json', import.meta.url), 'utf8'));
  const names = wf.nodes.map((n) => n.name);
  for (const n of ['Geocode check', 'Filter locations', 'Any location left?', 'First round?', 'Settle location not found']) assert.ok(names.includes(n), n);
  const settle = wf.nodes.find((n) => n.name === 'Settle location not found');
  const body = settle.parameters.jsonBody;
  assert.match(body, /p_status: "failed"/);
  assert.match(body, /p_error: "location_not_found"/);
  assert.match(body, /p_credits_used: 0/);
  assert.match(body, /location_not_found/);
  const geo = wf.nodes.find((n) => n.name === 'Geocode check');
  assert.equal(geo.parameters.options.batching.batch.batchInterval, 1100, 'one request per 1.1 s (the geocoder asks for at most one per second)');
  assert.equal(geo.onError, 'continueRegularOutput');
  // connections: Has queries -> Geocode check -> Filter locations -> Any location left? -> Apify (yes) / First round? (no)
  const c = wf.connections;
  assert.equal(c['Geocode check'].main[0][0].node, 'Filter locations');
  assert.equal(c['Filter locations'].main[0][0].node, 'Any location left?');
  assert.equal(c['Any location left?'].main[0][0].node, 'Apify places');
  assert.equal(c['Any location left?'].main[1][0].node, 'First round?');
  assert.equal(c['First round?'].main[0][0].node, 'Settle location not found');
  assert.equal(c['First round?'].main[1][0].node, 'Call normalize final', 'later rounds just stop searching');
});

test('WF1: skipped locations are saved in the job counts across rounds and shown by the funnel', async () => {
  const plan = { ...PLAN('سموحة', 'Smouha, Alexandria, Egypt'), skipped_locations: ['Alexa'] };
  const out = await runNode('ingest_collect.js', {
    nodes: { Webhook: [{ body: { round: 1, organization_id: 'o', campaign_id: 'c', job_id: 'j' } }], 'Get job': [{ counts: { lead_cap: 10, location_not_found: ['Cairoo'] }, credits_reserved: 10 }], 'Filter locations': [plan], 'Get probe': [] },
    input: [{ statusCode: 200, body: [] }],
  });
  assert.deepEqual(out[0].json.counts.location_not_found.sort(), ['Alexa', 'Cairoo']);
  assert.equal(out[0].json.allFailed, false);
});

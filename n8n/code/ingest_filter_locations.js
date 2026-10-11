// WF1 "Filter locations": the geocoder answered for every search location. A location it cannot find is skipped (the other locations
// continue) and recorded as "location not found". Only when NO location is left does the round have nothing to search.
// An unreachable geocoder (timeout, 429, 5xx) never removes a location: only an empty, successful answer does.
const plans = $('Plan queries').all().map((i) => i.json);
const resp = $input.all().map((i) => i.json || {});
const kept = [];
const skipped = [];
plans.forEach((pl, i) => {
  const r = resp[i] || {};
  const notFound = typeof r.statusCode === 'number' && r.statusCode >= 200 && r.statusCode < 300 && Array.isArray(r.body) && r.body.length === 0;
  if (notFound) {
    const name = String(pl.area || pl.location_query || '').trim();
    if (name && !skipped.includes(name)) skipped.push(name);
  } else kept.push(pl);
});
if (!kept.length) return [{ json: { allLocationsSkipped: true, skipped_locations: skipped } }];
return kept.map((pl, k) => ({ json: { ...pl, skipped_locations: k === 0 ? skipped : [] } }));

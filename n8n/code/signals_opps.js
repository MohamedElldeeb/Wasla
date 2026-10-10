// WF2b "Opportunities": top 3 opportunities per lead for THIS campaign (spec 6.3b step 3). Which opportunity types matter, and the
// angle sentence for each, come from the campaign's opportunity map written by the planner for the organization's offer.
/*__INSIGHTS__*/
const body = $('Webhook').first().json.body;
const campaign = $('Get campaign').first().json;
const links = $('Get campaign leads').all().map((i) => i.json).filter((r) => r.leads);
const freshMap = new Map($('Get fresh insights').all().map((i) => i.json).filter((r) => r && r.lead_id).map((r) => [r.lead_id, r]));
let byLead = new Map();
try { byLead = new Map($('Parse signals').first().json.byLead.map((x) => [x.lead_id, x])); } catch (e) { byLead = new Map(); }

const baseName = (n) => String(n || '').split(/\s[-–|]\s|\(|\|/)[0].toLowerCase().replace(/[^\p{L}\p{N}]+/g, ' ').trim();
const branchCount = new Map();
for (const r of $('Get org names').all()) {
  const k = baseName(r.json.business_name);
  if (k) branchCount.set(k, (branchCount.get(k) || 0) + 1);
}

const oppMap = ((campaign.parameters || {}).opportunities || []).map((o) => ({ type: o.type, angle: o.angle_ar || o.angle || '' }));
const rows = [];
for (const r of links) {
  const l = r.leads;
  const scraped = byLead.get(l.id);
  const stored = freshMap.get(l.id);
  const place = { ...(l.raw || {}), website: l.website, reviewsCount: l.reviews_count, totalScore: l.rating };
  const facts = (scraped && scraped.facts) || (stored && stored.facts) || computeFacts(place, [], { branches: Math.max(1, branchCount.get(baseName(l.business_name)) || 1) });
  const analysis = (scraped && scraped.analysis) || (stored && stored.analysis) || null;
  const opportunities = buildOpportunities(facts, analysis, oppMap);
  rows.push({
    organization_id: body.organization_id,
    campaign_id: body.campaign_id,
    lead_id: l.id,
    opportunities,
    selected_opportunity: opportunities[0] ? opportunities[0].type : null,
  });
}
return [{ json: { rows } }];

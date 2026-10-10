// WF2 "Counts": merge this round into the job counts and funnel, then decide whether another search round is needed (spec 6.2).
/*__INSIGHTS__*/
const ing = $input.first().json;
const fit = $('Apply fit').first().json;
const job = $('Get job').first().json;
const campaign = $('Get campaign').first().json;
const body = $('Webhook').first().json.body;

const prev = job.counts || {};
const pf = prev.funnel || {};
const st = fit.stats;
const add = (k, v) => (Number(pf[k]) || 0) + (Number(v) || 0);
const groups = { ...(pf.removed_global_by || {}) };
for (const [g, n] of Object.entries(fit.globalGroups || {})) groups[g] = (groups[g] || 0) + n;

const delivered = (Number(prev.delivered) || 0) + (Number(ing.newly_linked) || 0);
const funnel = {
  queries: Number(prev.queries) || 0,
  raw_places: add('raw_places', st.staged),
  removed_closed: add('removed_closed', st.removed_closed),
  removed_global: add('removed_global', st.removed_global),
  removed_global_by: groups,
  removed_category: add('removed_category', st.removed_category),
  removed_landline: add('removed_landline', st.removed_landline),
  removed_filters: add('removed_filters', st.removed_filters),
  removed_not_fit: add('removed_not_fit', st.removed_not_fit),
  duplicates: add('duplicates', (Number(st.duplicates) || 0) + (Number(ing.already_in_campaign) || 0)),
  previously_found: add('previously_found', (Number(st.previously_found) || 0) + (Number(ing.previously_found) || 0)),
  opted_out: add('opted_out', ing.dropped_opted_out),
  cooldown: add('cooldown', (Number(st.cooldown) || 0) + (Number(ing.cooldown) || 0)),
  delivered,
};
const leadCap = Number(prev.lead_cap) || 100;
const round = Number(body.round) || Number(prev.round) || 1;
const rawTotal = Number(prev.raw_total) || 0;
const nx = body.final === true ? { next: null, mode: prev.mode || 'normal' } : decideNext({ round, mode: prev.mode || 'normal', delivered, target: leadCap, rawTotal });

const counts = {
  ...prev,
  funnel,
  delivered,
  new: (Number(prev.new) || 0) + (Number(ing.new) || 0),
  already_known: (Number(prev.already_known) || 0) + (Number(ing.already_known) || 0),
  linked: delivered,
  found: funnel.raw_places,
  staged: funnel.raw_places,
  filtered_out: funnel.removed_closed + funnel.removed_global + funnel.removed_category + funnel.removed_landline + funnel.removed_filters + funnel.removed_not_fit,
  capped: (Number(prev.capped) || 0) + (Number(st.capped) || 0),
  fit_unchecked: (Number(prev.fit_unchecked) || 0) + (Number(st.fit_unchecked) || 0),
  mode: nx.mode,
  round,
  next_round: nx.next,
  fit_usage: {
    in: (Number(prev.fit_usage && prev.fit_usage.in) || 0) + fit.usage.in,
    out: (Number(prev.fit_usage && prev.fit_usage.out) || 0) + fit.usage.out,
    cost: (Number(prev.fit_usage && prev.fit_usage.cost) || 0) + fit.usage.cost,
    model: fit.usage.model || (prev.fit_usage && prev.fit_usage.model) || null,
  },
  not_fit_examples: [...(prev.not_fit_examples || []), ...(fit.dropped || [])].slice(0, 12),
};
if (nx.next === null) {
  counts.reached_target = delivered >= leadCap;
  counts.empty_reason = delivered === 0 ? emptyReason(funnel) : null;
  if (delivered > 0 && delivered < leadCap) counts.short_reason = emptyReason({ ...funnel, raw_places: Math.max(funnel.raw_places, 1) });
}

const signals = ((campaign.parameters || {}).signals || []).filter((s) => s && Number(s.weight) !== 0);
return [{
  json: {
    job_id: body.job_id,
    campaign_id: body.campaign_id,
    organization_id: body.organization_id,
    counts,
    next_round: nx.next,
    credits_used: counts.new, // 1 credit per NEW lead; leads already in the org are linked, not charged again
    signals_on: signals.length > 0 && delivered > 0,
    delivered,
    model: body.model,
    planner_model: body.planner_model,
    fallback_models: body.fallback_models,
    max_results_cap: body.max_results_cap,
  },
}];

// WF2 "Counts": merge ingest results into job counts and decide the next step.
const ing = $input.first().json;
const norm = $('Normalize').first().json;
const job = $('Get job').first().json;
const campaign = $('Get campaign').first().json;
const body = $('Webhook').first().json.body;

const signals = ((campaign.parameters || {}).signals || []).filter((s) => s && Number(s.weight) !== 0);
const counts = {
  ...(job.counts || {}),
  staged: norm.stats.staged,
  filtered_out: norm.stats.filtered_out,
  duplicates_in_batch: norm.stats.duplicates,
  capped: norm.stats.capped,
  received: ing.received,
  dropped_opted_out: ing.dropped_opted_out,
  new: ing.new,
  already_known: ing.already_known,
  linked: ing.newly_linked,
};

return [{
  json: {
    job_id: body.job_id,
    campaign_id: body.campaign_id,
    organization_id: body.organization_id,
    counts,
    credits_used: ing.new, // 1 credit per NEW lead; leads already in the org are linked, not charged again
    signals_on: signals.length > 0,
    model: body.model,
    fallback_models: body.fallback_models,
  },
}];

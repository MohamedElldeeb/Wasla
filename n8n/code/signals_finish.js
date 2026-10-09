// WF2b "Finish": final credit usage and counts for the whole ingest job (leads + signals).
const body = $('Webhook').first().json.body;
const job = $('Get job').first().json;
const plan = $('Plan signals').first().json;
let parsed = null;
try { parsed = $('Parse signals').first().json; } catch (e) { parsed = null; }
let warning = null;
try { const g = $('Group reviews').first().json; if (g && g.empty && g.error) warning = String(g.error); } catch (e) { /* node did not run */ }

const charged = parsed ? parsed.chargedLeads : 0;
const newLeads = Number((job.counts || {}).new) || 0;
const used = newLeads + charged * plan.perLead;

return [{
  json: {
    job_id: body.job_id,
    campaign_id: body.campaign_id,
    credits_used: used,
    counts: {
      ...(job.counts || {}),
      signals_free: plan.freeRows.length,
      review_targets: plan.targets.length,
      reviews_scraped: charged,
      signals_warning: warning,
    },
    usage: parsed ? parsed.usage : { in: 0, out: 0, cost: 0, model: null },
  },
}];

// WF2b "Finish": final credit usage and counts for the whole ingest job (leads + signals). Review analysis is charged per scraped lead.
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
const prevFit = (job.counts || {}).fit_usage || { in: 0, out: 0, cost: 0, model: null };
const u = parsed ? parsed.usage : { in: 0, out: 0, cost: 0, model: null };

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
    // One LLM cost line for the job: the fit check done in WF2 plus the review analysis done here.
    usage: { in: u.in + (prevFit.in || 0), out: u.out + (prevFit.out || 0), cost: u.cost + (prevFit.cost || 0), model: u.model || prevFit.model },
  },
}];

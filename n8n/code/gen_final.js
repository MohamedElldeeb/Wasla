// WF3 "Final": totals for settle_job. Credits are charged only for messages that were actually created.
const body = $('Webhook').first().json.body;
const job = $('Claim job').first().json;
const items = $input.all().map((i) => i.json);

let created = 0, failed = 0, retried = 0, tin = 0, tout = 0, cost = 0, model = null;
let skippedCooldown = 0;
try { skippedCooldown = Number($('Select and build').first().json.skippedCooldown) || 0; } catch (e) { skippedCooldown = 0; }
const reasons = {};
for (const r of items) {
  tin += r.tokens_in || 0;
  tout += r.tokens_out || 0;
  cost += r.cost || 0;
  model = r.model || model;
  if (r.retried) retried++;
  if (r.ok) created++; else { failed++; reasons[r.reason] = (reasons[r.reason] || 0) + 1; }
}
const status = created === 0 && failed > 0 ? 'failed' : 'succeeded';
return [{
  json: {
    job_id: body.job_id,
    status,
    credits_used: created,
    error: status === 'failed' ? 'generation_failed' : null,
    counts: { ...(job.counts || {}), generated: created, failed, retried, skipped_cooldown: skippedCooldown, failure_reasons: reasons },
    cost_usd: Math.round(cost * 1e6) / 1e6,
    model,
    tokens_in: tin,
    tokens_out: tout,
  },
}];

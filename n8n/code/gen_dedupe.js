// WF3 "Dedupe openings": no two messages of one run may start with the same five words (round 2: the batch must not read like one template).
// The first message keeps its opening; a later duplicate is sent back for its single automatic retry with the reason as feedback.
// The accepted openings are kept in workflow static data per job, so the check also holds across the loop's batches.
/*__INSIGHTS__*/
const body = $('Webhook').first().json.body;
const sd = $getWorkflowStaticData('global');
const key = `open_${body.job_id}`;
for (const k of Object.keys(sd)) if (k.startsWith('open_') && k !== key && k !== `${key}_t`) delete sd[k];
const seen = new Set(sd[key] || []);
const texts = sd[`${key}_t`] || [];
const metaByLead = new Map($('Select and build').all().map((i) => [i.json.lead_id, i.json]));

const out = $input.all().map((it, idx) => {
  const r = it.json;
  if (r && r.ok && r.opening) {
    const similar = texts.some((t) => messageSimilarity(t, r.message) >= SIMILAR_LIMIT);
    if (seen.has(r.opening) || similar) {
      const meta = metaByLead.get(r.lead_id);
      const retryable = !!meta;
      return {
        json: { ...r, ok: false, reason: similar && !seen.has(r.opening) ? 'too_similar' : 'duplicate_opening', retry: retryable, requestBody: retryable ? retryRequestBody(meta.requestBody, r.raw_content, similar && !seen.has(r.opening) ? 'too_similar_to_another_message' : 'duplicate_opening') : '{}',
          save: { method: 'PATCH', path: 'messages?id=eq.00000000-0000-0000-0000-000000000000', prefer: 'return=minimal', body: { review_status: 'pending' } } },
        pairedItem: { item: idx },
      };
    }
    seen.add(r.opening);
    texts.push(r.message);
  }
  return { json: r, pairedItem: { item: idx } };
});
sd[key] = [...seen];
sd[`${key}_t`] = texts.slice(-60);
return out;

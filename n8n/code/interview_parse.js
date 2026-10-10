// WF-interview "Parse turn": validate the interviewer reply. The structured profile is only a DRAFT: the user edits and confirms it in the UI.
/*__INSIGHTS__*/
const body = $('Webhook').first().json.body;
const meta = $('Build turn').first().json;
const { data, usage } = parseLlm($input.first().json);
if (!data || typeof data.reply !== 'string' || !data.reply.trim()) return [{ json: { ok: false, error: 'planner_bad_output', job_id: body.job_id } }];

const str = (v, n) => (typeof v === 'string' ? stripInvisible(v).slice(0, n) : '');
const done = data.done === true || meta.mustFinish;
let profile = null;
if (done) {
  const p = data.profile && typeof data.profile === 'object' ? data.profile : {};
  const firstUser = ((Array.isArray(body.transcript) ? body.transcript : []).find((m) => m && m.role === 'user') || {}).content || '';
  profile = {
    what_we_sell: str(p.what_we_sell, 600) || str(firstUser, 600),
    ideal_customer: str(p.ideal_customer, 600),
    problems_we_solve: str(p.problems_we_solve, 600),
    proof_points: str(p.proof_points, 600),
    regions: (Array.isArray(p.regions) ? p.regions : []).slice(0, 8).map((r) => ({ governorate: str(r && r.governorate, 60), city: str(r && r.city, 60) })).filter((r) => r.governorate || r.city),
    example_customers: (Array.isArray(p.example_customers) ? p.example_customers : []).slice(0, 6).map((x) => str(x, 80)).filter(Boolean),
  };
}
const quick = done ? [] : (Array.isArray(data.quick_replies) ? data.quick_replies : []).slice(0, 4).map((q) => str(q, 80)).filter(Boolean);
return [{
  json: {
    ok: true,
    job_id: body.job_id,
    result: { reply: str(data.reply, 800), quick_replies: quick, done, profile, asked: meta.asked + (done ? 0 : 1) },
    usage,
  },
}];

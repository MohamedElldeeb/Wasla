// WF0 "Parse planner": validates the LLM output against the signal library and clamps everything.
const res = $input.first().json;
const defs = $('Get signals').all().map((i) => i.json);
const allowed = new Map(defs.map((d) => [d.key, d]));
const body = $('Webhook').first().json.body;

const fail = (msg) => ({ json: { ok: false, error: msg, job_id: body.job_id } });
if (!res || res.statusCode < 200 || res.statusCode >= 300 || !res.body || !res.body.choices) {
  return [fail('ماقدرناش نكلم الذكاء الاصطناعي دلوقتي. جرّب تاني بعد شوية.')];
}
const raw = res.body.choices[0]?.message?.content || '';
let data;
try {
  data = JSON.parse(raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim());
} catch (e) {
  return [fail('الخطة طلعت بشكل مش مفهوم. جرّب تاني.')];
}

const str = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const strs = (a, max, n) => (Array.isArray(a) ? a.map((x) => str(x, n)).filter(Boolean).slice(0, max) : []);

const signals = [];
const seen = new Set();
for (const s of Array.isArray(data.signals) ? data.signals : []) {
  const key = str(s?.key, 60);
  const weight = Math.round(Math.max(-100, Math.min(100, Number(s?.weight))));
  if (!allowed.has(key) || seen.has(key) || !Number.isFinite(weight) || weight === 0) continue;
  seen.add(key);
  signals.push({ key, weight, reason_ar: str(s.reason_ar, 120) });
}

const locations = (Array.isArray(data.locations) ? data.locations : [])
  .map((l) => ({ governorate: str(l?.governorate, 60), city: str(l?.city, 60), district: str(l?.district, 60) }))
  .filter((l) => l.governorate || l.city || l.district)
  .slice(0, 8);

const draft = {
  categories: strs(data.categories, 8, 60),
  keywords: strs(data.keywords, 10, 60),
  locations,
  signals: signals.slice(0, 6),
  angles: (Array.isArray(data.angles) ? data.angles : [])
    .map((a) => ({ title_ar: str(a?.title_ar, 80), description_ar: str(a?.description_ar, 300) }))
    .filter((a) => a.title_ar)
    .slice(0, 3),
};
if (!draft.keywords.length) return [fail('الخطة مطلعتش كلمات بحث. جرّب تاني أو عدّل وصف اللي بتبيعه.')];

const u = res.body.usage || {};
return [{
  json: {
    ok: true,
    draft,
    job_id: body.job_id,
    tokens_in: u.prompt_tokens || 0,
    tokens_out: u.completion_tokens || 0,
    cost: Number(u.cost) || 0,
    model: res.body.model || body.model,
  },
}];

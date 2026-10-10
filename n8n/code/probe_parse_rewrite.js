// WF0b "Parse rewrite": the new queries (kept short, deduped against the old ones). Falls back to the old ones if the LLM failed.
/*__INSIGHTS__*/
const campaign = $('Get campaign').first().json;
const old = ((campaign.parameters || {}).keywords || []).map((k) => stripInvisible(k)).filter(Boolean);
const { data, usage } = parseLlm($input.first().json);
const seen = new Set(old.map(norm));
const queries = [];
for (const q of (data && Array.isArray(data.queries) ? data.queries : [])) {
  const v = stripInvisible(q).slice(0, 60);
  if (v && !seen.has(norm(v))) { seen.add(norm(v)); queries.push(v); }
  if (queries.length >= 4) break;
}
return [{ json: { queries: queries.length ? queries : old, rewritten: queries.length > 0, usage } }];

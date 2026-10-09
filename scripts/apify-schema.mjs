// Dev tool: print the input schema (property names, types, defaults) of an Apify actor.
// Usage: node --env-file=.env.local scripts/apify-schema.mjs compass/crawler-google-places [filter]
const [actor, filter] = process.argv.slice(2);
const token = process.env.APIFY_API_TOKEN;
const id = actor.replace('/', '~');
const act = await (await fetch(`https://api.apify.com/v2/acts/${id}?token=${token}`)).json();
const buildId = act.data?.taggedBuilds?.latest?.buildId;
const build = await (await fetch(`https://api.apify.com/v2/actor-builds/${buildId}?token=${token}`)).json();
const schema = build.data?.inputSchema ? JSON.parse(build.data.inputSchema) : null;
console.log('actor', actor, 'build', build.data?.buildNumber ?? buildId, 'pricing', JSON.stringify(act.data?.pricingInfos?.at(-1)?.pricingModel));
for (const [k, v] of Object.entries(schema?.properties ?? {})) {
  if (filter && !k.toLowerCase().includes(filter.toLowerCase())) continue;
  const d = v.default !== undefined ? ` default=${JSON.stringify(v.default)}` : '';
  const e = v.enum ? ` enum=${JSON.stringify(v.enum)}` : '';
  console.log(`- ${k} (${v.type})${d}${e}${v.title ? ' :: ' + v.title : ''}`);
}
console.log('required:', JSON.stringify(schema?.required ?? []));

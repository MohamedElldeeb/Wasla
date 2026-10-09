// Dev tool: capped sample run of an Apify actor, saved to docs/samples/. NEVER raise the cap casually (costs credits).
// Usage: node --env-file=.env.local scripts/apify-sample.mjs <actor> <out-file> '<input-json>'
import { writeFileSync, mkdirSync } from 'node:fs';
const [actor, out, inputJson] = process.argv.slice(2);
const input = JSON.parse(inputJson);
const token = process.env.APIFY_API_TOKEN;
const url = `https://api.apify.com/v2/acts/${actor.replace('/', '~')}/run-sync-get-dataset-items?token=${token}&timeout=240&format=json`;
const t0 = Date.now();
const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
const text = await res.text();
console.log('status', res.status, 'ms', Date.now() - t0, 'bytes', text.length);
if (!res.ok) { console.log(text.slice(0, 500)); process.exit(1); }
const items = JSON.parse(text);
mkdirSync('docs/samples', { recursive: true });
writeFileSync(out, JSON.stringify(items, null, 2));
console.log('items', items.length, 'keys of first:', Object.keys(items[0] ?? {}).join(', '));

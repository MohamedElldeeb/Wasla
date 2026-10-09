// Deploys n8n/workflows/*.json to the n8n instance through its REST API (no MCP).
// Credentials live in n8n's credential store; their ids are cached in n8n/.credentials.local.json (git-ignored).
// Usage: node --env-file=.env.local n8n/deploy.mjs [--dry]
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';

const base = process.env.N8N_BASE_URL?.replace(/\/$/, '');
const key = process.env.N8N_API_KEY;
const dry = process.argv.includes('--dry');
if (!base || !key) throw new Error('N8N_BASE_URL and N8N_API_KEY are required');

async function api(path, method = 'GET', body) {
  const res = await fetch(`${base}/api/v1${path}`, {
    method,
    headers: { 'X-N8N-API-KEY': key, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : null;
}

const credFile = new URL('./.credentials.local.json', import.meta.url);
const known = existsSync(credFile) ? JSON.parse(readFileSync(credFile, 'utf8')) : {};
const wanted = [
  ['__CRED_SUPABASE__', { name: 'Wasla Supabase', type: 'httpHeaderAuth', data: { name: 'apikey', value: process.env.SUPABASE_SERVICE_ROLE_KEY } }],
  ['__CRED_SECRET__', { name: 'Wasla Webhook Secret', type: 'httpHeaderAuth', data: { name: 'x-wasla-secret', value: process.env.N8N_WEBHOOK_SECRET } }],
  ['__CRED_OPENROUTER__', { name: 'Wasla OpenRouter', type: 'httpHeaderAuth', data: { name: 'Authorization', value: `Bearer ${process.env.OPENROUTER_API_KEY}` } }],
  ['__CRED_APIFY__', { name: 'Wasla Apify', type: 'httpQueryAuth', data: { name: 'token', value: process.env.APIFY_API_TOKEN } }],
];
for (const [placeholder, cred] of wanted) {
  if (known[placeholder]) continue;
  if (Object.values(cred.data).some((v) => !v || String(v).includes('undefined'))) throw new Error(`missing env for credential ${cred.name}`);
  if (dry) { console.log('would create credential', cred.name); continue; }
  const created = await api('/credentials', 'POST', cred);
  known[placeholder] = created.id;
  console.log('created credential', cred.name, created.id);
}
if (!dry) writeFileSync(credFile, JSON.stringify(known, null, 2));

const subs = {
  __SUPABASE_URL__: process.env.NEXT_PUBLIC_SUPABASE_URL,
  __N8N_BASE__: base,
  __APP_URL__: process.env.NEXT_PUBLIC_APP_URL || 'https://wasla.app',
  ...known,
};

const existing = [];
let cursor;
do {
  const page = await api(`/workflows?limit=100${cursor ? `&cursor=${cursor}` : ''}`);
  existing.push(...page.data);
  cursor = page.nextCursor;
} while (cursor);

const dir = new URL('./workflows/', import.meta.url);
for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  let text = readFileSync(new URL(file, dir), 'utf8');
  for (const [k, v] of Object.entries(subs)) text = text.split(k).join(v);
  const wf = JSON.parse(text);
  const payload = { name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings };
  const found = existing.find((w) => w.name === wf.name);
  if (dry) { console.log(found ? 'would update' : 'would create', wf.name); continue; }
  let id;
  if (found) { await api(`/workflows/${found.id}`, 'PUT', payload); id = found.id; }
  else id = (await api('/workflows', 'POST', payload)).id;
  await api(`/workflows/${id}/activate`, 'POST');
  console.log(found ? 'updated' : 'created', wf.name, id, '(active)');
}

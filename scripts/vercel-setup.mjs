// Dev tool: configure the Vercel project (env vars) and trigger a production deployment through the Vercel REST API.
// Only what the Next.js app needs goes to Vercel. API keys for Apify/OpenRouter/n8n stay in n8n's credential store.
// Usage: node --env-file=.env.local scripts/vercel-setup.mjs [--url https://final-url]   (VERCEL_TOKEN required)
const token = process.env.VERCEL_TOKEN;
if (!token) throw new Error('VERCEL_TOKEN missing');
const project = process.env.VERCEL_PROJECT || 'wasla';
const argUrl = process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : null;

async function api(path, method = 'GET', body) {
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`https://api.vercel.com${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text.slice(0, 400)}`);
  return json;
}

const p = await api(`/v9/projects/${project}`);
const team = p.accountId?.startsWith('team_') ? `teamId=${p.accountId}` : '';
const q = (path) => `${path}${path.includes('?') ? '&' : '?'}${team}`;

const e = process.env;
const vars = [
  ['NEXT_PUBLIC_SUPABASE_URL', e.NEXT_PUBLIC_SUPABASE_URL, 'encrypted'],
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY', e.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'encrypted'],
  ['SUPABASE_SERVICE_ROLE_KEY', e.SUPABASE_SERVICE_ROLE_KEY, 'sensitive'],
  ['N8N_BASE_URL', e.N8N_BASE_URL, 'encrypted'],
  ['N8N_WEBHOOK_SECRET', e.N8N_WEBHOOK_SECRET, 'sensitive'],
  ['OPENROUTER_MODEL', e.OPENROUTER_MODEL, 'encrypted'],
  ['OPENROUTER_FALLBACK_MODELS', e.OPENROUTER_FALLBACK_MODELS, 'encrypted'],
];
if (argUrl) vars.push(['NEXT_PUBLIC_APP_URL', argUrl, 'encrypted']);

const existing = (await api(q(`/v9/projects/${p.id}/env`))).envs ?? [];
for (const [key, value, type] of vars) {
  if (!value) { console.log('skip (empty)', key); continue; }
  // Replace any previous value (including ones added by the Vercel-Supabase integration for another project).
  for (const old of existing.filter((x) => x.key === key)) await api(q(`/v9/projects/${p.id}/env/${old.id}`), 'DELETE');
  await api(q(`/v10/projects/${p.id}/env`), 'POST', { key, value, type, target: ['production', 'preview'] });
  console.log('set', key, `(${type})`);
}

if (process.argv.includes('--deploy')) {
  const repoId = p.link?.repoId;
  const d = await api(q('/v13/deployments?forceNew=1&skipAutoDetectionConfirmation=1'), 'POST', {
    name: project,
    project: p.id,
    target: 'production',
    gitSource: { type: 'github', repoId, ref: 'main' },
  });
  console.log('deployment', d.id, d.url, d.readyState);
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const s = await api(q(`/v13/deployments/${d.id}`));
    console.log(' ', s.readyState);
    if (['READY', 'ERROR', 'CANCELED'].includes(s.readyState)) {
      console.log('url', s.url, 'aliases', (s.alias || []).join(', '));
      process.exit(s.readyState === 'READY' ? 0 : 1);
    }
  }
}

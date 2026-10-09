import 'server-only';

/** Fire an n8n webhook (authenticated with the shared secret header). n8n answers immediately; the work is async. */
export async function triggerWorkflow(path: string, payload: Record<string, unknown>) {
  const base = process.env.N8N_BASE_URL?.replace(/\/$/, '');
  if (!base || !process.env.N8N_WEBHOOK_SECRET) throw new Error('n8n is not configured');
  const res = await fetch(`${base}/webhook/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-wasla-secret': process.env.N8N_WEBHOOK_SECRET },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`n8n ${path} responded ${res.status}`);
}

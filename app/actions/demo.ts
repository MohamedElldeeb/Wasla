'use server';

import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { logActionError } from '@/lib/action-errors.mjs';

export type DemoState = { error: true } | undefined;

const DEMO_DOMAIN = 'demo.wasla.app';
const MAX_PER_HOUR = Number(process.env.DEMO_MAX_PER_HOUR || 20); // abuse guard: every demo user gets free credits

/**
 * One-click trial account for the public pilot. Creates a confirmed throw-away user (service role, server only),
 * signs it in, and sends it to onboarding where the normal 50-credit grant happens. Disable with DEMO_ENABLED=false.
 */
export async function startDemo(): Promise<DemoState> {
  if (process.env.DEMO_ENABLED === 'false') return { error: true };
  const admin = createAdminClient();

  const since = Date.now() - 3600_000;
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listErr) { logActionError('startDemo:list', listErr.message); return { error: true }; }
  const recent = list.users.filter((u) => u.email?.endsWith(`@${DEMO_DOMAIN}`) && new Date(u.created_at).getTime() > since).length;
  if (recent >= MAX_PER_HOUR) { logActionError('startDemo:rate-limit', `${recent} demo accounts in the last hour`); return { error: true }; }

  const email = `demo-${randomUUID().slice(0, 12)}@${DEMO_DOMAIN}`;
  const password = `${randomUUID()}-${randomUUID().slice(0, 8)}`;
  const { error: createErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: 'Demo', demo: true } });
  if (createErr) { logActionError('startDemo:create', createErr.message); return { error: true }; }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { logActionError('startDemo:signin', error.message); return { error: true }; }
  redirect('/onboarding');
}

import 'server-only';
import { createClient } from '@supabase/supabase-js';

/** Service-role client. SERVER ONLY. Bypasses RLS: use for refunds on failed job starts and never expose to the browser. */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

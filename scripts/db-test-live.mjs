// Runs the RLS and business-rule suite (supabase/tests/rls_and_rules.sql) against the REAL Supabase database (DEV project).
// The suite is one DO block that creates its own test data and ends with an exception, so everything is rolled back: "ALL CHECKS PASSED (rolled back)" means success.
// Usage: node --env-file=.env.local scripts/db-test-live.mjs   (needs SUPABASE_DB_PASSWORD; connects through the session pooler)
import { readFileSync } from 'node:fs';
import pg from 'pg';

const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const region = process.env.SUPABASE_REGION || 'eu-west-1';
const url = process.env.SUPABASE_DB_URL || `postgresql://postgres.${ref}:${encodeURIComponent(process.env.SUPABASE_DB_PASSWORD || '')}@aws-0-${region}.pooler.supabase.com:5432/postgres`;
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(readFileSync(new URL('../supabase/tests/rls_and_rules.sql', import.meta.url), 'utf8'));
  console.error('suite did not finish');
  process.exitCode = 1;
} catch (e) {
  console.log(e.message);
  process.exitCode = /^ALL CHECKS PASSED/.test(e.message) ? 0 : 1;
} finally {
  await client.end();
}

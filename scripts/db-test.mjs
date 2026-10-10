// Runs every migration and the RLS/business-rule suite against an in-memory Postgres (PGlite). No network, no Supabase project touched.
// Supabase-only pieces (auth schema, roles, realtime publication) are stubbed. Usage: node scripts/db-test.mjs
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const db = new PGlite();
await db.exec(`
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
grant usage on schema public to anon, authenticated, service_role;
create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
create table auth.users (id uuid primary key, instance_id uuid, aud text, role text, email text, raw_user_meta_data jsonb default '{}'::jsonb, created_at timestamptz default now());
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub','')::uuid $$;
create function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true),'')::jsonb ->> 'role','anon') $$;
create publication supabase_realtime;
alter default privileges in schema public grant all on tables to postgres;
`);
for (const f of readdirSync(new URL('supabase/migrations/', root)).filter((x) => x.endsWith('.sql')).sort()) {
  try { await db.exec(readFileSync(new URL(`supabase/migrations/${f}`, root), 'utf8')); console.log('migrated', f); }
  catch (e) { console.error('MIGRATION FAILED', f, e.message); process.exit(1); }
}
try {
  await db.exec(readFileSync(new URL('supabase/tests/rls_and_rules.sql', root), 'utf8'));
  console.error('suite did not finish');
  process.exit(1);
} catch (e) {
  console.log(e.message);
  process.exit(/^ALL CHECKS PASSED/.test(e.message) ? 0 : 1);
}

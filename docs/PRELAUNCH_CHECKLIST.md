# Pre-launch checklist

Items that are deliberately relaxed for the pilot and MUST be reverted or completed before real users sign up.

## Email and auth (blocked on a custom domain)
- [ ] **Buy a domain** for the product (and a separate sending domain or subdomain for outreach email, Phase 3).
- [ ] **Verify the domain in Resend** (SPF, DKIM, DMARC records) and keep `RESEND_API_KEY` (already stored in `.env.local`, unused for now).
- [ ] **Switch Supabase Auth SMTP to Resend**: Dashboard → Authentication → Emails → SMTP Settings (host `smtp.resend.com`, port 465, user `resend`, password = the Resend API key, sender on the verified domain). Until then the default Supabase sender is rate-limited and only suitable for tests.
- [ ] **Re-enable email confirmation** for email signups: Dashboard → Authentication → Sign In / Providers → Email → "Confirm email" ON. (Disabled for the pilot so signups work without email delivery.) Re-run the signup flow after switching.
- [ ] Enable **leaked password protection** (Authentication → Policies; flagged by the Supabase advisor).
- [ ] Update Auth **Site URL** and **Redirect URLs** to the production domain; remove `http://localhost:3000/**` from the allow-list.
- [ ] Google OAuth: move the Google Cloud OAuth consent screen to "In production" and add the production domain as an authorized origin.

## Environments
- [ ] Create a separate **production Supabase project** (the current `Wasla` project is DEV by decision); replay `supabase/migrations/` on it, set its keys in Vercel only.
- [x] Vercel project `wasla` linked to this repo (pilot URL https://wasla-henna.vercel.app, env vars set by `scripts/vercel-setup.mjs`). Still to do: custom domain, production env vars pointing at the production Supabase project, Vercel Deployment Protection review, and move the `VERCEL_TOKEN` out of `.env.local` into a rotated, scoped token.
- [ ] Add the Vercel URL to Supabase Auth redirect URLs / Site URL and to the Google OAuth authorized origins (dashboards only).
- [ ] Point n8n workflows at the production Supabase project (credentials in n8n's store) and redeploy with `npm run n8n:deploy`.
- [ ] n8n: turn off saving of successful execution data / set pruning (executions contain lead data; Egypt PDPL).

## Pilot-only features to remove or lock before launch
- [ ] One-click **demo accounts** (`app/actions/demo.ts`, landing page button): throw-away `@demo.wasla.app` users, each gets 50 free credits (limited to `DEMO_MAX_PER_HOUR`, default 20). Set `DEMO_ENABLED=false` in Vercel (or delete the feature), and clean up old demo users and their organizations.

## Product
- [ ] Fill the OPEN decisions: plan prices (EGP), final credit costs, Apollo key model, digits style, `WASLA_SALES_WHATSAPP`.
- [ ] Confirm the default OpenRouter model after a quality comparison on Egyptian Arabic.
- [ ] Rotate every key that was shared during development (Supabase service role, n8n API key, OpenRouter, Apify, Resend).

## Lead insights release (branch `feat/lead-insights`, nothing deployed yet)
- [ ] Apply the 4 new migrations (`20261010120000_lead_insights`, `..120100_message_opportunity`, `..120200_select_opportunity`, `..120300_templates_no_min_reviews`) to DEV, then to production, after the user approves. They were verified only on local PGlite (`npm run test:db`).
- [ ] Regenerate and redeploy all n8n workflows (`npm run n8n:build && npm run n8n:deploy`): WF0, WF0b_probe, WF_interview, WF1, WF2, WF2b, WF3 changed.
- [ ] Set `OPENROUTER_PLANNER_MODEL` in Vercel and n8n env (a stronger model than the writer is recommended; see `docs/MODEL_COMPARISON.md`). The user still has to choose the writer and planner models.
- [ ] OPEN: credit cost of a probe (`probeCredits`) and of the interview (`interviewCredits`) are 0 placeholders in `lib/config/defaults.ts`.
- [ ] Review `app_config.contact_cooldown_days` (30, PROPOSED) and the fresh-leads default.
- [ ] Onboarding changed: the old form was replaced by the AI interview; check it with a real new user before launch.
- [ ] Re-run `scripts/live-checks.mjs` against the deployed site after deploy (shortcuts, mobile filter sheet, Google redirect). Full Google sign-in needs a real Google account and was not tested.
- [ ] `PREVIEW_ROUTES` must stay unset in Vercel (it enables the `/preview` sample-data route used only to take landing page screenshots).

## Round 2 (fit logic, opportunities, messages)
- [ ] Set `OPENROUTER_PLANNER_MODEL=google/gemini-2.5-flash` in Vercel and in the n8n environment (decided in round 2). Choose `OPENROUTER_MODEL` (writer) from `docs/MODEL_COMPARISON.md`.
- [ ] Redeploy WF0, WF0b, WF_interview, WF1, WF2, WF3 (new Code nodes: `Dedupe openings`, the new generation prompt and validator). WF3 now reads `raw->categories` and `raw->>description` through PostgREST JSON paths in the `Get campaign leads` node; this select was not tested against the live API (offline tests only), so check it once after deploy.
- [ ] Existing organizations have no `cta_offer` / `sender_name`; messages work without them (those two checks are skipped) but are better with them. Ask users to re-run the profile interview.
- [ ] The generation prompt contains two example messages written for a different seller (style references, as requested). They are marked "copy only the tone and shape"; watch the first live campaigns for leaked wording.
- [ ] Learned categories now come only from user actions (probe "Looks right", sent leads, stored in `campaigns.parameters.learned_categories`). No migration needed.
- [ ] Apply migration `20261010120400_message_failed_state` (adds the `failed` message status, `fail_reason`, and an empty-text guard) together with the other four lead-insights migrations; verified only on local PGlite so far. Redeploy WF3 with it (failed generations are saved as visible rows).
- [ ] `offer_profile.style_examples` is empty for every organization. `scripts/set-style-examples.mjs <email>` fills the two Wasla reference messages for ONE user's organization; it has not been applied because the owner's Google account has no organization in the DEV project yet.

## Round 3 deploy record (2026-10-10)
- [x] The 6 lead-insights migrations were applied to the Wasla Supabase project with `supabase db push --db-url` (no access token available for `supabase link`); the SQL suite passed against the live database (`scripts/db-test-live.mjs`, rolled back).
- [x] The remote migration history held the old MCP timestamps (20261009122318 ...). It was repaired so it matches the local file names (12 remote versions marked reverted, 12 local versions marked applied). Only `supabase_migrations.schema_migrations` rows changed.
- [ ] The database password is stored in `.env.local` (`SUPABASE_DB_PASSWORD`) and, through the Vercel-Supabase integration, in the Vercel variables `POSTGRES_PASSWORD`, `POSTGRES_URL*` (production). No application code and no n8n workflow uses it (n8n talks to Supabase through the REST API with the service-role key). Rotate it before launch and remove the unused Vercel POSTGRES_* variables.
- [x] n8n: all workflows redeployed; success execution data is no longer saved (per-workflow setting). [ ] Server-wide pruning (`EXECUTIONS_DATA_PRUNE`, `EXECUTIONS_DATA_MAX_AGE`) cannot be read through the API: check it on the VPS. This n8n instance is shared with other projects and keeps their error executions.

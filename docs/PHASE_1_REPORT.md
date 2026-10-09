# Phase 1 Report — Foundation, schema, RLS

Date: 2026-10-09. Environment: Supabase project `Wasla` (`szuarlmqbtlfbfylqobe`, eu-west-1), treated as **DEV** by decision; a separate production project is to be created before launch.

## 1. What was built

**Docs**: `CLAUDE.md`, `USER_FLOW_UIUX.md` (project root), this report.
**Config**: `.env.example` (all variables documented), `.env.local` (git-ignored; Supabase URL, anon key, service key present), `.gitignore`.
**Assets**: `public/brand/wasla-logo.svg`, `wasla-logo-mark.svg` (untouched).
**Directories**: `supabase/migrations`, `supabase/tests`, `n8n/workflows`, `lib/config`, `docs`.

### Migrations (applied to the dev project via MCP, mirrored in `supabase/migrations/`)
| File | Contents |
|---|---|
| `20261009120000_base_helpers.sql` | `set_updated_at()`, `cairo_today()` |
| `20261009120100_identity.sql` | `profiles`, `organizations`, `memberships`, `invitations`; helpers `is_platform_admin`, `is_org_member`, `is_org_owner`, `shares_org_with`; `handle_new_user` trigger; last-owner guard; RLS |
| `20261009120200_billing.sql` | `plans` (seeded), `subscriptions`, append-only `credit_ledger`, `org_credit_balance()`, `create_organization()` |
| `20261009120300_campaigns_jobs_leads.sql` | `campaigns`, `jobs` (Realtime enabled), `leads`, `campaign_leads`, `lead_staging`, `campaign_templates` (3 seeded); `create_job()` (reserve), `settle_job()` (settle/refund) |
| `20261009120400_messaging.sql` | `messages`, `opt_outs`, `lead_events`, `daily_send_counters`; `is_opted_out`, `can_send_whatsapp`, `mark_message_sent`, `undo_message_sent`, `campaign_stats`; review/opt-out triggers |
| `20261009120500_email_secrets_admin.sql` | `email_mailboxes`, `email_sequences`, `sequence_steps`, `email_sends`, `org_secrets`, `admin_events` |

Note: the Supabase MCP records its own migration timestamps in `supabase_migrations`, so the version numbers there differ from these filenames. Names match. When the Supabase CLI is introduced, reconcile with `supabase migration repair` or reset the dev DB from the files.

### Tests
`supabase/tests/rls_and_rules.sql`: 60+ assertions in one rolled-back transaction. **Result: all checks passed** on the dev project; no residue left (verified). Covers: tenant isolation on reads, anon blocked, service-only tables unreadable, privilege-escalation attempts (org status, self-promote to admin, ledger insert, join other org), ledger append-only, last-owner guard, job reservation/idempotency/insufficient credits/settle once, dedupe per org, WhatsApp-eligibility constraint, review-before-send enforcement (even for service role), mark/undo sent, daily cap, opt-out cascade and generation block.

### Advisors
- Security: 3 INFO (`admin_events`, `lead_staging`, `org_secrets` have RLS and no policy, by design: service-role only). 9 WARN `authenticated_security_definer_function_executable` are all intentional: RLS helper functions must be executable by `authenticated`; the RPCs (`create_organization`, `create_job`, `mark_message_sent`, `undo_message_sent`, `is_opted_out`) each check membership internally. Service-only functions (`settle_job`, `handle_new_user`, `opt_outs_after_insert`) are not executable by users.
- Performance: only "unused index" INFO (empty database). Re-check after real traffic.

## 2. Architecture state
- Users never write credits, jobs, leads, or message send state directly. Writes go through `create_organization`, `create_job` (atomic reserve, row-locked per org, idempotent on key), `mark_message_sent` / `undo_message_sent` (review + opt-out + eligibility + cap enforced in DB), and service-role-only `settle_job`.
- Human review is enforced in the database: a message can only become `sent` from `approved`, and users can only do it through the RPC.
- Opt-outs are enforced at DB level on message creation and send; adding one flags the lead and rejects its open messages.
- Admin screens will run server-side with the service role after checking `is_platform_admin`; there are deliberately no admin RLS policies.
- Schema additions beyond specs.md §8: `invitations`, `lead_staging`, `campaign_templates`, `admin_events`; `jobs.error_detail`; `messages.job_id/regen_count`; `unique (lead_id, campaign_id, channel)` on messages.

## 3. Credentials needed for Phase 2
n8n base URL + API key; a webhook shared secret (I can generate one); Apify API token; OpenRouter API key. Also a decision on the sales WhatsApp number (`WASLA_SALES_WHATSAPP`) before Phase 4 billing UI.

## 4. Risks, shortcuts, debt
- **Dev = Wasla project.** Production must be a new project; migrations are files so they can be replayed.
- TypeScript types were generated but **not saved** (large output). Phase 2 regenerates `lib/supabase/types.ts` when the app exists.
- No git repo initialised yet (you asked for commits only on request).
- Suspended orgs are blocked from starting jobs, but other write policies do not check `status = 'suspended'`. Add in Phase 4 admin work.
- `wa_daily_cap` is bounded 1–500 but not yet capped by plan max; seat limits and channel gating by plan are not enforced in DB yet (Phase 4).
- Free-credit abuse guard: initial 50 credits only for a user's first org; max 3 owned orgs (PROPOSED, hardcoded in `create_organization`; move to config if kept).
- Undo window is 15s server-side (UI shows 10s) — PROPOSED.
- No admin RPCs yet (activate plan, adjust credits): Phase 4, written against the ledger and `admin_events`.
- Vault is not yet used: `org_secrets` and `email_mailboxes.credentials_ref` store Vault ids only; enabling/using Vault is Phase 3.
- Google sign-in needs a Google OAuth client; Phase 2 starts with email + password.
- Monthly credit grants/expiry (WF5) not built; Phase 4.

## 5. Open questions / decisions for you
1. Service role key: `.env.local` holds a 41-character value, which looks like the new `sb_secret_...` format. Fine if so. It must never be pasted in chat.
2. Confirm PROPOSED defaults: 30/day cap, 15s undo, 3-org limit, free plan 50 credits.
3. Pre-existing project `Taqyeem` is in the same Supabase org; untouched.
4. OPEN items still blocking later phases: plan prices, final credit costs, default OpenRouter model, Apollo key model and cost, digits style, sales WhatsApp number.

**Waiting for your approval before starting Phase 2.**

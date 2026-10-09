# CLAUDE.md — Wasla (وصلة)

Arabic-first B2B lead generation and outreach SaaS for Egypt/MENA. Source of truth: `specs.md` (v2.1). If this file or the user's prompt conflicts with `specs.md`, **stop and ask**. Do not invent features absent from both.

- **PROPOSED** values in specs.md: build with them, but keep them in config or seed data (`plans` seed, `lib/config/defaults.ts`), never hardcoded in logic.
- **OPEN** values: never guess. Use a clearly named placeholder (e.g. `price_egp = NULL`, `OPEN_APOLLO_CREDIT_COST`), and list each one in the phase report.
- Lovable is not used anywhere.

## 0. Product principle: Wasla is horizontal

Any B2B company that sells to other businesses can use Wasla (tax/accounting firm, packaging supplier, SaaS, agency, solar...). Marketing agencies and freelancers are **only the go-to-market order** (who we sell to first), never a product limitation.

- **Never hardcode a segment, industry, offer, keyword list, or signal weight** in code, prompts, SQL, or UI. Targeting, signals, scoring, and messaging are driven by the organization's **offer profile** (`what_we_sell`, `ideal_customer`, `problems_we_solve`, `proof_points`, `regions`) and the **campaign's** parameters.
- The AI campaign planner (WF0) turns an offer profile into an editable draft (categories, keywords, locations, signals with weights and reasons, 2–3 angles). It never starts a job by itself.
- Segment names and examples exist only as **seed data / templates / copy examples** (`campaign_templates`, onboarding chips). Templates are examples; the planner covers any other offer.
- **Signals** are facts about a lead (specs §6.3a) stored in `lead_signals`; their meaning is decided by campaign weights (signed: a positive weight rewards the signal's high state, a negative weight rewards its low state). Never assume "no website = good" globally.
- **Opportunity score** (0–100) and `score_reasons` live on `campaign_leads` (per campaign, because weights are per campaign) and are computed by `recompute_campaign_scores()` in the database. Message prompts may only cite signals that were actually collected.
- Signal definitions, credit costs, and reason templates live in the `signal_definitions` table (config as data), not in code.
- Prompts for the planner and the message writer must be offer-agnostic: no example inside a prompt may leak a segment into another org's output.

## 1. Hard rules (non-negotiable)

1. No automated sending on WhatsApp/Messenger. No WhatsApp Web bridges, unofficial libraries, or WhatsApp MCP servers. The user's own tap sends.
2. Human review before any message is sent, on every channel.
3. Opt-outs are permanent; check before generation AND before sending.
4. No secrets in git. The `service_role` key never reaches the browser.
5. Every table has RLS by `organization_id`, enabled and tested before the migration ships.
6. Every job is idempotent and capped by reserved credits.
7. Never run migrations or destructive SQL against production through MCP.
8. Do not start the next phase without the user's explicit approval.

## 2. Locked stack (no alternatives unless asked)

| Layer | Choice |
|---|---|
| Frontend | Next.js App Router + TypeScript + Tailwind + shadcn/ui on Vercel, `dir="rtl"`, logical CSS properties |
| DB/Auth/Realtime | Supabase (Postgres, RLS, Auth, Realtime on `jobs`) |
| Orchestration | Self-hosted n8n on a VPS (never on Vercel) |
| Ingestion | Apify: `compass/crawler-google-places`; `lukaskrivka/google-maps-with-contact-details` only when `enrich_emails`; signals: `compass/google-maps-reviews-scraper` (Phase 2); `vdrmota/contact-info-scraper`, `apify/instagram-profile-scraper`, `apify/facebook-pages-scraper`, `apify/facebook-ads-scraper` (Phase 3) |
| LLM | OpenRouter (`https://openrouter.ai/api/v1`), model from `OPENROUTER_MODEL` |
| Channels | WhatsApp/Messenger human-in-the-loop deep links; email via own sequence engine (Gmail OAuth/SMTP, separate domain) |
| Billing | Credits; Free/Starter/Growth; manual activation by platform admin |

## 3. Architecture rules

- **Next.js**: UI, auth session, trigger jobs, read state. Server Actions/API routes only validate input, write a `jobs` row, call the signed n8n webhook, return immediately. Nothing long-running.
- **n8n**: scraping, enrichment, LLM generation, email sending, scheduling.
- **Supabase**: single source of state. Frontend and n8n talk only via tables and signed webhooks.
- Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are client-exposed.
- Ingestion is **pluggable source connectors**: one adapter per source maps into the same normalized lead shape (`lib/sources/<source>.ts` and a matching n8n sub-workflow). Adding Apollo = a new adapter, no refactor. Leads support place-level and person-level fields.
- Instagram/Facebook/LinkedIn connectors sit behind feature flags; LinkedIn is last and isolated (cookie-based account risk).

## 4. Directory layout

```
/app                  Next.js routes (RTL). (auth)/ (app)/ admin/ api/
/components           ui/ (shadcn), layout/, features/<module>/
/lib
  /supabase           client.ts, server.ts, admin.ts (server only)
  /n8n                signed webhook client (HMAC)
  /sources            connector adapters + normalized lead types
  /phone              Egypt normalization + mobile/landline classification
  /config             defaults.ts (PROPOSED values), feature-flags.ts
  /i18n               ar.ts (all UI strings; typed object, English locale later)
  /whatsapp           wa.me link builder
/supabase
  /migrations         versioned SQL only
  /tests              pgTAP/SQL RLS tests
  seed.sql            plans, campaign templates, demo data
/n8n                  build.mjs (generates workflows), code/ (Code-node sources), deploy.mjs (REST deploy), workflows/ (exported JSON, placeholders only)
/scripts              dev tools: apify-schema, apify-sample (capped), e2e-pipeline (full backend run)
/docs                 PHASE_X_REPORT.md, samples/ (actor outputs), decisions
/public/brand         wasla-logo.svg, wasla-logo-mark.svg (untouched), derived icons
/tests                Playwright (Phase 5) and unit tests
```

## 5. Conventions

- **Naming**: DB tables/columns `snake_case`, plural tables; TS files `kebab-case.ts`, components `PascalCase`, hooks `useThing`; migrations `YYYYMMDDHHMMSS_short_description.sql`; n8n workflows `WF<n>_<name>.json`; env vars `SCREAMING_SNAKE`.
- **Money/credits**: integers. Credit balance is derived (`org_credit_balance(org_id)`), never a stored number. `credit_ledger` is append-only (no UPDATE/DELETE policies or triggers allow it).
- **Time**: store `timestamptz` UTC; daily caps and sending windows use `Africa/Cairo`.
- **Phones**: store `+201XXXXXXXXX` (E.164); wa.me uses `201XXXXXXXXX`. WhatsApp-eligible only for mobile prefixes 010/011/012/015; landlines get a `tel:` "اتصال" action, never WhatsApp.
- **UI copy**: Arabic only, in `lib/i18n/ar.json`; no hardcoded strings in components. Voice: respectful Egyptian colloquial, short sentences, no corporate jargon, no exaggerated claims. Western digits by default (OPEN: digits style).
- **Styling**: logical properties only (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`), never `left/right` or `ml/mr`. Tokens as CSS variables with dark variants. Orange `#F27A1A` never as small text on white (2.7:1); use it as CTA background with petrol text, or large elements/icons. Do not use WhatsApp green as a brand color. Do not redraw the logo.
- **Fonts**: Readex Pro via `next/font/google` (600–700 headings, 400 body); fallback IBM Plex Sans Arabic.
- **Four states** on every data screen: loading (skeleton), empty (clear next action), error (retry), active pipeline (Realtime progress).
- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `db:`, `n8n:`), small and scoped, one concern each. Never commit `.env*` (except `.env.example`), exported n8n credentials, or Apify/LLM samples containing personal data beyond what is needed. Only commit when the user asks.
- **Branches**: `main` protected; work on `feat/<slug>`.

## 6. Environment

`.env.local` is git-ignored; `.env.example` documents every variable (purpose, where it is used, phase introduced). Update `.env.example` in the same change that introduces a variable.

Planned variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only), `N8N_BASE_URL`, `N8N_API_KEY`, `N8N_WEBHOOK_SECRET`, `APIFY_API_TOKEN`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_FALLBACK_MODELS`, `APOLLO_API_KEY` (optional platform key), `ORG_SECRETS_KEY` if not using Vault, `NEXT_PUBLIC_APP_URL`, `WASLA_SALES_WHATSAPP` (OPEN), feature flags (`FF_INSTAGRAM`, `FF_FACEBOOK`, `FF_LINKEDIN`, `FF_APOLLO`).
Ask the user only for credentials the current phase needs (see §9).

## 7. Migrations and RLS

- All schema changes are versioned files in `/supabase/migrations`. No dashboard edits.
- Every migration that creates a table also: enables RLS, adds policies (members read; writes by role: owner/member; admin-only tables via server-side `is_platform_admin`), adds indexes on `organization_id` and FK columns, and adds a test in `/supabase/tests`.
- Helper functions (`is_org_member(org)`, `is_org_owner(org)`) are `SECURITY DEFINER` with fixed `search_path`.
- Required constraints: `unique (organization_id, dedupe_key)` on leads; `unique idempotency_key` on jobs; ledger idempotency (`unique (job_id, kind)` for reserve/settle/refund); opt-out check function used by generation/send paths.
- `jobs` is in the Realtime publication; RLS applies to Realtime.
- Per-org secrets (Apollo etc.): Supabase Vault; the table stores references only, never plaintext.
- Run Supabase advisors (security + performance) after each migration batch and fix findings.

## 8. Integrations

**Current environment**: the Supabase project `Wasla` (`szuarlmqbtlfbfylqobe`) is treated as DEV for now. A separate production project must be created before launch; never point production traffic at this one.

**Supabase MCP**: use only on a development branch or a dev project (`create_branch`; confirm cost via `get_cost`/`confirm_cost` before creating) or read-only. Flow: write the migration file locally → apply to the dev branch with `apply_migration` → `get_advisors` → `generate_typescript_types` into `lib/supabase/types.ts` → test RLS. Never target the production project ref for writes. Merge to production only on the user's explicit instruction.

**n8n (REST API, no MCP)**: use `N8N_BASE_URL` + `X-N8N-API-KEY`. Workflows are generated by `npm run n8n:build` from `n8n/code/*.js` into `/n8n/workflows` (never hand-edit the JSON) and pushed with `npm run n8n:deploy` (creates credentials once, substitutes placeholders, upserts by name, activates). Credentials are referenced by placeholder; their ids live in the git-ignored `n8n/.credentials.local.json`. Webhook auth = the Webhook node's Header Auth credential (`x-wasla-secret`). Rules for every workflow:
1. First node verifies the shared-secret header or HMAC signature; reject otherwise.
2. Receives `job_id` + idempotency key; re-run never duplicates leads, messages, or charges.
3. Updates `jobs` at each stage (queued → running → succeeded/failed, progress, counts, error in plain Arabic for users plus technical detail in logs).
4. Credentials live in n8n's credential store, never in exported JSON.
5. Batch and wait to respect Apify/OpenRouter/Gmail rate limits.
6. Cost guard: reserve credits before start; settle (charge actual, refund remainder) at end; failed jobs refund.

**Apify**: product calls the Apify API from n8n, never MCP. During development use the Apify MCP (or, if it is not available in the session, the Apify REST API directly) for schema inspection and small test runs only, with a hard cap (`maxCrawledPlacesPerSearch` 10–20). Save samples to `/docs/samples/` and derive normalization from real output. Always pass `maxCrawledPlacesPerSearch` and a total cap. Split campaigns into keyword × district queries ("مطاعم مدينة نصر"), merge and dedupe by `place_id`.

**OpenRouter**: OpenAI-compatible HTTP from n8n. Headers `HTTP-Referer` and `X-Title: Wasla`. Model from `OPENROUTER_MODEL`, per-campaign override `llm_model_override`, fallback list on provider failure. Output must be JSON `{ "message", "angle" }`; validate and retry once. Log model, tokens in/out, and cost into `jobs`. Message rules per specs §6.4 (40–90 words WhatsApp/Messenger, no links in first message, one soft question, ≥1 real lead detail, no invented facts, max 1 emoji, varied structure per lead).

**Gmail/SMTP (Phase 3)**: Gmail OAuth or SMTP on a separate sending domain; show SPF/DKIM/DMARC status in settings; sending windows (Sun–Thu 09:00–17:00 Cairo, PROPOSED), per-mailbox daily cap, random delays, stop on reply/bounce/opt-out, unsubscribe line in every email.

**Apollo (Phase 3)**: new adapter. Key model supports both: optional encrypted per-org key (Vault) overriding platform `APOLLO_API_KEY`. Flag Apollo API terms affecting this choice in the Phase 3 report.

## 9. Phases and gates

| Phase | Scope | Credentials needed |
|---|---|---|
| 1 | Docs, schema + RLS migrations, `.env.example`, Supabase dev-branch MCP setup | Supabase URL, anon key, service_role key, access token |
| 2 | Vertical slice: offer profile + AI planner (WF0) → campaign → Google Maps (Apify) → normalize/dedupe (WF1/WF2) → Phase 2 signals + opportunity score (WF2b) → OpenRouter message (WF3) → review queue → WhatsApp link; minimal UI | n8n URL + API key, webhook secret, Apify token, OpenRouter key |
| 3 | Phase 3 signals (website contacts, Instagram, Facebook page, ads); Instagram, Facebook, Apollo, LinkedIn sources; Messenger; email sequences; WF4 | Google OAuth or SMTP, sending domain (SPF/DKIM/DMARC), Apollo key |
| 4 | Full UI, credits enforcement, plans, admin, analytics, WF5 | Vercel + GitHub, optional auth-email provider |
| 5 | E2E (Playwright: flows, four states, RTL), RLS tests, deliverability guards, monitoring | — |

At the end of each phase, stop and write `docs/PHASE_<X>_REPORT.md`: what was built (files, migrations, workflows), architecture/schema changes, credentials needed next, risks/shortcuts/debt, open questions. Then wait for approval.

## 10. Pilot relaxations
Email confirmation is OFF and Auth uses the default Supabase mailer during the pilot; Google sign-in is enabled. Everything that must be reverted before launch is listed in `docs/PRELAUNCH_CHECKLIST.md`. Keep that file current whenever a shortcut is taken.

## 11. Privacy (Egypt PDPL)

Store only fields campaigns need. Opt-outs permanent. Support delete-lead-on-request and per-org data export. Never log message bodies or phone numbers in error monitoring.

# Wasla (وصلة) Product Specification

Version: 2.1 (supersedes v2.0 and v1.1). Changes in 2.1: product is explicitly horizontal (any B2B offer), offer profile and AI campaign planner (6.0), signals library and opportunity score (6.3a), new tables and workflows for them.
Date: 2026-10-09
Owner: Mohamed

This spec consolidates v1.1 with every decision made since: Next.js on Vercel instead of Lovable, OpenRouter for LLM calls, named Apify actors, WhatsApp deep links, a pluggable source layer with Apollo planned, and the Wasla brand. Where a value is marked **PROPOSED**, it is a sensible default that Mohamed must confirm before Phase 4. Anything marked **OPEN** is an undecided product question and must not be guessed.

---

## 1. Product overview

Wasla is an Arabic-first B2B lead generation and outreach SaaS for Egypt, then the wider MENA region. A user defines who they want to reach, Wasla collects matching businesses (Google Maps first), cleans and deduplicates them, writes a personalized message in Egyptian colloquial Arabic for each one, and the user reviews and sends each message from their own WhatsApp, Messenger, or email.

Core promise: "وصلة بينك وبين عميلك الجاي". Real leads, a ready personal message, one tap to send.

### Goals for the MVP (Phase 2 pilot)
1. Prove that one campaign can go from search parameters to sent WhatsApp messages in under 15 minutes of user time.
2. Use Wasla to sell Wasla to Egyptian marketing agencies and freelancers (dogfooding).
3. Validate that generated messages get replies, before investing in more sources and channels.

### Non-goals for the MVP
- Fully automated sending on WhatsApp or Messenger (never, see section 7).
- Payments gateway (manual activation only).
- Mobile app (responsive web only).
- English UI (Arabic only in MVP; architecture supports English later).

---

## 2. Target users

| Segment | Priority | What they sell | Who they target |
|---|---|---|---|
| Digital marketing agencies and freelancers | Beachhead | Social media, ads, websites, branding | Restaurants, clinics, gyms, salons, shops |
| Suppliers to restaurants and cafes | Next | Packaging, equipment, raw materials, POS | Restaurants, cafes, bakeries |
| Suppliers to clinics | Next | Medical supplies, booking systems, medical marketing | Clinics, labs, pharmacies |
| Local SaaS companies | Next | Accounting, CRM, management systems | SMEs and offices |
| Solar and commercial fit-out | Later | Solar systems, office and shop fit-out | Factories, shops, offices |

B2C targeting is out of scope.

**Wasla is horizontal.** Any B2B company that sells to other businesses can use it: a tax and accounting firm targeting SMEs, a packaging supplier targeting cafes, a SaaS targeting clinics. The segments above are only the go-to-market order (who we sell to first), not a product limitation. Nothing in the product may hardcode a segment: targeting, signals, scoring, and messaging are all driven by each organization's offer profile (section 6.0).

Example (tax and accounting firm):
- Offer: tax filing, e-invoice and e-receipt compliance, bookkeeping for SMEs.
- Targets: restaurants, clinics, pharmacies, retail shops, small factories, newly opened businesses.
- Useful signals: business looks new (first reviews recent, few reviews), category with heavy compliance needs, multiple branches (more complex books), no website (likely no in-house finance team).
- Angle: "متابعة الضرايب والفاتورة الإلكترونية من غير صداع ولا غرامات".

---

## 3. Roles and permissions

| Role | Scope | Can do |
|---|---|---|
| Owner | One organization | Everything in the org, manage members, view credits and plan |
| Member | One organization | Create and run campaigns, review and send messages; cannot manage members or plan |
| Platform admin | All organizations | Activate plans, adjust credits, view usage, suspend orgs |

- A user can belong to more than one organization; the active org is selected in the header.
- Platform admin is a flag on the profile, checked server-side only. Admin screens live under `/admin` and are never exposed to non-admins.

---

## 4. Plans and credits

### 4.1 Plans

| Plan | Price | Monthly credits | Seats | Channels |
|---|---|---|---|---|
| Free | 0 | **PROPOSED** 50 | 1 | WhatsApp deep link |
| Starter | **OPEN** (EGP) | **PROPOSED** 1,000 | **PROPOSED** 2 | WhatsApp, Messenger |
| Growth | **OPEN** (EGP) | **PROPOSED** 4,000 | **PROPOSED** 5 | WhatsApp, Messenger, email sequences |

- Credits reset monthly on the subscription anniversary. Unused credits do not roll over (**PROPOSED**).
- Top-up packs can be added later; not in MVP.

### 4.2 Credit costs per action (PROPOSED)

| Action | Credits |
|---|---|
| 1 lead collected and normalized (Google Maps) | 1 |
| Email enrichment for 1 lead (contact-details actor) | 1 extra |
| 1 generated message (any channel) | 1 |
| 1 regeneration of a message | 1 |
| 1 email sent through a sequence step | 0 (limited by plan send caps) |
| Apollo person lookup (when added) | **OPEN** |

Credits are an internal unit. Real costs (Apify per place, OpenRouter tokens) are logged per job so credit prices can be tuned with data.

### 4.3 Credit mechanics
- `credit_ledger` is append-only. Each row: org, amount (+/-), reason, job_id, created_by, created_at.
- Balance = sum of ledger rows, computed by a SQL view or function. There is no editable balance column.
- Before a job runs, credits are **reserved** (a negative "reserve" row). When the job ends, the reserve is **settled**: actual usage is charged and the remainder refunded.
- A job cannot start if the reservation would make the balance negative.

### 4.4 Manual activation (MVP)
1. User picks a plan on the Plans screen and taps "اشترك".
2. Wasla shows payment instructions and a WhatsApp deep link to the Wasla sales number with a prefilled message containing the org ID and plan.
3. User pays (InstaPay, Vodafone Cash, bank transfer) and sends proof on WhatsApp.
4. Platform admin opens `/admin/organizations/<id>`, activates the plan, and the system grants that period's credits via the ledger.
5. The subscription row stores start date, end date, plan, activated_by.

---

## 5. Core user flow

1. **Sign up / log in** (email + password, or Google). Email verification required.
2. **Onboarding** (3 steps): org name, what you sell (free text), who you target (pick a segment or write your own). This becomes the org's default "offer profile" used in message generation.
3. **Create campaign**: name, source, keywords, locations, filters, channel, tone.
4. **Run**: Wasla reserves credits, starts the ingestion job, shows live progress.
5. **Leads table**: collected, deduplicated leads with key fields and badges (has mobile, has website, rating).
6. **Generate messages**: for selected leads (or all), one message per lead per channel.
7. **Review queue**: user reads, edits, approves, or rejects each message.
8. **Send**: WhatsApp deep link, Messenger copy-and-open, or email sequence (Growth).
9. **Track**: user updates lead status (replied, interested, meeting, won, lost). Email replies are detected automatically when email is enabled.
10. **Analytics**: per campaign and overall.
11. **Credits and plan**: balance, usage history, upgrade.

---

## 6. Feature specification by module

### 6.0 Offer profile and AI campaign planner
Every org has an offer profile, filled in onboarding and editable in settings:
- `what_we_sell`: free text (Arabic)
- `ideal_customer`: free text (who buys, size, industries)
- `problems_we_solve`: free text
- `proof_points`: optional (clients, results, years in business)
- `regions`: governorates and cities they serve

AI campaign planner (one LLM call via OpenRouter, costs **PROPOSED** 2 credits):
- Input: offer profile (or a campaign-specific override).
- Output (JSON), shown to the user as an editable draft before the campaign is created:
  - suggested target categories and search keywords in Arabic and English
  - suggested locations (from the org regions)
  - suggested signals from the signal library (6.3a) with a weight and a one-line reason for each
  - 2 to 3 message angles
- The user can accept, edit, or ignore every suggestion. The planner never starts a job by itself.

This is what makes Wasla work for any B2B offer without hardcoding segments.

### 6.1 Campaigns
Fields:
- `name`
- `source`: `google_maps` in MVP; later `instagram`, `facebook`, `linkedin`, `apollo`
- `parameters` (JSONB):
  - `keywords`: array of Arabic or English search terms (e.g. "مطعم", "عيادة أسنان")
  - `locations`: array of `{ governorate, city, district }`; the engine expands keywords x districts into individual queries
  - `max_results`: total cap for the campaign (hard limit, also bounded by credits)
  - `filters`: `min_rating`, `min_reviews`, `must_have_phone`, `must_have_mobile`, `must_have_website`, `exclude_closed`, `categories_include`, `categories_exclude`
  - `enrich_emails`: boolean
  - `channel`: `whatsapp` | `messenger` | `email`
  - `tone`: `friendly` | `professional` | `direct`
  - `offer_override`: optional text that replaces the org offer profile for this campaign
  - `llm_model_override`: optional OpenRouter model ID
- `status`: `draft`, `running`, `ready`, `archived`

  - `signals`: array of `{ key, weight }` chosen from the signal library (6.3a)

Campaign templates (seeded): "وكالة تسويق تستهدف مطاعم", "وكالة تسويق تستهدف عيادات", "مورد تغليف يستهدف كافيهات", "مكتب ضرايب ومحاسبة يستهدف الشركات الصغيرة". Templates prefill keywords, filters, signals, and offer text. Templates are examples only; the planner covers any other offer.

### 6.2 Lead ingestion (Google Maps)
- Actor: `compass/crawler-google-places`. Optional second pass: `lukaskrivka/google-maps-with-contact-details` when `enrich_emails` is true.
- Query expansion: each keyword x district is one search string (e.g. "مطاعم مدينة نصر"), because Google Maps caps results per search.
- Per-run caps (`maxCrawledPlacesPerSearch`, total max) always come from the reserved credits.
- Results land in a staging step, then normalization.

### 6.3 Normalization and dedupe
Normalized lead fields:
- `business_name`, `category`, `address`, `governorate`, `city`, `district`, `lat`, `lng`
- `phone_raw`, `phone_e164`, `phone_type` (`mobile` | `landline` | `unknown`)
- `whatsapp_eligible` (true only for Egyptian mobile prefixes 010, 011, 012, 015)
- `website`, `email`, `facebook_url`, `instagram_url`, `linkedin_url`
- `rating`, `reviews_count`, `opening_hours`, `google_place_id`, `google_maps_url`
- Person-level fields (for Apollo later): `contact_name`, `job_title`, `seniority`, `company_domain`
- `source`, `raw` (full source JSON), `dedupe_key`

Rules:
- Egyptian phone normalization: `01XXXXXXXXX` → `+201XXXXXXXXX` stored; wa.me uses `201XXXXXXXXX`.
- `dedupe_key` priority: `google_place_id`, then `phone_e164`, then normalized `email`, then `business_name + district`.
- Dedupe is per organization: the same business can exist in two orgs, never twice in one org.
- A lead already in the org from an older campaign is linked to the new campaign, not duplicated, and not charged again.
- Leads on the org's opt-out list are dropped at this step.

### 6.3a Signals and opportunity score
Signals are facts about a lead that show need, budget, or a personalization hook. They are collected only when the campaign enables them, after normalization, on deduplicated leads only.

Signal library:

| Signal key | What it tells | Source | Phase |
|---|---|---|---|
| `review_insights` | Recurring praise and complaints from recent reviews (LLM summary of the last 10 reviews) | `compass/google-maps-reviews-scraper` + LLM | 2 |
| `business_age` | Looks new or established (date of oldest visible review) | Reviews scraper | 2 |
| `size_proxy` | Reviews count, rating, number of branches with the same name in the area | Google Maps data | 2 |
| `has_website` | Website exists or not | Google Maps data | 2 |
| `website_contacts` | Emails and social links found on the website | `vdrmota/contact-info-scraper` | 3 |
| `instagram_activity` | Followers, posts count, date of last post | `apify/instagram-profile-scraper` | 3 |
| `facebook_page` | Page exists, followers, contact fields | `apify/facebook-pages-scraper` | 3 |
| `running_ads` | Active ads in the Meta Ad Library and how many | `apify/facebook-ads-scraper` | 3 |
| `decision_maker` | Name and title of an owner or manager | Apollo API (when added) | 3+ |

Rules:
- Each signal is stored in `lead_signals` with its raw value, a normalized value, source, and collected_at. Signals older than **PROPOSED** 30 days are refreshed only on request.
- The same signal can mean opposite things for different offers (no website is a strong positive for a web agency, neutral for a packaging supplier). That is why weights come from the campaign, never from global rules.
- **Opportunity score** (0 to 100) = weighted sum of normalized signals using the campaign weights, plus `score_reasons`: the top 2 to 3 reasons in short Arabic (e.g. "مالوش موقع", "آخر بوست من 4 شهور", "الريفيوهات بتشتكي من التأخير").
- Leads table and review queue sort by score by default and show the reasons as badges.
- Message generation receives the score reasons and review insights and must build the opening on the strongest real signal. It must never mention a signal that was not collected.
- Credit cost per signal per lead (**PROPOSED**): reviews 1, website contacts 1, Instagram 1, Facebook page 1, ads 1. Signals derived from data already collected (has_website, size_proxy) are free.

### 6.4 Message generation
- Provider: OpenRouter, model from env `OPENROUTER_MODEL` (default `openai/gpt-4o-mini`), overridable per campaign, with a fallback model list.
- Inputs: org offer profile (or campaign override), lead fields (name, category, district, rating, reviews count, website presence, social presence), channel, tone.
- Output: JSON `{ "message": "...", "angle": "..." }`, where `angle` is a short note on the personalization hook used.
- Message rules:
  - Egyptian colloquial Arabic, respectful, sounds like a person, not an ad.
  - WhatsApp and Messenger: 40 to 90 words, no links in the first message, one clear soft question at the end.
  - Email: subject line + body of 60 to 120 words, plain text.
  - Must reference at least one real detail about the lead (category, area, rating, missing website, etc.). No invented facts.
  - No exaggerated claims, no "عرض لفترة محدودة" style pressure, no emojis overload (max 1).
  - Varied structure across leads in the same campaign (different openings and hooks), not one template with the name swapped.
- Regenerate button per message (costs 1 credit), with optional instruction ("أقصر", "أرسمي", "ركز على السوشيال").
- Generation is batched in n8n; progress shows live.

### 6.5 Review queue
- Default view: pending messages for the current campaign, one card per lead.
- Card shows: business name, category, district, phone type badge, rating, the generated message (editable inline), angle note.
- Actions: Approve, Edit then Approve, Regenerate, Reject.
- Bulk approve is allowed only after the user has reviewed (scrolled past) each card, to keep human review real.
- Approved messages move to the Send view.

### 6.6 Sending
**WhatsApp (all plans)**
- Button "ابعت على واتساب" opens `https://wa.me/201XXXXXXXXX?text=<url-encoded message>`.
- "نسخ الرسالة" button beside it as fallback.
- Landline leads show "اتصال" (tel: link) instead of WhatsApp.
- Clicking the WhatsApp action marks the message `sent` with an undo (10 seconds), plus a manual "اتبعتت" toggle.
- Daily send cap per org (**PROPOSED** default 30/day, editable by owner up to a plan max). A counter is always visible; a warning shows at 80%; the action is disabled at 100% until the next day (Cairo time).
- Onboarding recommends WhatsApp Business.

**Messenger (Starter and Growth)**
- Copy message, then open `https://m.me/<page>`. Mark as sent on click with undo.

**Email sequences (Growth, Phase 3)**
- Sequence = ordered steps with delay in days. Step 1 is the generated message; follow-ups are generated per lead too.
- Sending via Gmail OAuth or SMTP on a separate domain the user connects. SPF, DKIM, DMARC checks shown in settings.
- Sending windows (Sun to Thu, 9:00 to 17:00 Cairo, **PROPOSED**), per-mailbox daily cap, random delays between sends.
- Stop on reply, bounce, or opt-out. Unsubscribe line in every email.

### 6.7 Lead status and inbox
- Lead pipeline status: `new`, `contacted`, `replied`, `interested`, `meeting`, `won`, `lost`, `opted_out`.
- WhatsApp and Messenger replies cannot be read by Wasla (no API), so the user updates status manually; quick-action buttons on each lead.
- Email replies are detected by n8n polling the connected mailbox and attached to the lead thread.
- "Opted out" adds the phone or email to the org opt-out list permanently.

### 6.8 Analytics
Per campaign and org-wide, with date range:
- Leads collected, after dedupe, WhatsApp-eligible %
- Messages generated, approved, rejected, sent
- Replied, interested, meetings, won (counts and rates from status)
- Credits used and estimated real cost (Apify + LLM)
Simple cards + one trend chart; no heavy BI in MVP.

### 6.9 Settings
- Org profile: name, logo, offer profile (what you sell, who you target, proof points)
- Members and invites (owner)
- Sending: daily WhatsApp cap, Messenger page URL, email mailboxes (Phase 3)
- Integrations: optional per-org API keys (e.g. Apollo), stored encrypted
- Opt-out list: view, add, remove (remove requires confirmation)

### 6.10 Admin
- Organizations list with plan, balance, usage, last activity
- Org detail: activate or change plan, grant or deduct credits with a reason, suspend
- Global usage and cost view (Apify + OpenRouter cost per day)

---

## 7. Hard rules (non-negotiable)

1. No automated sending on WhatsApp or Messenger. No WhatsApp Web bridges, no unofficial libraries, no WhatsApp MCP servers. Every WhatsApp/Messenger message is sent by the user's own tap.
2. Human review before any message is sent, on every channel.
3. Opt-outs are permanent and checked before generation and before sending.
4. No hardcoded secrets. Service role key never reaches the browser.
5. Every table has RLS by organization.
6. Every job is idempotent and capped by reserved credits.

---

## 8. Data model

All business tables include `id uuid pk`, `organization_id uuid` (except global tables), `created_at`, `updated_at`. RLS: members of the org can read; writes per role as in section 3.

| Table | Key columns |
|---|---|
| `organizations` | name, logo_url, offer_profile jsonb, wa_daily_cap, status (active, suspended) |
| `profiles` | user_id (auth.users), full_name, is_platform_admin |
| `memberships` | organization_id, user_id, role (owner, member) |
| `plans` | code (free, starter, growth), name_ar, monthly_credits, seats, channels jsonb, price_egp |
| `subscriptions` | organization_id, plan_code, starts_at, ends_at, activated_by, status |
| `credit_ledger` | organization_id, amount int, kind (grant, reserve, settle, refund, adjust), job_id, reason, created_by |
| `campaigns` | name, source, parameters jsonb, status, created_by |
| `jobs` | campaign_id, type (ingest, enrich, generate, email_send), status (queued, running, succeeded, failed, cancelled), progress int, counts jsonb, error text, idempotency_key unique, credits_reserved, credits_used, cost_usd numeric, llm_model, tokens_in, tokens_out |
| `leads` | normalized fields from 6.3, status, dedupe_key, raw jsonb; unique (organization_id, dedupe_key) |
| `campaign_leads` | campaign_id, lead_id, opportunity_score int, score_reasons jsonb (score is per campaign because weights are per campaign) |
| `lead_signals` | lead_id, signal_key, raw jsonb, normalized jsonb, source, job_id, collected_at; unique (lead_id, signal_key) |
| `messages` | lead_id, campaign_id, channel, subject, generated_text, edited_text, angle, review_status (pending, approved, rejected, sent), sent_at, sent_by, llm_model |
| `email_mailboxes` | provider (gmail, smtp), from_address, daily_cap, credentials_ref (encrypted), status |
| `email_sequences` | campaign_id, name, status |
| `sequence_steps` | sequence_id, step_number, delay_days |
| `email_sends` | message_id, mailbox_id, scheduled_at, sent_at, status (scheduled, sent, bounced, replied, stopped), provider_message_id |
| `lead_events` | lead_id, type (status_change, note, reply_received), payload jsonb, created_by |
| `opt_outs` | organization_id, phone_e164, email, reason, created_by |
| `org_secrets` | organization_id, provider, encrypted_value (Supabase Vault) |
| `daily_send_counters` | organization_id, channel, date (Cairo), count |

Views / functions:
- `org_credit_balance(org_id)`
- `campaign_stats(campaign_id)`
- `can_send_whatsapp(org_id)` checks daily cap

---

## 9. n8n workflows

All workflows: authenticated webhook (shared secret header verified in the first node), receive `job_id`, update `jobs` row at each stage, idempotent, exported to `/n8n/workflows`.

| # | Workflow | Trigger | Does |
|---|---|---|---|
| WF1 | Campaign ingestion | Webhook from Next.js when a campaign runs | Expand queries, run Apify actor(s) with caps, store staged results, call WF2 |
| WF2 | Normalize and dedupe | Called by WF1 | Normalize fields and phones, classify mobile/landline, dedupe per org, drop opt-outs, link to campaign, settle ingestion credits |
| WF2b | Signal enrichment and scoring | Called by WF2 when the campaign has signals enabled | Run only the enabled signal actors on deduplicated leads (capped by reserved credits), summarize reviews with the LLM, save `lead_signals`, compute score and reasons per campaign, settle enrichment credits |
| WF0 | Campaign planner | Webhook from the campaign creation screen | One LLM call with the offer profile, returns the editable draft (6.0), charges planner credits |
| WF3 | Message generation | Webhook when user taps "Generate" or "Regenerate" | Build prompt per lead, call OpenRouter (with fallback), validate JSON, save messages, log tokens and cost, settle credits |
| WF4 | Email sequence engine (Phase 3) | Schedule every 5 minutes | Pick due `email_sends`, respect windows and caps, send via Gmail/SMTP, update status; poll replies and bounces, stop sequences |
| WF5 | Housekeeping | Daily schedule (Cairo midnight) | Monthly credit grants on anniversaries, expire subscriptions, reset daily counters, release stale reservations from failed jobs, cost summary |

---

## 10. Screens (high level, detailed in USER_FLOW_UIUX.md)

- `/login`, `/signup`, `/onboarding`
- `/` dashboard: credits, active jobs, recent campaigns, quick stats
- `/campaigns`, `/campaigns/new`, `/campaigns/[id]` (tabs: leads, messages/review, send, analytics)
- `/leads` (all leads across campaigns, filters, status)
- `/analytics`
- `/settings` (org, members, sending, integrations, opt-outs)
- `/billing` (plan, credits, usage)
- `/admin`, `/admin/organizations/[id]`

Every data screen implements loading, empty, error, and active-pipeline states.

---

## 11. Brand

See the BRAND section of the build prompt: name Wasla (وصلة), petrol blue `#0B3C49`, warm orange `#F27A1A`, Readex Pro, respectful Egyptian colloquial voice, logo files `wasla-logo.svg` and `wasla-logo-mark.svg`.

Accessibility: orange on white fails WCAG for small text (about 2.7:1). Use orange as a background for CTAs with dark petrol text, or for large elements and icons only; never small orange text on white.

---

## 12. Non-functional requirements

- **Performance**: dashboard and lists load under 2 seconds on 4G for up to 5,000 leads per org; lists paginated server-side.
- **Security**: RLS on every table, service role only in server code and n8n, webhook signatures, encrypted per-org secrets, rate limiting on auth and job-start endpoints.
- **Privacy (Egypt PDPL)**: collect only fields needed for outreach, permanent opt-outs, delete lead on request, data export per org on request.
- **Observability**: job errors visible to users in plain Arabic; technical details in logs; failed jobs refund reserved credits.
- **Localization**: all UI strings in an Arabic locale file, ready for English later; Cairo timezone for all caps and windows; Arabic-Indic vs Western digits **OPEN** (default Western digits).

---

## 13. Phase mapping

| Phase | Scope from this spec |
|---|---|
| 1 | Sections 3, 4.3, 8 (schema + RLS), env baseline, docs |
| 2 | 6.0 offer profile and planner, 6.1 (Google Maps only), 6.2, 6.3, 6.3a Phase 2 signals (reviews, business age, size, has website) and the score, 6.4, 6.5, 6.6 WhatsApp only, WF0 to WF3, minimal UI |
| 3 | 6.3a Phase 3 signals (website contacts, Instagram, Facebook page, ads); Instagram, Facebook, Apollo, LinkedIn as lead sources; 6.6 Messenger and email sequences; WF4 |
| 4 | 4.1, 4.2, 4.4, 6.7 to 6.10, full UI, WF5 |
| 5 | Testing, RLS tests, deliverability guards, monitoring |

---

## 14. Open decisions

1. Plan prices in EGP (Starter, Growth).
2. Final credit amounts and costs (section 4 values are proposed).
3. Default OpenRouter model after a quality comparison on Egyptian Arabic.
4. Apollo key model: platform key vs each org's own key, and its credit cost.
5. Digits style in UI (Western vs Arabic-Indic).
6. Default WhatsApp daily cap value.

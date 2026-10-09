# USER_FLOW_UIUX.md — Wasla (وصلة)

Companion to `specs.md` v2.0 §5, §10. UI copy is bilingual: simple Modern Standard Arabic (default, RTL) and English (LTR), switched from the header. Outreach messages written for leads stay Egyptian Arabic. Final strings live in `lib/i18n/ar.ts` and `en.ts`.

## 1. End-to-end flow

```
Auth → Onboarding → Campaign setup → Parameters → Ingestion (live) → Leads
  → Generate messages (live) → Review queue → Send → Status/Inbox → Analytics → Credits & plan
Admin (separate): plan activation, credit adjustments, suspend
```

### 1.1 Auth and onboarding
1. `/signup` (email + password, or Google) → email verification screen → `/login`.
2. `/onboarding`, 3 steps with progress indicator. Wasla is horizontal: no segment is assumed.
   - **Org name.**
   - **What you sell and who buys it**: `what_we_sell`, `ideal_customer`, `problems_we_solve` (free text, Arabic). Example chips (agency, supplier, accounting firm, SaaS...) only prefill examples; the user can write anything.
   - **Where you work and proof**: `regions` (governorates/cities), optional `proof_points`.
   - Final card: tip to use **WhatsApp Business** and the daily-cap explanation. Result saved as the org `offer_profile` (editable later in settings).
3. Land on `/` dashboard with a single clear CTA: "ابدأ أول حملة".

### 1.2 Campaign setup and parameters (`/campaigns/new`)
Three-step wizard (البداية / الجمهور المستهدف / التقييم والرسالة · Start / Target audience / Scoring and message), with Back/Next and validation per step:
1. **Start**: name + either **"خلي وصلة تقترح"** (AI planner: one job, 2 credits, returns an editable draft of categories, keywords, locations, signals with weight + one-line reason, and 2–3 angles; every suggestion can be accepted, edited, or ignored; the planner never starts a campaign) or pick an example template (agency→restaurants, agency→clinics, packaging→cafes, accounting→small businesses) or blank.
2. **Who to find**: keywords (tag input, Arabic/English), locations (governorate → city → district multi-select), filters (min rating, min reviews, must have phone / mobile / website, exclude closed, categories include/exclude), `max_results`, `enrich_emails` toggle.
3. **How to write**: channel (واتساب / ماسنجر / إيميل; locked options show plan badge), tone (ودود / رسمي / مباشر), offer override (optional).
**Scoring** (step 3): for each signal the user picks the preferred state in plain words ("Doesn't matter" / the signal's high state / its low state, e.g. "has a website" vs "has no website") and an importance (low / medium / high). These map to the signed weights (±30/60/100) stored on the campaign. Free signals are marked, paid ones show credits per lead.
A live **cost estimate panel** (sticky) shows: queries count (keywords × districts), expected leads cap, credits to reserve, current balance. "شغّل الحملة" is disabled when the reservation would make the balance negative, with an upgrade link.

### 1.3 Ingestion and enrichment (live)
Tapping run: server action validates → writes `jobs` row (reserve credits) → signed webhook to n8n → returns. UI switches to the campaign page with a **pipeline stepper** driven by Realtime on `jobs`: جاري البحث → تنضيف وإزالة المكرر → جاهز. Shows counters (found, duplicates removed, opted-out dropped, WhatsApp-eligible). User can leave the page; a dashboard card keeps showing progress. Cancel is available while running.

### 1.4 Leads → message generation
`/campaigns/[id]` tab **العملاء**: table with badges (موبايل / أرضي، موقع، تقييم). Table sorts by **opportunity score** by default; score badge (0–100) plus up to 3 Arabic reason chips per row. Select rows or "كلّهم" → **"اكتب الرسائل"** opens a confirm dialog with credit cost → job `generate` → live progress (x من y). Leads with landline show "اتصال" only; if channel is WhatsApp they are excluded from generation by default (toggle to include for call notes is out of scope).

### 1.5 Human review queue
Tab **المراجعة**: one card per lead (virtualized list). Card: business name, category, district, phone-type badge, rating, editable message (inline textarea with word counter against 40–90), angle note (muted), actions: **اعتمد** / **عدّل واعتمد** / **اكتب تاني** (opens instruction chips: أقصر، أرسمي، ركّز على السوشيال; costs 1 credit, shown) / **ارفض**. Bulk approve unlocks only after every visible card has entered the viewport (track by IntersectionObserver), with a counter "راجعت 12 من 40". Sticky header: daily-send counter (e.g. 18/30) with warning at 80%.

### 1.6 Send
Tab **الإرسال** (approved messages):
- **WhatsApp**: primary orange-background button "ابعت على واتساب" → opens `wa.me/201XXXXXXXXX?text=…` in a new tab, marks `sent` immediately with a 10-second undo toast; secondary "نسخ الرسالة"; manual toggle "اتبعتت". Landline: "اتصال" (`tel:`). At 100% daily cap the button is disabled with explanation and reset time (Cairo midnight).
- **Messenger** (Phase 3): "انسخ وافتح ماسنجر" → copies, opens `m.me/<page>`, marks sent with undo.
- **Email sequence** (Growth, Phase 3): sequence builder (steps with delay days, per-lead generated follow-ups), mailbox picker, sending window and cap summary, preview, "ابدأ التسلسل"; stop on reply/bounce/opt-out.

### 1.7 Status and inbox
Lead drawer/page: status quick actions (رد، مهتم، اجتماع، كسبنا، خسرنا، ما يرسلش تاني). "ما يرسلش تاني" opens a confirm dialog and adds a permanent opt-out. Timeline from `lead_events` (status changes, notes, email replies). WhatsApp/Messenger replies are entered manually (explain why, once, in a hint). Email replies appear automatically in the thread. `/leads` shows all leads across campaigns with filters.

### 1.8 Analytics (`/analytics`, campaign tab)
Date-range picker; cards: leads collected / after dedupe / WhatsApp-eligible %; messages generated / approved / rejected / sent; replied / interested / meetings / won with rates; credits used and estimated real cost. One trend chart (sent vs replied per day). No BI builder.

### 1.9 Credits and plan (`/billing`)
Balance card (derived), reservation-in-progress note, usage history table from ledger (kind, amount, reason, job link), plan cards (Free/Starter/Growth; price shows "قريباً" while OPEN), "اشترك" → payment instructions dialog (InstaPay, Vodafone Cash, bank transfer) + WhatsApp deep link to the sales number with org ID and plan prefilled. Status banner "في انتظار التفعيل" after tapping.

### 1.10 Admin flow (`/admin`, platform admins only, server-checked)
- `/admin`: organizations table (plan, balance, usage, last activity), search, filters; global cost view (Apify + OpenRouter per day).
- `/admin/organizations/[id]`: tabs **الاشتراك** (activate/change plan → dialog confirms plan, start/end, grants period credits via ledger), **الرصيد** (grant/deduct with mandatory reason, shown in ledger with `created_by`), **الاستخدام**, **تعليق** (suspend/unsuspend with confirm). Every action writes an audit row (ledger or `lead_events`-style admin event; see gaps in the Phase 1 plan).

## 2. Information architecture and screen hierarchy

```
App shell: Sidebar (start side) + Header (org switcher, credits chip, daily-send chip, user menu)
├─ /login /signup /onboarding            (no shell)
├─ /                  Dashboard
├─ /campaigns         list
│   ├─ /new           stepper
│   └─ /[id]          tabs: العملاء | المراجعة | الإرسال | التحليلات
├─ /leads             all leads
├─ /analytics
├─ /billing
├─ /settings          tabs: المنظمة | الأعضاء | الإرسال | التكاملات | عدم الإرسال (opt-outs)
└─ /admin             /admin/organizations/[id]
```
Mobile: sidebar becomes a bottom sheet/sheet-drawer; review cards go full-width; tables collapse into cards below 768px.

## 3. Components (shadcn/ui) and four states per screen

Shared patterns: `Skeleton` for loading; `EmptyState` (icon + one sentence + primary CTA); `ErrorState` (plain Arabic message + "جرّب تاني" retry, technical code hidden behind "تفاصيل"); `PipelineProgress` (Progress + Realtime subscription + counters).

| Screen | Key shadcn components | Loading | Empty | Error | Active pipeline |
|---|---|---|---|---|---|
| Auth/Onboarding | Form, Input, Button, Card, Progress | Button spinner | n/a | Inline field errors; verification resend | n/a |
| Dashboard | Card, Badge, Table, Progress | Card skeletons | "لسه معندكش حملات. ابدأ أول حملة" | Card-level retry | Running-jobs card with live progress |
| Campaigns list | DataTable, Badge, DropdownMenu | Row skeletons | CTA "ابدأ حملة" + template chips | Retry banner | Status badge + inline progress for `running` |
| Campaign new | Stepper (Tabs), Form, Select, Command (multi-select), Switch, Slider, Alert | Template skeleton | n/a | Field errors; "الرصيد مش كفاية" alert | n/a |
| Campaign: العملاء | DataTable, Checkbox, Badge, Sheet (lead drawer), Dialog | Table skeleton | "الحملة لسه ما جابتش عملاء" + "عدّل الفلاتر" | Retry + job error in Arabic | Stepper + live counters; rows stream in |
| Campaign: المراجعة | Card, Textarea, Button group, Popover (regen), Toast, Progress | Card skeletons | "مفيش رسائل للمراجعة. اكتب الرسائل" | Per-card retry on failed generation | Live "x من y" while generating |
| Campaign: الإرسال | Card list, Button, Toast (undo), Tooltip, Alert (cap) | Skeleton | "اعتمد رسائل الأول" | Retry | Sequence status (Phase 3) |
| Leads | DataTable (server pagination), Filter Popovers | Skeleton | "مفيش عملاء. شغّل حملة" | Retry | n/a |
| Analytics | Card, Chart (Recharts), Date range | Skeleton cards | "مفيش بيانات في المدة دي" | Retry | Live counters for running jobs |
| Billing | Card, Table, Dialog | Skeleton | "لسه مفيش استخدام" | Retry | Pending-activation banner |
| Settings | Tabs, Form, Table, AlertDialog | Skeleton | Opt-out list: "القايمة فاضية" | Retry | n/a |
| Admin | DataTable, Tabs, Dialog, AlertDialog | Skeleton | "مفيش منظمات" | Retry | n/a |

Destructive actions (reject all, remove opt-out, suspend, credit deduction) use `AlertDialog` with explicit confirmation. Toasts are for undoable actions only (mark-as-sent).

## 4. RTL-specific notes

- `<html lang="ar" dir="rtl">`; use logical utilities (`ms-/me-/ps-/pe-/start-/end-`, `text-start`). No `left/right`.
- **Icons**: mirror directional icons (chevrons, arrows, back, "next step", progress arrows) with `rtl:-scale-x-100`. Do not mirror: logos, checkmarks, play, clocks, charts, media controls, numerals, brand marks, phone/WhatsApp glyphs.
- **Layout**: sidebar on the right (start side); primary action on the start side of button groups; stepper flows right to left; Sheet drawers open from the start side.
- **Tables**: first column on the right; numeric columns right-aligned within RTL context using `text-end` for numbers with units; sticky first column uses `start-0`; sort/arrow icons follow direction. Horizontal scroll begins at the right edge.
- **Numbers**: Western digits by default (OPEN decision, switch via a single formatter `formatNumber()` using `Intl.NumberFormat('ar-EG' | 'en')`). Currency "ج.م" after the number. Dates via `Intl.DateTimeFormat` in `Africa/Cairo`, week starts Saturday; business days Sun–Thu.
- **Mixed Arabic/English**: wrap Latin strings, URLs, emails, phones, and model IDs in `<bdi>` or `dir="ltr"` spans; phone numbers always `dir="ltr"` with `unicode-bidi: isolate`. Message bodies use `dir="auto"` per paragraph. Inputs for email/URL/phone use `dir="ltr"` with `text-start`-aligned placeholder.
- **Charts**: x-axis time runs right to left; legends and tooltips aligned to start; verify with Recharts `reversed` axis.
- **Typography**: Readex Pro line-height at least 1.7 for Arabic body; avoid letter-spacing on Arabic; no italic. Test truncation with long Arabic business names (`line-clamp`, not char counts).
- **Forms**: error text below fields, start-aligned; required marker after the label. Keyboard: Tab order follows visual RTL order.
- **Accessibility**: orange never used for small text on white; focus rings 2px petrol/orange-on-dark; touch targets at least 44px; `aria-live` on pipeline progress.

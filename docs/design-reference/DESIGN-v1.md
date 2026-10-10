# Wasla Design System

Read this file fully before touching any UI. It overrides any earlier styling decision. If something here conflicts with the current code, the code changes.

## 0. How to apply this file (process)

1. **Audit first.** Use Playwright to screenshot every screen at 375px, 768px and 1280px, in Arabic (RTL) and English (LTR), light and dark. Save to `docs/design-audit/before/`. Write `docs/design-audit/AUDIT.md` listing every violation of this file per screen.
2. **Tokens next.** Implement section 2 and 3 as CSS variables and the Tailwind theme. Delete every hardcoded color, font size, radius and shadow in components.
3. **Components.** Rebuild the shared components in section 5 so each screen only composes them.
4. **Screens.** Apply section 6 screen by screen.
5. **Verify.** Re-take the same screenshots into `docs/design-audit/after/` and check the acceptance list in section 9. Fix until it passes.

Do not change business logic, data flow, or copy meaning while doing this.

---

## 1. Direction

Wasla should feel like a **calm, confident work tool**: the clarity of Linear, the warmth of a good Arabic product, the density of Attio when showing data. The user is a busy salesperson or agency owner checking leads on their phone between meetings.

Three words: **clear, warm, fast.**

- **Clear:** one obvious next action per screen. The eye should land on it in under a second.
- **Warm:** petrol blue and orange, soft surfaces, human Arabic copy. Not a cold enterprise gray tool.
- **Fast:** few clicks, no decorative animation, content visible without scrolling on mobile.

### Never
- Gradients on surfaces or buttons, neon glows, glassmorphism, purple anything.
- More than one primary button visible in the same view.
- Emojis in the UI (they are fine inside generated outreach messages).
- Cards inside cards inside cards. Maximum one level of nesting.
- Centered long text. Only short headings and empty states are centered.
- Gray text below the contrast minimum just to look "subtle".
- Tables on mobile.

---

## 2. Color tokens

Define as CSS variables on `:root` and `.dark`, then map to Tailwind (`bg-surface`, `text-fg-muted`, etc.). Components use semantic tokens only, never raw scale values.

### 2.1 Brand scales

| Step | Petrol | Orange |
|---|---|---|
| 50 | `#EEF5F7` | `#FFF5EC` |
| 100 | `#D5E6EB` | `#FFE6D0` |
| 200 | `#AACDD6` | `#FECBA0` |
| 300 | `#77AEBD` | `#FCA866` |
| 400 | `#458DA0` | `#F68E3A` |
| 500 | `#2A6F82` | `#F27A1A` (brand) |
| 600 | `#1B5767` | `#D9620A` |
| 700 | `#134553` | `#B34C09` |
| 800 | `#0B3C49` (brand) | `#8C3C0D` |
| 900 | `#072A33` | `#71320E` |
| 950 | `#041A20` | `#3F1A06` |

Neutrals: a cool gray with a slight petrol tint.
`#F7F9FA, #EEF2F4, #E1E7EA, #C9D2D7, #9AA8B0, #6B7B85, #4D5B64, #36424A, #232D33, #151C20, #0C1114` (50 to 950).

### 2.2 Semantic tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | neutral 50 | neutral 950 | page background |
| `surface` | `#FFFFFF` | neutral 900 | cards, sheets, inputs |
| `surface-muted` | neutral 100 | neutral 800 | table header, subtle blocks |
| `border` | neutral 200 | neutral 800 | default borders |
| `border-strong` | neutral 300 | neutral 700 | inputs, dividers that must show |
| `fg` | neutral 900 | neutral 50 | main text |
| `fg-muted` | neutral 600 | neutral 400 | secondary text (must pass 4.5:1) |
| `fg-subtle` | neutral 500 | neutral 500 | meta text, large sizes only |
| `primary` | petrol 800 | petrol 400 | primary buttons, active nav, links |
| `primary-fg` | white | neutral 950 | text on primary |
| `primary-soft` | petrol 50 | petrol 950 | selected rows, active chips |
| `accent` | orange 500 | orange 400 | the send action, highlights, focus ring |
| `accent-fg` | petrol 950 | petrol 950 | text on accent (never white) |
| `accent-soft` | orange 50 | orange 950 | score highlights, tips |
| `success` | `#15803D` | `#4ADE80` | sent, approved |
| `warning` | `#B45309` | `#FBBF24` | cap near, pending |
| `danger` | `#B91C1C` | `#F87171` | errors, reject, delete |
| `info` | petrol 600 | petrol 300 | neutral notices |

Each semantic color also has a `-soft` background (its 50 in light, 950 in dark) for badges and alerts.

### 2.3 Color rules
- **Orange is precious.** It appears for: the WhatsApp / send action, the focus ring, high scores, and the logo dot. Nowhere else. If a screen has three orange things, two are wrong.
- Orange never carries small white text. Text on orange uses `accent-fg`.
- Primary actions are petrol. Destructive actions are `danger` outline, filled only in the confirmation dialog.
- Do not use WhatsApp green anywhere, including the WhatsApp button. Use the accent with the WhatsApp icon.
- Dark mode is a real theme, not inverted colors. Check every screen.

---

## 3. Typography

Font: **Readex Pro** via `next/font/google`, weights 400, 500, 600, 700, subsets `arabic` and `latin`. Fallback `"IBM Plex Sans Arabic", system-ui, sans-serif`.

| Token | Size / line-height (Arabic) | Size / line-height (Latin) | Weight | Use |
|---|---|---|---|---|
| `display` | 30 / 44 | 30 / 38 | 700 | dashboard greeting, empty-state title on desktop |
| `h1` | 24 / 36 | 24 / 32 | 700 | page title |
| `h2` | 20 / 32 | 20 / 28 | 600 | section title, card title |
| `h3` | 18 / 28 | 18 / 26 | 600 | sub-section, dialog title |
| `body` | 16 / 28 | 16 / 24 | 400 | default text, inputs |
| `body-sm` | 14 / 24 | 14 / 20 | 400 | table cells, secondary text |
| `caption` | 13 / 20 | 12 / 16 | 500 | labels, badges, meta |

Rules:
- Arabic needs more line height than Latin; apply the Arabic column when `dir="rtl"`.
- Body text is never smaller than 16px on mobile. Nothing in the UI is smaller than 12px.
- Use weight and size for hierarchy, not color alone. A screen uses at most three sizes in the main content.
- Numbers in stats, credits, scores and tables use `font-variant-numeric: tabular-nums`. Western digits everywhere.
- No letter spacing on Arabic. No uppercase transforms on Latin labels.
- Line length for paragraphs: max about 70 characters (`max-w-prose`).

---

## 4. Spacing, layout, shape

### 4.1 Spacing
8pt grid. Allowed spacing values: 4 (only inside small components), 8, 12, 16, 24, 32, 48, 64.
- Mobile page side padding: 16. Tablet: 24. Desktop: 32.
- Gap between sections on a page: 32 mobile, 48 desktop.
- Gap between cards in a list: 12 mobile, 16 desktop.
- Card inner padding: 16 mobile, 24 desktop.

### 4.2 Breakpoints (Tailwind defaults)
`sm 640`, `md 768`, `lg 1024`, `xl 1280`. Design at 375 first. Content max width 1200, centered, on `xl` and above. Never hardcode container widths in px.

### 4.3 App shell
- **Mobile (< lg):** top bar 56px (logo mark, page title, credits pill, avatar). **Bottom navigation** 64px plus safe area, 4 items: الرئيسية / Home, الحملات / Campaigns, العملاء المحتملين / Leads, الإعدادات / Settings. Icon + label, active item in `primary` with a 2px top indicator.
- **Desktop (≥ lg):** right sidebar in RTL (left in LTR), 248px, collapsible to 72px icons. Logo lockup on top, nav, then credits card and user menu at the bottom. No top bar; each page has its own header.
- Page header pattern: title (`h1`) + one-line description (`fg-muted`) on the start side, the single primary action on the end side. On mobile the primary action becomes a full-width button below the header or a sticky bottom bar.

### 4.4 Shape and depth
- Radius: 8 for inputs, buttons, badges; 12 for cards and dialogs; 16 for bottom sheets; full for pills and avatars.
- Borders do the separation, shadows are rare. Cards: `1px border` and no shadow. Shadows only for floating layers: dropdowns, popovers, dialogs, sticky bars (`0 8px 24px rgb(0 0 0 / 0.08)`; in dark mode use a stronger border instead of shadow).

---

## 5. Components

Build on shadcn/ui, restyled with the tokens above. Every interactive element has: default, hover, active (pressed), focus-visible, disabled, and loading states.

### Buttons
- Sizes: `md` 40px height (desktop default), `lg` 48px (mobile default and main CTAs). Horizontal padding 16 / 20.
- Variants: `primary` (petrol filled), `accent` (orange filled, only for send), `secondary` (surface + border), `ghost` (text only, for toolbars), `danger-outline`.
- Pressed state: scale 0.98 and one step darker. Loading: spinner replaces the icon, label stays, width does not jump.
- Icon + label beats icon only. Icon-only buttons need a tooltip and `aria-label`, and a 48px hit area on mobile.

### Inputs
- Height 48 on mobile, 40 on desktop. Label always visible above the field (no placeholder-as-label). Helper text below in `caption`, error text in `danger` with an icon.
- Focus: 2px ring in `accent` with 2px offset. Same ring on every focusable element.
- Textareas for messages: min 6 rows, auto-grow, character and word count in the corner.

### Cards
- One purpose per card. Title row (`h2` or `h3`) + optional meta on the end side + content + optional footer actions.
- Clickable cards: whole card is the target, hover raises border to `border-strong` and background to `surface-muted` slightly. No lift animation.

### Badges and chips
- Badge: `caption`, 24px height, radius 8, soft background + strong text of the same semantic color.
- Status badges: draft (neutral), running (info with a pulsing dot), ready (success), failed (danger), pending review (warning), approved (success), sent (primary-soft), rejected (neutral, strikethrough not needed).
- Reason chips (score reasons): neutral soft background, small leading icon, short text, max 3 visible then "+2".

### Score
- A 40px circular badge with the number (tabular, 600 weight). Bands: 0 to 39 neutral, 40 to 69 `primary-soft` with `primary` text, 70 to 100 `accent-soft` with `accent-fg` text and an orange ring.
- Always next to its reason chips. A score without reasons is not shown.

### Stepper (campaign wizard)
- Mobile: compact "Step 2 of 3" + progress bar + step title. Desktop: horizontal steps with numbers and titles.
- Sticky bottom action bar on mobile: Back (secondary) and Continue (primary), full width split. Continue is disabled until the step is valid, with the reason shown above the bar.

### Lists and tables
- Mobile: every table becomes a list of cards (lead card: name, category + district, score badge, phone type badge, top 2 reason chips, chevron).
- Desktop: table with sticky header, 56px rows, `body-sm`, zebra off, row hover `surface-muted`, selected row `primary-soft`. Numbers aligned to the end. Max 6 visible columns; the rest go into the row detail drawer.
- Filters live in a single bar above the list; on mobile they open in a bottom sheet.

### Feedback
- Toasts at the top on mobile, bottom-end on desktop, auto-dismiss in 4s, with action (Undo) when relevant. The send undo uses a toast with a countdown.
- Inline alerts for page-level problems (soft background, icon, one sentence, one action).
- Skeletons match the real layout shape. No spinners for whole pages.

### Empty states
Icon (48px, `fg-subtle`), one-line title (`h3`), one sentence (`fg-muted`), one primary button. Centered, max width 360. Every list has one, written for that context.

### Dialogs and sheets
- Desktop: centered dialog, max width 480, radius 12.
- Mobile: bottom sheet with a drag handle, radius 16 on top, actions stacked full width.

---

## 6. Screens

### 6.1 Auth (login, signup)
Single column, max width 400, centered vertically on desktop, top-aligned with 48px top padding on mobile. Logo lockup, `h1`, one sentence, Google button first (secondary, with Google logo), divider "أو / or", email form, primary submit. Language toggle in the top corner. No illustrations, no split-screen hero.

### 6.2 Onboarding
3 short steps with the stepper. One question per step, large inputs, example text under each field ("مثال: بنعمل حسابات وضرائب للشركات الصغيرة"). Final step shows a summary card before finishing.

### 6.3 Dashboard
Top to bottom:
1. Greeting (`h1`) + credits pill.
2. If there are running jobs: a live progress card per job (title, progress bar, counts).
3. Three stat cards in a row on desktop, horizontal scroll on mobile: leads this month, messages sent, reply rate.
4. Recent campaigns list (cards), with "New campaign" as the page primary action.
5. "How Wasla works" guide only until the first campaign exists, as 3 numbered steps in one card, dismissible.

### 6.4 Campaign wizard
Three steps (Start, Target audience, Scoring and message) as today. Planner suggestions appear as editable chips the user can remove or add, not as a wall of text. Live cost estimate in a small sticky card (desktop: side column; mobile: inside the sticky bottom bar as "≈ 120 credits").

### 6.5 Campaign page
Header: name, status badge, key numbers (leads, approved, sent). Tabs: Leads, Review, Send, (later Analytics). On mobile the tabs are a horizontally scrollable segmented control under the header.

**Leads tab:** sorted by score. Filters: score band, phone type, has website.

**Review tab (the most important screen):**
- Mobile: one lead per screen. Top: business name, category, district, score + reasons. Middle: the message in an editable textarea, with the angle note above it in `caption`. Bottom sticky bar: Reject (ghost), Regenerate (secondary), Approve (primary). Swipe is optional; buttons are required. Counter "5 / 24" at the top.
- Desktop: two-pane. List of pending leads on the start side (320px), the selected lead and message on the end side. Keyboard: A approve, R regenerate, X reject, J/K next/previous.

**Send tab:**
- Daily cap counter always visible at the top ("12 / 30 today") with a progress bar that turns `warning` at 80%.
- Each approved message is a card: business name, phone type, message preview (3 lines, expandable), and one big **accent** button "ابعت على واتساب / Send on WhatsApp" with the WhatsApp icon, full width on mobile. Secondary "Copy message" next to it. Landline shows "اتصال / Call" instead.
- After tapping: card collapses to a "Sent" row with the undo toast.

### 6.6 Settings and billing
Simple stacked sections with a sticky section nav on desktop. Forms save per section with a clear Save button that is disabled until something changes.

---

## 7. RTL and bilingual rules

- Use logical properties only: `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`, `text-end`. No `ml/mr/pl/pr/left/right` in components.
- Mirror directional icons (arrows, chevrons, back, send, progress direction). Never mirror: logos, checkmarks, play, clocks, the WhatsApp icon, numbers, charts' time axis (time still flows left to right in LTR charts; in RTL charts keep time flowing right to left consistently across the app).
- Phone numbers, URLs, emails and code-like text are wrapped in `dir="ltr"` with `unicode-bidi: isolate` so they never scramble inside Arabic text.
- Mixed Arabic/English labels: keep the English term in parentheses only when users need it (e.g. "واتساب (WhatsApp)" is not needed; "النقاط (Score)" is not needed).
- Test every screen in both languages; Arabic strings are often 20 to 30% longer or shorter, so no fixed widths on buttons or tabs.

---

## 8. Motion

- Durations: 120ms for hover and press, 200ms for panels, sheets and dialogs. Easing `cubic-bezier(0.2, 0, 0, 1)`.
- Only animate opacity and transform. No layout-shifting animations, no bouncing, no parallax.
- Live progress bars animate smoothly; numbers that update can do a quick 150ms fade.
- Respect `prefers-reduced-motion`: disable all non-essential motion.

---

## 9. Acceptance checklist (must all pass)

- [ ] No hardcoded colors, font sizes, radii or shadows outside the token files.
- [ ] Every screen at 375px has no horizontal scroll and its primary action is visible without scrolling.
- [ ] All touch targets ≥ 48×48px on mobile with at least 8px between them.
- [ ] Text contrast ≥ 4.5:1 (body) and ≥ 3:1 (large text, icons), checked in light and dark.
- [ ] One primary button per view; orange used only for send, focus ring, high scores, logo.
- [ ] Every list has loading skeleton, empty state, error state, and (where relevant) live progress.
- [ ] Every interactive element shows a visible focus ring with keyboard navigation.
- [ ] Arabic RTL and English LTR both look intentional, with correct icon mirroring and isolated phone numbers.
- [ ] Dark mode checked on every screen.
- [ ] Before/after screenshots committed in `docs/design-audit/`.

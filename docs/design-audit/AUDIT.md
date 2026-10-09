# Design audit (before)

Method: `scripts/design-shots.mjs` captured every screen at 375 / 768 / 1280, Arabic (RTL) and English (LTR), light and dark: 144 full-page screenshots in `before/` (`<screen>__<width>__<lang>__<scheme>.jpg`). Rules are the sections of [`DESIGN.md`](../../DESIGN.md).

Screens that do not exist yet and are required by DESIGN.md: **Leads** (all leads, section 4.3 nav) and **Settings** (6.6). They are listed under "Missing".

## Global violations (affect every screen)

| # | Rule | Violation |
|---|---|---|
| G1 | 2.2, 9 dark mode | **There is no dark theme.** Every `*__dark` screenshot is identical to the light one (tokens exist only as a `.dark` class that is never applied, and `prefers-color-scheme` is ignored). |
| G2 | 2.1, 2.2 | Colors are not the DESIGN.md scales. The palette uses shadcn variables with ad-hoc hex values (`--primary #0b3c49` etc.), no petrol/orange 50–950 scales, no `surface`, `surface-muted`, `border-strong`, `fg-muted`, `fg-subtle`, `primary-soft`, `accent-soft`, `*-soft` status tokens. Tailwind classes like `bg-card`, `text-muted-foreground`, `bg-cta` are used instead of semantic tokens. |
| G3 | 2.3 | **Orange is used for every primary button** ("New campaign", "Next", "Start campaign", "Approve", "Write messages", "Create account"...). Allowed only for send, focus ring, high scores, logo dot. Primary actions must be petrol. |
| G4 | 2.3 | Text on orange is `#06232b` but several orange buttons also appear disabled at 50 % opacity (low contrast). The WhatsApp button must be accent with the WhatsApp icon (currently a generic chat icon). |
| G5 | 3 | Type scale is Tailwind sizes (`text-sm`, `text-xs`, `text-2xl`, `text-lg`) scaled by a 106.25 % root, not the `display/h1/h2/h3/body/body-sm/caption` tokens; no Arabic vs Latin line-height; weight 500 not loaded; sizes of 12px and smaller used for meta text on mobile; `tabular-nums` only on some numbers. |
| G6 | 4.1 | Off-grid spacing: `p-5`, `gap-5`, `py-2.5`, `px-3`, `gap-1.5`, `gap-3.5`; mobile side padding is 16 but tablet/desktop are not 24/32; section gaps are 24–32 instead of 32/48. |
| G7 | 4.3 | **App shell is wrong.** One top header with text nav on every breakpoint; no bottom navigation on mobile, no sidebar on desktop, no Leads/Settings destinations, language toggle and sign-out as loose header buttons. |
| G8 | 4.3 | No page-header pattern (title + description + single primary action on the end side); the primary action floats at a different place on each page. |
| G9 | 4.4 | Radius tokens are shadcn defaults (10px etc.), not 8 / 12 / 16. Buttons have a shadow (`shadow-sm` on CTA), cards sometimes `shadow-sm` (auth card, landing). Shadows only for floating layers. |
| G10 | 5 | Buttons: sizes 36/40/44 instead of 40 and 48; mobile default is not 48; no `accent` / `danger-outline` variants; no pressed (scale .98) or loading states with a spinner; icon-only controls lack 48px hit areas. |
| G11 | 5 | Inputs: height 44/40 not 48 mobile / 40 desktop; focus ring is the neutral shadcn ring, not a 2px accent ring with 2px offset; placeholders carry meaning in places (keywords hint). |
| G12 | 5 | Tabs, chips, segmented controls and badges have heights and radii that are not the specified 24px badge / 8px radius; status badges are all neutral gray (no semantic color per status, no pulsing running dot). |
| G13 | 5 | Toasts use the library default look and position, not top on mobile / bottom-end on desktop; the send undo toast has no countdown. |
| G14 | 5, 6 | Tables are used on mobile (Leads tab) — forbidden; they scroll horizontally on 375px. |
| G15 | 8 | No motion tokens, no `prefers-reduced-motion` handling; `transition-all` used on buttons. |
| G16 | 7 | Some physical properties remain (`text-left` none, but `left/right` free); chevrons/arrows are not mirrored for RTL; phone numbers are isolated with `<bdi>` only in the leads table, not on cards. |
| G17 | 5 | Dialogs are always centered (no bottom sheet on mobile, no drag handle). |
| G18 | 1 | Cards nested in cards in the wizard step 3 (signal cards inside the page card inside the form card; cost summary inside again); emojis appear in UI chrome? No, only in generated messages (OK). |

## Per screen

### Landing `/`
- G2, G3 (hero button is orange while it is the only primary, but DESIGN reserves orange): make it petrol primary `lg`.
- Header mixes ghost + outline buttons; language toggle is not in the corner pattern. Hero text is `text-5xl` (not a token). Cards in "How it works" have icon tiles in petrol which is fine but spacing is off-grid.
- Dark mode missing (G1).

### Login / Signup `/login`, `/signup`
- Violates 6.1: card has a shadow and is wrapped in a bordered container at top-aligned positions; the logo lockup is 96px high; the Google button is `outline` (should be `secondary` with the Google logo, first) — the Google logo uses raw hex fills inside a component.
- Submit button is orange (G3). Inputs 44px (G11). Language toggle sits above the card instead of in the top corner of the page.

### Onboarding `/onboarding`
- Violates 6.2: it is **one long form**, not 3 short steps with a stepper and a summary card; example chips are above the fields instead of example text under each field.
- Orange submit button (G3); inputs and textareas not 48px; no step progress.

### Dashboard `/dashboard`
- Violates 6.3: no greeting, no credits pill in a page header, **no stat cards** (leads this month, messages sent, reply rate), running jobs shown inside a "قيد التنفيذ" card instead of a progress card per job, guide is not dismissible and shows only when there are no campaigns (correct) but is not one card of numbered steps with dismiss.
- Primary action (orange "حملة جديدة") floats in the header (G3, G8).
- Recent campaigns are a divided list card, not clickable cards with status badge semantics (G12).
- Balance card duplicates the credits chip.

### Campaigns list `/campaigns`
- G3 orange button; cards use `shadow` on hover, not border-strong + surface-muted (5 cards); status badge gray; no empty-state icon.

### Campaign wizard `/campaigns/new` (3 steps)
- Violates 5 "Stepper" and 6.4: mobile shows only numbered circles (no "Step 2 of 3" + progress bar + step title); no sticky bottom action bar on mobile — Back/Next are inline at the end of a very long page (about 2400px tall on 375); step 3 is too long.
- Planner suggestions are not shown as editable chips (keywords are chips, but locations/signals/angles are not); cost estimate is inline at the end of step 3 instead of a sticky card (desktop) / "≈ 60 credits" in the sticky bar (mobile). "Continue" is not disabled-with-reason; validation shows after pressing.
- Cards in cards (G18) in step 3: every signal is a bordered box with nested segmented groups, inside the card.
- Orange Next / Start buttons (G3).

### Campaign page header `/campaigns/[id]`
- No key numbers (leads, approved, sent) in the header (6.5). A failed old job card is shown above the tabs and takes the first viewport on mobile.
- Tabs are a full-width pill row with badges; on mobile it should be a horizontally scrollable segmented control.

### Leads tab
- G14: table on mobile (horizontal scroll at 375). No filters (score band, phone type, has website). Score is a 10px dot + number, not the 40px circular score badge with bands; reasons are shown as plain gray chips without icons, no "+N" limit; the number of reasons per row is 1–3 without cap.
- "Write messages" is orange (G3).

### Review tab (most important screen)
- Violates 6.5: mobile shows **all pending messages stacked**, not one lead per screen with counter "5 / 24" and a sticky bottom bar (Reject / Regenerate / Approve); desktop has no two-pane layout and no keyboard shortcuts (A, R, X, J, K).
- Filter pills + bulk approve row + hint text push the first card down; the message textarea is 5 rows, not min 6 and no auto-grow.
- Approve is orange (G3), Reject outline, Regenerate ghost: the hierarchy and order are not as specified.

### Send tab
- Violates 6.5 Send: the cap counter is a plain card with a progress bar that never turns `warning` at 80 %; the WhatsApp button is orange but has a chat icon (should be the WhatsApp icon) and is 40px; after sending the card does not collapse to a "Sent" row; message preview is not 3 lines expandable; disabled orange at 50 % opacity looks washed out; the "copy" button is below the send button on mobile instead of next to it (acceptable stacked on mobile per 6.5 "full width"), but the send button is not full width on desktop.

### Settings / Leads (missing)
- DESIGN 4.3 lists Leads and Settings as nav destinations and 6.6 specifies Settings. Neither route exists.

## Acceptance items failing today (section 9)
All of them except: Western digits (pass), Arabic/English both usable (partly), no horizontal scroll on most screens at 375 except the leads table and the wizard step 3 sticky header artifact.

---

# Resolution (after)

Re-captured with the same script into `after/` (168 screenshots: the 12 original screens plus the new Leads and Settings screens). Side-by-side mobile comparisons of the dashboard, review and send screens are in `compare/`.

## Section 9 checklist

| Item | Result | How it was verified |
|---|---|---|
| No hardcoded colors, font sizes, radii or shadows outside the token file | Pass | `app/globals.css` is the only file with raw values. Grep for `#hex`, `rgb(`, `oklch(`, `text-xs/sm/lg…`, `rounded-md/lg/xl`, `shadow-sm/md` and legacy shadcn color classes returns nothing in `app/`, `components/`, `lib/`. The Google logo uses `--mark-google-*` variables from the token file. |
| 375px: no horizontal scroll, primary action visible | Pass | `scripts/design-check.mjs` (overflow check, 11 screens × ar/en × light/dark). Primary actions are in the page header (full width on mobile) or the sticky bar. |
| Touch targets ≥ 48×48 on mobile, 8px gaps | Pass | Same script measures every visible button, link, input, tab, radio and checkbox (checkboxes through their 48px label). Screen-reader-only skip links are exempt. |
| Contrast ≥ 4.5:1 / 3:1, light and dark | Pass | axe `color-contrast` on every screen at 375, 768, 1280, ar/en, light/dark: 0 violations. |
| One primary button per view; orange only for send, focus ring, high scores, logo | Pass | Primary = petrol. `accent` variant is used only by the WhatsApp send button; the score badge and focus ring use accent. Reviewed by code search for `accent`. |
| Skeleton, empty, error and live-progress states | Pass | `loading.tsx` skeleton matching the page, `EmptyState` with icon on every list, `error.tsx` with retry, `JobProgress` cards (Realtime + polling). |
| Visible focus ring on keyboard navigation | Pass | Global 2px accent ring with 2px offset; `outline-none` removed from components (it had been overriding the ring). Checked by the script (first Tab target on every screen). |
| Arabic RTL and English LTR intentional | Pass | Logical properties only; chevrons/arrows mirrored (`rtl:-scale-x-100`, `ltr:rotate-180`); phone numbers and counters isolated with `ltr-iso`; both languages reviewed in screenshots. |
| Dark mode on every screen | Pass | Real theme through tokens (`.dark`), `next-themes` with system default and a toggle in the account menu and Settings; every screenshot exists in dark. |
| Before/after committed | Pass | `before/`, `after/`, `compare/`. |

## Deviations from DESIGN.md (deliberate, please confirm)

1. **Text on `accent-soft` in dark mode.** DESIGN.md pairs `accent-soft` with `accent-fg` (petrol 950), which gives 1.16:1 on the dark soft surface. I added the token `accent-on-soft` (petrol 950 in light, orange 300 in dark) for high-score badges. Light mode is unchanged.
2. **Bottom-nav label "العملاء"** instead of "العملاء المحتملين": the long label wraps to two lines in a 64px bar at 375px. The page title keeps the full name; English stays "Leads".
3. **Settings is read-only for the business profile.** DESIGN 6.6 describes editable sections with a Save button; editing needs a new server action, which would be new business logic. Language, appearance and sign-out work.
4. **Review: bulk approve was removed.** The one-lead-per-screen flow replaces the "scroll past every card" rule; each message is reviewed individually by construction.
5. **Onboarding has 3 steps with a summary card on the last one** (name + what you sell, customers, regions), not one input per step.
6. **Landing page** keeps the "Try it free now" primary button plus a secondary "Create account".
7. **`cn()` is now `tailwind-merge` configured for the design tokens.** The previous merge helper silently dropped classes such as `text-caption` when combined with a color class.

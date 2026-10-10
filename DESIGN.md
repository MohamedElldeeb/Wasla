# Wasla Design System (v2: "Midnight precision", Wasla edition)

Read this file fully before touching any UI. It replaces DESIGN.md v1 and every earlier styling decision. It applies to the landing page and the whole web app, in Arabic (RTL) and English (LTR).

The visual reference is `docs/design-reference/linear-style.md` (Linear's style). We adopt its **aesthetic and discipline**, not its brand: no Linear colors (acid lime, violet, lavender), no Linear fonts (Berkeley Mono), no Linear logos or copy. Wasla's identity (petrol blue, warm orange, the logo, Readex Pro for Arabic) stays.

## 0. How to apply this file (process)

1. **Audit first.** Screenshot every screen and the landing page at 375px, 768px and 1280px, in Arabic and English, dark (default) and light. Save to `docs/design-audit/v2-before/`. List violations in `docs/design-audit/AUDIT-v2.md`.
2. **Tokens.** Implement sections 2 to 4 as CSS variables and the Tailwind theme. No hardcoded colors, sizes, radii or shadows anywhere else.
3. **Components.** Rebuild shared components (section 5).
4. **Screens and landing page** (sections 6 and 7).
5. **Verify** against section 10, save `docs/design-audit/v2-after/`, fix until it passes.

Do not change business logic, data flow, or copy meaning.

---

## 1. Direction

Wasla is a **midnight precision instrument for sales**: a dark, quiet, exact interface where the only things that glow are the data that matters and the one action you should take next.

- **Dark is the default theme** (like Linear). Light theme exists and must be fully designed, but dark is what the landing page and screenshots show.
- **Darkness with a petrol soul:** surfaces are near-black tinted with Wasla petrol, not neutral gray.
- **One flashlight:** Wasla orange is the single chromatic action color. One orange button per view, nothing else orange except high scores, the focus ring and the logo dot.
- **Geometry over decoration:** hairline borders, no shadows on cards, small exact radii, no gradients except the landing hero floor.
- **The product is the illustration:** the landing page shows real Wasla UI (lead brief cards, the review screen, the funnel), never stock photos or abstract art.

### Never
- Gradients on buttons, cards or text. Glows, neon, glassmorphism, purple or violet anything.
- More than one orange (primary) button per view.
- Bold 700+ weights in Latin text. Arabic headings max 600.
- Card radius above 12px. Shadows to separate cards from the canvas.
- Chromatic body text. Body text is always in the neutral text scale.
- Tables on mobile. Emojis in UI chrome.

---

## 2. Color tokens

Components use semantic tokens only.

### 2.1 Dark theme (default)

| Token | Value | Use |
|---|---|---|
| `bg` | `#061115` | page canvas ("Void", petrol-tinted) |
| `surface` | `#0A1A20` | cards, nav, inputs ("Carbon") |
| `surface-raised` | `#0F232A` | elevated panels, popovers, sheets ("Obsidian") |
| `surface-hover` | `#14303A` | hover and selected tint |
| `border` | `#1C3640` | hairline borders, dividers |
| `border-strong` | `#2A4A55` | inputs, section separators |
| `fg` | `#FFFFFF` | headings, max emphasis |
| `fg-body` | `#D3DEE2` | body text, button text on dark |
| `fg-muted` | `#8FA3AB` | secondary text, placeholders (must keep ≥ 4.5:1 on `bg` and `surface`) |
| `fg-subtle` | `#62767E` | meta and disabled, large text and icons only |
| `primary` | `#F27A1A` (Wasla orange) | the one primary action per view, active nav indicator |
| `primary-fg` | `#061115` | text on orange |
| `primary-soft` | `rgba(242,122,26,0.12)` | high-score badges, selected chips |
| `brand` | `#77AEBD` (petrol 300) | links, info, active tab text, brand accents |
| `brand-soft` | `rgba(69,141,160,0.14)` | info badges, selected rows |
| `success` | `#4ADE80` on `rgba(74,222,128,0.12)` | sent, approved |
| `warning` | `#FBBF24` on `rgba(251,191,36,0.12)` | pending, cap near |
| `danger` | `#F87171` on `rgba(248,113,113,0.12)` | errors, reject |

### 2.2 Light theme

| Token | Value |
|---|---|
| `bg` | `#F7F9FA` |
| `surface` | `#FFFFFF` |
| `surface-raised` | `#FFFFFF` + `border-strong` |
| `surface-hover` | `#EEF5F7` |
| `border` | `#E1E7EA` |
| `border-strong` | `#C9D2D7` |
| `fg` | `#0B3C49` (petrol 800) |
| `fg-body` | `#232D33` |
| `fg-muted` | `#4D5B64` |
| `fg-subtle` | `#6B7B85` (large text only) |
| `primary` | `#F27A1A` with `primary-fg` `#3F1A06` |
| `brand` | `#1B5767` |
| semantic | `#15803D`, `#B45309`, `#B91C1C` on their 50-level soft backgrounds |

### 2.3 Color rules
- Orange is the flashlight: primary buttons (including "Send on WhatsApp"), the active nav indicator, high-score badges, the focus ring, the logo dot. Nowhere else.
- Never white or light text on orange. Text on orange is `primary-fg`.
- No WhatsApp green anywhere. The send button is orange with the WhatsApp icon.
- Theme follows the system setting by default, with a toggle in settings and on the landing page header. Landing page default: dark.

---

## 3. Typography

Two families, loaded with `next/font/google`:
- **Inter** (variable) for Latin: `font-feature-settings: "cv01", "ss03", "zero"`.
- **Readex Pro** for Arabic. Stack Arabic text on Readex Pro (via `:lang(ar)` or the font stack order with `unicode-range`) so mixed text renders each script in its own font.
- Mono (for counters, IDs, phone numbers when shown as data): **JetBrains Mono** 400, used sparingly.

| Token | Latin size / lh / tracking / weight | Arabic size / lh / weight | Use |
|---|---|---|---|
| `display` | 64 / 1.0 / -0.022em / 510 | 48 / 1.35 / 600 | landing hero (desktop) |
| `h1` | 40 / 1.05 / -0.022em / 510 | 34 / 1.4 / 600 | landing sections, mobile hero |
| `h2` | 28 / 1.15 / -0.012em / 510 | 26 / 1.45 / 600 | page titles in app |
| `h3` | 20 / 1.33 / -0.012em / 510 | 20 / 1.6 / 600 | card and section titles |
| `body-lg` | 17 / 1.6 / 0 / 400 | 18 / 1.8 / 400 | landing paragraphs |
| `body` | 16 / 1.5 / 0 / 400 | 16 / 1.75 / 400 | default |
| `body-sm` | 14 / 1.5 / -0.01em / 400 | 14 / 1.7 / 400 | tables, secondary |
| `caption` | 13 / 1.3 / 0 / 400 | 13 / 1.6 / 500 | labels, badges |
| `micro` | 12 / 1.4 / 0 / 510 | 12 / 1.6 / 500 | meta only, never below 12 |

Rules:
- Negative tracking applies to Latin only. Never letter-space Arabic.
- Latin weights stay in the 400 to 590 band (510 for headings). Arabic headings use 600 because thin Arabic display text looks weak; body 400.
- Mobile body text is 16px minimum. Numbers use `tabular-nums`, Western digits.

---

## 4. Spacing, shape, elevation, layout

- **Base unit 4px.** Allowed: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96. Rhythm ladder: 8 (element gap), 12, 24 (card padding desktop; 16 on mobile), 96 (landing section gap; 48 on mobile).
- **Radii:** buttons and inputs 6px, cards and dialogs 12px, badges 4px, pills and chips 9999px, mobile bottom sheets 12px top. Nothing else.
- **Elevation:** hairline borders (1px `border`, or `inset 0 0 0 1px` via box-shadow) do all separation. Cards have no outer shadow. Only floating layers (menus, popovers, dialogs) get `0 8px 32px rgba(0,0,0,0.5)` in dark, `0 8px 24px rgba(11,60,73,0.10)` in light.
- **App shell:**
  - Desktop: start-side sidebar 240px, `surface` background, hairline end border, compact nav items 32px tall, active item with `surface-hover` fill and a 2px orange indicator on the start edge.
  - Mobile: top bar 56px + bottom nav 64px (+ safe area), active item orange indicator.
  - Content max width 1200px.
- **Touch targets:** 48×48px minimum on mobile even though the visual style is compact (pad the hit area, not the visual).

---

## 5. Components

Every interactive element has default, hover, pressed, focus-visible (2px orange ring, 2px offset), disabled and loading states.

- **Primary button:** orange fill, `primary-fg` text, radius 6, padding 10×16, `body-sm` weight 510 (Arabic 600). Mobile main CTAs 48px tall. One per view.
- **Secondary (ghost) button:** transparent, 1px `border-strong`, `fg-body` text, radius 6. Hover: `surface-hover`.
- **Nav CTA on landing:** white pill (`#FFFFFF` bg, `#061115` text, radius full) in dark; petrol pill in light.
- **Inputs:** `surface` bg, 1px `border-strong`, radius 6, padding 12×14, label above, focus: border `brand` + orange ring.
- **Cards:** `surface`, 1px `border`, radius 12, no shadow. Hover on clickable cards: border `border-strong`, bg `surface-hover`.
- **Badges:** radius 4, padding 0×6, `caption`, soft tinted background + matching text. Neutral badge: `rgba(255,255,255,0.05)` with `fg-muted` (dark).
- **Chips (keywords, categories, reasons):** pill, `rgba(255,255,255,0.05)` bg (dark), `fg-body` text, 1px `border`; selected: `primary-soft` bg with orange text.
- **Score badge:** 36px square with radius 6 (not a circle), tabular number. 70 to 100: `primary-soft` + orange text; 40 to 69: `brand-soft` + `brand`; below 40: neutral.
- **Lead brief card:** "Why now" line in `fg` weight 510, evidence chips row, review summary in `fg-muted`, angle line with a small orange dot. Monospace for counts and phone.
- **Tables (desktop):** no zebra, 44px rows, hairline row dividers, sticky header in `surface`, `body-sm`. Mobile: cards.
- **Toasts, dialogs, sheets:** `surface-raised`, hairline border, the floating shadow above.
- **Empty states:** line icon in `fg-subtle`, `h3`, one `fg-muted` sentence, one primary button.
- **Skeletons:** `surface-hover` blocks with a subtle shimmer, matching the real layout.
- **Stepper, sticky bars, bottom nav:** as in v1 behaviour, restyled with these tokens.

---

## 6. App screens

Keep every screen's structure and behaviour from DESIGN.md v1 section 6 (auth, onboarding interview, dashboard, campaign wizard with probe sample, campaign page with Leads / Review / Send tabs, settings, billing, admin). Apply the new tokens and components. Specifics:
- **Dashboard:** compact stat row in hairline cards with large tabular numbers in `fg` and labels in `fg-muted`; live jobs as thin progress bars in `brand`.
- **Review screen:** the lead brief at the top in a card, the message in a large textarea on `surface`, sticky action bar with ghost Reject, ghost Regenerate, orange Approve.
- **Send screen:** cap counter as a thin bar with a monospace "12 / 30"; each card has one orange "Send on WhatsApp" button.
- **Onboarding interview:** chat bubbles minimal: agent messages as plain text on `bg` with a small logo mark, user messages in `surface-raised` cards aligned to the end side, quick-reply chips under the last agent message, final summary card with an orange Confirm.

---

## 7. Landing page

Dark by default. Sections separated by 96px (48 on mobile), content max 1200px, never 3-column card grids.

1. **Header:** logo lockup (white wordmark in dark), nav links in `fg-body` 13 to 14px, language toggle (العربية / English), theme toggle, white pill "Start free" CTA.
2. **Hero:** oversized headline (`display`), one-line subhead in `fg-muted`, one orange CTA and one ghost secondary ("See how it works"). Below: a large framed screenshot of the real Wasla review screen with a lead brief, in a 12px hairline card, sitting on the only gradient in the system (petrol-black to a faint petrol light at the bottom, subtle).
3. **How it works:** 3 numbered steps in a vertical list on mobile and a horizontal row on desktop (numbers in monospace, no icons-in-circles): tell us what you sell, we find and research the right companies, you review and send on WhatsApp.
4. **The lead brief:** text on one side, a real lead brief card on the other (mirrored in RTL): why now, evidence, what customers say, the suggested opening.
5. **The funnel / transparency:** a real funnel component screenshot: found, removed and why, delivered.
6. **Built for Egypt and MENA:** short copy on Arabic-first, Egyptian Arabic messages, WhatsApp, local data.
7. **Pricing:** plans in a simple 3-row comparison on mobile, side-by-side cards on desktop (prices from the database; show "Contact us" while prices are unset).
8. **FAQ:** accordion with hairline dividers.
9. **Final CTA band** + footer.

Copy is bilingual from the same i18n files as the app. Arabic headlines are written for Arabic readers, not translated word for word.

---

## 8. RTL and bilingual rules

Unchanged from v1 section 7: logical properties only, mirror directional icons only, isolate phone numbers and Latin tokens with `dir="ltr"`, no fixed widths on text containers, test both languages on every screen.

## 9. Motion

120ms for hover and press, 200ms for panels; easing `cubic-bezier(0.2, 0, 0, 1)`; opacity and transform only; respect `prefers-reduced-motion`.

---

## 10. Acceptance checklist

- [ ] No hardcoded colors, sizes, radii or shadows outside token files.
- [ ] Dark and light themes both complete; dark is the landing default; theme follows the system with a toggle.
- [ ] One orange button per view; orange appears only in the allowed places.
- [ ] Contrast ≥ 4.5:1 for body text and ≥ 3:1 for large text and icons in both themes.
- [ ] Latin uses Inter with the tracking rules; Arabic uses Readex Pro with no letter spacing; mixed text renders each script correctly.
- [ ] No horizontal scroll at 375px; primary action visible without scrolling; touch targets ≥ 48px.
- [ ] Cards use hairline borders and no shadows; radii only 4, 6, 12 and full.
- [ ] The landing page uses real Wasla UI screenshots, works in both languages and both themes.
- [ ] Every list has skeleton, empty, error and live states.
- [ ] Before/after screenshots committed in `docs/design-audit/`.

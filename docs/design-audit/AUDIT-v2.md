# Design audit for DESIGN.md v2 ("Midnight precision, Wasla edition")

Process: DESIGN.md v2 section 0. Before screenshots: `docs/design-audit/v2-before/` (the app as it was after the v1 redesign: 14 screens x 375/768/1280 x ar/en x light/dark, 168 images). After screenshots: `docs/design-audit/v2-after/` (same matrix). Both are made by `scripts/design-shots.mjs` against a production build (`next start`), logged in as the e2e test account.

The v1 code was already token-driven, so the audit is about the **gap between v1 and v2**, not about stray hardcoded values. `scripts/design-verify.mjs` confirms there are none in `app/` and `components/`.

## Violations found in the "before" state (v1 against v2)

| # | Area | v1 (before) | v2 requires | Fix |
|---|---|---|---|---|
| 1 | Theme | Light first; dark followed the system | Dark default, light fully designed, toggle | `defaultTheme="dark"` with system option kept; `ThemeIconToggle` in the landing header; the 3-way control stays in settings |
| 2 | Canvas and surfaces | Neutral gray dark (`#0C1114`) | Petrol-tinted near-black: `bg #061115`, `surface #0A1A20`, `surface-raised`, `surface-hover` | New tokens in `app/globals.css`; added `surface-raised`, `surface-hover` |
| 3 | Primary action color | Petrol `primary` buttons, orange only for the send button | Orange is the one primary action color; petrol is `brand` (links, info, progress) | Token rename: old primary becomes `brand`, old accent becomes `primary`; codemod `scripts/v2-rename.py`; `Button` primary and accent are both orange |
| 4 | Text colors | `fg` and `fg-muted` only | `fg`, `fg-body`, `fg-muted`, `fg-subtle`; body text in `fg-body` | `fg-body` token; `body` uses it |
| 5 | Fonts | Readex Pro for everything | Inter for Latin (`cv01 ss03 zero`), Readex Pro for Arabic, JetBrains Mono sparingly | `next/font` Inter and JetBrains Mono added; font stack Inter, Readex Pro, IBM Plex Sans Arabic |
| 6 | Type scale | 30/24/20/18 px, weights 600/700 | display 64/48, h1 40/34, h2 28/26, h3 20, body-sm 14, caption 13, micro 12; Latin 510, Arabic 600, negative tracking Latin only | New classes in `globals.css` (`text-display`, `text-section`, `text-h1`..`text-micro`); RTL overrides remove tracking |
| 7 | Radii | Controls 8, sheets 16 | Buttons and inputs 6, cards 12, badges 4, pills full, sheets 12 | `--radius-*` tokens; new `rounded-badge` |
| 8 | Elevation | Dark used a border ring as shadow | Floating layers only: `0 8px 32px rgba(0,0,0,.5)` dark, `0 8px 24px rgba(11,60,73,.10)` light | `--shadow-float` per theme |
| 9 | Buttons | Secondary on `surface`, hover `surface-muted` | Ghost: transparent, 1px `border-strong`, hover `surface-hover`; `body-sm` weight 510 (Arabic 600) | `components/ui/button.tsx` |
| 10 | Badges and chips | 8px radius, 24px high | Badges radius 4; chips pill with hairline; selected chips `primary-soft` with orange text | `badge.tsx`, chips in lead brief, wizard |
| 11 | Score badge | 40px circle, orange ring for high | 36px square radius 6, tabular number; 70-100 `primary-soft`, 40-69 `brand-soft`, below 40 neutral | `score-badge.tsx` |
| 12 | Navigation | 248px sidebar, 48px items, brand-soft active | 240px, 32px items, `surface-hover` fill with a 2px orange start-edge indicator; mobile active item with an orange top indicator | `app-nav.tsx` |
| 13 | Tables | 56px rows, muted header | 44px rows, hairline dividers, sticky `surface` header, hover `surface-hover` | `table.tsx` |
| 14 | Skeletons | `animate-pulse` | Subtle shimmer on `surface-hover` | `.shimmer` utility, `skeleton.tsx` |
| 15 | Focus ring | Orange 2px (2.6:1 on the light canvas) | 2px orange, offset 2, at least 3:1 | New `--focus` token (orange-600 in light) |
| 16 | Logo on dark | Petrol wordmark on a dark canvas (low contrast) | White wordmark in dark | `public/brand/wasla-logo-on-dark.svg` (same artwork, wordmark fill white; not redrawn) and `BrandLogo` |
| 17 | Landing page | 3 sections, no product visuals, 3-column cards | 9 sections of section 7, real UI screenshots, no 3-column card grids | `app/page.tsx` rebuilt; copy in `lib/i18n/*` (`landing`); screenshots from `/preview` |
| 18 | Dashboard stats | `text-display` 30px | Compact stat row, large tabular numbers in `fg` | `text-stat` |
| 19 | New screens (interview, lead brief, funnel) | Styled with v1 tokens | Same v2 treatment | Inherit the token and component changes; brief card padding and chips updated |

## What was kept (v2 says so or does not change it)
Screen structures and behaviour (DESIGN v1 section 6), the RTL rules (logical properties), motion values (120/200 ms), 48px touch targets on mobile, the four states on data screens, the logo and its colors.

## Decisions to review
- **Theme default:** v2 says both "dark is the default" and "theme follows the system by default". I made dark the default for new visitors and kept "System" as an explicit choice in settings.
- **`text-h3` is 17px, not 20px.** v2 gives h3 20px for card titles; in the dense app screens that made cards too heavy, so app cards use 17px and `text-h2` (20px) is used where a section title is wanted. Landing section titles use the v2 sizes (`text-section`, `text-display`).
- **Two orange buttons on the landing page** (hero and final CTA band). They are far apart (never in the same viewport), which I read as satisfying "one orange button per view".
- **Landing screenshots use sample data** (a fictional agency) rendered by the real components at `/preview` (disabled unless `PREVIEW_ROUTES=1`). The funnel numbers are from the real Alexandria fixture run. The sample message text is hand-written, not model output.

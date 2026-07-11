# Ultima High-Octane Design System Alignment

## Context

The homepage built in the previous pass (see `2026-07-10-ultima-homepage-design.md`) approximated the "Ultima High-Octane" brand from a text brief, making reasonable guesses where the brief was vague (exact hex values, font substitutes, spacing scale, card layouts). The user has since provided `design.md` — a precise, authoritative design-token export (Material-Design-3-style palette, typography scale, spacing/radius scale, and explicit component specs for buttons, cards, navigation, forms, and testimonials).

This pass aligns the existing implementation to that authoritative source. It corrects token values that were approximated (e.g. the actual Secondary color), introduces one real architectural addition (a two-tier corner-radius system, since design.md wants sharp containers but soft/pill interactive elements — the current single `--brand-radius` token drives both), and rebuilds several components whose visual structure differs meaningfully from the brief-era guess (Vehicle/Trend Cards, Category Cards, Navigation, Testimonials).

This is a **restyle and restructure** of existing components, not new pages or new functionality. No new routes, no new data model, no new forms.

## Decisions locked in with the user

1. **Scope**: full alignment — design tokens, all 9 homepage sections, and the global `Header`/`Footer` (shared across every `(site)` page, not homepage-only) — so the brand is consistent site-wide, not just on `/`.
2. **Radius architecture**: add a second per-tenant token, `radiusInteractive`, alongside the existing `radius` field on `DealershipConfig`. `radius` continues to drive sharp containers/cards (`0px` for Ultima); `radiusInteractive` drives buttons/inputs (`9999px` pill for Ultima). Both flow through the same CSS-variable injection pattern already established in `layout.tsx` (`--brand-primary`/`--brand-secondary`/`--brand-radius` → now also `--brand-radius-interactive`).
3. **Testimonial avatars**: no real customer photos (unchanged constraint from the previous pass). Approximate design.md's "dual-circle image overlap" with two overlapping `Avatar`/`AvatarFallback` (initials) circles instead of photographs.
4. **Heading font**: keep Archivo Black (already wired, already used everywhere) as the Coolvetica substitute — Coolvetica is still not available via `next/font/google`. No change here.
5. **Body font**: switch from Geist Sans to **Inter** (design.md specifies Inter for body/label/meta text, and Inter *is* available via `next/font/google` — no substitute needed, this is the real font).
6. **`DealershipConfig` stays lean**: only `secondaryColor` (value-corrected) and the new `radiusInteractive` field are added to the tenant config. The rest of design.md's detailed M3 token set (surface-container variants, on-surface, outline, tertiary accent, etc.) becomes Ultima-specific CSS custom properties in `globals.css`, not new generic per-tenant config fields — those tokens are this design's implementation detail, not a knob every future tenant needs.
7. **Heading casing**: every `font-heading` element that currently renders `uppercase` switches to `lowercase`. Scoped precisely to elements combining `font-heading` + `uppercase` (12 occurrences across `hero.tsx`, `about.tsx`, `categories-scroller.tsx` (both the section heading and the category card label), `finance-calculator.tsx` (section heading only), `inventory-grid.tsx`, `lead-footer.tsx`, `testimonials.tsx`, `trade-in.tsx` (both headings), `trend-vehicles.tsx`, `vehicle-card.tsx`). Finance Calculator's "Estimated Monthly Payment" caption (`text-sm uppercase` with no `font-heading`) is body-font microcopy, not a heading — it stays uppercase, unaffected.

## Token corrections and additions

**`src/types/dealership.ts`** (`dealershipConfigSchema`): add `radiusInteractive: z.string().default("9999px")` alongside the existing `radius` field.

**`src/lib/dealership/mock-data.ts`** (`ULTIMA_DEALERSHIP_CONFIG`):
- `secondaryColor`: `"#f9f9f9"` → `"#D8D6D3"` (design.md's actual Secondary — `#f9f9f9` was really the Surface/Background value, which `Section`'s light tone already hardcodes separately and is unaffected by this field).
- Add `radiusInteractive: "9999px"`.

**`src/app/layout.tsx`**: inject a third CSS variable, `"--brand-radius-interactive": dealership.radiusInteractive`, alongside the existing two in the `<html>` inline style.

**`src/app/globals.css`**:
- New `--brand-radius-interactive` variable (fallback `9999px`, matching the pattern of `--brand-radius`'s `0.625rem` fallback) and a new `--radius-interactive` theme token derived from it, available as a Tailwind arbitrary-value/utility source for buttons and inputs.
- New Ultima-specific accent tokens as plain CSS custom properties (not per-tenant config): `--ultima-tertiary: #A6A3A0`, `--ultima-surface-container: #eeeeee`, `--ultima-outline-variant: #c4c7c7` — only the specific values actually consumed by components below are added, not the full M3 set from design.md (YAGNI — no point defining tokens nothing reads).
- Swap the body font family reference in `@theme inline` from the Geist Sans variable to the new Inter variable (see below).

**`src/app/layout.tsx`** (font loaders): replace the `Geist` import/loader with `Inter` from `next/font/google` (`variable: "--font-geist-sans"` → keep the CSS variable name `--font-sans`-facing behavior unchanged so no component needs to change its class names; only the underlying font-loading call changes). Archivo Black loader is untouched.

## Component changes

### Buttons (`src/components/ui/button.tsx`)
The `buttonVariants` base class's `rounded-lg` (which currently resolves through `--radius-lg` → `--radius` → `--brand-radius` → `0px` for Ultima) changes to reference the new `--radius-interactive` token instead, so buttons render pill-shaped for Ultima while cards/containers stay sharp. This is a global change to the shared `Button` primitive — every button site-wide (WhatsApp CTAs, form submits, nav links, dashboard buttons) picks up the new radius token. Because `radiusInteractive` defaults to `9999px` in the schema, this also changes the *default* button shape for any tenant/page that doesn't set an explicit value — including the dashboard/auth foundation, which today renders buttons via the same `0.625rem`-default path. This is an intentional, broad side effect of changing the shared primitive (see Out of Scope below), not a regression scoped only to Ultima.

### Inputs (`src/components/ui/input.tsx`)
Border color and radius updated to design.md's spec: `border-[#D8D6D3]` (hardcoded, since this is a literal color from the spec, consistent with how other literal Ultima hex values are already hardcoded in homepage components) and radius via a fixed `8px` (design.md explicitly calls out inputs as `8px`, distinct from the button's pill radius — inputs do not use `--radius-interactive`, they get their own fixed value since design.md specifies a different number for them).

### VehicleCard / Trend Cards (`src/components/site/homepage/vehicle-card.tsx`)
Restructured per design.md's Trend Card spec, keeping the same props (`vehicle`, `dealership`, `className`) and the same WhatsApp-inquire-link behavior:
- Image block aspect ratio changes from `aspect-[4/3]` to `aspect-[4/5]`.
- Vehicle name/year/mileage move from a text block *below* the image to an overlay positioned at the *top* of the image (absolutely positioned over the gradient-placeholder block, white text with a subtle scrim/gradient for legibility — no real photo, so the overlay sits on the existing gradient placeholder).
- Price and the "Inquire" button move into a white bottom action bar (replacing the current black card body) — `bg-white text-[#0d0d0d]` bar spanning the card width, price on the left, pill-shaped black "Inquire" button on the right.
- This affects both `TrendVehicles` and `InventoryGrid`, which both consume `VehicleCard` — matches the existing "same card style" pattern from the previous pass, no change to that pairing.

### Category Cards (`src/components/site/homepage/categories-scroller.tsx`)
Cards rebuilt from plain text link-cards to design.md's spec: white background (`bg-white`), centered `Car` icon (lucide, reused as the silhouette placeholder — same icon already used in `VehicleCard`), a small arrow-up-right icon (`ArrowUpRight` from lucide) in the top-right corner, and the category label as metadata text at the bottom. Same `/inventory` links, same horizontal snap-scroll container from the previous pass — only the individual card's internal layout changes.

### Navigation (`src/components/site/header.tsx`, global)
- Sticky bar background changes from solid `bg-background` to a glassmorphic treatment: semi-transparent dark tint with `backdrop-blur-lg` (design.md: "high-density backdrop blur (20px+) with a semi-transparent dark tint").
- Desktop nav link layout (logo left, links + CTA right) is unchanged structurally — only the bar's background/blur changes.
- Mobile: the existing `Sheet`-based menu trigger becomes a floating hamburger button (already roughly this today — `Sheet` trigger positioned top-right), and the `SheetContent` overlay gets the same backdrop-blur/dark-tint treatment as the desktop bar, approximating design.md's "full-screen blurred overlay" without swapping the underlying `Sheet` primitive (still Base UI's `Dialog`-backed sheet — just restyled to look full-screen and blurred, not a new overlay mechanism).

### Testimonials (`src/components/site/homepage/testimonials.tsx`)
- Avatar: two `Avatar`/`AvatarFallback` circles per testimonial, overlapping via negative margin (`-ml-4` on the second). Design content only has one name per testimonial today, so both circles show the same initials (no new data field added) — a visual approximation of the "dual-circle" look, not a data model change.
- Star color: `Star` icons switch from `fill-white text-white` to the new tertiary accent (`fill-[var(--ultima-tertiary)] text-[var(--ultima-tertiary)]`, i.e. `#A6A3A0`).

## Out of scope (explicitly not built this pass)

- No new pages, no new routes.
- No real photography anywhere (vehicles, testimonials) — placeholders stay placeholders, per the standing constraint.
- No changes to Trade-In/Lead Footer form *behavior* (validation, stubbed submission) — only their `Input` component's visual styling changes, inherited from the global `input.tsx` change.
- No changes to the dashboard/auth foundation's visual design — the `radiusInteractive` schema default (`9999px`) technically changes the *default* pill look for any tenant/dashboard button that doesn't set an explicit radius, which is a broad but intentional side effect of the shared `Button` primitive change (see Button section above); no dashboard-specific styling is added or removed beyond that token-driven shift.
- No literal implementation of design.md's `Inputs & Forms` "Location/Date/User" icon fields — that describes a booking/search widget this site doesn't have; the 8px-radius/`#D8D6D3`-border styling still applies to the forms that do exist (Trade-In, Lead Footer, Finance Calculator).

## Verification

1. `npx tsc --noEmit`, `npm run lint`, `npm run build` — clean, as with every prior pass.
2. Dev server + curl: confirm `--brand-radius-interactive:9999px` and the corrected `--brand-secondary:#D8D6D3` appear in the homepage's inline `<html>` style output.
3. Structural greps: confirm new class markers exist (e.g. `aspect-[4/5]` in the vehicle card output, `backdrop-blur` in the header output, `ArrowUpRight`-derived SVG markup in the category cards).
4. Manual visual pass (grep can't verify visual correctness) — explicitly called out in the implementation plan for a human/screenshot check: Trend/Inventory cards show the image-overlay + white-bottom-bar layout; Category cards show white background + car icon + corner arrow; header shows visible blur/transparency over page content when scrolled; buttons are visibly pill-shaped while cards remain sharp-cornered; testimonials show two overlapping circles per card.
5. `npm run dev` smoke test on `/`, `/login` (to confirm the global nav change didn't break the `(auth)` route group, which doesn't use `Header` but shares nothing broken by this change), and a direct check that `/dashboard` (behind the stub login) still renders correctly with the new pill-button default.

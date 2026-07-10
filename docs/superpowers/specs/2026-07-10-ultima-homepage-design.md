# Ultima.cars Homepage Design

## Context

A Google Stitch project brief for "Ultima.cars" (a "High-Octane" automotive brand: deep charcoal/off-white palette, zebra-striped dark/light sections, bold display typography, sharp corners) was provided as the design to apply to the Dealio v6 public homepage. Dealio's foundation (built earlier) has a generic per-tenant color-swap system (`--brand-primary`/`--brand-secondary`/`--brand-radius` driven by `DealershipConfig`) and a placeholder "Demo Motors" tenant with neutral shadcn styling.

Ultima.cars is being treated as **the concrete demo tenant**, not a redesign of Dealio's generic system look. This dealership's specific, fully custom homepage gets built to match the brief; other future dealerships would get their own distinct designs later using the same underlying `DealershipConfig`/token mechanism — nothing about the token *system* changes, only the values for this one tenant and the homepage components that render them.

The Stitch MCP server (`stitch.googleapis.com/mcp`) could not be used to pull this design programmatically — it returns a malformed JSON Schema (`can't resolve reference #/$defs/ScreenInstance from id #`) on every tool-list attempt, confirmed after two remove/re-add cycles. The brief was applied from the pasted project document instead.

## Decisions locked in with the user

1. **Scope**: Ultima.cars is the concrete demo tenant. Replace "Demo Motors" mock data with real Ultima.cars branding; the generic multi-tenant token system is unchanged.
2. **Images**: placeholder imagery for now (correct layout/spacing/hover states); real photography swaps in later via the same `imageUrl` fields, no layout changes needed.
3. **Headline font**: Coolvetica (named in the brief) isn't available via `next/font/google` (not a Google Font, licensed/freeware). Substitute **Archivo Black** — free, bold, condensed-industrial, closest legal match. Body copy stays on the foundation's existing Geist Sans.
4. **Finance Calculator / Trade-In form / Lead Footer form**: fully interactive. Calculator does real monthly-payment math client-side. Forms have real client-side validation and a stubbed submit (shows a success state, no persistence) — consistent with how Firebase itself is stubbed elsewhere in the foundation. Wiring to a real `Lead` model/Firestore is separate future scope.
5. **Sub-pages**: homepage only. "Car Categories & Fleet" and "Contact & Inquiry" stay unbuilt; existing nav links to `/inventory` and `/contact` continue pointing at the foundation's existing "Coming soon" placeholders.
6. **Component architecture**: per-section components (matching the existing `header.tsx`/`footer.tsx` convention) plus a shared `<Section tone="dark" | "light">` wrapper, since half the sections repeat the same dark treatment and half repeat the same light treatment.

## Data & tokens

**Dealership mock data** (`src/lib/dealership/mock-data.ts`): update the existing "Demo Motors" fixture in place —
- `name: "Ultima.cars"`
- `primaryColor: "#0d0d0d"` (deep charcoal)
- `secondaryColor: "#f9f9f9"` (off-white surface)
- Add `radius: "0px"` sourced into the existing `--brand-radius` CSS variable (already wired in `src/app/globals.css` from the foundation — the brief's "Round Four" sharp-corner requirement needs no new token, just a new value for this tenant).

Since `DealershipConfig`/`dealershipConfigSchema` (`src/types/dealership.ts`) has no radius field today, add an optional `radius` string field (CSS length, e.g. `"0px"`), defaulting to `"0.625rem"` when omitted — the same value already hardcoded as the `--brand-radius` fallback in `globals.css`, so tenants that don't set it keep today's rounded shadcn look. Thread the resolved value into `src/app/layout.tsx`'s existing inline-style injection alongside `--brand-primary`/`--brand-secondary`.

**Typography**: add **Archivo Black** via `next/font/google` in `src/app/layout.tsx` (alongside the existing Geist Sans/Mono loaders), exposed as a `--font-heading` CSS variable. Homepage section headlines use this; body copy and the rest of the app keep Geist Sans.

**New `Vehicle` type** (`src/types/vehicle.ts`): `{ id: string; make: string; model: string; year: number; price: number; mileage: number; imageUrl: string; category: "new" | "used"; featured: boolean }`. Added to the `src/types/index.ts` barrel.

**Mock vehicle data** (`src/lib/vehicles/mock-data.ts`): ~9 placeholder entries spanning both categories, 3–4 flagged `featured: true` for the Trend Vehicles section. Explicitly commented as a homepage-only placeholder that the future real Inventory feature (Firestore-backed, per the original product spec) replaces — not the start of that feature now.

## Shared primitive & page composition

**`src/components/site/homepage/section.tsx`** — `<Section tone="dark" | "light">` wrapping `children`. Owns:
- Background: `bg-[#0d0d0d] text-white` (dark) or `bg-[#f9f9f9] text-[#0d0d0d]` (light)
- Vertical padding: `py-12 md:py-20`
- Full-width container with the existing `max-w-6xl` content constraint used elsewhere in the site layout

**`src/app/(site)/page.tsx`** — replaced with a thin composition of the 10 section components in brief order (Hero → Categories → Trend Vehicles → About → Inventory Grid → Finance Calculator → Trade-In → Testimonials → Lead Footer). The existing `(site)/layout.tsx` global `<Header>`/`<Footer>` are unchanged and still wrap this page.

## Section components (`src/components/site/homepage/`)

| File | Tone | Notes |
|---|---|---|
| `hero.tsx` | dark | 700px fixed height, full-bleed placeholder background image, Archivo Black headline + subhead, primary CTA (WhatsApp, reusing the existing `wa.me` link pattern from the current homepage) |
| `categories-scroller.tsx` | light | Horizontal `overflow-x-auto` snap-scroll of category cards (New/Used/body style), touch-friendly, positioned directly below Hero per the brief's reordering |
| `trend-vehicles.tsx` | dark | Filters mock vehicles by `featured: true`; black cards, white primary buttons, hover-lift transform |
| `about.tsx` | light | Two-column split (headline left, narrative right), stacks to one column on mobile |
| `inventory-grid.tsx` | dark | 9-card grid (3×3 desktop, 1-col mobile), reuses the same vehicle-card component as Trend Vehicles for visual consistency, "See All Inventory" CTA linking to the existing `/inventory` placeholder |
| `finance-calculator.tsx` | dark | Client component; price/down-payment/APR/term inputs, live monthly-payment calculation |
| `trade-in.tsx` | light | Valuation lead form (year/make/model/mileage/contact), validated, stubbed submit |
| `testimonials.tsx` | dark | Headshot placeholders + star ratings grid, completes the zebra alternation before the footer |
| `lead-footer.tsx` | — | "Need a car?" contact form (name/phone/message), same validated/stubbed-submit pattern, sits directly above the existing global `<Footer>` |

A shared vehicle-card component (`src/components/site/homepage/vehicle-card.tsx`) is used by both `trend-vehicles.tsx` and `inventory-grid.tsx` to avoid duplicating the card markup, per the brief's "following the Trend Vehicles card style" requirement for the Inventory Grid.

## Interactive logic

**Finance calculator**: standard amortization formula, `M = P × [r(1+r)^n] / [(1+r)^n − 1]`, where `r` = monthly rate (APR / 12 / 100) and `n` = term in months. Recomputed on every input change via `useState`; no debounce (cheap arithmetic, no network).

**Trade-In / Lead Footer forms**: plain controlled inputs, no new form-library dependency (matches the foundation's dependency-light approach — the login form also uses plain controlled inputs). A small manual validation function checks required fields and phone/email format. On valid submit: local `submitted` state flips to show a success message; no network call, no persistence — a comment in each form notes this is a placeholder for a future `Lead` model + Firestore write.

## Verification

1. `npx tsc --noEmit` and `npm run build` — clean, as with the foundation.
2. Dev server, visit `/` — all 9 non-header/footer sections render in brief order with correct dark/light zebra alternation and the `#0d0d0d`/`#f9f9f9` palette visible via devtools (through `--brand-primary`/`--brand-secondary`).
3. Finance calculator: enter known values (e.g. $30,000 price, $5,000 down, 6% APR, 60 months) and confirm the computed monthly payment matches a manual amortization calculation.
4. Submit Trade-In and Lead Footer forms with valid and invalid data — confirm validation blocks bad input and valid submissions show the success state.
5. Resize to mobile width — hero, categories scroller, and inventory grid all reflow correctly (grid to single column, scroller remains horizontally swipeable).
6. `npm run lint` — clean.

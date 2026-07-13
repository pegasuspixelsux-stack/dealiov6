# Vehicle Detail Page — Phase 1 — Design

## Context

The site currently has no way to view a single vehicle in depth. `VehicleCard` (used on the homepage's "Vehículos 0km" and "Vehículos Usados" sections) shows only a thumbnail, basic stats, and a WhatsApp inquiry button — it isn't a link to anywhere. The homepage's "Ver Todo el Inventario" buttons already point at `/inventory`, but that route doesn't exist yet (404).

This is Phase 1 of a larger "Vehicle Detail Page" spec the user pasted, which was decomposed into three phases because it bundles several independent subsystems:

- **Phase 1 (this spec)**: expanded Vehicle data model, Add Vehicle modal updated to capture it, a public inventory listing page, and the vehicle detail page core (gallery, header, description, equipment, WhatsApp + contact form).
- **Phase 2 (future)**: finance calculator card and trust elements section on the detail page.
- **Phase 3 (future)**: similar vehicles, sticky contact bar, SEO structured data (schema.org Vehicle/Offer/Organization markup, meta tags).

## Explicitly out of scope (this phase)

- Finance calculator card on the detail page.
- Trust elements (dealer hours, address, financing partner, reviews) on the detail page.
- Similar vehicles section.
- Sticky contact bar.
- SEO meta tags / structured data generation.
- Editing or deleting vehicles (still add-only, matching the existing Inventory feature's scope).
- Multi-currency support, filters/search beyond `?make=` on the inventory listing page.
- Grouping equipment into Seguridad/Confort/Tecnología categories (flat list only).

## Data model changes

### `Vehicle` (`src/types/vehicle.ts`)

New fields, all with safe fallback defaults on read so pre-existing vehicle documents (which lack these fields) don't break:

```ts
export type Fuel = "nafta" | "diesel" | "hibrido" | "electrico";
export type Transmission = "manual" | "automatica";
export type VehicleStatus = "disponible" | "reservado" | "vendido";

export interface Vehicle {
  // ...existing fields (id, dealershipId, make, model, year, price, mileage, imageUrls, category, featured)
  version: string;
  fuel: Fuel;
  transmission: Transmission;
  location: string;
  financingAvailable: boolean;
  status: VehicleStatus;
  description: string;
  features: string[];
}
```

`vehicleSchema` gains matching zod validators (`z.enum` for fuel/transmission/status, `z.string()` for version/location/description, `z.boolean()` for financingAvailable, `z.array(z.string())` for features). `getVehicles`'s existing `safeParse`-and-filter hardening means any doc missing these fields simply fails validation and is skipped from the read — so as part of this phase, `getVehicles` needs a one-time default-backfill shim OR (simpler, chosen here) the schema treats the new fields as `.default(...)` in zod so old docs parse successfully with sensible fallbacks (`features: []`, `status: "disponible"`, `financingAvailable: false`, `fuel`/`transmission`/`version`/`location`/`description` default to empty string / a neutral enum value). This avoids a data migration.

### `Lead` (`src/types/lead.ts`)

New optional fields, for the detail page's contact form:

```ts
export interface Lead {
  // ...existing fields
  email?: string;
  preferredContact?: "whatsapp" | "email" | "phone";
}
```

`leadSchema` gains `email: z.string().email().optional()` and `preferredContact: z.enum(["whatsapp", "email", "phone"]).optional()`.

## Price formatting

A shared helper (`src/lib/format-price.ts`, new) replaces the scattered `${vehicle.price.toLocaleString(...)}` calls:

```ts
export function formatPrice(price: number): string {
  return `US$${price.toLocaleString("en-US")}`;
}
```

Used in `VehicleCard`, `FinanceCalculator`'s result display, and the new vehicle detail page. This is a pure display change — no currency field is added to `Vehicle`, per your answer that the whole site should assume a single fixed currency (USD).

## Dashboard: Add Vehicle modal

`src/app/(dashboard)/dashboard/inventory/add-vehicle-modal.tsx` gains form fields for every new `Vehicle` field:

- `version` — text input
- `fuel` — `<select>` (Nafta / Diesel / Híbrido / Eléctrico)
- `transmission` — `<select>` (Manual / Automática)
- `location` — text input
- `financingAvailable` — checkbox
- `status` — `<select>` (Disponible / Reservado / Vendido), defaulting to Disponible
- `description` — `<textarea>`
- `features` — a fixed checklist of checkboxes (not a free-text/tag input), values collected into a `string[]` on submit. The checklist (flattening the spec's Seguridad/Confort/Tecnología categories into one list, since Phase 1 keeps features flat):

  Airbags, ABS, Control de estabilidad, Cámara de retroceso, Sensores de estacionamiento, Aire acondicionado, Pantalla multimedia, Bluetooth, Asientos eléctricos, Apple CarPlay, Android Auto, Keyless entry, Puerto USB de carga

`createVehicleAction` (`src/app/(dashboard)/dashboard/inventory/actions.ts`) reads these new fields from `FormData`, validates via the updated `vehicleSchema`, and persists them alongside the existing fields. No changes to the existing photo-upload flow.

## Public inventory listing page

New route: `src/app/(site)/inventory/page.tsx`.

- Server Component; fetches `getVehicles(dealership.id)`.
- Reads the `make` search param (`?make=Toyota`, already generated by `BrandScroller`'s links) and filters vehicles case-insensitively by `make` when present.
- Renders results in a responsive grid using `VehicleCard`, matching the visual density of the homepage's "Vehículos Usados" section.
- Empty state: "No hay vehículos disponibles" when the (possibly filtered) list is empty.
- Each card links to `/inventory/[id]`.

## `VehicleCard` becomes a link

`VehicleCard` (`src/components/site/homepage/vehicle-card.tsx`) is wrapped in a `next/link` `Link` to `/inventory/{vehicle.id}` everywhere it's rendered (homepage's 0km/Usados sections *and* the new inventory listing page) — approved per your answer that homepage cards should also become clickable.

Because the card's WhatsApp "Consultar" button (`VehicleInquiryButton`) lives inside the now-link-wrapped card, its click handler calls `event.stopPropagation()` (and `event.preventDefault()` on the trigger) so opening the inquiry dialog doesn't also navigate to the detail page.

## Vehicle detail page

New route: `src/app/(site)/inventory/[id]/page.tsx`.

- Server Component; looks up the vehicle by `id` from `getVehicles(dealership.id)` (Phase 1 doesn't need a dedicated `getVehicleById` — filtering the existing list is sufficient at this scale, matching the codebase's YAGNI conventions elsewhere). Calls Next.js `notFound()` if no match.
- **Layout**: two-column CSS grid, 65/35 split on desktop (`lg:grid-cols-[65fr_35fr]` or equivalent), single column stacked on mobile with vehicle info (header, gallery, description, equipment) ordered before the contact actions.
- **Header**: `<h1>` title as `{make} {model} {version} {year}`; an info row of small stat chips (brand, model, year, mileage, fuel label, transmission label, location); a status badge (color-coded: Disponible=green, Reservado=yellow, Vendido=grey) computed from `status`; price via `formatPrice`; a "Financiación disponible" badge shown only when `financingAvailable`.
- **Photo gallery** (left column, Client Component for interactivity): main image at 16:9 with rounded corners, sourced from `imageUrls[activeIndex]`; thumbnail strip below showing all `imageUrls`, clicking one sets `activeIndex`; clicking the main image opens a full-screen viewer using the existing `Dialog` component, with prev/next controls and basic touch-swipe (via `onTouchStart`/`onTouchEnd` delta comparison — no new dependency).
- **Description**: `vehicle.description` rendered as a paragraph under a "Descripción" heading. If empty, the section is omitted.
- **Equipment**: `vehicle.features` rendered as a pill/tag grid under an "Equipamiento" heading. If empty, the section is omitted.
- **Right column**: the existing `VehicleInquiryButton` component (large WhatsApp CTA, reused as-is) plus a new `VehicleContactForm` Client Component ("Solicitá información") with fields name, phone, email, message, and a preferred-contact radio group (WhatsApp/Email/Teléfono) — submits via `createLeadAction` with `source: "vehicle_inquiry"`, populating the new `email`/`preferredContact` fields, following the codebase's mandatory try/catch/finally pattern for client components calling Server Actions.

## Verification approach

Matches this codebase's established convention — no automated test runner exists:

1. `npx tsc --noEmit` after each task.
2. Throwaway `scripts/manual-verify-*.ts` round-trips against real Firestore for schema/read changes (deleted before commit).
3. Manual browser walkthrough at the end: add a vehicle with all new fields via the dashboard modal, confirm it appears correctly on `/inventory`, click through to `/inventory/[id]` and confirm every section renders (gallery incl. full-screen viewer and swipe, description, equipment, status/financing badges, both contact paths), confirm `?make=` filtering works from a Brand Scroller click, confirm homepage cards now navigate correctly while the WhatsApp button still opens its dialog without navigating.

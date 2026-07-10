# Ultima.cars Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic placeholder homepage with the full 9-section Ultima.cars "High-Octane" design (dark/light zebra-striping, Archivo Black display type, sharp corners, mock vehicle inventory, interactive finance calculator, and two stubbed lead-capture forms), per `docs/superpowers/specs/2026-07-10-ultima-homepage-design.md`.

**Architecture:** A shared `<Section tone="dark"|"light">` primitive owns the zebra background/padding; nine per-section components (`src/components/site/homepage/*.tsx`) each wrap in it and are composed in order by `src/app/(site)/page.tsx`. Branding (colors, corner radius) and content (dealership name/contact info, mock vehicles) flow from the existing `DealershipConfig`/`Vehicle` data layer — no new backend, no new dependencies beyond one shadcn component.

**Tech Stack:** Next.js 16 App Router (Server Components by default, `"use client"` only where interactivity is required), Tailwind v4 CSS-variable theming, shadcn/ui on Base UI (use the `render` prop, not `asChild` — this codebase is on Base UI, not Radix), `next/font/google`, zod.

## Global Constraints

- No test runner is configured in this repo (matches the existing foundation code — verified by inspecting `package.json`). Every task's "test" step is `npx tsc --noEmit` (type-checks the new/changed files via the project's `**/*.tsx` include glob even before they're imported anywhere) plus, where noted, a manual dev-server/curl check. Do not add a test framework as part of this plan — out of scope.
- shadcn/ui in this repo is Base UI-based (`@base-ui/react`), not Radix. Any composed trigger/button-as-link must use `render={<Element .../>}`, never `asChild`. This is already established in `src/components/site/header.tsx` — follow that exact pattern.
- No real images: all vehicle/hero imagery is a CSS gradient placeholder block (no `next/image`, no `next.config.ts` changes, no network calls) so rendering is fully deterministic offline. `Vehicle.imageUrl` stays in the data model for future use but is not rendered yet.
- Ultima.cars brand colors: primary `#0d0d0d` (deep charcoal), secondary `#f9f9f9` (off-white). Corner radius: `0px` (sharp corners). These are tenant data values, not new CSS tokens — the token plumbing (`--brand-primary`/`--brand-secondary`/`--brand-radius`) already exists from the foundation.
- Headline font: **Archivo Black** via `next/font/google` (verified present: `export declare function Archivo_Black` in `node_modules/next/dist/compiled/@next/font/dist/google/index.d.ts:1031`, single weight `'400'`). Body copy stays on the existing Geist Sans.
- Forms (Trade-In, Lead Footer) and the Finance Calculator are fully interactive client-side; form submissions are stubbed (local success state only, no persistence) — comment this explicitly in each form's submit handler.

---

### Task 1: Add tenant radius field and switch mock dealership to Ultima.cars

**Files:**
- Modify: `src/types/dealership.ts`
- Modify: `src/lib/dealership/mock-data.ts`
- Modify: `src/lib/dealership/config.ts`

**Interfaces:**
- Consumes: existing `dealershipConfigSchema` (Zod), existing `DealershipConfig` type, existing `getDealershipConfig`/`resolveDealershipId`/`DEFAULT_DEALERSHIP_ID` exports from `src/lib/dealership/config.ts`.
- Produces: `DealershipConfig.radius: string` (new field, defaults to `"0.625rem"` when omitted from raw data). `ULTIMA_DEALERSHIP_CONFIG` export from `src/lib/dealership/mock-data.ts` (replaces `DEMO_DEALERSHIP_CONFIG`). `DEFAULT_DEALERSHIP_ID` fallback becomes `"ultima-cars"`.

- [ ] **Step 1: Add the `radius` field to the dealership schema**

In `src/types/dealership.ts`, find:

```ts
export const dealershipConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  logoUrl: z.string().optional(),
  primaryColor: z.string(),
  secondaryColor: z.string(),
  phone: z.string(),
```

Replace with:

```ts
export const dealershipConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  logoUrl: z.string().optional(),
  primaryColor: z.string(),
  secondaryColor: z.string(),
  radius: z.string().default("0.625rem"),
  phone: z.string(),
```

- [ ] **Step 2: Replace the mock dealership fixture with Ultima.cars**

Overwrite `src/lib/dealership/mock-data.ts` entirely with:

```ts
import type { DealershipConfig } from "@/types";

export const ULTIMA_DEALERSHIP_CONFIG: DealershipConfig = {
  id: "ultima-cars",
  name: "Ultima.cars",
  logoUrl: undefined,
  primaryColor: "#0d0d0d",
  secondaryColor: "#f9f9f9",
  radius: "0px",
  phone: "+1 (555) 010-0100",
  whatsapp: "+15550100100",
  email: "sales@ultima.cars.example",
  address: "123 Auto Row, Springfield, ST 00000",
  mapsLocation: { lat: 39.7817, lng: -89.6501 },
  hours: {
    monday: "9:00 AM - 7:00 PM",
    tuesday: "9:00 AM - 7:00 PM",
    wednesday: "9:00 AM - 7:00 PM",
    thursday: "9:00 AM - 7:00 PM",
    friday: "9:00 AM - 7:00 PM",
    saturday: "9:00 AM - 5:00 PM",
    sunday: "Closed",
  },
  socialLinks: {},
  financePartner: undefined,
  tradeInSettings: { enabled: true, minYear: 2005 },
  seoDefaults: {
    title: "Ultima.cars — High-Octane Automotive Experience",
    description:
      "Discover, finance, and trade in premium vehicles at Ultima.cars.",
  },
};
```

- [ ] **Step 3: Update the config module's import and default tenant id**

In `src/lib/dealership/config.ts`, replace the whole file with:

```ts
import { dealershipConfigSchema, type DealershipConfig } from "@/types";
import { ULTIMA_DEALERSHIP_CONFIG } from "./mock-data";

export const DEFAULT_DEALERSHIP_ID =
  process.env.NEXT_PUBLIC_DEFAULT_DEALERSHIP_ID ?? "ultima-cars";

/**
 * Resolves which dealership a request belongs to. Today this always returns
 * the default tenant; `host` is threaded through now so a real
 * subdomain/custom-domain -> dealershipId lookup (Firestore) can replace the
 * body later without changing any call sites.
 */
export function resolveDealershipId(host: string | null): string {
  void host;
  return DEFAULT_DEALERSHIP_ID;
}

/**
 * Returns the resolved dealership's config. Backed by a hardcoded fixture
 * today; a real implementation fetches `dealerships/{dealershipId}` from
 * Firestore and parses it through the same schema.
 */
export function getDealershipConfig(
  dealershipId: string = DEFAULT_DEALERSHIP_ID
): DealershipConfig {
  void dealershipId;
  return dealershipConfigSchema.parse(ULTIMA_DEALERSHIP_CONFIG);
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (This also catches any other file still importing the old `DEMO_DEALERSHIP_CONFIG` name — there should be none outside `mock-data.ts`/`config.ts`, confirmed by the file list in the spec.)

- [ ] **Step 5: Commit**

```bash
git add src/types/dealership.ts src/lib/dealership/mock-data.ts src/lib/dealership/config.ts
git commit -m "feat: switch demo tenant to Ultima.cars branding"
```

---

### Task 2: Add Vehicle type and homepage mock inventory

**Files:**
- Create: `src/types/vehicle.ts`
- Modify: `src/types/index.ts`
- Create: `src/lib/vehicles/mock-data.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `Vehicle` type and `VehicleCategory` type from `@/types`. `MOCK_VEHICLES: Vehicle[]` from `@/lib/vehicles/mock-data`.

- [ ] **Step 1: Create the Vehicle type**

Create `src/types/vehicle.ts`:

```ts
export type VehicleCategory = "new" | "used";

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  imageUrl: string;
  category: VehicleCategory;
  featured: boolean;
}
```

- [ ] **Step 2: Export it from the types barrel**

In `src/types/index.ts`, add a line so the file reads:

```ts
export * from "./auth";
export * from "./dealership";
export * from "./firestore";
export * from "./vehicle";
```

- [ ] **Step 3: Create the mock vehicle dataset**

Create `src/lib/vehicles/mock-data.ts`:

```ts
import type { Vehicle } from "@/types";

/**
 * Placeholder inventory for the homepage only. The real Inventory feature
 * (Firestore-backed, per the product spec) replaces this with live data.
 */
export const MOCK_VEHICLES: Vehicle[] = [
  { id: "v1", make: "Ultima", model: "GTR", year: 2024, price: 89500, mileage: 1200, imageUrl: "/vehicles/placeholder-1.jpg", category: "new", featured: true },
  { id: "v2", make: "Ultima", model: "Evo-X", year: 2024, price: 76900, mileage: 800, imageUrl: "/vehicles/placeholder-2.jpg", category: "new", featured: true },
  { id: "v3", make: "Ultima", model: "Roadster S", year: 2023, price: 64500, mileage: 5400, imageUrl: "/vehicles/placeholder-3.jpg", category: "used", featured: true },
  { id: "v4", make: "Ultima", model: "Apex", year: 2023, price: 58900, mileage: 8900, imageUrl: "/vehicles/placeholder-4.jpg", category: "used", featured: false },
  { id: "v5", make: "Ultima", model: "Vantage", year: 2022, price: 52400, mileage: 14200, imageUrl: "/vehicles/placeholder-5.jpg", category: "used", featured: false },
  { id: "v6", make: "Ultima", model: "Cross", year: 2024, price: 71200, mileage: 300, imageUrl: "/vehicles/placeholder-6.jpg", category: "new", featured: false },
  { id: "v7", make: "Ultima", model: "Coupe RS", year: 2023, price: 68700, mileage: 6100, imageUrl: "/vehicles/placeholder-7.jpg", category: "used", featured: false },
  { id: "v8", make: "Ultima", model: "GT Sport", year: 2024, price: 94300, mileage: 450, imageUrl: "/vehicles/placeholder-8.jpg", category: "new", featured: false },
  { id: "v9", make: "Ultima", model: "Legacy", year: 2022, price: 47600, mileage: 21000, imageUrl: "/vehicles/placeholder-9.jpg", category: "used", featured: false },
];
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/types/vehicle.ts src/types/index.ts src/lib/vehicles/mock-data.ts
git commit -m "feat: add Vehicle type and homepage mock inventory"
```

---

### Task 3: Wire Archivo Black heading font and brand-radius injection

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `DealershipConfig.radius` (from Task 1), existing `getDealershipConfig`/`resolveDealershipId`.
- Produces: `--font-heading` CSS variable resolving to Archivo Black (usable as `font-heading` Tailwind utility class in every homepage component). `--brand-radius` now set per-request from tenant data (was previously only declared with a static fallback).

- [ ] **Step 1: Add the Archivo Black font loader and inject brand-radius**

In `src/app/layout.tsx`, replace:

```ts
import { Geist, Geist_Mono } from "next/font/google";
```

with:

```ts
import { Geist, Geist_Mono, Archivo_Black } from "next/font/google";
```

Then, after the `geistMono` declaration, add:

```ts
const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  subsets: ["latin"],
  weight: "400",
});
```

Then find the `<html>` element:

```tsx
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={
        {
          "--brand-primary": dealership.primaryColor,
          "--brand-secondary": dealership.secondaryColor,
        } as React.CSSProperties
      }
    >
```

Replace with:

```tsx
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${archivoBlack.variable} h-full antialiased`}
      style={
        {
          "--brand-primary": dealership.primaryColor,
          "--brand-secondary": dealership.secondaryColor,
          "--brand-radius": dealership.radius,
        } as React.CSSProperties
      }
    >
```

- [ ] **Step 2: Point `--font-heading` at Archivo Black**

In `src/app/globals.css`, find (inside the `@theme inline` block near the top):

```css
  --font-heading: var(--font-sans);
```

Replace with:

```css
  --font-heading: var(--font-archivo-black);
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

```bash
(npx next dev -p 4200 > /tmp/task3-dev.log 2>&1 &) && sleep 5
curl -s http://localhost:4200/ | grep -o 'style="[^"]*--brand-radius[^"]*"'
```

Expected output contains `--brand-radius:0px`.

Stop the dev server: find the process listening on port 4200 and terminate it (e.g. on Windows: `netstat -ano | grep :4200` to get the PID, then `taskkill //PID <pid> //F`; on Linux/Mac: `lsof -ti:4200 | xargs kill`).

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat: load Archivo Black heading font and inject tenant radius"
```

---

### Task 4: Install the shadcn Textarea component

**Files:**
- Create: `src/components/ui/textarea.tsx` (generated by shadcn CLI)

**Interfaces:**
- Consumes: nothing.
- Produces: `Textarea` component from `@/components/ui/textarea`, used by Task 15 (Lead Footer form).

- [ ] **Step 1: Run the shadcn CLI**

Run: `npx shadcn@latest add textarea`
Expected: `✔ Created 1 file: src/components/ui/textarea.tsx` (or "skipped, already exists" — either is fine).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/textarea.tsx
git commit -m "feat: add shadcn textarea component"
```

---

### Task 5: Build the shared Section theming primitive

**Files:**
- Create: `src/components/site/homepage/section.tsx`

**Interfaces:**
- Consumes: `cn` from `@/lib/utils`.
- Produces: `Section` component, props `{ tone: "dark" | "light"; children: ReactNode; className?: string }`, used by Tasks 8–15.

- [ ] **Step 1: Create the component**

Create `src/components/site/homepage/section.tsx`:

```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionProps {
  tone: "dark" | "light";
  children: ReactNode;
  className?: string;
}

export function Section({ tone, children, className }: SectionProps) {
  return (
    <section
      className={cn(
        "py-12 md:py-20",
        tone === "dark"
          ? "bg-[#0d0d0d] text-white"
          : "bg-[#f9f9f9] text-[#0d0d0d]",
        className
      )}
    >
      <div className="mx-auto max-w-6xl px-4">{children}</div>
    </section>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/site/homepage/section.tsx
git commit -m "feat: add shared dark/light Section wrapper"
```

---

### Task 6: Build the shared VehicleCard component

**Files:**
- Create: `src/components/site/homepage/vehicle-card.tsx`

**Interfaces:**
- Consumes: `Vehicle` type and `DealershipConfig` type from `@/types`, `Button` from `@/components/ui/button`, `Car` icon from `lucide-react` (confirmed exported).
- Produces: `VehicleCard` component, props `{ vehicle: Vehicle; dealership: DealershipConfig }`, used by Tasks 9 and 11.

- [ ] **Step 1: Create the component**

Create `src/components/site/homepage/vehicle-card.tsx`:

```tsx
import { Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DealershipConfig, Vehicle } from "@/types";

export function VehicleCard({
  vehicle,
  dealership,
}: {
  vehicle: Vehicle;
  dealership: DealershipConfig;
}) {
  const message = encodeURIComponent(
    `Hi, I'm interested in the ${vehicle.year} ${vehicle.make} ${vehicle.model}.`
  );
  const whatsappHref = `https://wa.me/${dealership.whatsapp.replace(/[^\d]/g, "")}?text=${message}`;

  return (
    <div className="group overflow-hidden border border-white/10 bg-black transition-transform hover:-translate-y-1">
      {/* Placeholder imagery until real photography (vehicle.imageUrl) is wired in */}
      <div className="flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-950">
        <Car className="size-12 text-white/20" strokeWidth={1} />
      </div>
      <div className="flex flex-col gap-1 p-4 text-white">
        <h3 className="font-heading text-lg uppercase tracking-wide">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </h3>
        <p className="text-sm text-white/60">
          {vehicle.mileage.toLocaleString()} mi ·{" "}
          {vehicle.category === "new" ? "New" : "Used"}
        </p>
        <p className="mt-2 text-xl font-semibold">
          ${vehicle.price.toLocaleString()}
        </p>
        <Button
          size="sm"
          className="mt-3 bg-white text-black hover:bg-white/80"
          render={<a href={whatsappHref}>Inquire</a>}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/site/homepage/vehicle-card.tsx
git commit -m "feat: add shared VehicleCard component"
```

---

### Task 7: Build the Hero section

**Files:**
- Create: `src/components/site/homepage/hero.tsx`

**Interfaces:**
- Consumes: `Button` from `@/components/ui/button`, `DealershipConfig` type from `@/types`.
- Produces: `Hero` component, props `{ dealership: DealershipConfig }`, used by Task 16.

- [ ] **Step 1: Create the component**

Create `src/components/site/homepage/hero.tsx`:

```tsx
import { Button } from "@/components/ui/button";
import type { DealershipConfig } from "@/types";

export function Hero({ dealership }: { dealership: DealershipConfig }) {
  return (
    <section className="relative flex h-[700px] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-neutral-900 via-black to-neutral-800 px-4 text-center text-white">
      <div className="flex max-w-2xl flex-col items-center gap-6">
        <h1 className="font-heading text-5xl uppercase tracking-tight sm:text-6xl">
          {dealership.name}
        </h1>
        <p className="text-lg text-white/70">
          High-fidelity vehicles. High-octane experience.
        </p>
        <Button
          size="lg"
          className="bg-white text-black hover:bg-white/80"
          render={
            <a
              href={`https://wa.me/${dealership.whatsapp.replace(/[^\d]/g, "")}`}
            >
              Chat on WhatsApp
            </a>
          }
        />
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/site/homepage/hero.tsx
git commit -m "feat: add homepage Hero section"
```

---

### Task 8: Build the Categories Scroller section

**Files:**
- Create: `src/components/site/homepage/categories-scroller.tsx`

**Interfaces:**
- Consumes: `Section` from `./section`, `Link` from `next/link`.
- Produces: `CategoriesScroller` component, no props, used by Task 16.

- [ ] **Step 1: Create the component**

Create `src/components/site/homepage/categories-scroller.tsx`:

```tsx
import Link from "next/link";
import { Section } from "./section";

const CATEGORIES = [
  { label: "New Vehicles" },
  { label: "Used Vehicles" },
  { label: "SUVs" },
  { label: "Sedans" },
  { label: "Coupes" },
  { label: "Convertibles" },
];

export function CategoriesScroller() {
  return (
    <Section tone="light">
      <h2 className="font-heading mb-6 text-2xl uppercase tracking-tight">
        Browse by Category
      </h2>
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4">
        {CATEGORIES.map((category) => (
          <Link
            key={category.label}
            href="/inventory"
            className="font-heading flex h-32 w-48 shrink-0 snap-start items-center justify-center border border-[#0d0d0d]/10 bg-white text-center uppercase tracking-wide transition-colors hover:bg-[#0d0d0d] hover:text-white"
          >
            {category.label}
          </Link>
        ))}
      </div>
    </Section>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/site/homepage/categories-scroller.tsx
git commit -m "feat: add homepage Categories Scroller section"
```

---

### Task 9: Build the Trend Vehicles section

**Files:**
- Create: `src/components/site/homepage/trend-vehicles.tsx`

**Interfaces:**
- Consumes: `Section` from `./section`, `VehicleCard` from `./vehicle-card` (Task 6), `Button` from `@/components/ui/button`, `MOCK_VEHICLES` from `@/lib/vehicles/mock-data` (Task 2), `DealershipConfig` type from `@/types`.
- Produces: `TrendVehicles` component, props `{ dealership: DealershipConfig }`, used by Task 16.

- [ ] **Step 1: Create the component**

Create `src/components/site/homepage/trend-vehicles.tsx`:

```tsx
import Link from "next/link";
import { Section } from "./section";
import { VehicleCard } from "./vehicle-card";
import { Button } from "@/components/ui/button";
import { MOCK_VEHICLES } from "@/lib/vehicles/mock-data";
import type { DealershipConfig } from "@/types";

export function TrendVehicles({
  dealership,
}: {
  dealership: DealershipConfig;
}) {
  const featured = MOCK_VEHICLES.filter((vehicle) => vehicle.featured);

  return (
    <Section tone="dark">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-heading text-2xl uppercase tracking-tight">
          Trend Vehicles
        </h2>
        <Button
          variant="outline"
          className="border-white text-white hover:bg-white hover:text-black"
          render={<Link href="/inventory">See All Inventory</Link>}
        />
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((vehicle) => (
          <VehicleCard
            key={vehicle.id}
            vehicle={vehicle}
            dealership={dealership}
          />
        ))}
      </div>
    </Section>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/site/homepage/trend-vehicles.tsx
git commit -m "feat: add homepage Trend Vehicles section"
```

---

### Task 10: Build the About section

**Files:**
- Create: `src/components/site/homepage/about.tsx`

**Interfaces:**
- Consumes: `Section` from `./section`, `DealershipConfig` type from `@/types`.
- Produces: `About` component, props `{ dealership: DealershipConfig }`, used by Task 16.

- [ ] **Step 1: Create the component**

Create `src/components/site/homepage/about.tsx`:

```tsx
import { Section } from "./section";
import type { DealershipConfig } from "@/types";

export function About({ dealership }: { dealership: DealershipConfig }) {
  return (
    <Section tone="light">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <h2 className="font-heading text-3xl uppercase tracking-tight sm:text-4xl">
          Built for drivers who demand more.
        </h2>
        <p className="text-base leading-relaxed text-[#0d0d0d]/70">
          {dealership.name} curates a high-performance inventory backed by
          transparent pricing, fast financing, and a team that treats every
          test drive like the start of a partnership. From studio-quality
          listings to hassle-free trade-ins, every part of the experience is
          engineered around getting you into the right car, faster.
        </p>
      </div>
    </Section>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/site/homepage/about.tsx
git commit -m "feat: add homepage About section"
```

---

### Task 11: Build the Inventory Grid section

**Files:**
- Create: `src/components/site/homepage/inventory-grid.tsx`

**Interfaces:**
- Consumes: `Section` from `./section`, `VehicleCard` from `./vehicle-card` (Task 6), `Button` from `@/components/ui/button`, `MOCK_VEHICLES` from `@/lib/vehicles/mock-data` (Task 2), `DealershipConfig` type from `@/types`.
- Produces: `InventoryGrid` component, props `{ dealership: DealershipConfig }`, used by Task 16.

- [ ] **Step 1: Create the component**

Create `src/components/site/homepage/inventory-grid.tsx`:

```tsx
import Link from "next/link";
import { Section } from "./section";
import { VehicleCard } from "./vehicle-card";
import { Button } from "@/components/ui/button";
import { MOCK_VEHICLES } from "@/lib/vehicles/mock-data";
import type { DealershipConfig } from "@/types";

export function InventoryGrid({
  dealership,
}: {
  dealership: DealershipConfig;
}) {
  return (
    <Section tone="dark">
      <h2 className="font-heading mb-6 text-2xl uppercase tracking-tight">
        Full Inventory
      </h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {MOCK_VEHICLES.map((vehicle) => (
          <VehicleCard
            key={vehicle.id}
            vehicle={vehicle}
            dealership={dealership}
          />
        ))}
      </div>
      <div className="mt-8 flex justify-center">
        <Button
          size="lg"
          className="bg-white text-black hover:bg-white/80"
          render={<Link href="/inventory">See All Inventory</Link>}
        />
      </div>
    </Section>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/site/homepage/inventory-grid.tsx
git commit -m "feat: add homepage Inventory Grid section"
```

---

### Task 12: Build the Finance Calculator section

**Files:**
- Create: `src/components/site/homepage/finance-calculator.tsx`

**Interfaces:**
- Consumes: `Section` from `./section`, `Input`/`Label` from `@/components/ui/input` and `@/components/ui/label`.
- Produces: `FinanceCalculator` component, no props, used by Task 16.

- [ ] **Step 1: Create the component**

Create `src/components/site/homepage/finance-calculator.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { Section } from "./section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FinanceCalculator() {
  const [price, setPrice] = useState(50000);
  const [downPayment, setDownPayment] = useState(5000);
  const [apr, setApr] = useState(6);
  const [termMonths, setTermMonths] = useState(60);

  const monthlyPayment = useMemo(() => {
    const principal = Math.max(price - downPayment, 0);
    const monthlyRate = apr / 100 / 12;

    if (monthlyRate === 0) {
      return termMonths > 0 ? principal / termMonths : 0;
    }

    const factor = Math.pow(1 + monthlyRate, termMonths);
    return (principal * (monthlyRate * factor)) / (factor - 1);
  }, [price, downPayment, apr, termMonths]);

  return (
    <Section tone="dark">
      <h2 className="font-heading mb-6 text-2xl uppercase tracking-tight">
        Finance Calculator
      </h2>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="fc-price" className="text-white/70">
              Vehicle Price ($)
            </Label>
            <Input
              id="fc-price"
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value) || 0)}
              className="border-white/20 bg-transparent text-white"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="fc-down" className="text-white/70">
              Down Payment ($)
            </Label>
            <Input
              id="fc-down"
              type="number"
              min={0}
              value={downPayment}
              onChange={(e) => setDownPayment(Number(e.target.value) || 0)}
              className="border-white/20 bg-transparent text-white"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="fc-apr" className="text-white/70">
              APR (%)
            </Label>
            <Input
              id="fc-apr"
              type="number"
              min={0}
              step={0.1}
              value={apr}
              onChange={(e) => setApr(Number(e.target.value) || 0)}
              className="border-white/20 bg-transparent text-white"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="fc-term" className="text-white/70">
              Term (months)
            </Label>
            <Input
              id="fc-term"
              type="number"
              min={1}
              value={termMonths}
              onChange={(e) => setTermMonths(Number(e.target.value) || 1)}
              className="border-white/20 bg-transparent text-white"
            />
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 border border-white/10 p-8 text-center">
          <p className="text-sm uppercase tracking-wide text-white/60">
            Estimated Monthly Payment
          </p>
          <p
            data-testid="monthly-payment"
            className="font-heading text-5xl text-white"
          >
            ${monthlyPayment.toFixed(2)}
          </p>
        </div>
      </div>
    </Section>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Verify the amortization math independently**

Run:

```bash
node -e "
const price = 50000, downPayment = 5000, apr = 6, termMonths = 60;
const principal = Math.max(price - downPayment, 0);
const monthlyRate = apr / 100 / 12;
const factor = Math.pow(1 + monthlyRate, termMonths);
const payment = (principal * (monthlyRate * factor)) / (factor - 1);
console.log(payment.toFixed(2));
"
```

Expected output: `869.98` — this must match the component's default-state render in Task 17's verification.

- [ ] **Step 4: Commit**

```bash
git add src/components/site/homepage/finance-calculator.tsx
git commit -m "feat: add homepage Finance Calculator section"
```

---

### Task 13: Build the Trade-In section

**Files:**
- Create: `src/components/site/homepage/trade-in.tsx`

**Interfaces:**
- Consumes: `Section` from `./section`, `Button`/`Input`/`Label` from `@/components/ui/*`.
- Produces: `TradeIn` component, no props, used by Task 16.

- [ ] **Step 1: Create the component**

Create `src/components/site/homepage/trade-in.tsx`:

```tsx
"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Section } from "./section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TradeInFormState {
  year: string;
  make: string;
  model: string;
  mileage: string;
  name: string;
  email: string;
}

const INITIAL_STATE: TradeInFormState = {
  year: "",
  make: "",
  model: "",
  mileage: "",
  name: "",
  email: "",
};

function validate(state: TradeInFormState): string | null {
  if (!state.year || !state.make || !state.model || !state.mileage) {
    return "Please fill in your vehicle's year, make, model, and mileage.";
  }
  if (!state.name) {
    return "Please enter your name.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) {
    return "Please enter a valid email address.";
  }
  return null;
}

export function TradeIn() {
  const [form, setForm] = useState<TradeInFormState>(INITIAL_STATE);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleChange(field: keyof TradeInFormState) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationError = validate(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    // Placeholder submission: no Lead model/Firestore write exists yet.
    // A future Leads feature wires this into a real Lead record.
    setError(null);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <Section tone="light">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-heading text-2xl uppercase tracking-tight">
            Thanks! We&apos;ll be in touch.
          </h2>
          <p className="mt-2 text-[#0d0d0d]/70">
            A member of our trade-in team will reach out with your
            vehicle&apos;s estimated value shortly.
          </p>
        </div>
      </Section>
    );
  }

  return (
    <Section tone="light">
      <div className="mx-auto max-w-xl">
        <h2 className="font-heading mb-2 text-2xl uppercase tracking-tight">
          Get Your Trade-In Value
        </h2>
        <p className="mb-6 text-[#0d0d0d]/70">
          Tell us about your current vehicle and we&apos;ll send you an
          estimate.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ti-year">Year</Label>
              <Input
                id="ti-year"
                value={form.year}
                onChange={handleChange("year")}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ti-mileage">Mileage</Label>
              <Input
                id="ti-mileage"
                value={form.mileage}
                onChange={handleChange("mileage")}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ti-make">Make</Label>
              <Input
                id="ti-make"
                value={form.make}
                onChange={handleChange("make")}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ti-model">Model</Label>
              <Input
                id="ti-model"
                value={form.model}
                onChange={handleChange("model")}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ti-name">Your Name</Label>
            <Input
              id="ti-name"
              value={form.name}
              onChange={handleChange("name")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ti-email">Email</Label>
            <Input
              id="ti-email"
              type="email"
              value={form.email}
              onChange={handleChange("email")}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            type="submit"
            className="bg-[#0d0d0d] text-white hover:bg-[#0d0d0d]/80"
          >
            Get My Estimate
          </Button>
        </form>
      </div>
    </Section>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/site/homepage/trade-in.tsx
git commit -m "feat: add homepage Trade-In section"
```

---

### Task 14: Build the Testimonials section

**Files:**
- Create: `src/components/site/homepage/testimonials.tsx`

**Interfaces:**
- Consumes: `Section` from `./section`, `Avatar`/`AvatarFallback` from `@/components/ui/avatar`, `Star` icon from `lucide-react` (confirmed exported).
- Produces: `Testimonials` component, no props, used by Task 16.

- [ ] **Step 1: Create the component**

Create `src/components/site/homepage/testimonials.tsx`:

```tsx
import { Star } from "lucide-react";
import { Section } from "./section";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Testimonial {
  name: string;
  quote: string;
  rating: number;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Jordan M.",
    quote:
      "The whole process was seamless — found my car, financed it, and drove off in under two hours.",
    rating: 5,
  },
  {
    name: "Priya S.",
    quote:
      "Trade-in valuation was spot on and way faster than I expected. Highly recommend.",
    rating: 5,
  },
  {
    name: "Marcus T.",
    quote:
      "Inventory quality is unmatched. Every car looked exactly like the photos.",
    rating: 5,
  },
];

export function Testimonials() {
  return (
    <Section tone="dark">
      <h2 className="font-heading mb-8 text-2xl uppercase tracking-tight">
        What Drivers Are Saying
      </h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {TESTIMONIALS.map((testimonial) => (
          <div key={testimonial.name} className="border border-white/10 p-6">
            <div className="mb-3 flex gap-1">
              {Array.from({ length: testimonial.rating }).map((_, index) => (
                <Star key={index} className="size-4 fill-white text-white" />
              ))}
            </div>
            <p className="text-white/80">&ldquo;{testimonial.quote}&rdquo;</p>
            <div className="mt-4 flex items-center gap-3">
              <Avatar>
                <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{testimonial.name}</span>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/site/homepage/testimonials.tsx
git commit -m "feat: add homepage Testimonials section"
```

---

### Task 15: Build the Lead Gen Footer section

**Files:**
- Create: `src/components/site/homepage/lead-footer.tsx`

**Interfaces:**
- Consumes: `Section` from `./section`, `Button`/`Input`/`Label` from `@/components/ui/*`, `Textarea` from `@/components/ui/textarea` (Task 4).
- Produces: `LeadFooter` component, no props, used by Task 16.

- [ ] **Step 1: Create the component**

Create `src/components/site/homepage/lead-footer.tsx`:

```tsx
"use client";

import {
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Section } from "./section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface LeadFormState {
  name: string;
  phone: string;
  message: string;
}

const INITIAL_STATE: LeadFormState = { name: "", phone: "", message: "" };

function validate(state: LeadFormState): string | null {
  if (!state.name) return "Please enter your name.";
  if (!/^[\d+\-() ]{7,}$/.test(state.phone)) {
    return "Please enter a valid phone number.";
  }
  return null;
}

export function LeadFooter() {
  const [form, setForm] = useState<LeadFormState>(INITIAL_STATE);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleChange<K extends keyof LeadFormState>(field: K) {
    return (
      event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationError = validate(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    // Placeholder submission: no Lead model/Firestore write exists yet.
    // A future Leads feature wires this into a real Lead record.
    setError(null);
    setSubmitted(true);
  }

  return (
    <Section tone="light">
      <div className="mx-auto max-w-xl text-center">
        <h2 className="font-heading mb-2 text-2xl uppercase tracking-tight">
          Need a Car?
        </h2>
        {submitted ? (
          <p className="text-[#0d0d0d]/70">
            Thanks — we&apos;ve got your message and will reach out shortly.
          </p>
        ) : (
          <>
            <p className="mb-6 text-[#0d0d0d]/70">
              Tell us what you&apos;re looking for and a member of our team
              will follow up.
            </p>
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-4 text-left"
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="lf-name">Name</Label>
                <Input
                  id="lf-name"
                  value={form.name}
                  onChange={handleChange("name")}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="lf-phone">Phone</Label>
                <Input
                  id="lf-phone"
                  value={form.phone}
                  onChange={handleChange("phone")}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="lf-message">What are you looking for?</Label>
                <Textarea
                  id="lf-message"
                  value={form.message}
                  onChange={handleChange("message")}
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button
                type="submit"
                className="bg-[#0d0d0d] text-white hover:bg-[#0d0d0d]/80"
              >
                Send Message
              </Button>
            </form>
          </>
        )}
      </div>
    </Section>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/site/homepage/lead-footer.tsx
git commit -m "feat: add homepage Lead Gen Footer section"
```

---

### Task 16: Compose all sections into the homepage

**Files:**
- Modify: `src/app/(site)/page.tsx`

**Interfaces:**
- Consumes: `Hero` (Task 7), `CategoriesScroller` (Task 8), `TrendVehicles` (Task 9), `About` (Task 10), `InventoryGrid` (Task 11), `FinanceCalculator` (Task 12), `TradeIn` (Task 13), `Testimonials` (Task 14), `LeadFooter` (Task 15), existing `getDealershipConfig`/`resolveDealershipId`.
- Produces: the composed `/` route.

- [ ] **Step 1: Replace the homepage**

Overwrite `src/app/(site)/page.tsx` entirely with:

```tsx
import { headers } from "next/headers";
import { getDealershipConfig, resolveDealershipId } from "@/lib/dealership/config";
import { Hero } from "@/components/site/homepage/hero";
import { CategoriesScroller } from "@/components/site/homepage/categories-scroller";
import { TrendVehicles } from "@/components/site/homepage/trend-vehicles";
import { About } from "@/components/site/homepage/about";
import { InventoryGrid } from "@/components/site/homepage/inventory-grid";
import { FinanceCalculator } from "@/components/site/homepage/finance-calculator";
import { TradeIn } from "@/components/site/homepage/trade-in";
import { Testimonials } from "@/components/site/homepage/testimonials";
import { LeadFooter } from "@/components/site/homepage/lead-footer";

export default async function HomePage() {
  const headerList = await headers();
  const dealership = getDealershipConfig(
    resolveDealershipId(headerList.get("host"))
  );

  return (
    <>
      <Hero dealership={dealership} />
      <CategoriesScroller />
      <TrendVehicles dealership={dealership} />
      <About dealership={dealership} />
      <InventoryGrid dealership={dealership} />
      <FinanceCalculator />
      <TradeIn />
      <Testimonials />
      <LeadFooter />
    </>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(site)/page.tsx"
git commit -m "feat: compose Ultima.cars homepage from section components"
```

---

### Task 17: Full verification pass

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Type-check, lint, build**

Run:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Expected: all three succeed with zero errors.

- [ ] **Step 2: Start the dev server**

```bash
(npx next dev -p 4200 > /tmp/task17-dev.log 2>&1 &) && sleep 5
cat /tmp/task17-dev.log
```

Expected: log shows `✓ Ready in <N>ms` with no errors.

- [ ] **Step 3: Verify structure and brand tokens**

```bash
curl -s http://localhost:4200/ -o /tmp/ultima-home.html
grep -o 'Ultima.cars' /tmp/ultima-home.html | head -1
grep -o -- '--brand-primary:#0d0d0d' /tmp/ultima-home.html
grep -o -- '--brand-radius:0px' /tmp/ultima-home.html
grep -o 'Trend Vehicles' /tmp/ultima-home.html
grep -o 'Browse by Category' /tmp/ultima-home.html
grep -o 'Full Inventory' /tmp/ultima-home.html
grep -o 'Finance Calculator' /tmp/ultima-home.html
grep -o 'Get Your Trade-In Value' /tmp/ultima-home.html
grep -o 'What Drivers Are Saying' /tmp/ultima-home.html
grep -o 'Need a Car?' /tmp/ultima-home.html
```

Expected: every grep returns a match (each section is present in the rendered HTML).

- [ ] **Step 4: Verify the finance calculator's default computed value**

```bash
grep -o '869.98' /tmp/ultima-home.html
```

Expected: match found (confirms the client component's initial SSR render computed the same value as Task 12 Step 3's independent math check).

- [ ] **Step 5: Verify 9 vehicle cards render in the Inventory Grid (plus 3 more in Trend Vehicles = 12 "Inquire" buttons total)**

```bash
grep -c 'Inquire' /tmp/ultima-home.html
```

Expected: `12` (3 featured cards in Trend Vehicles + 9 cards in Inventory Grid).

- [ ] **Step 6: Stop the dev server**

Find the process listening on port 4200 and terminate it (e.g. `netstat -ano | grep :4200` then `taskkill //PID <pid> //F` on Windows).

- [ ] **Step 7: Final commit**

If Steps 1–5 required any fixes, stage and commit them:

```bash
git add -A
git commit -m "fix: address verification findings for Ultima.cars homepage"
```

If no fixes were needed, this step is a no-op — the plan is complete as of Task 16's commit.

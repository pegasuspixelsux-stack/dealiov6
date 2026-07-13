# Vehicle Detail Page (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the Vehicle data model, update the dashboard's Add Vehicle modal to capture it, and build a public inventory listing page plus a vehicle detail page (gallery, description, equipment, WhatsApp + contact form) so vehicles are findable and convertible.

**Architecture:** Two new public routes (`/inventory`, `/inventory/[id]`) under the existing `(site)` route group, reusing `getVehicles`/`VehicleCard`/`VehicleInquiryButton`/`Section`/`Dialog`. The Vehicle and Lead Firestore schemas grow with zod `.default(...)`/`.optional()` fields so existing documents keep parsing without a migration.

**Tech Stack:** Next.js 16 App Router (uses the global `PageProps<'/route'>` / `LayoutProps<'/route'>` helper types — see Global Constraints), TypeScript, zod, Firestore Admin SDK.

## Global Constraints

- **This Next.js version (16.2.10) uses global `PageProps<'/route-pattern'>` helper types** for page props (`params`, `searchParams`) instead of manually-typed `Promise<{...}>` props — confirmed via `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`. These types are **generated on disk** (in `.next/types`, gitignored) by `next dev`, `next build`, or `next typegen` — they do not exist until one of those runs. **Every task that creates or reads a new route file's `PageProps` must run `npx next typegen` before `npx tsc --noEmit`**, or `tsc` will fail with "Cannot find name 'PageProps'". No import is needed for `PageProps` — it's a global type.
- **Single fixed currency: USD.** No `currency` field on `Vehicle`. All price display goes through one shared `formatPrice` helper (`src/lib/format-price.ts`): `` `US$${price.toLocaleString("en-US")}` ``.
- **Vehicle fields added this phase**: `version: string`, `fuel: "nafta"|"diesel"|"hibrido"|"electrico"`, `transmission: "manual"|"automatica"`, `location: string`, `financingAvailable: boolean`, `status: "disponible"|"reservado"|"vendido"`, `description: string`, `features: string[]`. Every one of these gets a zod `.default(...)` so pre-existing Firestore vehicle docs (which lack these fields entirely) still parse successfully via `getVehicles`'s `safeParse`-and-filter pattern — no data migration.
- **Features are a flat list**, not grouped by category (Seguridad/Confort/Tecnología), and captured via a **fixed checklist** (the exact 13 items in Task 1), not free text — this is deliberate MVP scope, confirmed with the user.
- **Lead fields added this phase**: `email?: string`, `preferredContact?: "whatsapp"|"email"|"phone"` — both optional, no schema-breaking changes to existing lead docs.
- **No vehicle edit/delete** — this phase is still add-only, matching the existing Inventory feature's scope.
- **Explicitly out of scope this phase** (deferred to Phase 2/3, do not build): finance calculator card on the detail page, trust elements section (dealer hours/address/financing partner/reviews), similar vehicles, sticky contact bar, SEO meta tags / structured data, multi-currency.
- **`VehicleCard` becomes a link** to `/inventory/{vehicle.id}` everywhere it's rendered (homepage AND the new inventory listing page). Its embedded WhatsApp "Consultar" button must **not** trigger navigation when clicked — wrap it in a plain `<div onClick={(e) => e.stopPropagation()}>`, not by modifying `VehicleInquiryButton` itself.
- **No automated test runner exists in this repo.** Verification is `npx tsc --noEmit` (after `npx next typegen` where noted) plus real Firestore round-trips via throwaway `scripts/manual-verify-*.ts` files (always deleted before commit) plus a final manual browser walkthrough.
- Every client component that calls a Server Action wraps the call in try/catch/finally, clearing pending state in `finally` — mandatory codebase-wide pattern.

---

### Task 1: Data model — Vehicle + Lead fields, price formatting helper

**Files:**
- Modify: `src/types/vehicle.ts`
- Modify: `src/types/lead.ts`
- Create: `src/lib/format-price.ts`

**Interfaces:**
- Produces: expanded `Vehicle` interface, `vehicleSchema`, `Fuel`/`Transmission`/`VehicleStatus` types, `FUEL_LABELS`/`TRANSMISSION_LABELS`/`VEHICLE_STATUS_LABELS`/`VEHICLE_FEATURES` constants, expanded `Lead` interface + `leadSchema`, `formatPrice(price: number): string` — all consumed by every later task.

- [ ] **Step 1: Rewrite the Vehicle type and schema**

Replace the full contents of `src/types/vehicle.ts`:
```ts
import { z } from "zod";

export type VehicleCategory = "new" | "used";
export type Fuel = "nafta" | "diesel" | "hibrido" | "electrico";
export type Transmission = "manual" | "automatica";
export type VehicleStatus = "disponible" | "reservado" | "vendido";

export interface Vehicle {
  id: string;
  dealershipId: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  imageUrls: string[];
  category: VehicleCategory;
  featured: boolean;
  version: string;
  fuel: Fuel;
  transmission: Transmission;
  location: string;
  financingAvailable: boolean;
  status: VehicleStatus;
  description: string;
  features: string[];
}

export const vehicleSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1900).max(2100),
  price: z.number().nonnegative(),
  mileage: z.number().nonnegative(),
  imageUrls: z.array(z.string().url()).min(1).max(8),
  category: z.enum(["new", "used"]),
  featured: z.boolean(),
  version: z.string().default(""),
  fuel: z.enum(["nafta", "diesel", "hibrido", "electrico"]).default("nafta"),
  transmission: z.enum(["manual", "automatica"]).default("manual"),
  location: z.string().default(""),
  financingAvailable: z.boolean().default(false),
  status: z.enum(["disponible", "reservado", "vendido"]).default("disponible"),
  description: z.string().default(""),
  features: z.array(z.string()).default([]),
});

export const FUEL_LABELS: Record<Fuel, string> = {
  nafta: "Nafta",
  diesel: "Diesel",
  hibrido: "Híbrido",
  electrico: "Eléctrico",
};

export const TRANSMISSION_LABELS: Record<Transmission, string> = {
  manual: "Manual",
  automatica: "Automática",
};

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  disponible: "Disponible",
  reservado: "Reservado",
  vendido: "Vendido",
};

export const VEHICLE_FEATURES = [
  "Airbags",
  "ABS",
  "Control de estabilidad",
  "Cámara de retroceso",
  "Sensores de estacionamiento",
  "Aire acondicionado",
  "Pantalla multimedia",
  "Bluetooth",
  "Asientos eléctricos",
  "Apple CarPlay",
  "Android Auto",
  "Keyless entry",
  "Puerto USB de carga",
] as const;
```

- [ ] **Step 2: Add the new Lead fields**

In `src/types/lead.ts`, add a `PreferredContact` type, add `email?: string;` and `preferredContact?: PreferredContact;` to the `Lead` interface, and add matching optional fields to `leadSchema`. The full file becomes:
```ts
import { z } from "zod";

export type LeadSource = "vehicle_inquiry" | "trade_in" | "general_inquiry";

export type LeadStage =
  | "recibido"
  | "contactado"
  | "seguimiento"
  | "negociacion"
  | "ganado"
  | "perdido";

export type PreferredContact = "whatsapp" | "email" | "phone";

export const LEAD_STAGES: LeadStage[] = [
  "recibido",
  "contactado",
  "seguimiento",
  "negociacion",
  "ganado",
  "perdido",
];

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  recibido: "Recibido",
  contactado: "Contactado",
  seguimiento: "Seguimiento",
  negociacion: "Negociación",
  ganado: "Ganado",
  perdido: "Perdido",
};

export const leadStageSchema = z.enum([
  "recibido",
  "contactado",
  "seguimiento",
  "negociacion",
  "ganado",
  "perdido",
]);

export interface Lead {
  id: string;
  dealershipId: string;
  source: LeadSource;
  name: string;
  contact: string;
  message: string;
  email?: string;
  preferredContact?: PreferredContact;
  stage: LeadStage;
  createdAt: string;
  updatedAt: string;
}

export const leadSchema = z.object({
  source: z.enum(["vehicle_inquiry", "trade_in", "general_inquiry"]),
  name: z.string().min(1),
  contact: z.string().min(1),
  message: z.string().min(1),
  email: z.string().email().optional(),
  preferredContact: z.enum(["whatsapp", "email", "phone"]).optional(),
});
```

- [ ] **Step 3: Add the price formatting helper**

`src/lib/format-price.ts`:
```ts
export function formatPrice(price: number): string {
  return `US$${price.toLocaleString("en-US")}`;
}
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Verify pre-existing vehicle docs (missing the new fields) still parse, with correct defaults**

`scripts/manual-verify-vehicle-defaults.ts`:
```ts
import { adminFirestore } from "../src/lib/firebase/admin";
import { getVehicles } from "../src/lib/vehicles/vehicles";

async function main() {
  const dealershipId = "manual-verify-dealership";
  const ref = adminFirestore!
    .collection("dealerships")
    .doc(dealershipId)
    .collection("vehicles")
    .doc();

  // Simulate a pre-Phase-1 vehicle doc: only the original fields, but with
  // createdAt set (as every real doc has, since createVehicle always sets it) —
  // getVehicles orders by createdAt, so a doc missing that field would be silently
  // excluded from the query results and this test would give a false pass.
  await ref.set({
    make: "Toyota",
    model: "Corolla",
    year: 2020,
    price: 20000,
    mileage: 50000,
    imageUrls: ["https://example.com/photo.jpg"],
    category: "used",
    featured: false,
    createdAt: new Date(),
  });

  const vehicles = await getVehicles(dealershipId);
  console.log(JSON.stringify(vehicles, null, 2));

  await ref.delete();
  console.log("cleaned up");
}

main();
```

- [ ] **Step 6: Run it**

Run: `npx tsx --conditions=react-server --env-file=.env.local scripts/manual-verify-vehicle-defaults.ts`
Expected: prints one vehicle whose new fields are `"version": ""`, `"fuel": "nafta"`, `"transmission": "manual"`, `"location": ""`, `"financingAvailable": false`, `"status": "disponible"`, `"description": ""`, `"features": []` — proving the defaults work without a migration — then `cleaned up`.

- [ ] **Step 7: Delete the throwaway script**

```bash
rm scripts/manual-verify-vehicle-defaults.ts
```

- [ ] **Step 8: Commit**

```bash
git add src/types/vehicle.ts src/types/lead.ts src/lib/format-price.ts
git commit -m "feat: expand Vehicle and Lead data models, add price formatting helper"
```

---

### Task 2: Dashboard — Add Vehicle modal + createVehicleAction

**Files:**
- Modify: `src/app/(dashboard)/dashboard/inventory/add-vehicle-modal.tsx`
- Modify: `src/app/(dashboard)/dashboard/inventory/actions.ts`

**Interfaces:**
- Consumes: `VEHICLE_FEATURES`, `vehicleSchema` from `@/types` (Task 1).
- Produces: nothing new consumed by later tasks — this task is a leaf in the dependency graph, but MUST be done before Task 6's final E2E walkthrough, since that's how a vehicle with the full field set gets created for testing.

- [ ] **Step 1: Update the Add Vehicle modal**

Replace the full contents of `src/app/(dashboard)/dashboard/inventory/add-vehicle-modal.tsx`:
```tsx
"use client";

import { useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VEHICLE_FEATURES } from "@/types";
import { createVehicleAction } from "./actions";

export function AddVehicleModal() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const result = await createVehicleAction(formData);
      if (result.success) {
        setOpen(false);
        form.reset();
      } else {
        setError(result.error);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Add New Car</Button>} />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Car</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="av-make">Make</Label>
              <Input id="av-make" name="make" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="av-model">Model</Label>
              <Input id="av-model" name="model" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="av-version">Version</Label>
              <Input id="av-version" name="version" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="av-year">Year</Label>
              <Input id="av-year" name="year" type="number" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="av-price">Price (US$)</Label>
              <Input id="av-price" name="price" type="number" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="av-mileage">Mileage</Label>
              <Input id="av-mileage" name="mileage" type="number" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="av-category">Category</Label>
              <select
                id="av-category"
                name="category"
                required
                className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
              >
                <option value="new">New</option>
                <option value="used">Used</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="av-fuel">Fuel</Label>
              <select
                id="av-fuel"
                name="fuel"
                required
                className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
              >
                <option value="nafta">Nafta</option>
                <option value="diesel">Diesel</option>
                <option value="hibrido">Híbrido</option>
                <option value="electrico">Eléctrico</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="av-transmission">Transmission</Label>
              <select
                id="av-transmission"
                name="transmission"
                required
                className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
              >
                <option value="manual">Manual</option>
                <option value="automatica">Automática</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="av-status">Status</Label>
              <select
                id="av-status"
                name="status"
                required
                className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
              >
                <option value="disponible">Disponible</option>
                <option value="reservado">Reservado</option>
                <option value="vendido">Vendido</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="av-location">Location</Label>
              <Input id="av-location" name="location" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="av-description">Description</Label>
            <Textarea id="av-description" name="description" rows={3} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Features</Label>
            <div className="grid grid-cols-2 gap-2">
              {VEHICLE_FEATURES.map((feature) => (
                <label key={feature} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="features" value={feature} />
                  {feature}
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="av-photos">Photos (up to 8)</Label>
            <input
              id="av-photos"
              name="photos"
              type="file"
              accept="image/*"
              multiple
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="featured" />
            Featured
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="financingAvailable" />
            Financing available
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Adding..." : "Add Car"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Update createVehicleAction to read and validate the new fields**

Replace the full contents of `src/app/(dashboard)/dashboard/inventory/actions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { reserveVehicleId, createVehicle } from "@/lib/vehicles/vehicles";
import { uploadVehiclePhotos } from "@/lib/vehicles/upload-photos";
import { vehicleSchema } from "@/types";

export async function createVehicleAction(
  formData: FormData
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await verifySession();
  if (!session) {
    return { success: false, error: "Not signed in." };
  }
  if (!can(session.role, "canManageVehicles")) {
    return { success: false, error: "You don't have permission to add vehicles." };
  }

  const photos = formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (photos.length === 0) {
    return { success: false, error: "At least one photo is required." };
  }
  if (photos.length > 8) {
    return { success: false, error: "Maximum 8 photos." };
  }

  const fieldsParsed = vehicleSchema
    .omit({ imageUrls: true })
    .safeParse({
      make: formData.get("make"),
      model: formData.get("model"),
      year: Number(formData.get("year")),
      price: Number(formData.get("price")),
      mileage: Number(formData.get("mileage")),
      category: formData.get("category"),
      featured: formData.get("featured") === "on",
      version: formData.get("version") ?? "",
      fuel: formData.get("fuel"),
      transmission: formData.get("transmission"),
      location: formData.get("location") ?? "",
      financingAvailable: formData.get("financingAvailable") === "on",
      status: formData.get("status"),
      description: formData.get("description") ?? "",
      features: formData.getAll("features"),
    });

  if (!fieldsParsed.success) {
    return { success: false, error: "Please check the form fields and try again." };
  }

  const vehicleId = reserveVehicleId(session.dealershipId);
  const imageUrls = await uploadVehiclePhotos(session.dealershipId, vehicleId, photos);
  await createVehicle(session.dealershipId, vehicleId, {
    ...fieldsParsed.data,
    imageUrls,
  });

  revalidatePath("/dashboard/inventory");
  revalidatePath("/inventory");
  return { success: true };
}
```

Note: `revalidatePath("/inventory")` refers to a route that doesn't exist until Task 4 lands later in this same plan — `revalidatePath` on a not-yet-existing route is a harmless no-op, not an error, so this ordering is safe.

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/dashboard/inventory/add-vehicle-modal.tsx" "src/app/(dashboard)/dashboard/inventory/actions.ts"
git commit -m "feat: capture full vehicle field set in Add Vehicle modal"
```

Note: `createVehicleAction` requires a real signed-in session (cookies), so it cannot be exercised by a standalone script — its correctness is verified by `tsc` here and by the full manual browser walkthrough at the end of Task 6.

---

### Task 3: VehicleCard becomes a link + USD price formatting

**Files:**
- Modify: `src/components/site/homepage/vehicle-card.tsx`
- Modify: `src/components/site/homepage/finance-calculator.tsx`

**Interfaces:**
- Consumes: `formatPrice` from `@/lib/format-price` (Task 1).
- Produces: `VehicleCard` now links to `/inventory/{vehicle.id}` — this route doesn't exist until Task 5, which is a safe forward-reference (no `typedRoutes` in `next.config.ts`, confirmed — plain string `href`s aren't route-checked).

- [ ] **Step 1: Wrap VehicleCard in a Link, apply formatPrice, guard the WhatsApp button from navigating**

Replace the full contents of `src/components/site/homepage/vehicle-card.tsx`:
```tsx
import Link from "next/link";
import { Car } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format-price";
import type { DealershipConfig, Vehicle } from "@/types";
import { VehicleInquiryButton } from "./vehicle-inquiry-button";

export function VehicleCard({
  vehicle,
  dealership,
  className,
  overlay = true,
}: {
  vehicle: Vehicle;
  dealership: DealershipConfig;
  className?: string;
  overlay?: boolean;
}) {
  return (
    <Link
      href={`/inventory/${vehicle.id}`}
      className={cn(
        "group relative block aspect-square w-full overflow-hidden transition-transform hover:-translate-y-1",
        className
      )}
    >
      {vehicle.imageUrls.length > 0 ? (
        <Image
          src={vehicle.imageUrls[0]}
          alt={`${vehicle.make} ${vehicle.model}`}
          fill
          className="object-cover"
        />
      ) : (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center",
            overlay && "bg-gradient-to-br from-neutral-800 to-neutral-950"
          )}
        >
          <Car
            className={cn("size-12", overlay ? "text-white/20" : "text-[#0d0d0d]/20")}
            strokeWidth={1}
          />
        </div>
      )}
      {!overlay && (
        <div className="absolute top-3 right-3 text-right">
          <p className="text-xs text-[#0d0d0d]/70">A partir de</p>
          <p className="text-xl font-semibold text-[#0d0d0d]">
            {formatPrice(vehicle.price)}
          </p>
        </div>
      )}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 p-4",
          overlay && "bg-gradient-to-t from-black/85 via-black/50 to-transparent"
        )}
      >
        <h3
          className={cn(
            "font-heading tracking-wide",
            overlay ? "text-lg text-white" : "mt-2 text-sm text-[#0d0d0d]"
          )}
        >
          {vehicle.make} {vehicle.model} {vehicle.year}
        </h3>
        <p className={cn("text-sm", overlay ? "text-white/70" : "text-[#0d0d0d]/70")}>
          {vehicle.mileage.toLocaleString()} km ·{" "}
          {vehicle.category === "new" ? "Nuevo" : "Usado"}
        </p>
        <div className={cn("mt-3 flex items-center gap-3", overlay ? "justify-between" : "justify-end")}>
          {overlay && (
            <p className="text-xl font-semibold text-white">
              {formatPrice(vehicle.price)}
            </p>
          )}
          <div onClick={(event) => event.stopPropagation()}>
            <VehicleInquiryButton
              vehicle={vehicle}
              dealership={dealership}
              dark={!overlay}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Apply formatPrice to the finance calculator's result and update its input labels**

In `src/components/site/homepage/finance-calculator.tsx`:
- Add the import: `import { formatPrice } from "@/lib/format-price";`
- Change the label text `"Precio del Vehículo ($)"` to `"Precio del Vehículo (US$)"`.
- Change the label text `"Anticipo ($)"` to `"Anticipo (US$)"`.
- Change the monthly payment display from:
  ```tsx
  <p
    data-testid="monthly-payment"
    className="font-heading text-5xl text-[#0d0d0d]"
  >
    ${monthlyPayment.toFixed(2)}
  </p>
  ```
  to:
  ```tsx
  <p
    data-testid="monthly-payment"
    className="font-heading text-5xl text-[#0d0d0d]"
  >
    {formatPrice(Math.round(monthlyPayment))}
  </p>
  ```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/site/homepage/vehicle-card.tsx src/components/site/homepage/finance-calculator.tsx
git commit -m "feat: link vehicle cards to detail page, switch price display to USD"
```

---

### Task 4: Public inventory listing page

**Files:**
- Create: `src/app/(site)/inventory/page.tsx`

**Interfaces:**
- Consumes: `getVehicles` from `@/lib/vehicles/vehicles`; `VehicleCard` from `@/components/site/homepage/vehicle-card` (Task 3); `Section` from `@/components/site/homepage/section`; `getDealershipConfig`/`resolveDealershipId` from `@/lib/dealership/config`.
- Produces: the `/inventory` route, fixing the previously-dead links from the homepage's "Ver Todo el Inventario" buttons and `BrandScroller`'s `?make=` links.

- [ ] **Step 1: Create the inventory listing page**

`src/app/(site)/inventory/page.tsx`:
```tsx
import { headers } from "next/headers";
import { getDealershipConfig, resolveDealershipId } from "@/lib/dealership/config";
import { getVehicles } from "@/lib/vehicles/vehicles";
import { Section } from "@/components/site/homepage/section";
import { VehicleCard } from "@/components/site/homepage/vehicle-card";

export default async function InventoryPage(props: PageProps<"/inventory">) {
  const { make } = await props.searchParams;
  const makeFilter = Array.isArray(make) ? make[0] : make;

  const headerList = await headers();
  const dealership = getDealershipConfig(
    resolveDealershipId(headerList.get("host"))
  );
  const vehicles = await getVehicles(dealership.id);

  const filtered = makeFilter
    ? vehicles.filter(
        (vehicle) => vehicle.make.toLowerCase() === makeFilter.toLowerCase()
      )
    : vehicles;

  return (
    <Section tone="light">
      <h1 className="font-heading mb-6 text-2xl tracking-tight">
        Inventario
      </h1>
      {filtered.length === 0 ? (
        <p className="text-sm text-[#0d0d0d]/70">
          No hay vehículos disponibles.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              dealership={dealership}
              className="rounded-[12px]"
            />
          ))}
        </div>
      )}
    </Section>
  );
}
```

- [ ] **Step 2: Generate route types, then verify it compiles**

Run: `npx next typegen`
Run: `npx tsc --noEmit`
Expected: no errors. (If `PageProps<"/inventory">` is unresolved, `next typegen` did not run first — re-run it.)

- [ ] **Step 3: Commit**

```bash
git add "src/app/(site)/inventory/page.tsx"
git commit -m "feat: add public inventory listing page"
```

---

### Task 5: Vehicle detail page — gallery, header, description, equipment

**Files:**
- Create: `src/app/(site)/inventory/[id]/page.tsx`
- Create: `src/components/site/vehicle-detail/photo-gallery.tsx`

**Interfaces:**
- Consumes: `getVehicles` from `@/lib/vehicles/vehicles`; `VehicleInquiryButton` from `@/components/site/homepage/vehicle-inquiry-button`; `Section` from `@/components/site/homepage/section`; `Badge` from `@/components/ui/badge`; `formatPrice` from `@/lib/format-price` (Task 1); `FUEL_LABELS`/`TRANSMISSION_LABELS`/`VEHICLE_STATUS_LABELS` from `@/types` (Task 1).
- Produces: the `/inventory/[id]` route (feature-complete for browsing + WhatsApp contact); `PhotoGallery` component consumed only here.

- [ ] **Step 1: Create the photo gallery component**

`src/components/site/vehicle-detail/photo-gallery.tsx`:
```tsx
"use client";

import { useState, type TouchEvent } from "react";
import Image from "next/image";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function PhotoGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  if (images.length === 0) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl bg-neutral-100 text-sm text-[#0d0d0d]/50">
        Sin fotos disponibles
      </div>
    );
  }

  function showNext() {
    setActiveIndex((index) => (index + 1) % images.length);
  }

  function showPrev() {
    setActiveIndex((index) => (index - 1 + images.length) % images.length);
  }

  function handleTouchStart(event: TouchEvent) {
    setTouchStartX(event.touches[0].clientX);
  }

  function handleTouchEnd(event: TouchEvent) {
    if (touchStartX === null) return;
    const deltaX = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(deltaX) > 50) {
      if (deltaX < 0) {
        showNext();
      } else {
        showPrev();
      }
    }
    setTouchStartX(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setViewerOpen(true)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative aspect-video w-full overflow-hidden rounded-xl"
      >
        <Image src={images[activeIndex]} alt={alt} fill className="object-cover" />
      </button>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((url, index) => (
            <button
              key={url}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={cn(
                "relative aspect-square size-20 shrink-0 overflow-hidden rounded-md ring-2",
                index === activeIndex ? "ring-[#0d0d0d]" : "ring-transparent"
              )}
            >
              <Image src={url} alt={alt} fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="w-screen max-w-none rounded-none border-none bg-black/95 p-0 sm:max-w-none h-screen">
          <div
            className="relative flex h-full w-full items-center justify-center"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <Image
              src={images[activeIndex]}
              alt={alt}
              fill
              className="object-contain"
            />
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={showPrev}
                  aria-label="Foto anterior"
                  className="absolute top-1/2 left-4 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={showNext}
                  aria-label="Foto siguiente"
                  className="absolute top-1/2 right-4 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                >
                  ›
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Create the vehicle detail page**

`src/app/(site)/inventory/[id]/page.tsx`:
```tsx
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getDealershipConfig, resolveDealershipId } from "@/lib/dealership/config";
import { getVehicles } from "@/lib/vehicles/vehicles";
import { Section } from "@/components/site/homepage/section";
import { VehicleInquiryButton } from "@/components/site/homepage/vehicle-inquiry-button";
import { PhotoGallery } from "@/components/site/vehicle-detail/photo-gallery";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format-price";
import {
  FUEL_LABELS,
  TRANSMISSION_LABELS,
  VEHICLE_STATUS_LABELS,
  type VehicleStatus,
} from "@/types";

const STATUS_BADGE_VARIANT: Record<
  VehicleStatus,
  "default" | "secondary" | "outline"
> = {
  disponible: "default",
  reservado: "secondary",
  vendido: "outline",
};

export default async function VehicleDetailPage(
  props: PageProps<"/inventory/[id]">
) {
  const { id } = await props.params;
  const headerList = await headers();
  const dealership = getDealershipConfig(
    resolveDealershipId(headerList.get("host"))
  );
  const vehicles = await getVehicles(dealership.id);
  const vehicle = vehicles.find((v) => v.id === id);

  if (!vehicle) {
    notFound();
  }

  return (
    <Section tone="light">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[65fr_35fr]">
        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-3">
            <h1 className="font-heading text-3xl tracking-tight">
              {vehicle.make} {vehicle.model} {vehicle.version} {vehicle.year}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#0d0d0d]/70">
              <span>{vehicle.make}</span>
              <span>{vehicle.model}</span>
              <span>{vehicle.year}</span>
              <span>{vehicle.mileage.toLocaleString()} km</span>
              <span>{FUEL_LABELS[vehicle.fuel]}</span>
              <span>{TRANSMISSION_LABELS[vehicle.transmission]}</span>
              {vehicle.location && <span>{vehicle.location}</span>}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={STATUS_BADGE_VARIANT[vehicle.status]}>
                {VEHICLE_STATUS_LABELS[vehicle.status]}
              </Badge>
              {vehicle.financingAvailable && (
                <Badge variant="outline">Financiación disponible</Badge>
              )}
              <span className="font-heading text-2xl text-[#0d0d0d]">
                {formatPrice(vehicle.price)}
              </span>
            </div>
          </div>

          <PhotoGallery
            images={vehicle.imageUrls}
            alt={`${vehicle.make} ${vehicle.model}`}
          />

          {vehicle.description && (
            <div className="flex flex-col gap-3">
              <h2 className="font-heading text-xl tracking-tight">
                Descripción
              </h2>
              <p className="text-sm leading-relaxed text-[#0d0d0d]/80">
                {vehicle.description}
              </p>
            </div>
          )}

          {vehicle.features.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="font-heading text-xl tracking-tight">
                Equipamiento
              </h2>
              <div className="flex flex-wrap gap-2">
                {vehicle.features.map((feature) => (
                  <Badge key={feature} variant="outline">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <VehicleInquiryButton vehicle={vehicle} dealership={dealership} dark />
        </div>
      </div>
    </Section>
  );
}
```

- [ ] **Step 3: Generate route types, then verify it compiles**

Run: `npx next typegen`
Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(site)/inventory/[id]/page.tsx" src/components/site/vehicle-detail/photo-gallery.tsx
git commit -m "feat: add vehicle detail page with photo gallery"
```

---

### Task 6: Contact form + Lead action wiring + final verification

**Files:**
- Modify: `src/app/actions/leads.ts`
- Create: `src/components/site/vehicle-detail/vehicle-contact-form.tsx`
- Modify: `src/app/(site)/inventory/[id]/page.tsx`

**Interfaces:**
- Consumes: `createLeadAction` (updated), `leadSchema` (from Task 1) via `createLeadAction`'s internal `safeParse`.
- Produces: nothing consumed by later tasks — this is the final task of the plan.

- [ ] **Step 1: Extend createLeadAction's input type to accept the new optional fields**

In `src/app/actions/leads.ts`, change the `createLeadAction` signature and body to:
```ts
export async function createLeadAction(input: {
  dealershipId: string;
  source: string;
  name: string;
  contact: string;
  message: string;
  email?: string;
  preferredContact?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Please check the form and try again." };
  }

  await createLead(input.dealershipId, parsed.data);
  return { success: true };
}
```
(Only the input type changed — the body is unchanged, since `leadSchema` already validates the new optional fields from Task 1.)

- [ ] **Step 2: Create the contact form component**

`src/components/site/vehicle-detail/vehicle-contact-form.tsx`:
```tsx
"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createLeadAction } from "@/app/actions/leads";
import type { DealershipConfig, PreferredContact, Vehicle } from "@/types";

export function VehicleContactForm({
  vehicle,
  dealership,
}: {
  vehicle: Vehicle;
  dealership: DealershipConfig;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [preferredContact, setPreferredContact] =
    useState<PreferredContact>("whatsapp");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const result = await createLeadAction({
        dealershipId: dealership.id,
        source: "vehicle_inquiry",
        name,
        contact: phone,
        message:
          message || `Interesado en ${vehicle.make} ${vehicle.model} ${vehicle.year}`,
        email: email || undefined,
        preferredContact,
      });

      if (result.success) {
        setSent(true);
      } else {
        setError(result.error);
      }
    } catch {
      setError("Algo salió mal. Por favor intentá de nuevo.");
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <p className="text-sm text-green-700">
        ¡Gracias! Recibimos tu consulta y te vamos a contactar pronto.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="font-heading text-lg tracking-tight">
        Solicitá información
      </h2>
      <div className="flex flex-col gap-2">
        <Label htmlFor="vc-name">Nombre</Label>
        <Input id="vc-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="vc-phone">Teléfono</Label>
        <Input id="vc-phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="vc-email">Email</Label>
        <Input id="vc-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="vc-message">Mensaje</Label>
        <Textarea id="vc-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Medio de contacto preferido</Label>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="preferredContact"
              checked={preferredContact === "whatsapp"}
              onChange={() => setPreferredContact("whatsapp")}
            />
            WhatsApp
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="preferredContact"
              checked={preferredContact === "email"}
              onChange={() => setPreferredContact("email")}
            />
            Email
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="preferredContact"
              checked={preferredContact === "phone"}
              onChange={() => setPreferredContact("phone")}
            />
            Teléfono
          </label>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Enviando..." : "Enviar consulta"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Wire the contact form into the detail page's right column**

In `src/app/(site)/inventory/[id]/page.tsx`:
- Add the import: `import { VehicleContactForm } from "@/components/site/vehicle-detail/vehicle-contact-form";`
- Change the right column from:
  ```tsx
  <div className="flex flex-col gap-4">
    <VehicleInquiryButton vehicle={vehicle} dealership={dealership} dark />
  </div>
  ```
  to:
  ```tsx
  <div className="flex flex-col gap-6">
    <VehicleInquiryButton vehicle={vehicle} dealership={dealership} dark />
    <VehicleContactForm vehicle={vehicle} dealership={dealership} />
  </div>
  ```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Verify the new Lead fields round-trip through real Firestore**

`scripts/manual-verify-lead-contact-fields.ts`:
```ts
import { createLead, getLeads } from "../src/lib/leads/leads";
import { leadSchema } from "../src/types";

async function main() {
  const dealershipId = "manual-verify-dealership";

  const parsed = leadSchema.parse({
    source: "vehicle_inquiry",
    name: "Test Buyer",
    contact: "+5491100000000",
    message: "Interesado en un vehículo",
    email: "buyer@example.com",
    preferredContact: "email",
  });

  await createLead(dealershipId, parsed);

  const leads = await getLeads(dealershipId);
  console.log(JSON.stringify(leads, null, 2));

  const { adminFirestore } = await import("../src/lib/firebase/admin");
  const snapshot = await adminFirestore!
    .collection("dealerships")
    .doc(dealershipId)
    .collection("leads")
    .where("contact", "==", "+5491100000000")
    .get();
  await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
  console.log("cleaned up");
}

main();
```

- [ ] **Step 6: Run it**

Run: `npx tsx --conditions=react-server --env-file=.env.local scripts/manual-verify-lead-contact-fields.ts`
Expected: prints a lead with `"email": "buyer@example.com"` and `"preferredContact": "email"` present, then `cleaned up`.

- [ ] **Step 7: Delete the throwaway script**

```bash
rm scripts/manual-verify-lead-contact-fields.ts
```

- [ ] **Step 8: Commit**

```bash
git add src/app/actions/leads.ts src/components/site/vehicle-detail/vehicle-contact-form.tsx "src/app/(site)/inventory/[id]/page.tsx"
git commit -m "feat: add vehicle detail contact form"
```

- [ ] **Step 9: Full manual browser walkthrough (controller/human step — cannot be done by a subagent without a real browser + signed-in session)**

1. Sign in as the seeded owner, go to `/dashboard/inventory`, click "Add New Car", fill in every field including at least 3 features and a description, upload 2+ photos, submit — confirm it appears in the dashboard list.
2. Visit `/inventory` — confirm the new vehicle appears, confirm clicking a Brand Scroller logo on the homepage lands on `/inventory?make=...` filtered correctly.
3. Click the vehicle card — confirm it navigates to `/inventory/[id]` (not just opening the WhatsApp dialog).
4. On the detail page: confirm the header shows make/model/version/year, info row, status badge, financing badge (if checked), and USD-formatted price.
5. Confirm the photo gallery: clicking a thumbnail swaps the main image; clicking the main image opens the full-screen viewer; prev/next controls work; swipe works on a mobile viewport (browser dev tools touch emulation is acceptable).
6. Confirm the Descripción and Equipamiento sections render with the submitted values.
7. Confirm the WhatsApp button still opens its dialog and completes the existing flow.
8. Submit the "Solicitá información" form — confirm a success message appears and the lead shows up in `/dashboard/leads` with the email and preferred contact method visible (or at least present in Firestore).
9. On the homepage, confirm clicking a vehicle card navigates to its detail page, and confirm clicking "Consultar" on that same card opens the WhatsApp dialog WITHOUT navigating away.

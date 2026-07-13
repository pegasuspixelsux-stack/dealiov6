# Dashboard Overview (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dashboard's placeholder home page with 4 KPI cards (with month-over-month and year-over-year trends), two "attention" tables (stalest listings, longest-waiting leads), and Quick Actions.

**Architecture:** `Vehicle` gains real timestamps (`createdAt`/`updatedAt`, mirroring how `Lead` already exposes them) plus an auto-managed `soldAt`. A pure `computeDashboardStats` function derives all 4 KPIs from already-fetched `Vehicle[]`/`Lead[]` arrays. The two attention tables and `LeadDetailModal` (promoted to a shared location so both Pipeline and this new page can use it) assemble into the dashboard home page.

**Tech Stack:** Next.js 16 App Router, TypeScript, zod, Firestore Admin SDK.

## Global Constraints

- **`Vehicle` gains `createdAt: string`, `updatedAt: string`, `soldAt?: string`** (ISO strings) — NOT part of `vehicleSchema` (server-managed, not user-submitted), exactly like `Lead`'s existing `createdAt`/`updatedAt` pattern.
- **`soldAt` auto-management** lives in the data layer (`createVehicle`/`updateVehicle`), not in the Server Actions, so any future caller gets correct behavior automatically: set to now when `status` transitions to `"vendido"`; left unchanged if it's already `"vendido"` and stays that way (re-editing a sold vehicle's price shouldn't reset its sold date); cleared via `FieldValue.delete()` when `status` changes away from `"vendido"`. **Do not clear it by passing `undefined`** — with this repo's `ignoreUndefinedProperties: true` Firestore setting, an `undefined` value is silently *omitted* from a `{merge: true}` write, which would leave a stale `soldAt` in place instead of clearing it. `FieldValue.delete()` is the only correct way to remove an existing field under merge semantics.
- **KPI trend honesty**: "Total Vehicles Published"'s headline number is a snapshot (`status === "disponible"` count right now), but its trend lines measure something different — vehicles *added* (by `createdAt`) this month vs. last month / same month last year, an acquisition-pace proxy. There's no historical snapshot system to reconstruct "total inventory level a month ago." "Vehicles Sold" and "Leads Received" trends are accurate real counts (`soldAt`, `createdAt` are real event timestamps). "Leads Converted" uses `updatedAt` on `stage === "ganado"` leads as a proxy for "when it was won" — same approximation already used elsewhere in this app.
- **`computeDashboardStats(vehicles, leads, now = new Date())`** takes an injectable `now` specifically so it's testable with fixed dates, without needing real Firestore data or mocking the system clock.
- **`LeadDetailModal` moves** from `src/app/(dashboard)/dashboard/pipeline/lead-detail-modal.tsx` to `src/components/dashboard/lead-detail-modal.tsx` — it's now used by both Pipeline and this new dashboard page, so it belongs in a shared location, not a single route's local directory. `pipeline-board.tsx`'s import must be updated to match.
- **Both attention tables cap at 10 rows** and reuse existing formatting/staleness logic — `getLeadStaleness` (Pipeline) for the leads table, the same status badge styling already established on the vehicle detail page for the vehicles table.
- **Explicitly out of scope this phase**: Assigned Salesperson columns, Stock Number column, Recent Activity feed, Sales Performance chart, "Add Lead"/"Register Sale"/"Upload Photos" as distinct Quick Action buttons (none are real distinct flows today).
- **No automated test runner exists in this repo.** Verification is `npx tsc --noEmit` plus real Firestore round-trips (for Task 1's data-layer changes) or fixed-fixture unit-style scripts (for Task 3's pure stats function) via throwaway `scripts/manual-verify-*.ts` files (always deleted before commit), plus a mandatory local `npm run build` before merge (this codebase has a documented blind spot where `tsc` alone doesn't catch every production build failure), plus a final manual browser walkthrough.

---

### Task 1: Data layer — Vehicle timestamps, `soldAt`, inventory settings

**Files:**
- Modify: `src/types/vehicle.ts`
- Modify: `src/lib/vehicles/vehicles.ts`
- Create: `src/types/inventory-settings.ts`
- Create: `src/lib/vehicles/inventory-config.ts`
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces: `Vehicle.createdAt`/`updatedAt`/`soldAt`, `InventorySettings`/`DEFAULT_INVENTORY_SETTINGS`/`inventorySettingsSchema`, `getInventorySettings(dealershipId): Promise<InventorySettings>`, `updateInventorySettings(dealershipId, input): Promise<void>` — consumed by Task 2 (Settings UI), Task 3 (stats), Task 4 (vehicles table).

- [ ] **Step 1: Add the three fields to the Vehicle interface**

In `src/types/vehicle.ts`, add `createdAt: string;`, `updatedAt: string;`, `soldAt?: string;` to the end of the `Vehicle` interface (after `bodyType: BodyType;` and `monthlyPayment?: number;`). Do NOT add these to `vehicleSchema` — they're server-managed, not submitted input, matching how `Lead`'s `createdAt`/`updatedAt` work.

- [ ] **Step 2: Expose timestamps and auto-manage soldAt in the data layer**

Replace the full contents of `src/lib/vehicles/vehicles.ts`:
```ts
import "server-only";
import { adminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { vehicleSchema, type Vehicle } from "@/types";
import type { z } from "zod";

export async function getVehicles(dealershipId: string): Promise<Vehicle[]> {
  if (!adminFirestore) return [];

  const snapshot = await adminFirestore
    .collection("dealerships")
    .doc(dealershipId)
    .collection("vehicles")
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.flatMap((doc) => {
    const data = doc.data();
    const parsed = vehicleSchema.safeParse(data);
    if (!parsed.success) return [];

    const createdAt: Date =
      typeof data.createdAt?.toDate === "function"
        ? data.createdAt.toDate()
        : new Date();
    const updatedAt: Date =
      typeof data.updatedAt?.toDate === "function"
        ? data.updatedAt.toDate()
        : createdAt;
    const soldAt: string | undefined =
      typeof data.soldAt?.toDate === "function"
        ? data.soldAt.toDate().toISOString()
        : undefined;

    return [
      {
        id: doc.id,
        dealershipId,
        ...parsed.data,
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
        soldAt,
      },
    ];
  });
}

export function reserveVehicleId(dealershipId: string): string {
  if (!adminFirestore) {
    throw new Error("Firestore is not configured.");
  }

  return adminFirestore
    .collection("dealerships")
    .doc(dealershipId)
    .collection("vehicles")
    .doc().id;
}

export async function createVehicle(
  dealershipId: string,
  vehicleId: string,
  input: z.infer<typeof vehicleSchema>
): Promise<void> {
  if (!adminFirestore) {
    throw new Error("Firestore is not configured.");
  }

  const now = new Date();

  await adminFirestore
    .collection("dealerships")
    .doc(dealershipId)
    .collection("vehicles")
    .doc(vehicleId)
    .set({
      ...input,
      id: vehicleId,
      dealershipId,
      createdAt: now,
      updatedAt: now,
      ...(input.status === "vendido" ? { soldAt: now } : {}),
    });
}

export async function updateVehicle(
  dealershipId: string,
  vehicleId: string,
  input: z.infer<typeof vehicleSchema>
): Promise<void> {
  if (!adminFirestore) {
    throw new Error("Firestore is not configured.");
  }

  const ref = adminFirestore
    .collection("dealerships")
    .doc(dealershipId)
    .collection("vehicles")
    .doc(vehicleId);

  const existing = await ref.get();
  const existingData = existing.data();
  const wasAlreadySold =
    existingData?.status === "vendido" && Boolean(existingData?.soldAt);

  const soldAtUpdate =
    input.status === "vendido"
      ? { soldAt: wasAlreadySold ? existingData!.soldAt : new Date() }
      : { soldAt: FieldValue.delete() };

  await ref.set(
    {
      ...input,
      id: vehicleId,
      dealershipId,
      updatedAt: new Date(),
      ...soldAtUpdate,
    },
    { merge: true }
  );
}
```

- [ ] **Step 3: Add the InventorySettings type**

`src/types/inventory-settings.ts`:
```ts
import { z } from "zod";

export interface InventorySettings {
  staleListingDays: number;
}

export const DEFAULT_INVENTORY_SETTINGS: InventorySettings = {
  staleListingDays: 60,
};

export const inventorySettingsSchema = z.object({
  staleListingDays: z.number().positive(),
});
```

- [ ] **Step 4: Add the inventory settings data-layer functions**

`src/lib/vehicles/inventory-config.ts`:
```ts
import "server-only";
import { adminFirestore } from "@/lib/firebase/admin";
import {
  inventorySettingsSchema,
  DEFAULT_INVENTORY_SETTINGS,
  type InventorySettings,
} from "@/types";

export async function getInventorySettings(
  dealershipId: string
): Promise<InventorySettings> {
  if (!adminFirestore) return DEFAULT_INVENTORY_SETTINGS;

  const doc = await adminFirestore.collection("dealerships").doc(dealershipId).get();
  const parsed = inventorySettingsSchema.safeParse(doc.data()?.inventorySettings);
  return parsed.success ? parsed.data : DEFAULT_INVENTORY_SETTINGS;
}

export async function updateInventorySettings(
  dealershipId: string,
  input: InventorySettings
): Promise<void> {
  if (!adminFirestore) {
    throw new Error("Firestore is not configured.");
  }

  await adminFirestore
    .collection("dealerships")
    .doc(dealershipId)
    .set({ inventorySettings: input }, { merge: true });
}
```

- [ ] **Step 5: Re-export the new type from the barrel**

In `src/types/index.ts`, add `export * from "./inventory-settings";` in alphabetical order — between `export * from "./firestore";` and `export * from "./lead";`.

- [ ] **Step 6: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Verify soldAt auto-management and inventory settings against real Firestore**

`scripts/manual-verify-dashboard-data.ts`:
```ts
import { adminFirestore } from "../src/lib/firebase/admin";
import {
  createVehicle,
  getVehicles,
  reserveVehicleId,
  updateVehicle,
} from "../src/lib/vehicles/vehicles";
import {
  getInventorySettings,
  updateInventorySettings,
} from "../src/lib/vehicles/inventory-config";

async function main() {
  const dealershipId = "manual-verify-dealership";
  const vehicleId = reserveVehicleId(dealershipId);

  const base = {
    make: "Toyota",
    model: "Hilux",
    year: 2021,
    price: 30000,
    mileage: 15000,
    imageUrls: ["https://example.com/a.jpg"],
    category: "used" as const,
    featured: false,
    version: "",
    fuel: "nafta" as const,
    transmission: "manual" as const,
    location: "",
    financingAvailable: false,
    description: "",
    features: [],
    color: "",
    bodyType: "pickup" as const,
  };

  await createVehicle(dealershipId, vehicleId, { ...base, status: "disponible" });
  const afterCreate = (await getVehicles(dealershipId)).find((v) => v.id === vehicleId)!;
  console.log(
    "after create:",
    JSON.stringify({
      soldAt: afterCreate.soldAt,
      hasCreatedAt: typeof afterCreate.createdAt === "string",
      hasUpdatedAt: typeof afterCreate.updatedAt === "string",
    })
  );

  await updateVehicle(dealershipId, vehicleId, { ...base, status: "vendido" });
  const afterSold = (await getVehicles(dealershipId)).find((v) => v.id === vehicleId)!;
  const soldAtFirst = afterSold.soldAt;
  console.log("after marking sold:", JSON.stringify({ soldAtSet: typeof afterSold.soldAt === "string" }));

  await new Promise((resolve) => setTimeout(resolve, 1100));
  await updateVehicle(dealershipId, vehicleId, { ...base, status: "vendido", price: 31000 });
  const afterReEdit = (await getVehicles(dealershipId)).find((v) => v.id === vehicleId)!;
  console.log(
    "after re-editing while still sold:",
    JSON.stringify({ soldAtUnchanged: afterReEdit.soldAt === soldAtFirst, price: afterReEdit.price })
  );

  await updateVehicle(dealershipId, vehicleId, { ...base, status: "disponible" });
  const afterUnsold = (await getVehicles(dealershipId)).find((v) => v.id === vehicleId)!;
  console.log(
    "after reverting to disponible:",
    JSON.stringify({ soldAtCleared: afterUnsold.soldAt === undefined })
  );

  const defaults = await getInventorySettings(dealershipId);
  console.log("default inventory settings:", JSON.stringify(defaults));
  await updateInventorySettings(dealershipId, { staleListingDays: 45 });
  const updated = await getInventorySettings(dealershipId);
  console.log("updated inventory settings:", JSON.stringify(updated));

  await adminFirestore!
    .collection("dealerships")
    .doc(dealershipId)
    .collection("vehicles")
    .doc(vehicleId)
    .delete();
  console.log("cleaned up");
}

main();
```

- [ ] **Step 8: Run it**

Run: `npx tsx --conditions=react-server --env-file=.env.local scripts/manual-verify-dashboard-data.ts`
Expected output, in order:
- `after create: {"soldAt":undefined,"hasCreatedAt":true,"hasUpdatedAt":true}` (note: `JSON.stringify` actually omits an `undefined`-valued key entirely, so this line will print as `{"hasCreatedAt":true,"hasUpdatedAt":true}` — confirm `soldAt` is simply absent from the printed object)
- `after marking sold: {"soldAtSet":true}`
- `after re-editing while still sold: {"soldAtUnchanged":true,"price":31000}`
- `after reverting to disponible: {"soldAtCleared":true}`
- `default inventory settings: {"staleListingDays":60}`
- `updated inventory settings: {"staleListingDays":45}`
- `cleaned up`

- [ ] **Step 9: Delete the throwaway script**

```bash
rm scripts/manual-verify-dashboard-data.ts
```

- [ ] **Step 10: Commit**

```bash
git add src/types/vehicle.ts src/lib/vehicles/vehicles.ts src/types/inventory-settings.ts src/lib/vehicles/inventory-config.ts src/types/index.ts
git commit -m "feat: add Vehicle timestamps, auto-managed soldAt, and inventory settings"
```

---

### Task 2: Settings — "Inventario" section

**Files:**
- Create: `src/app/actions/inventory-config.ts`
- Create: `src/app/(dashboard)/dashboard/settings/inventory-settings-form.tsx`
- Modify: `src/app/(dashboard)/dashboard/settings/page.tsx`

**Interfaces:**
- Consumes: `getInventorySettings`, `inventorySettingsSchema`, `updateInventorySettings` (Task 1).
- Produces: nothing consumed by later tasks in this plan — but lets staff configure `staleListingDays` before Task 4's table uses it.

- [ ] **Step 1: Add the Server Action**

`src/app/actions/inventory-config.ts`:
```ts
"use server";

import { verifySession } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { updateInventorySettings } from "@/lib/vehicles/inventory-config";
import { inventorySettingsSchema } from "@/types";

export async function updateInventorySettingsAction(input: {
  staleListingDays: number;
}): Promise<{ success: true } | { success: false; error: string }> {
  const session = await verifySession();
  if (!session) {
    return { success: false, error: "Not signed in." };
  }
  if (!can(session.role, "canAccessConfig")) {
    return { success: false, error: "You don't have permission to change settings." };
  }

  const parsed = inventorySettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Please check the values and try again." };
  }

  await updateInventorySettings(session.dealershipId, parsed.data);
  return { success: true };
}
```

- [ ] **Step 2: Add the form component**

`src/app/(dashboard)/dashboard/settings/inventory-settings-form.tsx`:
```tsx
"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateInventorySettingsAction } from "@/app/actions/inventory-config";
import type { InventorySettings } from "@/types";

export function InventorySettingsForm({ initial }: { initial: InventorySettings }) {
  const [values, setValues] = useState<InventorySettings>(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleChange(field: keyof InventorySettings) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: Number(event.target.value) }));
      setSaved(false);
    };
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);

    try {
      const result = await updateInventorySettingsAction(values);
      if (result.success) {
        setSaved(true);
      } else {
        setError(result.error);
      }
    } catch {
      setError("Algo salió mal. Por favor intentá de nuevo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="is-stale-days">
          Marcar como atrasado después de (días)
        </Label>
        <Input
          id="is-stale-days"
          type="number"
          value={values.staleListingDays}
          onChange={handleChange("staleListingDays")}
          required
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-600">Guardado.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Wire the new section into the Settings page**

Replace the full contents of `src/app/(dashboard)/dashboard/settings/page.tsx`:
```tsx
import Image from "next/image";
import { verifySession } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { Forbidden } from "@/components/dashboard/coming-soon";
import { getLeadStageThresholds } from "@/lib/leads/lead-config";
import { getBrands } from "@/lib/brands/brands";
import { getInventorySettings } from "@/lib/vehicles/inventory-config";
import { LeadThresholdsForm } from "./lead-thresholds-form";
import { AddBrandForm } from "./add-brand-form";
import { InventorySettingsForm } from "./inventory-settings-form";

export default async function SettingsPage() {
  const session = await verifySession();
  if (!session || !can(session.role, "canAccessConfig")) {
    return <Forbidden />;
  }

  const [thresholds, brands, inventorySettings] = await Promise.all([
    getLeadStageThresholds(session.dealershipId),
    getBrands(session.dealershipId),
    getInventorySettings(session.dealershipId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Leads</h2>
        <LeadThresholdsForm initial={thresholds} />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Inventario</h2>
        <InventorySettingsForm initial={inventorySettings} />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Marcas</h2>
        {brands.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay marcas todavía.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {brands.map((brand) => (
              <li key={brand.id} className="flex items-center gap-3">
                <div className="relative size-10 shrink-0">
                  <Image
                    src={brand.logoUrl}
                    alt={brand.name}
                    fill
                    className="rounded-md object-contain"
                  />
                </div>
                <span className="text-sm">{brand.name}</span>
              </li>
            ))}
          </ul>
        )}
        <AddBrandForm />
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/actions/inventory-config.ts "src/app/(dashboard)/dashboard/settings/inventory-settings-form.tsx" "src/app/(dashboard)/dashboard/settings/page.tsx"
git commit -m "feat: add Inventario section to Settings for staleListingDays"
```

---

### Task 3: Stats computation + KPI cards

**Files:**
- Create: `src/lib/dashboard/stats.ts`
- Create: `src/components/dashboard/kpi-card.tsx`
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `type Vehicle`, `type Lead` from `@/types`.
- Produces: `computeDashboardStats(vehicles, leads, now?): DashboardStats`, `type DashboardStats`, `type TrendMetric` — consumed by Task 5's final page assembly (this task already wires KPIs into the page; Tasks 4-5 add more sections to the same page without touching this part).

- [ ] **Step 1: Add the stats computation module**

`src/lib/dashboard/stats.ts`:
```ts
import type { Vehicle, Lead } from "@/types";

export interface TrendMetric {
  value: number;
  vsLastMonth: number | null;
  vsLastYear: number | null;
}

export interface DashboardStats {
  vehiclesPublished: TrendMetric;
  vehiclesSold: TrendMetric;
  leadsReceived: TrendMetric & { today: number };
  leadsConverted: TrendMetric & { conversionPercent: number };
}

function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function isSameMonth(date: Date, reference: Date): boolean {
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth()
  );
}

function countInMonth(dates: Date[], reference: Date): number {
  return dates.filter((date) => isSameMonth(date, reference)).length;
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export function computeDashboardStats(
  vehicles: Vehicle[],
  leads: Lead[],
  now: Date = new Date()
): DashboardStats {
  const lastMonth = addMonths(now, -1);
  const lastYear = addMonths(now, -12);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const publishedNow = vehicles.filter((v) => v.status === "disponible").length;
  const createdDates = vehicles.map((v) => new Date(v.createdAt));
  const addedThisMonth = countInMonth(createdDates, now);
  const addedLastMonth = countInMonth(createdDates, lastMonth);
  const addedLastYear = countInMonth(createdDates, lastYear);

  const soldDates = vehicles
    .filter((v): v is Vehicle & { soldAt: string } => typeof v.soldAt === "string")
    .map((v) => new Date(v.soldAt));
  const soldThisMonth = countInMonth(soldDates, now);
  const soldLastMonth = countInMonth(soldDates, lastMonth);
  const soldLastYearCount = countInMonth(soldDates, lastYear);

  const leadCreatedDates = leads.map((l) => new Date(l.createdAt));
  const leadsThisMonth = countInMonth(leadCreatedDates, now);
  const leadsLastMonth = countInMonth(leadCreatedDates, lastMonth);
  const leadsLastYearCount = countInMonth(leadCreatedDates, lastYear);
  const leadsToday = leadCreatedDates.filter((date) => date >= todayStart).length;

  const wonUpdatedDates = leads
    .filter((l) => l.stage === "ganado")
    .map((l) => new Date(l.updatedAt));
  const convertedThisMonth = countInMonth(wonUpdatedDates, now);
  const convertedLastMonth = countInMonth(wonUpdatedDates, lastMonth);
  const convertedLastYear = countInMonth(wonUpdatedDates, lastYear);
  const conversionPercent =
    leadsThisMonth === 0 ? 0 : Math.round((convertedThisMonth / leadsThisMonth) * 100);

  return {
    vehiclesPublished: {
      value: publishedNow,
      vsLastMonth: percentChange(addedThisMonth, addedLastMonth),
      vsLastYear: percentChange(addedThisMonth, addedLastYear),
    },
    vehiclesSold: {
      value: soldThisMonth,
      vsLastMonth: percentChange(soldThisMonth, soldLastMonth),
      vsLastYear: percentChange(soldThisMonth, soldLastYearCount),
    },
    leadsReceived: {
      value: leadsThisMonth,
      vsLastMonth: percentChange(leadsThisMonth, leadsLastMonth),
      vsLastYear: percentChange(leadsThisMonth, leadsLastYearCount),
      today: leadsToday,
    },
    leadsConverted: {
      value: convertedThisMonth,
      vsLastMonth: percentChange(convertedThisMonth, convertedLastMonth),
      vsLastYear: percentChange(convertedThisMonth, convertedLastYear),
      conversionPercent,
    },
  };
}
```

- [ ] **Step 2: Add the KPI card component**

`src/components/dashboard/kpi-card.tsx`:
```tsx
function formatTrend(value: number | null): string {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value}%`;
}

export function KpiCard({
  label,
  value,
  vsLastMonth,
  vsLastYear,
  suffix,
}: {
  label: string;
  value: number;
  vsLastMonth: number | null;
  vsLastYear: number | null;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-semibold">
        {value}
        {suffix && (
          <span className="ml-1 text-base font-normal text-muted-foreground">
            {suffix}
          </span>
        )}
      </p>
      <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
        <span>{formatTrend(vsLastMonth)} vs. mes pasado</span>
        <span>{formatTrend(vsLastYear)} vs. año pasado</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire KPI cards into the dashboard home page**

Replace the full contents of `src/app/(dashboard)/dashboard/page.tsx`:
```tsx
import { verifySession } from "@/lib/auth/dal";
import { getVehicles } from "@/lib/vehicles/vehicles";
import { getLeads } from "@/lib/leads/leads";
import { computeDashboardStats } from "@/lib/dashboard/stats";
import { KpiCard } from "@/components/dashboard/kpi-card";

export default async function DashboardHomePage() {
  const session = await verifySession();
  if (!session) return null;

  const [vehicles, leads] = await Promise.all([
    getVehicles(session.dealershipId),
    getLeads(session.dealershipId),
  ]);
  const stats = computeDashboardStats(vehicles, leads);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {session.name}</h1>
        <p className="text-muted-foreground">
          Role: <span className="capitalize">{session.role}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Vehículos Publicados"
          value={stats.vehiclesPublished.value}
          vsLastMonth={stats.vehiclesPublished.vsLastMonth}
          vsLastYear={stats.vehiclesPublished.vsLastYear}
        />
        <KpiCard
          label="Vehículos Vendidos"
          value={stats.vehiclesSold.value}
          vsLastMonth={stats.vehiclesSold.vsLastMonth}
          vsLastYear={stats.vehiclesSold.vsLastYear}
        />
        <KpiCard
          label="Leads Recibidos"
          value={stats.leadsReceived.value}
          vsLastMonth={stats.leadsReceived.vsLastMonth}
          vsLastYear={stats.leadsReceived.vsLastYear}
          suffix={`(hoy: ${stats.leadsReceived.today})`}
        />
        <KpiCard
          label="Leads Convertidos"
          value={stats.leadsConverted.value}
          vsLastMonth={stats.leadsConverted.vsLastMonth}
          vsLastYear={stats.leadsConverted.vsLastYear}
          suffix={`(${stats.leadsConverted.conversionPercent}%)`}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Verify computeDashboardStats against fixed fixtures**

`scripts/manual-verify-dashboard-stats.ts`:
```ts
import { computeDashboardStats } from "../src/lib/dashboard/stats";
import type { Vehicle, Lead } from "../src/types";

const now = new Date("2026-07-15T12:00:00.000Z");

function vehicle(overrides: Partial<Vehicle>): Vehicle {
  return {
    id: "v",
    dealershipId: "d1",
    make: "Toyota",
    model: "Corolla",
    year: 2022,
    price: 20000,
    mileage: 10000,
    imageUrls: ["https://example.com/a.jpg"],
    category: "used",
    featured: false,
    version: "",
    fuel: "nafta",
    transmission: "manual",
    location: "",
    financingAvailable: false,
    status: "disponible",
    description: "",
    features: [],
    color: "",
    bodyType: "sedan",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    ...overrides,
  };
}

function lead(overrides: Partial<Lead>): Lead {
  return {
    id: "l",
    dealershipId: "d1",
    source: "vehicle_inquiry",
    name: "Test",
    contact: "123",
    message: "hi",
    stage: "recibido",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    ...overrides,
  };
}

const vehicles: Vehicle[] = [
  vehicle({ id: "v1", status: "disponible", createdAt: "2026-07-05T12:00:00.000Z" }),
  vehicle({ id: "v2", status: "disponible", createdAt: "2026-06-05T12:00:00.000Z" }),
  vehicle({ id: "v3", status: "disponible", createdAt: "2025-07-05T12:00:00.000Z" }),
  vehicle({
    id: "v4",
    status: "vendido",
    createdAt: "2020-01-05T12:00:00.000Z",
    soldAt: "2026-07-10T12:00:00.000Z",
  }),
  vehicle({
    id: "v5",
    status: "vendido",
    createdAt: "2020-01-05T12:00:00.000Z",
    soldAt: "2026-06-10T12:00:00.000Z",
  }),
  vehicle({
    id: "v6",
    status: "vendido",
    createdAt: "2020-01-05T12:00:00.000Z",
    soldAt: "2025-07-10T12:00:00.000Z",
  }),
];

const leads: Lead[] = [
  lead({ id: "l1", createdAt: "2026-07-14T12:00:00.000Z", updatedAt: "2026-07-14T12:00:00.000Z" }),
  lead({ id: "l2", createdAt: "2026-07-15T12:00:00.000Z", updatedAt: "2026-07-15T12:00:00.000Z" }),
  lead({ id: "l3", createdAt: "2026-06-14T12:00:00.000Z", updatedAt: "2026-06-14T12:00:00.000Z" }),
  lead({ id: "l4", createdAt: "2025-07-14T12:00:00.000Z", updatedAt: "2025-07-14T12:00:00.000Z" }),
  lead({
    id: "l5",
    stage: "ganado",
    createdAt: "2026-07-01T12:00:00.000Z",
    updatedAt: "2026-07-12T12:00:00.000Z",
  }),
  lead({
    id: "l6",
    stage: "ganado",
    createdAt: "2020-01-05T12:00:00.000Z",
    updatedAt: "2026-06-12T12:00:00.000Z",
  }),
  lead({
    id: "l7",
    stage: "ganado",
    createdAt: "2020-01-05T12:00:00.000Z",
    updatedAt: "2025-07-12T12:00:00.000Z",
  }),
];

console.log(JSON.stringify(computeDashboardStats(vehicles, leads, now), null, 2));
```

- [ ] **Step 6: Run it**

Run: `npx tsx --conditions=react-server scripts/manual-verify-dashboard-stats.ts`

(No `--env-file` needed — this script only exercises the pure `computeDashboardStats` function over synthetic in-memory data, no Firestore involved.)

Expected output:
```json
{
  "vehiclesPublished": { "value": 3, "vsLastMonth": 0, "vsLastYear": 0 },
  "vehiclesSold": { "value": 1, "vsLastMonth": 0, "vsLastYear": 0 },
  "leadsReceived": { "value": 3, "vsLastMonth": 200, "vsLastYear": 200, "today": 1 },
  "leadsConverted": { "value": 1, "vsLastMonth": 0, "vsLastYear": 0, "conversionPercent": 33 }
}
```

- [ ] **Step 7: Delete the throwaway script**

```bash
rm scripts/manual-verify-dashboard-stats.ts
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/dashboard/stats.ts src/components/dashboard/kpi-card.tsx "src/app/(dashboard)/dashboard/page.tsx"
git commit -m "feat: add dashboard stats computation and KPI cards"
```

---

### Task 4: Vehicles Listed the Longest table

**Files:**
- Create: `src/components/dashboard/vehicles-attention-table.tsx`
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `getInventorySettings` (Task 1); `formatPrice` from `@/lib/format-price`; `VEHICLE_STATUS_LABELS`, `type Vehicle`, `type VehicleStatus` from `@/types`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Create the table component**

`src/components/dashboard/vehicles-attention-table.tsx`:
```tsx
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format-price";
import { VEHICLE_STATUS_LABELS, type Vehicle, type VehicleStatus } from "@/types";

const STATUS_BADGE_VARIANT: Record<VehicleStatus, "default" | "secondary" | "outline"> = {
  disponible: "default",
  reservado: "secondary",
  vendido: "outline",
};

function daysOnline(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
}

export function VehiclesAttentionTable({
  vehicles,
  staleListingDays,
}: {
  vehicles: Vehicle[];
  staleListingDays: number;
}) {
  const listed = [...vehicles]
    .filter((v) => v.status !== "vendido")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(0, 10);

  if (listed.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay vehículos publicados.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-2 pr-4">Foto</th>
          <th className="py-2 pr-4">Vehículo</th>
          <th className="py-2 pr-4">Publicado</th>
          <th className="py-2 pr-4">Días en línea</th>
          <th className="py-2 pr-4">Precio</th>
          <th className="py-2 pr-4">Estado</th>
          <th className="py-2 pr-4">Acción</th>
        </tr>
      </thead>
      <tbody>
        {listed.map((vehicle) => {
          const days = daysOnline(vehicle.createdAt);
          const stale = days > staleListingDays;
          return (
            <tr key={vehicle.id} className={cn("border-b", stale && "bg-red-50")}>
              <td className="py-2 pr-4">
                {vehicle.imageUrls[0] && (
                  <div className="relative size-12 overflow-hidden rounded-md">
                    <Image src={vehicle.imageUrls[0]} alt="" fill className="object-cover" />
                  </div>
                )}
              </td>
              <td className="py-2 pr-4">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </td>
              <td className="py-2 pr-4">
                {new Date(vehicle.createdAt).toLocaleDateString()}
              </td>
              <td className={cn("py-2 pr-4", stale && "font-semibold text-red-600")}>
                {days}
              </td>
              <td className="py-2 pr-4">{formatPrice(vehicle.price)}</td>
              <td className="py-2 pr-4">
                <Badge variant={STATUS_BADGE_VARIANT[vehicle.status]}>
                  {VEHICLE_STATUS_LABELS[vehicle.status]}
                </Badge>
              </td>
              <td className="py-2 pr-4">
                <Button
                  size="sm"
                  variant="outline"
                  render={
                    <Link href={`/inventory/${vehicle.id}`} target="_blank">
                      Ver Vehículo
                    </Link>
                  }
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: Wire the table into the dashboard page**

In `src/app/(dashboard)/dashboard/page.tsx`, add these imports:
```ts
import { getInventorySettings } from "@/lib/vehicles/inventory-config";
import { VehiclesAttentionTable } from "@/components/dashboard/vehicles-attention-table";
```
Change the `Promise.all` to also fetch inventory settings:
```ts
  const [vehicles, leads, inventorySettings] = await Promise.all([
    getVehicles(session.dealershipId),
    getLeads(session.dealershipId),
    getInventorySettings(session.dealershipId),
  ]);
```
Add this section right after the closing `</div>` of the KPI grid (before the final closing `</div>` of the page):
```tsx
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Vehículos Publicados Hace Más Tiempo</h2>
        <VehiclesAttentionTable
          vehicles={vehicles}
          staleListingDays={inventorySettings.staleListingDays}
        />
      </section>
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/vehicles-attention-table.tsx "src/app/(dashboard)/dashboard/page.tsx"
git commit -m "feat: add Vehicles Listed the Longest table to dashboard"
```

---

### Task 5: Leads Waiting the Longest table + Quick Actions + final assembly

**Files:**
- Move: `src/app/(dashboard)/dashboard/pipeline/lead-detail-modal.tsx` → `src/components/dashboard/lead-detail-modal.tsx`
- Modify: `src/app/(dashboard)/dashboard/pipeline/pipeline-board.tsx`
- Create: `src/components/dashboard/leads-attention-table.tsx`
- Create: `src/components/dashboard/quick-actions.tsx`
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `getLeadStaleness` from `@/lib/leads/staleness`; `getLeadStageThresholds` from `@/lib/leads/lead-config`; `LEAD_STAGE_LABELS`, `type Lead`, `type LeadSource`, `type LeadStageThresholds` from `@/types`; the moved `LeadDetailModal`.
- Produces: nothing consumed by later tasks — final task of this plan.

- [ ] **Step 1: Move LeadDetailModal to a shared location**

Move `src/app/(dashboard)/dashboard/pipeline/lead-detail-modal.tsx` to `src/components/dashboard/lead-detail-modal.tsx` with its contents unchanged (it has no relative imports that need updating — everything it imports uses the `@/` alias already).

```bash
git mv "src/app/(dashboard)/dashboard/pipeline/lead-detail-modal.tsx" "src/components/dashboard/lead-detail-modal.tsx"
```

- [ ] **Step 2: Update Pipeline's import**

In `src/app/(dashboard)/dashboard/pipeline/pipeline-board.tsx`, change:
```ts
import { LeadDetailModal } from "./lead-detail-modal";
```
to:
```ts
import { LeadDetailModal } from "@/components/dashboard/lead-detail-modal";
```

- [ ] **Step 3: Create the leads attention table**

`src/components/dashboard/leads-attention-table.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LEAD_STAGE_LABELS } from "@/types";
import type { Lead, LeadSource, LeadStageThresholds } from "@/types";
import { getLeadStaleness, type Staleness } from "@/lib/leads/staleness";
import { LeadDetailModal } from "./lead-detail-modal";

const STALENESS_COLORS: Record<Staleness, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
};

const SOURCE_LABELS: Record<LeadSource, string> = {
  vehicle_inquiry: "Interés en vehículo",
  trade_in: "Canje",
  general_inquiry: "Consulta general",
};

const STALENESS_ORDER: Record<Staleness, number> = { red: 0, yellow: 1, green: 2 };

function daysWaiting(updatedAt: string): number {
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24));
}

export function LeadsAttentionTable({
  leads,
  thresholds,
}: {
  leads: Lead[];
  thresholds: LeadStageThresholds;
}) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const waiting = leads
    .filter((lead) => lead.stage !== "ganado" && lead.stage !== "perdido")
    .map((lead) => ({
      lead,
      staleness: getLeadStaleness(lead.stage, lead.updatedAt, thresholds),
    }))
    .sort((a, b) => {
      const aOrder = a.staleness ? STALENESS_ORDER[a.staleness] : 3;
      const bOrder = b.staleness ? STALENESS_ORDER[b.staleness] : 3;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return new Date(a.lead.updatedAt).getTime() - new Date(b.lead.updatedAt).getTime();
    })
    .slice(0, 10);

  if (waiting.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay leads pendientes.</p>;
  }

  return (
    <>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-4">Cliente</th>
            <th className="py-2 pr-4">Interés</th>
            <th className="py-2 pr-4">Origen</th>
            <th className="py-2 pr-4">Recibido</th>
            <th className="py-2 pr-4">Días esperando</th>
            <th className="py-2 pr-4">Estado</th>
            <th className="py-2 pr-4">Acción</th>
          </tr>
        </thead>
        <tbody>
          {waiting.map(({ lead, staleness }) => (
            <tr key={lead.id} className="border-b">
              <td className="py-2 pr-4">{lead.name}</td>
              <td className="line-clamp-1 max-w-48 py-2 pr-4">{lead.message}</td>
              <td className="py-2 pr-4">{SOURCE_LABELS[lead.source]}</td>
              <td className="py-2 pr-4">{new Date(lead.createdAt).toLocaleDateString()}</td>
              <td className="py-2 pr-4">{daysWaiting(lead.updatedAt)}</td>
              <td className="py-2 pr-4">
                <span className="flex items-center gap-2">
                  {staleness && (
                    <span className={`size-2 shrink-0 rounded-full ${STALENESS_COLORS[staleness]}`} />
                  )}
                  {LEAD_STAGE_LABELS[lead.stage]}
                </span>
              </td>
              <td className="py-2 pr-4">
                <Button size="sm" variant="outline" onClick={() => setSelectedLead(lead)}>
                  Abrir Lead
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {selectedLead && (
        <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}
    </>
  );
}
```

- [ ] **Step 4: Create the Quick Actions component**

`src/components/dashboard/quick-actions.tsx`:
```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button render={<Link href="/dashboard/inventory">Agregar Vehículo</Link>} />
      <Button
        variant="outline"
        render={<Link href="/dashboard/inventory">Gestionar Inventario</Link>}
      />
      <Button variant="outline" render={<Link href="/dashboard/pipeline">Ver Leads</Link>} />
    </div>
  );
}
```

- [ ] **Step 5: Final page assembly**

Replace the full contents of `src/app/(dashboard)/dashboard/page.tsx`:
```tsx
import { verifySession } from "@/lib/auth/dal";
import { getVehicles } from "@/lib/vehicles/vehicles";
import { getLeads } from "@/lib/leads/leads";
import { getInventorySettings } from "@/lib/vehicles/inventory-config";
import { getLeadStageThresholds } from "@/lib/leads/lead-config";
import { computeDashboardStats } from "@/lib/dashboard/stats";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { VehiclesAttentionTable } from "@/components/dashboard/vehicles-attention-table";
import { LeadsAttentionTable } from "@/components/dashboard/leads-attention-table";
import { QuickActions } from "@/components/dashboard/quick-actions";

export default async function DashboardHomePage() {
  const session = await verifySession();
  if (!session) return null;

  const [vehicles, leads, inventorySettings, leadThresholds] = await Promise.all([
    getVehicles(session.dealershipId),
    getLeads(session.dealershipId),
    getInventorySettings(session.dealershipId),
    getLeadStageThresholds(session.dealershipId),
  ]);
  const stats = computeDashboardStats(vehicles, leads);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {session.name}</h1>
        <p className="text-muted-foreground">
          Role: <span className="capitalize">{session.role}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Vehículos Publicados"
          value={stats.vehiclesPublished.value}
          vsLastMonth={stats.vehiclesPublished.vsLastMonth}
          vsLastYear={stats.vehiclesPublished.vsLastYear}
        />
        <KpiCard
          label="Vehículos Vendidos"
          value={stats.vehiclesSold.value}
          vsLastMonth={stats.vehiclesSold.vsLastMonth}
          vsLastYear={stats.vehiclesSold.vsLastYear}
        />
        <KpiCard
          label="Leads Recibidos"
          value={stats.leadsReceived.value}
          vsLastMonth={stats.leadsReceived.vsLastMonth}
          vsLastYear={stats.leadsReceived.vsLastYear}
          suffix={`(hoy: ${stats.leadsReceived.today})`}
        />
        <KpiCard
          label="Leads Convertidos"
          value={stats.leadsConverted.value}
          vsLastMonth={stats.leadsConverted.vsLastMonth}
          vsLastYear={stats.leadsConverted.vsLastYear}
          suffix={`(${stats.leadsConverted.conversionPercent}%)`}
        />
      </div>

      <QuickActions />

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Vehículos Publicados Hace Más Tiempo</h2>
        <VehiclesAttentionTable
          vehicles={vehicles}
          staleListingDays={inventorySettings.staleListingDays}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Leads Esperando Hace Más Tiempo</h2>
        <LeadsAttentionTable leads={leads} thresholds={leadThresholds} />
      </section>
    </div>
  );
}
```

- [ ] **Step 6: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Verify a full local production build succeeds**

Run: `npm run build`
Expected: completes successfully (exit 0), including "Collecting page data" and "Generating static pages" — mandatory per this codebase's documented `tsc`-doesn't-catch-everything blind spot. Also confirm the Pipeline page (`/dashboard/pipeline`) still builds cleanly after the `LeadDetailModal` move — check the route table includes `/dashboard/pipeline` and `/dashboard`.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(dashboard)/dashboard/pipeline/lead-detail-modal.tsx" "src/components/dashboard/lead-detail-modal.tsx" "src/app/(dashboard)/dashboard/pipeline/pipeline-board.tsx" src/components/dashboard/leads-attention-table.tsx src/components/dashboard/quick-actions.tsx "src/app/(dashboard)/dashboard/page.tsx"
git commit -m "feat: add Leads Waiting the Longest table, Quick Actions, and finish dashboard overview"
```

(The `git add` includes both the old and new `lead-detail-modal.tsx` paths so git records the move correctly, even though the old path no longer exists on disk after Step 1's `git mv`.)

- [ ] **Step 9: Full manual browser walkthrough (controller/human step — cannot be done by a subagent without a real browser + signed-in session)**

1. Sign in as the seeded owner, visit `/dashboard` — confirm the 4 KPI cards render with plausible numbers matching a manual count of real data (vehicles with `status === "disponible"`, leads created this month, etc.).
2. Confirm each KPI card shows both "vs. mes pasado" and "vs. año pasado" lines, even if some show "—" (expected when there's no prior-period data yet in this dealership).
3. Confirm "Vehículos Publicados Hace Más Tiempo" lists non-sold vehicles oldest-first, and that changing "Marcar como atrasado después de (días)" in Settings → Inventario changes which rows get the red highlight on this page.
4. Confirm "Leads Esperando Hace Más Tiempo" excludes won/lost leads, sorts worst-staleness-first, and that clicking "Abrir Lead" opens the same modal Pipeline uses — change a stage there and confirm it's reflected both on this page and on `/dashboard/pipeline`.
5. Confirm Quick Actions navigate correctly (Agregar Vehículo / Gestionar Inventario → `/dashboard/inventory`, Ver Leads → `/dashboard/pipeline`).
6. Mark a vehicle as sold (Edit → status → Vendido) via `/dashboard/inventory`, then revisit `/dashboard` and confirm "Vehículos Vendidos" reflects it. Edit that same vehicle again without changing its status and confirm the KPI doesn't double-count it or reset its sold date.
7. Confirm `/dashboard/pipeline` still works exactly as before (stage changes, staleness dots) after the `LeadDetailModal` move.

# Inventory Dashboard Page + Add New Car Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dashboard Inventory page's "Coming soon" placeholder with a real, Firestore-backed list + "Add New Car" modal, and wire the public homepage off the same data instead of the hardcoded mock fixture.

**Architecture:** A new server-only Firestore access module (`getVehicles`/`createVehicle`) backs both the dashboard (Server Component page + a Server Action for the create form) and the public homepage (Server Component fetch, passed down as props). Authorization is enforced in the Server Action itself, not just hidden in the UI.

**Tech Stack:** Next.js 16 App Router, TypeScript, zod, firebase-admin (Firestore), shadcn/ui (new `dialog` component), Server Actions.

## Global Constraints

- Firestore path: `dealerships/{dealershipId}/vehicles/{vehicleId}` — a subcollection, per the existing `TenantScopedDocument` convention in `src/types/firestore.ts`. Every document still carries an explicit `dealershipId` field.
- `vehicleSchema` validates exactly: `make, model, year, price, mileage, imageUrl, category, featured` — no `id`/`dealershipId`/timestamps (those are assigned server-side, not submitted by the form).
- `category` is exactly `"new" | "used"` (matches the existing `VehicleCategory` type).
- No automated test runner exists in this repo — every task's verification is a manual, reproducible step (typecheck + real Firestore/browser checks), not a unit test suite.
- Authorization: only roles with `canManageVehicles` (owner, manager — see `src/lib/auth/permissions.ts`) may create vehicles. This must be checked inside the Server Action itself, not only in the UI.
- Out of scope (do not implement): edit/delete vehicles, real image upload/storage, Leads dashboard page, frontend leads modal, filtering/search/pagination, multi-tenant testing.

---

### Task 1: Add `dealershipId` to `Vehicle` + add `vehicleSchema`

**Files:**
- Modify: `src/types/vehicle.ts`

**Interfaces:**
- Produces: `Vehicle` (existing interface, gains `dealershipId: string`); `vehicleSchema` (new zod object) — both exported from `@/types` (already re-exported via `src/types/index.ts`'s `export * from "./vehicle"`, no index.ts change needed).

- [ ] **Step 1: Update the file**

`src/types/vehicle.ts`:
```ts
import { z } from "zod";

export type VehicleCategory = "new" | "used";

export interface Vehicle {
  id: string;
  dealershipId: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  imageUrl: string;
  category: VehicleCategory;
  featured: boolean;
}

export const vehicleSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1900).max(2100),
  price: z.number().nonnegative(),
  mileage: z.number().nonnegative(),
  imageUrl: z.string().url(),
  category: z.enum(["new", "used"]),
  featured: z.boolean(),
});
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: errors in `src/lib/vehicles/mock-data.ts` (its 9 fixture objects now lack `dealershipId`) — this is expected and will be fixed in Task 5 when that file is deleted. Confirm there are no *other* errors (e.g. in `vehicle-card.tsx`, `trend-vehicles.tsx`, `inventory-grid.tsx` — none of them construct a `Vehicle` themselves, only consume one, so they shouldn't error).

- [ ] **Step 3: Commit**

```bash
git add src/types/vehicle.ts
git commit -m "feat: add dealershipId to Vehicle and add vehicleSchema"
```

---

### Task 2: Add Firestore access layer (`getVehicles`, `createVehicle`)

**Files:**
- Create: `src/lib/vehicles/vehicles.ts`

**Interfaces:**
- Consumes: `adminFirestore` from `@/lib/firebase/admin`; `vehicleSchema`, `type Vehicle` from `@/types` (Task 1).
- Produces: `getVehicles(dealershipId: string): Promise<Vehicle[]>` and `createVehicle(dealershipId: string, input: z.infer<typeof vehicleSchema>): Promise<string>` — both used by Task 3 (Server Action) and Task 5 (homepage).

- [ ] **Step 1: Create the module**

`src/lib/vehicles/vehicles.ts`:
```ts
import "server-only";
import { adminFirestore } from "@/lib/firebase/admin";
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

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Vehicle);
}

export async function createVehicle(
  dealershipId: string,
  input: z.infer<typeof vehicleSchema>
): Promise<string> {
  if (!adminFirestore) {
    throw new Error("Firestore is not configured.");
  }

  const now = new Date();
  const ref = adminFirestore
    .collection("dealerships")
    .doc(dealershipId)
    .collection("vehicles")
    .doc();

  await ref.set({
    ...input,
    id: ref.id,
    dealershipId,
    createdAt: now,
    updatedAt: now,
  });

  return ref.id;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: same pre-existing `mock-data.ts` errors as Task 1 (still not fixed until Task 5), no new errors.

- [ ] **Step 3: Verify against real Firestore with a throwaway script**

`scripts/manual-verify-vehicles.ts`:
```ts
import { createVehicle, getVehicles } from "../src/lib/vehicles/vehicles";

async function main() {
  const dealershipId = "manual-verify-dealership";
  const id = await createVehicle(dealershipId, {
    make: "TestMake",
    model: "TestModel",
    year: 2024,
    price: 10000,
    mileage: 500,
    imageUrl: "https://example.com/car.jpg",
    category: "new",
    featured: false,
  });
  console.log("Created:", id);

  const vehicles = await getVehicles(dealershipId);
  console.log("Fetched:", vehicles);
}

main();
```

- [ ] **Step 4: Run it**

Run: `npx tsx scripts/manual-verify-vehicles.ts`
Expected: prints the created doc's id, then an array containing exactly one vehicle whose fields match what was passed in, plus `id` and `dealershipId: "manual-verify-dealership"`.

- [ ] **Step 5: Clean up the test data and the throwaway script**

Delete the Firestore document created in Step 3/4 (write a one-off `adminFirestore.collection("dealerships").doc("manual-verify-dealership").collection("vehicles").doc(id).delete()` call, or delete via the Firebase console under `dealerships/manual-verify-dealership/vehicles`), then:

```bash
rm scripts/manual-verify-vehicles.ts
```

(Never committed — it only existed to prove Step 4's output.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/vehicles/vehicles.ts
git commit -m "feat: add Firestore access layer for vehicles"
```

---

### Task 3: Add `dialog` component + create Server Action

**Files:**
- Create (via shadcn CLI): `src/components/ui/dialog.tsx`
- Create: `src/app/(dashboard)/dashboard/inventory/actions.ts`

**Interfaces:**
- Consumes: `verifySession` from `@/lib/auth/dal`; `can` from `@/lib/auth/permissions`; `createVehicle` from `@/lib/vehicles/vehicles` (Task 2); `vehicleSchema` from `@/types` (Task 1).
- Produces: `createVehicleAction(formData: FormData): Promise<{ success: true } | { success: false; error: string }>` — used by Task 4's modal. `Dialog`/`DialogContent`/`DialogTrigger`/etc. exports from `@/components/ui/dialog` — used by Task 4's modal.

- [ ] **Step 1: Install the shadcn dialog component**

Run: `npx shadcn add dialog`
Expected: creates `src/components/ui/dialog.tsx` (following this repo's existing shadcn conventions — same style as the already-installed `sheet.tsx`).

- [ ] **Step 2: Create the Server Action**

`src/app/(dashboard)/dashboard/inventory/actions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { createVehicle } from "@/lib/vehicles/vehicles";
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

  const parsed = vehicleSchema.safeParse({
    make: formData.get("make"),
    model: formData.get("model"),
    year: Number(formData.get("year")),
    price: Number(formData.get("price")),
    mileage: Number(formData.get("mileage")),
    imageUrl: formData.get("imageUrl"),
    category: formData.get("category"),
    featured: formData.get("featured") === "on",
  });

  if (!parsed.success) {
    return { success: false, error: "Please check the form fields and try again." };
  }

  await createVehicle(session.dealershipId, parsed.data);
  revalidatePath("/dashboard/inventory");
  return { success: true };
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: same pre-existing `mock-data.ts` errors, no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/dialog.tsx "src/app/(dashboard)/dashboard/inventory/actions.ts"
git commit -m "feat: add dialog component and createVehicleAction"
```

---

### Task 4: Dashboard Inventory page + Add New Car modal

**Files:**
- Modify: `src/app/(dashboard)/dashboard/inventory/page.tsx`
- Create: `src/app/(dashboard)/dashboard/inventory/add-vehicle-modal.tsx`

**Interfaces:**
- Consumes: `verifySession` from `@/lib/auth/dal`; `can` from `@/lib/auth/permissions`; `getVehicles` from `@/lib/vehicles/vehicles` (Task 2); `createVehicleAction` from `./actions` (Task 3); `Dialog`/`DialogContent`/`DialogTrigger`/`DialogHeader`/`DialogTitle` from `@/components/ui/dialog` (Task 3); `Button`, `Input`, `Label` from `@/components/ui/*`.

- [ ] **Step 1: Replace the placeholder page**

`src/app/(dashboard)/dashboard/inventory/page.tsx`:
```tsx
import { verifySession } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { getVehicles } from "@/lib/vehicles/vehicles";
import { AddVehicleModal } from "./add-vehicle-modal";

export default async function InventoryPage() {
  const session = await verifySession();
  if (!session) return null;

  const vehicles = await getVehicles(session.dealershipId);
  const canAdd = can(session.role, "canManageVehicles");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Inventory</h1>
        {canAdd && <AddVehicleModal />}
      </div>

      {vehicles.length === 0 ? (
        <p className="text-sm text-muted-foreground">No vehicles yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4">Vehicle</th>
              <th className="py-2 pr-4">Category</th>
              <th className="py-2 pr-4">Price</th>
              <th className="py-2 pr-4">Mileage</th>
              <th className="py-2 pr-4">Featured</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((vehicle) => (
              <tr key={vehicle.id} className="border-b">
                <td className="py-2 pr-4">
                  {vehicle.make} {vehicle.model} {vehicle.year}
                </td>
                <td className="py-2 pr-4 capitalize">{vehicle.category}</td>
                <td className="py-2 pr-4">${vehicle.price.toLocaleString()}</td>
                <td className="py-2 pr-4">{vehicle.mileage.toLocaleString()} km</td>
                <td className="py-2 pr-4">{vehicle.featured ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

Note: `verifySession()` returning `null` here should be unreachable in practice (the `(dashboard)/layout.tsx` already redirects unauthenticated requests to `/login` before this page renders), but the check keeps this page type-safe without asserting non-null.

- [ ] **Step 2: Create the modal**

`src/app/(dashboard)/dashboard/inventory/add-vehicle-modal.tsx`:
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
import { createVehicleAction } from "./actions";

export function AddVehicleModal() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const result = await createVehicleAction(formData);

    if (result.success) {
      setOpen(false);
      event.currentTarget.reset();
    } else {
      setError(result.error);
    }
    setPending(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Add New Car</Button>} />
      <DialogContent>
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
              <Label htmlFor="av-year">Year</Label>
              <Input id="av-year" name="year" type="number" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="av-price">Price</Label>
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
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="av-imageUrl">Image URL</Label>
            <Input id="av-imageUrl" name="imageUrl" type="url" required />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="featured" />
            Featured
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

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: same pre-existing `mock-data.ts` errors, no new errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/dashboard/inventory/page.tsx" "src/app/(dashboard)/dashboard/inventory/add-vehicle-modal.tsx"
git commit -m "feat: build Inventory dashboard page and Add New Car modal"
```

---

### Task 5: Wire the public homepage to real data, delete the mock fixture

**Files:**
- Modify: `src/app/(site)/page.tsx`
- Modify: `src/components/site/homepage/trend-vehicles.tsx`
- Modify: `src/components/site/homepage/inventory-grid.tsx`
- Delete: `src/lib/vehicles/mock-data.ts`

**Interfaces:**
- Consumes: `getVehicles` from `@/lib/vehicles/vehicles` (Task 2); `type Vehicle` from `@/types` (Task 1).

- [ ] **Step 1: Update the homepage to fetch real vehicles**

Modify `src/app/(site)/page.tsx`:
```ts
import { getVehicles } from "@/lib/vehicles/vehicles";
```
Add this import alongside the existing ones, then in the component body, after `dealership` is resolved:
```ts
const vehicles = await getVehicles(dealership.id);
```
Pass `vehicles={vehicles}` to both `<TrendVehicles ... />` and `<InventoryGrid ... />`.

- [ ] **Step 2: Update `TrendVehicles`**

`src/components/site/homepage/trend-vehicles.tsx` — replace the `MOCK_VEHICLES` import and usage:
```ts
import type { DealershipConfig, Vehicle } from "@/types";
```
```tsx
export function TrendVehicles({
  dealership,
  vehicles,
}: {
  dealership: DealershipConfig;
  vehicles: Vehicle[];
}) {
  const featured = vehicles.filter((vehicle) => vehicle.featured);
  // ...rest of the component body is unchanged
```
Remove the `import { MOCK_VEHICLES } from "@/lib/vehicles/mock-data";` line entirely.

- [ ] **Step 3: Update `InventoryGrid`**

`src/components/site/homepage/inventory-grid.tsx` — same pattern:
```ts
import type { DealershipConfig, Vehicle } from "@/types";
```
```tsx
export function InventoryGrid({
  dealership,
  vehicles,
}: {
  dealership: DealershipConfig;
  vehicles: Vehicle[];
}) {
  return (
    <Section tone="light">
      <h2 className="font-heading mb-6 text-2xl tracking-tight">
        Vehículos Usados
      </h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((vehicle) => (
          // ...unchanged
```
Remove the `import { MOCK_VEHICLES } from "@/lib/vehicles/mock-data";` line entirely.

- [ ] **Step 4: Confirm no other file imports the mock fixture**

Run: `grep -rn "vehicles/mock-data" src/`
Expected: no output (empty) — confirms it's safe to delete.

- [ ] **Step 5: Delete the mock fixture**

```bash
rm src/lib/vehicles/mock-data.ts
```

- [ ] **Step 6: Verify it compiles clean (no more pre-existing errors)**

Run: `npx tsc --noEmit`
Expected: no errors at all — this is the first task where the `mock-data.ts`-related errors from Tasks 1-4 finally disappear, since the file importing the outdated fixture shape is now gone.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(site)/page.tsx" src/components/site/homepage/trend-vehicles.tsx src/components/site/homepage/inventory-grid.tsx
git rm src/lib/vehicles/mock-data.ts
git commit -m "feat: wire public homepage to real Firestore vehicles, remove mock fixture"
```

- [ ] **Step 8: Full end-to-end verification (requires a real browser + the real seeded owner account — controller/human step, not a subagent)**

1. Sign in to the dashboard as the seeded owner, visit `/dashboard/inventory` — confirm it shows "No vehicles yet." instead of "Coming soon."
2. Click "Add New Car", fill in the form (any category, **check** `featured`), submit — confirm the dialog closes and the new vehicle appears in the table without a manual page refresh.
3. Visit the public homepage — confirm the new vehicle appears in the "Vehículos Nuevos" section (`TrendVehicles`). Note: despite its heading, `TrendVehicles` filters by `featured`, not by `category` — this is pre-existing behavior, unchanged by this plan, so this is the correct check.
4. Add a second vehicle with `featured` **unchecked**. Confirm it does NOT appear in "Vehículos Nuevos" (not featured), but DOES appear in the "Vehículos Usados" section (`InventoryGrid`). Note: `InventoryGrid` renders every vehicle unfiltered regardless of `category` — also pre-existing, unchanged by this plan — so both the featured and non-featured vehicles should appear there.
5. If you have (or can quickly seed) a `salesperson`-role test account: sign in as them, visit `/dashboard/inventory`, confirm the "Add New Car" button does not render.

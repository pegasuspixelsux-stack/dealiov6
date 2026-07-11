# Inventory Dashboard Page + Add New Car Modal — Design

## Context

The dashboard's Inventory page currently renders a `<ComingSoon title="Inventory" />` placeholder (`src/app/(dashboard)/dashboard/inventory/page.tsx`) with no data fetching at all. The public homepage's vehicle sections (`TrendVehicles`, `InventoryGrid`) read from a hardcoded fixture, `src/lib/vehicles/mock-data.ts`, whose own comment states it's "Placeholder inventory for the homepage only. The real Inventory feature (Firestore-backed, per the product spec) replaces this."

This spec is that real Inventory feature's first slice: a dashboard page to view and add vehicles, backed by Firestore, with the public homepage reading the same data so cars added via the dashboard actually appear on the live site.

Firebase (Auth + Firestore + real login) is already wired up and working in production as of the previous spec/plan (`2026-07-11-firebase-real-login-design.md`). This spec builds directly on that: `adminFirestore` (from `src/lib/firebase/admin.ts`) is available and configured; `verifySession()`/`can()` (from `src/lib/auth/dal.ts` / `src/lib/auth/permissions.ts`) are available and unchanged.

## Explicitly out of scope

Each of these is a future spec; do not implement them here:

- Edit or delete vehicles — this pass is List + Create only.
- Real image upload/storage (e.g. Vercel Blob) — the form takes a plain image URL text field, matching the existing `Vehicle.imageUrl: string` shape.
- Leads dashboard page and a frontend leads modal — separate follow-up spec, explicitly deferred per the scoping conversation.
- Filtering, search, sorting, or pagination on either the dashboard list or the public inventory grid.
- Multi-tenant testing — only the single existing `ultima-cars` dealership needs to work.

## Data model

**Firestore**: `dealerships/{dealershipId}/vehicles/{vehicleId}`, per the existing documented convention in `src/types/firestore.ts` (`TenantScopedDocument`: every doc carries an explicit `dealershipId` even though it lives in a tenant-scoped subcollection).

```
dealerships/{dealershipId}/vehicles/{vehicleId}: {
  id: string
  dealershipId: string
  make: string
  model: string
  year: number
  price: number
  mileage: number
  imageUrl: string
  category: "new" | "used"
  featured: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**`src/types/vehicle.ts`** changes: add `dealershipId: string` to the `Vehicle` interface, and add a zod schema:

```ts
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

This schema covers exactly the fields a form submits (no `id`/`dealershipId`/timestamps — those are assigned server-side). `Vehicle` itself (the full stored shape, `id` + `dealershipId` + timestamps + the schema's fields) stays a plain TypeScript interface as it is today — no need to also infer it from zod, since nothing parses a full stored document through this schema (only creation input).

## Firestore access layer

**New file** `src/lib/vehicles/vehicles.ts` (server-only):

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

`getVehicles` fails soft (returns `[]`) when Firestore isn't configured, matching the fail-safe pattern already established in `getUserRecord`. `createVehicle` throws when unconfigured — this is only ever called from the Server Action below, which only runs after `verifySession()` already succeeded (meaning Firestore must be configured, since real login depends on it), so a throw here indicates a genuine misconfiguration worth surfacing loudly rather than silently no-op-ing.

## Create Server Action + authorization

**New file** `src/app/(dashboard)/dashboard/inventory/actions.ts`:

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

Authorization is checked server-side in the action itself (not just hidden in the UI) — this is the actual security boundary, since Server Actions are callable directly regardless of what the client renders.

## Dashboard Inventory page

**Modify** `src/app/(dashboard)/dashboard/inventory/page.tsx` — replace the `ComingSoon` placeholder with a Server Component:
- Calls `verifySession()` for `role`/`dealershipId` (the layout already guarantees a session exists; this just reads it).
- Calls `getVehicles(session.dealershipId)`.
- Renders a heading ("Inventory"), an "Add New Car" button (only rendered when `can(session.role, "canManageVehicles")`) that opens the modal, and a plain HTML `<table>` listing make/model/year, category, price, mileage, and a featured indicator — one row per vehicle.
- Empty state: "No vehicles yet." when the list is empty.

**New shadcn component**: `dialog` is not yet installed in this repo (only `sheet`, `button`, `input`, `label`, `textarea`, etc. exist). Add it via `npx shadcn add dialog` before building the modal.

**New file** `src/app/(dashboard)/dashboard/inventory/add-vehicle-modal.tsx` (`"use client"`):
- Renders a `Dialog` (trigger = the "Add New Car" button from the page) containing a `<form>` with `Input`s for make/model/year/price/mileage/imageUrl, a plain native `<select>` for category (no shadcn `select` component exists yet, and one native select doesn't justify adding a new primitive for this pass), and a checkbox for featured.
- On submit, calls `createVehicleAction` via a plain `async` client-side submit handler (local `useState` for `pending`/`error` — no `useActionState` needed, since the only derived UI state is a boolean pending flag and an optional error string), shows the pending state and any returned `error`, closes the dialog on `{ success: true }`.

## Public homepage wiring

**Modify** `src/app/(site)/page.tsx`: replace the `MOCK_VEHICLES` import with `getVehicles(dealership.id)` (server-side, same place `dealership` config is already resolved), pass the resulting `vehicles: Vehicle[]` down as a prop.

**Modify** `src/components/site/homepage/trend-vehicles.tsx`: accept a `vehicles: Vehicle[]` prop instead of importing `MOCK_VEHICLES`; keep filtering by `featured` exactly as it does today.

**Modify** `src/components/site/homepage/inventory-grid.tsx`: accept a `vehicles: Vehicle[]` prop instead of importing `MOCK_VEHICLES`; render all of them exactly as it does today.

**Empty state**: both sections already map over an array to render cards — an empty array naturally renders nothing (no placeholder cars, no crash). No new empty-state UI is required beyond that existing behavior.

**Delete** `src/lib/vehicles/mock-data.ts` once nothing imports it (only these two components + the two dashboard placeholder pages reference it today, and both dashboard pages already only import `ComingSoon`, not `mock-data`, per current source — confirm at implementation time that no other import sites exist before deleting).

## Verification (manual — no automated test runner exists in this repo)

1. `npx tsc --noEmit` after each task.
2. Sign in to the dashboard as the seeded owner account, visit `/dashboard/inventory` — confirm it shows an (initially empty) list instead of "Coming soon."
3. Click "Add New Car", fill in the form, submit — confirm the new vehicle appears in the dashboard list without a manual page refresh (via `revalidatePath`).
4. Visit the public homepage — confirm the newly-added vehicle appears in the correct section ("Vehículos Nuevos" or "Vehículos Usados" per its `category`, and in "Vehículos Destacados"/`TrendVehicles` if marked `featured`).
5. Seed a second test user with role `salesperson` (no `canManageVehicles` permission) via the existing `scripts/seed-owner.ts`-style flow (or a quick one-off Firestore write, since the seed script is hardcoded to `role: "owner"` — a manual Firestore edit of the `role` field on a throwaway test doc is sufficient for this check), sign in as them, and confirm the "Add New Car" button does not render on `/dashboard/inventory`.

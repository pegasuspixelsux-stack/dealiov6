# Edit Vehicle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Edit" button per row on the dashboard's inventory list, opening a modal pre-filled with the vehicle's current data (including photos) that saves changes via a new `updateVehicleAction`.

**Architecture:** A new `updateVehicle` data-layer function (full-field `.set(..., {merge:true})`, preserving only `createdAt`), a new `updateVehicleAction` Server Action mirroring `createVehicleAction`'s validation but combining kept-existing-photo-URLs with newly-uploaded-photo-URLs, and a new `EditVehicleModal` Client Component structurally mirroring `AddVehicleModal` with every field pre-filled.

**Tech Stack:** Next.js 16 App Router, TypeScript, zod, Firestore Admin SDK, Firebase Storage.

## Global Constraints

- **`updateVehicle(dealershipId, vehicleId, input)`** writes via `.set({...input, id, dealershipId, updatedAt: new Date()}, {merge: true})` — since the edit form always submits every field (not a partial patch), this is effectively a full field replacement; `{merge: true}` exists only so `createdAt` (not part of `input`) survives untouched.
- **`uploadVehiclePhotos`'s Storage path** changes from `` `dealerships/${dealershipId}/vehicles/${vehicleId}/${index}-${file.name}` `` to `` `dealerships/${dealershipId}/vehicles/${vehicleId}/${Date.now()}-${index}-${file.name}` `` — required so a photo uploaded during an edit can never collide with (and silently overwrite) a same-index/same-filename photo from the original Add. This changes the path only for future uploads; existing stored URLs are untouched.
- **Removing a photo in the edit modal only detaches it** (drops its URL from the vehicle's `imageUrls`) — it is never deleted from Firebase Storage. This is a deliberate, approved simplification.
- **`updateVehicleAction`** is gated by the same `verifySession()` + `can(session.role, "canManageVehicles")` check as `createVehicleAction`. The combined `imageUrls` (kept existing + newly uploaded) must be validated to 1–8 before writing — same bounds as Create.
- **`revalidatePath`** after a successful edit must cover `/dashboard/inventory`, `/inventory`, AND `/inventory/{vehicleId}` (the public detail page also needs fresh data — this is new compared to Create, which never needed to revalidate a detail page since Create can't be viewed at a stable URL until this feature exists).
- **Explicitly out of scope**: deleting a vehicle entirely, actually deleting removed photos from Storage, drag-to-reorder photos, bulk edit, edit history/audit log.
- **No automated test runner exists in this repo.** Verification is `npx tsc --noEmit` plus a real Firestore round-trip via a throwaway `scripts/manual-verify-*.ts` file (deleted before commit) plus a mandatory local `npm run build` (this codebase has a documented blind spot where `tsc` alone doesn't catch every production build failure) plus a final manual browser walkthrough.
- Every client component that calls a Server Action wraps the call in try/catch/finally, clearing pending state in `finally` — mandatory codebase-wide pattern.

---

### Task 1: Data layer — `updateVehicle` + collision-safe upload paths

**Files:**
- Modify: `src/lib/vehicles/vehicles.ts`
- Modify: `src/lib/vehicles/upload-photos.ts`

**Interfaces:**
- Produces: `updateVehicle(dealershipId: string, vehicleId: string, input: z.infer<typeof vehicleSchema>): Promise<void>` — consumed by Task 2's `updateVehicleAction`. `uploadVehiclePhotos`'s signature is unchanged, only its internal path template changes.

- [ ] **Step 1: Add `updateVehicle`**

In `src/lib/vehicles/vehicles.ts`, add this function after the existing `createVehicle` function:
```ts
export async function updateVehicle(
  dealershipId: string,
  vehicleId: string,
  input: z.infer<typeof vehicleSchema>
): Promise<void> {
  if (!adminFirestore) {
    throw new Error("Firestore is not configured.");
  }

  await adminFirestore
    .collection("dealerships")
    .doc(dealershipId)
    .collection("vehicles")
    .doc(vehicleId)
    .set(
      { ...input, id: vehicleId, dealershipId, updatedAt: new Date() },
      { merge: true }
    );
}
```

- [ ] **Step 2: Make the upload path collision-safe**

In `src/lib/vehicles/upload-photos.ts`, change the `path` line inside the `files.map(...)` callback from:
```ts
      const path = `dealerships/${dealershipId}/vehicles/${vehicleId}/${index}-${file.name}`;
```
to:
```ts
      const path = `dealerships/${dealershipId}/vehicles/${vehicleId}/${Date.now()}-${index}-${file.name}`;
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Verify updateVehicle persists changes and preserves createdAt**

`scripts/manual-verify-update-vehicle.ts`:
```ts
import { adminFirestore } from "../src/lib/firebase/admin";
import { createVehicle, reserveVehicleId, updateVehicle } from "../src/lib/vehicles/vehicles";

async function main() {
  const dealershipId = "manual-verify-dealership";
  const vehicleId = reserveVehicleId(dealershipId);

  const baseFields = {
    make: "Honda",
    model: "Civic",
    year: 2020,
    mileage: 40000,
    imageUrls: ["https://example.com/photo.jpg"],
    category: "used" as const,
    featured: false,
    version: "",
    fuel: "nafta" as const,
    transmission: "manual" as const,
    location: "",
    financingAvailable: false,
    status: "disponible" as const,
    description: "",
    features: [],
    color: "",
    bodyType: "sedan" as const,
  };

  await createVehicle(dealershipId, vehicleId, { ...baseFields, price: 20000 });

  const ref = adminFirestore!
    .collection("dealerships")
    .doc(dealershipId)
    .collection("vehicles")
    .doc(vehicleId);

  const before = await ref.get();
  const createdAtBefore = before.data()!.createdAt;

  await new Promise((resolve) => setTimeout(resolve, 1100));

  await updateVehicle(dealershipId, vehicleId, { ...baseFields, price: 22000 });

  const after = await ref.get();
  const data = after.data()!;

  console.log(
    JSON.stringify(
      {
        price: data.price,
        createdAtUnchanged: data.createdAt.isEqual(createdAtBefore),
        updatedAtAfterCreatedAt:
          data.updatedAt.toMillis() > data.createdAt.toMillis(),
      },
      null,
      2
    )
  );

  await ref.delete();
  console.log("cleaned up");
}

main();
```

- [ ] **Step 5: Run it**

Run: `npx tsx --conditions=react-server --env-file=.env.local scripts/manual-verify-update-vehicle.ts`
Expected: prints `{"price": 22000, "createdAtUnchanged": true, "updatedAtAfterCreatedAt": true}` then `cleaned up`.

- [ ] **Step 6: Delete the throwaway script**

```bash
rm scripts/manual-verify-update-vehicle.ts
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/vehicles/vehicles.ts src/lib/vehicles/upload-photos.ts
git commit -m "feat: add updateVehicle and make photo upload paths collision-safe"
```

---

### Task 2: `updateVehicleAction`

**Files:**
- Modify: `src/app/(dashboard)/dashboard/inventory/actions.ts`

**Interfaces:**
- Consumes: `updateVehicle` from `@/lib/vehicles/vehicles` (Task 1).
- Produces: `updateVehicleAction(vehicleId: string, formData: FormData): Promise<{success:true}|{success:false,error:string}>` — consumed by Task 3's `EditVehicleModal`.

- [ ] **Step 1: Add the Server Action**

In `src/app/(dashboard)/dashboard/inventory/actions.ts`, add `updateVehicle` to the existing `import { reserveVehicleId, createVehicle } from "@/lib/vehicles/vehicles";` line (making it `import { reserveVehicleId, createVehicle, updateVehicle } from "@/lib/vehicles/vehicles";`), then add this function after `createVehicleAction`:
```ts
export async function updateVehicleAction(
  vehicleId: string,
  formData: FormData
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await verifySession();
  if (!session) {
    return { success: false, error: "Not signed in." };
  }
  if (!can(session.role, "canManageVehicles")) {
    return { success: false, error: "You don't have permission to edit vehicles." };
  }

  const existingImageUrls = formData
    .getAll("existingImageUrls")
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  const newPhotos = formData
    .getAll("newPhotos")
    .filter((f): f is File => f instanceof File && f.size > 0);

  const monthlyPaymentRaw = formData.get("monthlyPayment");
  const monthlyPayment =
    typeof monthlyPaymentRaw === "string" && monthlyPaymentRaw.trim() !== ""
      ? Number(monthlyPaymentRaw)
      : undefined;

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
      color: formData.get("color") ?? "",
      bodyType: formData.get("bodyType"),
      monthlyPayment,
    });

  if (!fieldsParsed.success) {
    return { success: false, error: "Please check the form fields and try again." };
  }

  const newImageUrls =
    newPhotos.length > 0
      ? await uploadVehiclePhotos(session.dealershipId, vehicleId, newPhotos)
      : [];
  const imageUrls = [...existingImageUrls, ...newImageUrls];

  if (imageUrls.length === 0) {
    return { success: false, error: "At least one photo is required." };
  }
  if (imageUrls.length > 8) {
    return { success: false, error: "Maximum 8 photos." };
  }

  await updateVehicle(session.dealershipId, vehicleId, {
    ...fieldsParsed.data,
    imageUrls,
  });

  revalidatePath("/dashboard/inventory");
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${vehicleId}`);
  return { success: true };
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/dashboard/inventory/actions.ts"
git commit -m "feat: add updateVehicleAction"
```

Note: `updateVehicleAction` requires a real signed-in session (cookies), so it cannot be exercised by a standalone script — its correctness is verified by `tsc` here, by Task 1's direct `updateVehicle` round-trip, and by the full manual browser walkthrough at the end of Task 3.

---

### Task 3: `EditVehicleModal` + dashboard table wiring + final verification

**Files:**
- Create: `src/app/(dashboard)/dashboard/inventory/edit-vehicle-modal.tsx`
- Modify: `src/app/(dashboard)/dashboard/inventory/page.tsx`

**Interfaces:**
- Consumes: `updateVehicleAction` from `./actions` (Task 2); `VEHICLE_FEATURES`, `BODY_TYPE_LABELS`, `type Vehicle` from `@/types`.
- Produces: nothing consumed by later tasks — final task of this plan.

- [ ] **Step 1: Create the Edit Vehicle modal**

`src/app/(dashboard)/dashboard/inventory/edit-vehicle-modal.tsx`:
```tsx
"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
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
import { VEHICLE_FEATURES, BODY_TYPE_LABELS } from "@/types";
import type { Vehicle } from "@/types";
import { updateVehicleAction } from "./actions";

export function EditVehicleModal({ vehicle }: { vehicle: Vehicle }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keptPhotos, setKeptPhotos] = useState<string[]>(vehicle.imageUrls);

  function removePhoto(url: string) {
    setKeptPhotos((current) => current.filter((u) => u !== url));
  }

  // Correction (found during this plan's final whole-branch review, applied
  // after Task 3's code was written): the outer EditVehicleModal never
  // unmounts — only DialogContent does, on close — so keptPhotos (plain
  // React state here) silently carried stale removals/omitted-additions
  // across separate edit sessions for the same vehicle. A routine
  // edit-the-same-car-twice workflow could detach photos added in an
  // earlier edit. Fixed by resyncing keptPhotos (and clearing any stale
  // error) from vehicle.imageUrls whenever the dialog opens:
  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setKeptPhotos(vehicle.imageUrls);
      setError(null);
    }
  }
  // ...and use `<Dialog open={open} onOpenChange={handleOpenChange}>`
  // instead of `onOpenChange={setOpen}` in the JSX below.

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    keptPhotos.forEach((url) => formData.append("existingImageUrls", url));

    try {
      const result = await updateVehicleAction(vehicle.id, formData);
      if (result.success) {
        setOpen(false);
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
      <DialogTrigger render={<Button size="sm" variant="outline">Edit</Button>} />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Car</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`ev-make-${vehicle.id}`}>Make</Label>
              <Input id={`ev-make-${vehicle.id}`} name="make" defaultValue={vehicle.make} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`ev-model-${vehicle.id}`}>Model</Label>
              <Input id={`ev-model-${vehicle.id}`} name="model" defaultValue={vehicle.model} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`ev-version-${vehicle.id}`}>Version</Label>
              <Input id={`ev-version-${vehicle.id}`} name="version" defaultValue={vehicle.version} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`ev-year-${vehicle.id}`}>Year</Label>
              <Input id={`ev-year-${vehicle.id}`} name="year" type="number" defaultValue={vehicle.year} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`ev-price-${vehicle.id}`}>Price (US$)</Label>
              <Input id={`ev-price-${vehicle.id}`} name="price" type="number" defaultValue={vehicle.price} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`ev-monthly-payment-${vehicle.id}`}>
                Monthly Payment (US$, optional)
              </Label>
              <Input
                id={`ev-monthly-payment-${vehicle.id}`}
                name="monthlyPayment"
                type="number"
                defaultValue={vehicle.monthlyPayment ?? ""}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`ev-mileage-${vehicle.id}`}>Mileage</Label>
              <Input id={`ev-mileage-${vehicle.id}`} name="mileage" type="number" defaultValue={vehicle.mileage} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`ev-category-${vehicle.id}`}>Category</Label>
              <select
                id={`ev-category-${vehicle.id}`}
                name="category"
                defaultValue={vehicle.category}
                required
                className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
              >
                <option value="new">New</option>
                <option value="used">Used</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`ev-fuel-${vehicle.id}`}>Fuel</Label>
              <select
                id={`ev-fuel-${vehicle.id}`}
                name="fuel"
                defaultValue={vehicle.fuel}
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
              <Label htmlFor={`ev-transmission-${vehicle.id}`}>Transmission</Label>
              <select
                id={`ev-transmission-${vehicle.id}`}
                name="transmission"
                defaultValue={vehicle.transmission}
                required
                className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
              >
                <option value="manual">Manual</option>
                <option value="automatica">Automática</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`ev-status-${vehicle.id}`}>Status</Label>
              <select
                id={`ev-status-${vehicle.id}`}
                name="status"
                defaultValue={vehicle.status}
                required
                className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
              >
                <option value="disponible">Disponible</option>
                <option value="reservado">Reservado</option>
                <option value="vendido">Vendido</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`ev-location-${vehicle.id}`}>Location</Label>
              <Input id={`ev-location-${vehicle.id}`} name="location" defaultValue={vehicle.location} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`ev-color-${vehicle.id}`}>Color</Label>
              <Input id={`ev-color-${vehicle.id}`} name="color" defaultValue={vehicle.color} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`ev-body-type-${vehicle.id}`}>Body Type</Label>
              <select
                id={`ev-body-type-${vehicle.id}`}
                name="bodyType"
                defaultValue={vehicle.bodyType}
                required
                className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
              >
                {Object.entries(BODY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`ev-description-${vehicle.id}`}>Description</Label>
            <Textarea
              id={`ev-description-${vehicle.id}`}
              name="description"
              defaultValue={vehicle.description}
              rows={3}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Features</Label>
            <div className="grid grid-cols-2 gap-2">
              {VEHICLE_FEATURES.map((feature) => (
                <label key={feature} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="features"
                    value={feature}
                    defaultChecked={vehicle.features.includes(feature)}
                  />
                  {feature}
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Current Photos</Label>
            {keptPhotos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No photos kept — add at least one below.
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {keptPhotos.map((url) => (
                  <div key={url} className="relative aspect-square overflow-hidden rounded-md">
                    <Image src={url} alt="" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(url)}
                      className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/70 text-xs text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`ev-photos-${vehicle.id}`}>Add Photos</Label>
            <input
              id={`ev-photos-${vehicle.id}`}
              name="newPhotos"
              type="file"
              accept="image/*"
              multiple
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="featured" defaultChecked={vehicle.featured} />
            Featured
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="financingAvailable"
              defaultChecked={vehicle.financingAvailable}
            />
            Financing available
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Wire the Edit button into the dashboard inventory table**

Replace the full contents of `src/app/(dashboard)/dashboard/inventory/page.tsx`:
```tsx
import { verifySession } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { getVehicles } from "@/lib/vehicles/vehicles";
import { AddVehicleModal } from "./add-vehicle-modal";
import { EditVehicleModal } from "./edit-vehicle-modal";

export default async function InventoryPage() {
  const session = await verifySession();
  if (!session) return null;

  const vehicles = await getVehicles(session.dealershipId);
  const canManage = can(session.role, "canManageVehicles");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Inventory</h1>
        {canManage && <AddVehicleModal />}
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
              <th className="py-2 pr-4">Actions</th>
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
                <td className="py-2 pr-4">
                  {canManage && <EditVehicleModal vehicle={vehicle} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Verify a full local production build succeeds**

Run: `npm run build`
Expected: completes successfully (exit 0), including "Collecting page data" and "Generating static pages" — mandatory, not optional, per this codebase's documented `tsc`-doesn't-catch-everything blind spot.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/dashboard/inventory/edit-vehicle-modal.tsx" "src/app/(dashboard)/dashboard/inventory/page.tsx"
git commit -m "feat: add Edit Vehicle modal and wire it into the dashboard inventory table"
```

- [ ] **Step 6: Full manual browser walkthrough (controller/human step — cannot be done by a subagent without a real browser + signed-in session)**

1. Sign in as the seeded owner, go to `/dashboard/inventory`, click "Edit" on an existing vehicle — confirm every field is pre-filled with its current value, including the Monthly Payment field (blank if unset) and the existing photos shown as thumbnails.
2. Change a text field (e.g. price) and save — confirm the table updates and the change is reflected without a manual page reload.
3. Remove one existing photo and add one new photo, save — confirm the vehicle's public detail page (`/inventory/{id}`) shows the updated photo set (kept photos minus the removed one, plus the new one), and confirm the removed photo's original URL still resolves directly in the browser (proving it was only detached, not deleted from Storage).
4. Try removing every existing photo without adding a replacement, then save — confirm it's rejected with a clear "At least one photo is required" error and nothing is written.
5. Confirm `/inventory` (the public listing) and the homepage cards reflect the edit without a manual cache-bust.
6. Confirm a user without `canManageVehicles` does not see the Edit button.

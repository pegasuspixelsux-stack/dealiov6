# Vehicle Photo Upload (Firebase Storage) — Design

## Context

The "Add New Car" modal (built in the Inventory dashboard feature, branch `feat/inventory-dashboard`, not yet merged to `master`) currently takes a single `imageUrl` text field — a placeholder pending real photography, per the original spec's explicit scope boundary ("Real image upload/storage — the form takes a plain image URL text field... deferred").

This spec replaces that text field with real multi-photo upload, stored in Firebase Storage, with the resulting public URLs saved on the vehicle's Firestore document. This builds directly on the (already-implemented, not-yet-merged) Inventory feature — same branch, same files.

Firebase Storage is already enabled on the project (confirmed: an existing bucket, not a "Get started" prompt) and the bucket name is already known via `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` (used by the currently-unused client SDK `storage` export in `src/lib/firebase/client.ts`).

## Explicitly out of scope

- Image carousel/gallery anywhere (cards show the first photo only — confirmed).
- Editing or removing photos from an existing vehicle (ties into the already-deferred "edit vehicles" scope from the Inventory spec).
- Client-side image compression/resizing before upload.
- Firebase Storage security rules — not needed, since every write goes through the Admin SDK, which bypasses security rules entirely (same trust model already used for Firestore/Auth in this app).
- Drag-and-drop upload UI, upload progress bars — a plain native multi-file `<input>` is sufficient.

## Trust model / upload flow

All uploads are routed through the server (the existing `createVehicleAction` Server Action) via the Firebase Admin SDK — never a direct client-to-Firebase-Storage write. This matches the explicit constraint that dashboard users should have no direct access to Firebase infrastructure, and matches the existing architecture (Firestore reads/writes in this app already go exclusively through the Admin SDK, never the client SDK).

Limits: **up to 8 photos, 10MB total request body** (raised from Next.js's 1MB Server Action default via `next.config.ts`).

## Data model changes

**`src/types/vehicle.ts`**: `imageUrl: string` → `imageUrls: string[]` on both `Vehicle` and `vehicleSchema`. No migration needed — only test data exists so far.

```ts
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
});
```

**Firestore doc** (`dealerships/{dealershipId}/vehicles/{vehicleId}`): `imageUrl` → `imageUrls: string[]`, everything else unchanged.

## Firebase Admin Storage wiring

**`src/lib/firebase/admin.ts`**: add `adminStorage`, following the exact existing pattern for `adminAuth`/`adminFirestore` — import `getStorage` from `firebase-admin/storage`, pass `storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` into `initializeApp(...)` (reusing the same bucket name the client SDK already uses), initialize alongside the other two, `null` when unconfigured.

**New file** `src/lib/vehicles/upload-photos.ts` (server-only) — single responsibility: take raw files, return public URLs. No Firestore knowledge here; kept decoupled from `vehicles.ts`.

```ts
import "server-only";
import { adminStorage } from "@/lib/firebase/admin";

export async function uploadVehiclePhotos(
  dealershipId: string,
  vehicleId: string,
  files: File[]
): Promise<string[]> {
  if (!adminStorage) {
    throw new Error("Firebase Storage is not configured.");
  }

  const bucket = adminStorage.bucket();

  return Promise.all(
    files.map(async (file, index) => {
      const path = `dealerships/${dealershipId}/vehicles/${vehicleId}/${index}-${file.name}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const storageFile = bucket.file(path);
      await storageFile.save(buffer, { contentType: file.type });
      await storageFile.makePublic();
      return `https://storage.googleapis.com/${bucket.name}/${path}`;
    })
  );
}
```

Photos are made public (`makePublic()` + a plain `storage.googleapis.com` URL) rather than using Firebase's signed-token download URLs — these are public marketing photos for a car listing site, not access-controlled content, so a stable public URL is simpler and is exactly what `next/image` needs (no token to manage or expire).

## `vehicles.ts` changes (reserve-id-then-write split)

Photos need to be uploaded to a path keyed by the vehicle's id, but the id must exist *before* the Firestore document is written (so the doc can be created with its final `imageUrls` in one write, not written-then-patched). `createVehicle` currently generates its own id internally via `.doc()` immediately before `.set()`. This is split into two steps:

**`reserveVehicleId(dealershipId: string): string`** — returns a new, unwritten document id (`.doc().id`) for the given dealership's `vehicles` subcollection. Throws if Firestore is unconfigured (same reasoning as `createVehicle`'s existing throw: only ever called from an already-authenticated Server Action).

**`createVehicle(dealershipId: string, vehicleId: string, input: z.infer<typeof vehicleSchema>): Promise<void>`** — signature changes from returning a generated id to accepting one, and no longer returns anything (the caller already has the id from `reserveVehicleId`). Writes to `.doc(vehicleId)` instead of `.doc()`.

## Server Action changes

**`src/app/(dashboard)/dashboard/inventory/actions.ts`**, after the existing session/permission checks, before the current `vehicleSchema.safeParse` call:

```ts
const photos = formData
  .getAll("photos")
  .filter((f): f is File => f instanceof File && f.size > 0);

if (photos.length === 0) {
  return { success: false, error: "At least one photo is required." };
}
if (photos.length > 8) {
  return { success: false, error: "Maximum 8 photos." };
}
```

Then parse the non-photo fields (the existing `make`/`model`/`year`/`price`/`mileage`/`category`/`featured` extraction is unchanged; `imageUrls` is populated after upload, not read from a form field), reserve an id, upload, then create:

```ts
const vehicleId = reserveVehicleId(session.dealershipId);
const imageUrls = await uploadVehiclePhotos(session.dealershipId, vehicleId, photos);
await createVehicle(session.dealershipId, vehicleId, { ...parsed.data, imageUrls });
```

## Modal form changes

**`src/app/(dashboard)/dashboard/inventory/add-vehicle-modal.tsx`**: replace the single `imageUrl` URL text input with:

```tsx
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
```

## Next.js config

**`next.config.ts`**: raise the Server Action body size limit from the 1MB default:

```ts
const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};
```

## `VehicleCard` display

`src/components/site/homepage/vehicle-card.tsx` currently never actually renders `vehicle.imageUrl` at all — it always shows a gradient-and-car-icon placeholder (per its own comment, "Placeholder imagery until real photography... is wired in"). Since real photos now exist, this is wired up: render `vehicle.imageUrls[0]` via `next/image` (`fill`, `object-cover`, matching the existing `Hero` component's `next/image` usage pattern) when `imageUrls.length > 0`, falling back to the existing gradient/icon placeholder when the array is empty (e.g., a vehicle somehow created without photos, though the form now requires at least one).

## Verification (manual — no automated test runner exists in this repo)

1. `npx tsc --noEmit` after each task.
2. Sign in as the seeded owner, open "Add New Car", select 2-3 real photo files, submit — confirm no error, dialog closes, vehicle appears in the dashboard table.
3. Check the Firebase Storage console — confirm the uploaded files exist under `dealerships/ultima-cars/vehicles/{id}/`.
4. Visit the public homepage — confirm the new vehicle's card shows the actual first uploaded photo instead of the gradient/car-icon placeholder.
5. Try submitting with 0 photos — confirm "At least one photo is required" and nothing is created.
6. Try submitting with 9 photos — confirm "Maximum 8 photos" and nothing is created.

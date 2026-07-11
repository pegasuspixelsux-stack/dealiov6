# Vehicle Photo Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "Add New Car" modal's single image-URL text field with real multi-photo upload (up to 8 photos), stored in Firebase Storage via the Admin SDK, with the resulting public URLs saved on the vehicle's Firestore document and rendered on the public homepage's vehicle cards.

**Architecture:** All uploads route through the existing `createVehicleAction` Server Action, using the Firebase Admin SDK's Storage bucket — no direct client-to-Firebase-Storage access, matching this app's existing trust model (Admin SDK only, bypassing all security rules). `vehicles.ts` splits id-generation from document-writing so photos can be uploaded to a path keyed by the vehicle's id before the Firestore document is created.

**Tech Stack:** Next.js 16 App Router, TypeScript, zod, firebase-admin (Storage + Firestore), Server Actions.

## Global Constraints

- Upload limits: up to 8 photos, 10MB total request body (raised from the 1MB Server Action default).
- All Storage access goes through the Admin SDK (server-only) — no Firebase Storage security rules needed, no client-side Storage usage.
- `Vehicle.imageUrl: string` becomes `Vehicle.imageUrls: string[]` — a clean replacement, not a migration (only test data exists).
- Photos are made public (`makePublic()` + plain `storage.googleapis.com` URL), not signed/token URLs.
- Vehicle cards show the first photo only (`imageUrls[0]`) — no carousel/gallery.
- No automated test runner exists in this repo — every task's verification is a manual, reproducible step.
- Out of scope (do not implement): editing/removing photos from existing vehicles, client-side image compression, Firebase Storage security rules, drag-and-drop upload UI or progress bars.

---

### Task 1: Change `Vehicle`/`vehicleSchema` to multi-photo

**Files:**
- Modify: `src/types/vehicle.ts`

**Interfaces:**
- Produces: `Vehicle.imageUrls: string[]` (was `imageUrl: string`); `vehicleSchema`'s `imageUrls: z.array(z.string().url()).min(1).max(8)` (was `imageUrl: z.string().url()`) — both consumed by every later task in this plan.

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

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: errors in `src/lib/vehicles/vehicles.ts` (still writes `imageUrl` from the old schema shape — fixed in Task 3), `src/app/(dashboard)/dashboard/inventory/actions.ts` (still reads `imageUrl` from form data — fixed in Task 4), and `src/app/(dashboard)/dashboard/inventory/add-vehicle-modal.tsx` (still has the old `imageUrl` input — fixed in Task 5). Confirm there are no *other* errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/vehicle.ts
git commit -m "feat: change Vehicle to support multiple photo URLs"
```

---

### Task 2: Firebase Admin Storage wiring + upload module

**Files:**
- Modify: `src/lib/firebase/admin.ts`
- Create: `src/lib/vehicles/upload-photos.ts`

**Interfaces:**
- Produces: `adminStorage: Storage | null` exported from `@/lib/firebase/admin` (same fail-safe pattern as `adminAuth`/`adminFirestore`); `uploadVehiclePhotos(dealershipId: string, vehicleId: string, files: File[]): Promise<string[]>` — used by Task 4's Server Action.

- [ ] **Step 1: Add `adminStorage` to the admin module**

Modify `src/lib/firebase/admin.ts`:

```ts
import "server-only";
import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

function readServiceAccount() {
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!encoded) return null;
  try {
    return JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"));
  } catch {
    return null;
  }
}

const serviceAccount = readServiceAccount();

let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let adminFirestore: Firestore | null = null;
let adminStorage: Storage | null = null;

if (serviceAccount) {
  adminApp = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert(serviceAccount),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
  adminAuth = getAuth(adminApp);
  adminFirestore = getFirestore(adminApp);
  adminStorage = getStorage(adminApp);
} else if (process.env.NODE_ENV !== "production") {
  console.warn(
    "[firebase-admin] Not configured — running in stub mode. Set FIREBASE_SERVICE_ACCOUNT_KEY to enable."
  );
}

export { adminApp, adminAuth, adminFirestore, adminStorage };

export function verifyIdTokenStub(): never {
  throw new Error(
    "Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_KEY before calling verifyIdToken."
  );
}
```

(Only additions: the `getStorage` import, the `adminStorage` variable, passing `storageBucket` into `initializeApp`, initializing `adminStorage`, and adding it to the export list. Everything else in this file is unchanged.)

- [ ] **Step 2: Create the upload module**

`src/lib/vehicles/upload-photos.ts`:
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

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: same pre-existing errors as Task 1 (still 3 files, not yet fixed), no new errors.

- [ ] **Step 4: Verify against real Firebase Storage with a throwaway script**

`scripts/manual-verify-upload.ts`:
```ts
import { uploadVehiclePhotos } from "../src/lib/vehicles/upload-photos";

async function main() {
  // A minimal 1x1 transparent PNG, base64-decoded, wrapped as a File.
  const pngBytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64"
  );
  const file = new File([pngBytes], "test.png", { type: "image/png" });

  const urls = await uploadVehiclePhotos("manual-verify-dealership", "manual-verify-vehicle", [file]);
  console.log("Uploaded:", urls);
}

main();
```

- [ ] **Step 5: Run it, then verify the URL is actually public**

Run: `npx tsx scripts/manual-verify-upload.ts`
Expected: prints an array with one URL matching `https://storage.googleapis.com/{your-bucket}/dealerships/manual-verify-dealership/vehicles/manual-verify-vehicle/0-test.png`.

Then fetch that exact URL to confirm it's publicly readable (proving `makePublic()` worked), without needing a browser:

Run: `curl -s -o /dev/null -w "%{http_code} %{content_type}\n" "<the-printed-url>"`
Expected: `200 image/png` — a non-200 status (e.g. 403) means `makePublic()` didn't actually take effect and must be investigated before proceeding.

- [ ] **Step 6: Clean up the test file and the throwaway script**

Delete the uploaded test object from the Firebase Storage console (path `dealerships/manual-verify-dealership/vehicles/manual-verify-vehicle/0-test.png`), then:

```bash
rm scripts/manual-verify-upload.ts
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/firebase/admin.ts src/lib/vehicles/upload-photos.ts
git commit -m "feat: add Firebase Admin Storage wiring and photo upload module"
```

---

### Task 3: Split `vehicles.ts` into reserve-id-then-write

**Files:**
- Modify: `src/lib/vehicles/vehicles.ts`

**Interfaces:**
- Produces: `reserveVehicleId(dealershipId: string): string` (new); `createVehicle(dealershipId: string, vehicleId: string, input: z.infer<typeof vehicleSchema>): Promise<void>` (signature changed — now takes a pre-generated `vehicleId` and returns nothing, instead of generating its own id and returning it) — both consumed by Task 4's Server Action.

- [ ] **Step 1: Update the file**

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
    });
}
```

Note: `getVehicles` is completely unchanged — only `createVehicle`'s signature changes, and `reserveVehicleId` is new.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: same pre-existing errors from Task 1's list, MINUS this file (which now correctly uses `imageUrls` via the unchanged `input` passthrough — the only remaining errors should be in `actions.ts` and `add-vehicle-modal.tsx`). If this file still shows an error, something doesn't match Task 1's `vehicleSchema` shape — investigate before proceeding.

- [ ] **Step 3: Commit**

```bash
git add src/lib/vehicles/vehicles.ts
git commit -m "feat: split vehicles.ts into reserveVehicleId + createVehicle(vehicleId, ...)"
```

---

### Task 4: Server Action changes + raise body size limit

**Files:**
- Modify: `src/app/(dashboard)/dashboard/inventory/actions.ts`
- Modify: `next.config.ts`

**Interfaces:**
- Consumes: `reserveVehicleId`, `createVehicle` from `@/lib/vehicles/vehicles` (Task 3); `uploadVehiclePhotos` from `@/lib/vehicles/upload-photos` (Task 2).
- Produces: `createVehicleAction` now expects a `"photos"` field in the submitted `FormData` (one or more `File` entries) instead of an `"imageUrl"` string field — consumed by Task 5's modal.

- [ ] **Step 1: Update the Server Action**

`src/app/(dashboard)/dashboard/inventory/actions.ts`:
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
  return { success: true };
}
```

- [ ] **Step 2: Raise the Server Action body size limit**

Modify `next.config.ts`:
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: only the `add-vehicle-modal.tsx` error remains (still has the old `imageUrl` input — fixed in Task 5). Confirm no other errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/dashboard/inventory/actions.ts" next.config.ts
git commit -m "feat: wire photo upload into createVehicleAction, raise body size limit"
```

---

### Task 5: Modal file input + VehicleCard display + full E2E verification

**Files:**
- Modify: `src/app/(dashboard)/dashboard/inventory/add-vehicle-modal.tsx`
- Modify: `src/components/site/homepage/vehicle-card.tsx`
- Modify: `next.config.ts`

**Interfaces:**
- Consumes: `createVehicleAction` from `./actions` (Task 4, unchanged call site — only the `FormData` contents change); `Vehicle` from `@/types` (Task 1).

- [ ] **Step 1: Replace the image URL input with a multi-file input**

Modify `src/app/(dashboard)/dashboard/inventory/add-vehicle-modal.tsx` — replace this block:
```tsx
          <div className="flex flex-col gap-2">
            <Label htmlFor="av-imageUrl">Image URL</Label>
            <Input id="av-imageUrl" name="imageUrl" type="url" required />
          </div>
```
with:
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

- [ ] **Step 2: Wire `VehicleCard` to render the first real photo**

Modify `src/components/site/homepage/vehicle-card.tsx` — add the `Image` import:
```ts
import Image from "next/image";
```
Replace this block:
```tsx
      {/* Placeholder imagery until real photography (vehicle.imageUrl) is wired in */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-950">
        <Car className="size-12 text-white/20" strokeWidth={1} />
      </div>
```
with:
```tsx
      {vehicle.imageUrls.length > 0 ? (
        <Image
          src={vehicle.imageUrls[0]}
          alt={`${vehicle.make} ${vehicle.model}`}
          fill
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-950">
          <Car className="size-12 text-white/20" strokeWidth={1} />
        </div>
      )}
```

- [ ] **Step 3: Allow `next/image` to load from the Storage bucket**

Modify `next.config.ts` — add `images.remotePatterns` alongside the existing `experimental.serverActions` block:
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 4: Verify it compiles clean**

Run: `npx tsc --noEmit`
Expected: zero errors — this is the task where the last pre-existing error (from Task 1) finally disappears.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/dashboard/inventory/add-vehicle-modal.tsx" src/components/site/homepage/vehicle-card.tsx next.config.ts
git commit -m "feat: multi-file photo input in Add New Car modal, render real photos on vehicle cards"
```

- [ ] **Step 6: Full end-to-end verification (requires a real browser + a real dev server restart — controller/human step, not a subagent)**

Restart the dev server (config file changes like `next.config.ts` require a restart, unlike most file edits) — `npm run dev`.

1. Sign in as the seeded owner, open "Add New Car", fill in the fields, select 2-3 real photo files, submit.
2. Confirm the dialog closes and the new vehicle appears in the dashboard table.
3. Open the Firebase Storage console — confirm the uploaded files exist under `dealerships/ultima-cars/vehicles/{the-new-vehicle-id}/`.
4. Visit the public homepage — confirm the new vehicle's card shows the actual first uploaded photo (not the gradient/car-icon placeholder).
5. Try submitting the form with 0 files selected — confirm "At least one photo is required" and no vehicle is created.
6. If practical, try selecting 9+ files — confirm "Maximum 8 photos" and no vehicle is created.

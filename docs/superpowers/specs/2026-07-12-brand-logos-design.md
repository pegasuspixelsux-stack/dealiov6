# Brand Logos (Configurable Brands + Scroller) — Design

## Context

The homepage's Brand Scroller (`src/components/site/homepage/brand-scroller.tsx`) currently shows 10 hardcoded brands (Toyota, Honda, Ford, etc.) as letter-monogram badges — there are no real logo images. This spec makes brands a real, Firestore-backed, dealership-configurable entity: staff add brands (name + logo image) from a new "Marcas" section on the dashboard Settings page, and the homepage scroller reads and displays the real uploaded logos instead of monograms.

This builds on the already-merged Inventory/Photo-Upload and Leads/Pipeline features — the `dealerships/{dealershipId}/...` subcollection convention, the Firebase Admin Storage upload pattern (`uploadVehiclePhotos`), and the Settings page (currently showing a "Leads" thresholds section) are all reused, not replaced.

## Explicitly out of scope

- Editing or deleting brands — add + list only, matching the "List + Create only" pattern already used for Inventory's first pass.
- Reordering brands.
- Multiple logos per brand — exactly one logo image per brand.
- A multi-row single-form "add several brands at once" UI — brands are added one at a time, each an independent save (matches the existing "Add New Car" pattern).

## Data model

**Firestore**: `dealerships/{dealershipId}/brands/{brandId}`, per the existing subcollection convention.

**`src/types/brand.ts`** (new):
```ts
import { z } from "zod";

export interface Brand {
  id: string;
  dealershipId: string;
  name: string;
  logoUrl: string;
}

export const brandSchema = z.object({
  name: z.string().min(1),
});
```
`logoUrl` is server-assigned after upload — not part of the submitted-input schema, same pattern as `Vehicle.imageUrls` being assigned after `uploadVehiclePhotos` runs.

## Firestore access layer

**`src/lib/brands/brands.ts`** (new), mirrors `src/lib/vehicles/vehicles.ts`'s reserve-then-write split (the logo needs a brand id to upload to before the Firestore document is written):
```ts
import "server-only";
import { adminFirestore } from "@/lib/firebase/admin";
import { brandSchema, type Brand } from "@/types";
import type { z } from "zod";

export async function getBrands(dealershipId: string): Promise<Brand[]> {
  if (!adminFirestore) return [];

  const snapshot = await adminFirestore
    .collection("dealerships")
    .doc(dealershipId)
    .collection("brands")
    .orderBy("createdAt", "asc")
    .get();

  return snapshot.docs.flatMap((doc) => {
    const parsed = brandSchema.safeParse(doc.data());
    if (!parsed.success) return [];
    return [{ id: doc.id, dealershipId, ...parsed.data, logoUrl: doc.data().logoUrl }];
  });
}

export function reserveBrandId(dealershipId: string): string {
  if (!adminFirestore) {
    throw new Error("Firestore is not configured.");
  }
  return adminFirestore
    .collection("dealerships")
    .doc(dealershipId)
    .collection("brands")
    .doc().id;
}

export async function createBrand(
  dealershipId: string,
  brandId: string,
  input: z.infer<typeof brandSchema> & { logoUrl: string }
): Promise<void> {
  if (!adminFirestore) {
    throw new Error("Firestore is not configured.");
  }
  const now = new Date();
  await adminFirestore
    .collection("dealerships")
    .doc(dealershipId)
    .collection("brands")
    .doc(brandId)
    .set({ ...input, id: brandId, dealershipId, createdAt: now, updatedAt: now });
}
```
(Exact field-safety details — e.g. whether `logoUrl` needs its own schema validation on read — are finalized at plan-writing time, following the same `safeParse`-and-filter hardening already applied to `getVehicles`/`getLeads`.)

## Logo upload

**`src/lib/brands/upload-logo.ts`** (new): `uploadBrandLogo(dealershipId: string, brandId: string, file: File): Promise<string>` — single file (not an array), uploaded to `dealerships/{dealershipId}/brands/{brandId}/logo-{file.name}`, made public via the Admin SDK, same trust model as `uploadVehiclePhotos` (no client-side Storage access, no security rules needed).

## Server Action

**`src/app/actions/brands.ts`** (new): `createBrandAction(formData: FormData)` — requires a signed-in session **and** `can(session.role, "canAccessConfig")` (owner-only, matching the rest of the Settings page's gate). Validates exactly one logo file is present, reserves a brand id, uploads the logo, creates the brand doc, `revalidatePath("/dashboard/settings")`.

## Settings page UI

A new "Marcas" section added to `/dashboard/settings`, alongside the existing "Leads" section:
- A simple list of existing brands (logo thumbnail + name).
- Below the list, an always-visible inline "Add Brand" form (name input + file input + submit button) — plain form, not a modal, matching this page's existing `LeadThresholdsForm` style. Submitting adds one brand; it then appears in the list (via `revalidatePath` + the form's own success handling, same try/catch/finally pattern used everywhere else in this app for Server Action calls from client components).

## Homepage wiring

**`src/app/(site)/page.tsx`**: fetch `getBrands(dealership.id)` alongside the existing `getVehicles` call, pass as a `brands` prop to `<BrandScroller>`.

**`src/components/site/homepage/brand-scroller.tsx`**: remove the hardcoded `BRANDS` array; accept `brands: Brand[]` prop; render each brand's `logoUrl` via `next/image` in place of the letter-monogram badge; when `brands.length === 0`, render nothing (the section disappears entirely) rather than showing an empty scroller shell.

## Verification (manual — no automated test runner exists in this repo)

1. `npx tsc --noEmit` after each task.
2. In Settings, add a brand (name + logo file) — confirm it appears in the list immediately.
3. Visit the homepage — confirm the new brand's real logo shows in the scroller instead of a monogram badge.
4. With zero brands added (fresh dealership), confirm the scroller section doesn't render at all.

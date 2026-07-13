# Edit Vehicle — Design

## Context

The Inventory feature has been add-only since it was first built — every vehicle field, including photos, has needed a fresh "Add New Car" entry with no way to correct a mistake or update a listing afterward. This spec adds full edit capability from the dashboard's inventory list: an "Edit" button per row opens a modal pre-filled with the vehicle's current data, including its photos, and lets the seller change anything before saving.

This builds directly on the already-merged Vehicle Detail Page, Inventory Search, and Monthly Payment features — same `vehicleSchema`, same Add Vehicle modal conventions, same `uploadVehiclePhotos` helper.

## Data layer

**`src/lib/vehicles/vehicles.ts`** gains `updateVehicle`:

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

Because the edit form always submits every field (mirroring Create, not a partial-patch form), this is effectively a full field replacement — `{ merge: true }` only matters so that `createdAt` (not part of `input`) is left untouched rather than dropped.

**`src/lib/vehicles/upload-photos.ts`**: the Storage path changes from `` `dealerships/${dealershipId}/vehicles/${vehicleId}/${index}-${file.name}` `` to `` `dealerships/${dealershipId}/vehicles/${vehicleId}/${Date.now()}-${index}-${file.name}` ``. This is needed because editing can call `uploadVehiclePhotos` again for the same `vehicleId` with a fresh `files` array starting at index 0 — without the timestamp, a new upload could coincidentally reuse the exact same path as an original photo (same index, same filename) and silently overwrite its content, corrupting a photo the seller intended to keep. This only affects the path new uploads get; existing stored URLs are untouched.

## Server Action

**`src/app/(dashboard)/dashboard/inventory/actions.ts`** gains `updateVehicleAction(vehicleId: string, formData: FormData)`:

- Same auth gate as `createVehicleAction`: `verifySession()` + `can(session.role, "canManageVehicles")`.
- Reads the same text/select fields as `createVehicleAction` (make, model, version, year, price, monthlyPayment, mileage, category, fuel, transmission, location, financingAvailable, status, description, features, color, bodyType).
- Reads `existingImageUrls` (`formData.getAll("existingImageUrls")` — the photos the seller kept) and `newPhotos` (`formData.getAll("newPhotos")` — new files to upload).
- Uploads `newPhotos` via `uploadVehiclePhotos`, concatenates the resulting URLs with `existingImageUrls` into the final `imageUrls` array.
- Validates the combined `imageUrls` count is 1–8 (same bounds `vehicleSchema` already enforces) before writing — if a seller removes every existing photo and adds none, the action returns a validation error instead of writing an empty array.
- Calls `updateVehicle`, then `revalidatePath("/dashboard/inventory")`, `revalidatePath("/inventory")`, and `revalidatePath(`/inventory/${vehicleId}`)` (the public detail page needs fresh data too).

## UI

**`EditVehicleModal`** (new, `src/app/(dashboard)/dashboard/inventory/edit-vehicle-modal.tsx`), structurally mirroring `AddVehicleModal`:

- Takes a `vehicle: Vehicle` prop; every field is pre-filled from it (`defaultValue` on text/number inputs, matching `<option selected>` on selects, `defaultChecked` on the features checkboxes and featured/financingAvailable checkboxes).
- Photos section: existing photos render as a thumbnail grid, each with a "Quitar" button that removes it from local component state only (nothing is deleted from Storage — per the approved design, a removed photo is just detached from the vehicle, never actually deleted). A separate file input lets the seller add new photos on top of whatever's kept. The combined count (kept + new) is validated client-side (1–8) before allowing submit, mirroring the server-side check.
- On submit: builds `FormData` with all text/select fields, one `existingImageUrls` entry per kept photo URL, and the new files under `newPhotos`; calls `updateVehicleAction(vehicle.id, formData)` inside the same try/catch/finally pattern every other Server-Action-calling form in this app uses.

**Dashboard inventory table** (`src/app/(dashboard)/dashboard/inventory/page.tsx`): gains an "Actions" column with an "Edit" button per row, rendered only when `canManageVehicles`, opening `EditVehicleModal` for that row's vehicle.

## Explicitly out of scope

- Deleting a vehicle entirely (still no delete — this spec only adds edit).
- Actually deleting removed photos from Firebase Storage (detach-only, per the approved design).
- Reordering photos (the first photo in the combined kept+new order becomes the "main" image, same as Create already does — no drag-to-reorder UI).
- Bulk edit / editing multiple vehicles at once.
- Edit history / audit log of what changed.

## Verification approach

Matches this codebase's established convention — no automated test runner exists:

1. `npx tsc --noEmit` after each task.
2. A throwaway `scripts/manual-verify-*.ts` round-trip for `updateVehicle`, confirming a field change persists and `createdAt` stays unchanged while `updatedAt` advances.
3. A local `npm run build` before merge — this codebase has a documented blind spot where `tsc` alone doesn't catch every production build failure.
4. Manual browser walkthrough: edit an existing vehicle's text fields and confirm they persist; remove one existing photo and add a new one, confirm the final photo set is correct on the public detail page and the removed photo's original URL still resolves (proving it wasn't deleted, just detached); try removing every photo with none added and confirm the save is rejected with a clear error; confirm the public `/inventory` and `/inventory/{id}` pages reflect the edit without a manual cache-bust.

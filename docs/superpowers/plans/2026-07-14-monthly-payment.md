# Monthly Payment Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional, manually-entered `monthlyPayment` field to vehicles, and show it as "Desde US$XXX/mes" prominently with the total price smaller beneath it — on cards and the detail page — only when it's set.

**Architecture:** One new optional Vehicle field (no calculation, no financing logic — the seller types the number). Existing price-display call sites (`VehicleCard`'s two variants, the vehicle detail page's price block) branch on whether `monthlyPayment` is present; when absent, rendering is byte-identical to today.

**Tech Stack:** Next.js 16 App Router, TypeScript, zod.

## Global Constraints

- **New field**: `monthlyPayment?: number` on `Vehicle`, with `z.number().positive().optional()` in `vehicleSchema` — deliberately `.optional()`, NOT `.default(...)` like the other recent field additions (color/bodyType/etc.), because there's no sensible default number and "not set" must stay distinguishable from any real value so display logic can cleanly branch on it.
- **Blank-field handling in `createVehicleAction`**: when the modal's Monthly Payment input is left empty, `monthlyPayment` must be passed as `undefined` into `vehicleSchema.safeParse(...)` — never coerced to `0` (which would also fail the schema's `.positive()` check) or `null`. This relies on the existing `adminFirestore.settings({ ignoreUndefinedProperties: true })` fix already in `src/lib/firebase/admin.ts` (from an earlier plan on this repo) — a `monthlyPayment: undefined` value passed into `createVehicle`'s `.set({...input})` call is safely omitted from the Firestore document rather than throwing.
- **Formatting**: `formatMonthlyPayment(payment: number): string` returns `` `Desde ${formatPrice(payment)}/mes` `` — reuses the existing `formatPrice` helper, added to the same `src/lib/format-price.ts` file.
- **Display rule, applied identically at all three call sites** (`VehicleCard` overlay variant, `VehicleCard` non-overlay variant, vehicle detail page header): if `vehicle.monthlyPayment` is truthy, render `formatMonthlyPayment(...)` at the position/weight the price currently occupies, with `formatPrice(vehicle.price)` directly beneath it in a smaller, muted style. If `vehicle.monthlyPayment` is falsy (unset), render exactly what's there today — no visual change.
- **Explicitly out of scope**: any financing math (term/APR/down payment calculation), editing `monthlyPayment` on existing vehicles (still add-only), surfacing it in `/inventory`'s search filters, and any change to the homepage's standalone `FinanceCalculator` section.
- **No automated test runner exists in this repo.** Verification is `npx tsc --noEmit` plus real Firestore round-trips via throwaway `scripts/manual-verify-*.ts` files (always deleted before commit) plus a final manual browser walkthrough. No `next typegen` is needed — this plan doesn't touch any route's dynamic-segment/searchParams shape.

---

### Task 1: Data model — `monthlyPayment` field + formatting helper

**Files:**
- Modify: `src/types/vehicle.ts`
- Modify: `src/lib/format-price.ts`

**Interfaces:**
- Produces: `Vehicle.monthlyPayment?: number`, expanded `vehicleSchema`, `formatMonthlyPayment(payment: number): string` — consumed by Task 2 (Add Vehicle modal) and Task 3 (card/detail-page display).

- [ ] **Step 1: Add the field and schema validator**

In `src/types/vehicle.ts`, add `monthlyPayment?: number;` to the `Vehicle` interface (after `bodyType: BodyType;`), and add `monthlyPayment: z.number().positive().optional(),` to `vehicleSchema` (after the `bodyType` line). The relevant parts become:
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
  version: string;
  fuel: Fuel;
  transmission: Transmission;
  location: string;
  financingAvailable: boolean;
  status: VehicleStatus;
  description: string;
  features: string[];
  color: string;
  bodyType: BodyType;
  monthlyPayment?: number;
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
  color: z.string().default(""),
  bodyType: z
    .enum(["sedan", "suv", "hatchback", "pickup", "coupe", "furgon"])
    .default("sedan"),
  monthlyPayment: z.number().positive().optional(),
});
```

- [ ] **Step 2: Add the formatting helper**

Replace the full contents of `src/lib/format-price.ts`:
```ts
export function formatPrice(price: number): string {
  return `US$${price.toLocaleString("en-US")}`;
}

export function formatMonthlyPayment(payment: number): string {
  return `Desde ${formatPrice(payment)}/mes`;
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Verify monthlyPayment round-trips correctly — present when set, genuinely absent when not**

`scripts/manual-verify-monthly-payment.ts`:
```ts
import { adminFirestore } from "../src/lib/firebase/admin";
import { createVehicle, getVehicles, reserveVehicleId } from "../src/lib/vehicles/vehicles";

async function main() {
  const dealershipId = "manual-verify-dealership";

  const idWithout = reserveVehicleId(dealershipId);
  await createVehicle(dealershipId, idWithout, {
    make: "Chevrolet",
    model: "Onix",
    year: 2022,
    price: 18000,
    mileage: 20000,
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
    imageUrls: ["https://example.com/photo.jpg"],
  });

  const idWith = reserveVehicleId(dealershipId);
  await createVehicle(dealershipId, idWith, {
    make: "Chevrolet",
    model: "Tracker",
    year: 2023,
    price: 25000,
    mileage: 5000,
    category: "new",
    featured: false,
    version: "",
    fuel: "nafta",
    transmission: "automatica",
    location: "",
    financingAvailable: true,
    status: "disponible",
    description: "",
    features: [],
    color: "",
    bodyType: "suv",
    imageUrls: ["https://example.com/photo2.jpg"],
    monthlyPayment: 450,
  });

  const vehicles = await getVehicles(dealershipId);
  console.log(
    JSON.stringify(
      vehicles.filter((v) => v.id === idWithout || v.id === idWith),
      null,
      2
    )
  );

  const collection = adminFirestore!
    .collection("dealerships")
    .doc(dealershipId)
    .collection("vehicles");
  await collection.doc(idWithout).delete();
  await collection.doc(idWith).delete();
  console.log("cleaned up");
}

main();
```

- [ ] **Step 5: Run it**

Run: `npx tsx --conditions=react-server --env-file=.env.local scripts/manual-verify-monthly-payment.ts`
Expected: prints two vehicles — the "Onix" one has NO `monthlyPayment` key at all in the printed JSON (confirming it was never written to Firestore, not stored as `0`/`null`); the "Tracker" one has `"monthlyPayment": 450`. Then `cleaned up`.

- [ ] **Step 6: Delete the throwaway script**

```bash
rm scripts/manual-verify-monthly-payment.ts
```

- [ ] **Step 7: Commit**

```bash
git add src/types/vehicle.ts src/lib/format-price.ts
git commit -m "feat: add monthlyPayment field to Vehicle and formatMonthlyPayment helper"
```

---

### Task 2: Dashboard — Add Vehicle modal + createVehicleAction

**Files:**
- Modify: `src/app/(dashboard)/dashboard/inventory/add-vehicle-modal.tsx`
- Modify: `src/app/(dashboard)/dashboard/inventory/actions.ts`

**Interfaces:**
- Consumes: expanded `vehicleSchema` from `@/types` (Task 1).

- [ ] **Step 1: Add the Monthly Payment field to the modal**

In `src/app/(dashboard)/dashboard/inventory/add-vehicle-modal.tsx`, add a new field immediately after the existing `av-price` field block (inside the `grid grid-cols-2 gap-4`):
```tsx
            <div className="flex flex-col gap-2">
              <Label htmlFor="av-monthly-payment">Monthly Payment (US$, optional)</Label>
              <Input id="av-monthly-payment" name="monthlyPayment" type="number" />
            </div>
```

- [ ] **Step 2: Read the field in createVehicleAction, omitting it entirely when blank**

In `src/app/(dashboard)/dashboard/inventory/actions.ts`, add this block right before the `const fieldsParsed = vehicleSchema...` statement:
```ts
  const monthlyPaymentRaw = formData.get("monthlyPayment");
  const monthlyPayment =
    typeof monthlyPaymentRaw === "string" && monthlyPaymentRaw.trim() !== ""
      ? Number(monthlyPaymentRaw)
      : undefined;

```
Then add `monthlyPayment,` as a new line inside the `vehicleSchema.omit({ imageUrls: true }).safeParse({...})` object, after the `bodyType: formData.get("bodyType"),` line.

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/dashboard/inventory/add-vehicle-modal.tsx" "src/app/(dashboard)/dashboard/inventory/actions.ts"
git commit -m "feat: capture optional monthlyPayment in Add Vehicle modal"
```

Note: `createVehicleAction` requires a real signed-in session (cookies), so it cannot be exercised by a standalone script — its correctness is verified by `tsc` here, by Task 1's direct `createVehicle` round-trip, and by the full manual browser walkthrough at the end of Task 3.

---

### Task 3: Display on cards and detail page + final verification

**Files:**
- Modify: `src/components/site/homepage/vehicle-card.tsx`
- Modify: `src/app/(site)/inventory/[id]/page.tsx`

**Interfaces:**
- Consumes: `formatMonthlyPayment` from `@/lib/format-price` (Task 1).
- Produces: nothing consumed by later tasks — final task of this plan.

- [ ] **Step 1: Branch the non-overlay (top-right) price block on monthlyPayment**

In `src/components/site/homepage/vehicle-card.tsx`, add `formatMonthlyPayment` to the existing `import { formatPrice } from "@/lib/format-price";` line (making it `import { formatPrice, formatMonthlyPayment } from "@/lib/format-price";`), then replace:
```tsx
      {!overlay && (
        <div className="absolute top-3 right-3 text-right">
          <p className="text-xs text-[#0d0d0d]/70">A partir de</p>
          <p className="text-xl font-semibold text-[#0d0d0d]">
            {formatPrice(vehicle.price)}
          </p>
        </div>
      )}
```
with:
```tsx
      {!overlay && (
        <div className="absolute top-3 right-3 text-right">
          {vehicle.monthlyPayment ? (
            <>
              <p className="text-xl font-semibold text-[#0d0d0d]">
                {formatMonthlyPayment(vehicle.monthlyPayment)}
              </p>
              <p className="text-xs text-[#0d0d0d]/70">
                {formatPrice(vehicle.price)}
              </p>
            </>
          ) : (
            <>
              <p className="text-xs text-[#0d0d0d]/70">A partir de</p>
              <p className="text-xl font-semibold text-[#0d0d0d]">
                {formatPrice(vehicle.price)}
              </p>
            </>
          )}
        </div>
      )}
```

- [ ] **Step 2: Branch the overlay (bottom-row) price on monthlyPayment**

In the same file, replace:
```tsx
          {overlay && (
            <p className="text-xl font-semibold text-white">
              {formatPrice(vehicle.price)}
            </p>
          )}
```
with:
```tsx
          {overlay && (
            <div>
              {vehicle.monthlyPayment ? (
                <>
                  <p className="text-xl font-semibold text-white">
                    {formatMonthlyPayment(vehicle.monthlyPayment)}
                  </p>
                  <p className="text-xs text-white/70">
                    {formatPrice(vehicle.price)}
                  </p>
                </>
              ) : (
                <p className="text-xl font-semibold text-white">
                  {formatPrice(vehicle.price)}
                </p>
              )}
            </div>
          )}
```

- [ ] **Step 3: Branch the vehicle detail page's price block on monthlyPayment**

In `src/app/(site)/inventory/[id]/page.tsx`, add `formatMonthlyPayment` to the existing `import { formatPrice } from "@/lib/format-price";` line, then replace:
```tsx
              <span className="font-heading text-2xl text-[#0d0d0d]">
                {formatPrice(vehicle.price)}
              </span>
```
with:
```tsx
              {vehicle.monthlyPayment ? (
                <div>
                  <p className="font-heading text-2xl text-[#0d0d0d]">
                    {formatMonthlyPayment(vehicle.monthlyPayment)}
                  </p>
                  <p className="text-sm text-[#0d0d0d]/70">
                    {formatPrice(vehicle.price)}
                  </p>
                </div>
              ) : (
                <span className="font-heading text-2xl text-[#0d0d0d]">
                  {formatPrice(vehicle.price)}
                </span>
              )}
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Verify a full local production build succeeds**

Run: `npm run build`
Expected: completes successfully (exit 0), including "Collecting page data" and "Generating static pages" — this codebase has a known blind spot where `tsc`/scripts alone don't catch every production build failure (a prior plan on this repo broke the Vercel build despite clean `tsc`), so this step is mandatory before merge, not optional.

- [ ] **Step 6: Commit**

```bash
git add src/components/site/homepage/vehicle-card.tsx "src/app/(site)/inventory/[id]/page.tsx"
git commit -m "feat: show monthly payment prominently with price beneath it when set"
```

- [ ] **Step 7: Full manual browser walkthrough (controller/human step — cannot be done by a subagent without a real browser + signed-in session)**

1. Sign in as the seeded owner, add one vehicle WITH a Monthly Payment (e.g. 450) and one WITHOUT (leave it blank), both via the Add Vehicle modal.
2. Visit the homepage's "Vehículos 0km" and "Vehículos Usados" sections (or `/inventory`, depending on each vehicle's category) — confirm the vehicle with a payment shows "Desde US$450/mes" prominently with the price smaller beneath it, and the vehicle without a payment shows exactly what it showed before this feature (unchanged).
3. Click through to each vehicle's detail page — confirm the same prominent-payment/smaller-price pattern on the one with a payment, and unchanged price-only display on the one without.
4. Confirm the WhatsApp inquiry button and contact form on both vehicles still work normally (unaffected by this change).

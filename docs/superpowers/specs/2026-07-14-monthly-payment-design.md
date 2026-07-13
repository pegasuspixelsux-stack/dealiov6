# Monthly Payment Display — Design

## Context

Sellers currently have no way to advertise a financing payment estimate alongside a vehicle's price. This spec adds an optional `monthlyPayment` field, manually entered per vehicle in the Add Vehicle modal (no calculation — the seller types the number they want shown), and changes card/detail-page price display so that when it's set, the payment is shown prominently ("Desde US$XXX/mes") with the total price directly beneath it in a smaller font. When it's not set, everything displays exactly as it does today.

This builds on the Vehicle Detail Page and Inventory Search work already merged — same `vehicleSchema`/`getVehicles` conventions, same Add Vehicle modal, same `VehicleCard`/detail-page price block.

## Data model

**`Vehicle`** (`src/types/vehicle.ts`) gains one new field:

```ts
monthlyPayment?: number;

// vehicleSchema gains:
monthlyPayment: z.number().positive().optional(),
```

`.optional()` (not `.default(...)`) is deliberate here, unlike the other recent additions (`color`, `bodyType`, etc.) — those always have *some* real value once a vehicle exists, so a fallback default made sense. A payment estimate either exists or doesn't; there's no sensible default number, and "not present" must stay distinguishable from "zero" so the display logic can cleanly branch on it (`vehicle.monthlyPayment ? ... : ...`).

## Dashboard: Add Vehicle modal

One new field, placed next to the existing Price field:
- `monthlyPayment` — number input, NOT required, labeled "Monthly Payment (US$, optional)".

`createVehicleAction` reads it via `formData.get("monthlyPayment")`: if the field is empty, it's omitted from the parsed input entirely (not coerced to `0` or `null`) so `vehicleSchema`'s `.optional()` leaves it genuinely absent on the Firestore doc.

## Display: cards and detail page

A shared formatting helper (`src/lib/format-price.ts`, extended) adds `formatMonthlyPayment(payment: number): string` returning `` `Desde ${formatPrice(payment)}/mes` ``, reusing the existing `formatPrice` (which already renders the USD-with-thousands-separator style).

Wherever a vehicle's price is currently shown (`VehicleCard` — both the `overlay` and non-`overlay` variants — and the vehicle detail page's header price block), the rendering branches:
- **`monthlyPayment` set**: show `formatMonthlyPayment(...)` prominently (same visual weight/position the price currently occupies), with `formatPrice(vehicle.price)` directly beneath it at a smaller size, unlabeled.
- **`monthlyPayment` not set**: unchanged from current behavior — only the price shows, exactly as today (including the existing "A partir de" label on 0km cards, which is untouched).

## Explicitly out of scope

- Any payment calculation/financing math (term, APR, down payment) — the seller types the number directly, same spirit as the rest of the manually-entered vehicle fields.
- Editing `monthlyPayment` on existing vehicles — still add-only, matching the rest of the Inventory feature's scope.
- Surfacing `monthlyPayment` in the `/inventory` search filters — not requested.
- Changing the homepage's standalone `FinanceCalculator` section — unrelated, untouched.

## Verification approach

Matches this codebase's established convention — no automated test runner exists:

1. `npx tsc --noEmit` after each task.
2. A throwaway `scripts/manual-verify-*.ts` round-trip confirming a vehicle written without `monthlyPayment` reads back with the field genuinely absent (not `0`/`null`), and one written with it reads back correctly.
3. Manual browser walkthrough: add one vehicle with a monthly payment and one without via the dashboard modal, confirm the "Desde .../mes" + smaller price rendering appears only on the one with a payment, on both card styles (homepage 0km/Usados sections, `/inventory` grid) and the vehicle detail page.

# Leads Dashboard + Frontend Lead Capture — Design

## Context

Three places on the public site already collect visitor contact info but only fake-submit it:
- `src/components/site/homepage/trade-in.tsx` ("Conocé el Valor de tu Vehículo") — name, email, vehicle details.
- `src/components/site/homepage/lead-footer.tsx` ("¿Buscás un Auto?") — name, phone, free-text message.
- `src/components/site/homepage/vehicle-card.tsx`'s "Consultar" button — currently a plain link straight to WhatsApp with a pre-filled message, no lead capture at all.

Both existing forms have explicit `// Placeholder submission: no Lead model/Firestore write exists yet. A future Leads feature wires this into a real Lead record.` comments. The dashboard's Leads page (`src/app/(dashboard)/dashboard/leads/page.tsx`) is a `<ComingSoon>` placeholder with zero data fetching. This spec is that "future Leads feature": a unified `Lead` model, a Firestore-backed dashboard list, and all three frontend sources wired to write real leads — including adding lead capture to the "Consultar" flow, which previously had none (a modal for name + WhatsApp number, gating the redirect to WhatsApp).

This builds on the already-merged Inventory/Firebase work — `adminFirestore`, `verifySession`, the dashboard layout guard, and the `dealerships/{dealershipId}/...` subcollection convention are all already in place and unchanged by this spec.

## Explicitly out of scope

- Status tracking (New/Contacted/Closed) or any lead lifecycle — read-only list only.
- Editing or deleting leads.
- Rate limiting, spam prevention, or CAPTCHA on the public lead-capture endpoint — same v1 trust posture as the site's existing (currently fake) contact forms.
- A public vehicle detail page or a working "view vehicle" link from the leads list — vehicle info is plain text in the `message` field.
- Assigning leads to specific salespeople.

## Trust model

Lead capture is invoked by **anonymous public site visitors**, not authenticated dashboard staff — a fundamentally different trust boundary than the Inventory feature's Server Action. There is no session to check. The action only needs a `dealershipId` (already resolved server-side per-request via the existing `resolveDealershipId(host)` → `getDealershipConfig` flow used throughout the homepage) and does basic zod validation on the submitted fields. No auth check, no permission check — this is a public write path by design.

## Data model

**Firestore**: `dealerships/{dealershipId}/leads/{leadId}`, matching the existing documented convention (`src/types/firestore.ts`).

**`src/types/lead.ts`** (new):
```ts
import { z } from "zod";

export type LeadSource = "vehicle_inquiry" | "trade_in" | "general_inquiry";

export interface Lead {
  id: string;
  dealershipId: string;
  source: LeadSource;
  name: string;
  contact: string;
  message: string;
}

export const leadSchema = z.object({
  source: z.enum(["vehicle_inquiry", "trade_in", "general_inquiry"]),
  name: z.string().min(1),
  contact: z.string().min(1),
  message: z.string().min(1),
});
```

One unified shape covers all three sources (`contact` is a phone/WhatsApp number or an email depending on source; `message` is a human-readable summary), keeping the dashboard list simple: Name | Contact | Source | Message | Date columns, no discriminated union with per-source fields.

## Firestore access layer

**New file** `src/lib/leads/leads.ts` (server-only):
```ts
import "server-only";
import { adminFirestore } from "@/lib/firebase/admin";
import { leadSchema, type Lead } from "@/types";
import type { z } from "zod";

export async function getLeads(dealershipId: string): Promise<Lead[]> {
  if (!adminFirestore) return [];
  const snapshot = await adminFirestore
    .collection("dealerships")
    .doc(dealershipId)
    .collection("leads")
    .orderBy("createdAt", "desc")
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Lead);
}

export async function createLead(
  dealershipId: string,
  input: z.infer<typeof leadSchema>
): Promise<void> {
  if (!adminFirestore) {
    throw new Error("Firestore is not configured.");
  }
  const now = new Date();
  const ref = adminFirestore
    .collection("dealerships")
    .doc(dealershipId)
    .collection("leads")
    .doc();
  await ref.set({ ...input, id: ref.id, dealershipId, createdAt: now, updatedAt: now });
}
```

## Public Server Action

**New file** `src/app/actions/leads.ts`:
```ts
"use server";

import { createLead } from "@/lib/leads/leads";
import { leadSchema } from "@/types";

export async function createLeadAction(input: {
  dealershipId: string;
  source: string;
  name: string;
  contact: string;
  message: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Please check the form and try again." };
  }
  await createLead(input.dealershipId, parsed.data);
  return { success: true };
}
```

Called with a plain object (not `FormData`), since all three call sites already use controlled-input React state, not native form submissions.

## Consultar → inquiry modal

**Prop threading**: `LeadFooter` and `TradeIn` currently take zero props; both gain `dealershipId: string`, threaded from their wrapper sections (`lead-testimonials.tsx`, `trade-in-section.tsx`) the same way `page.tsx` already threads `dealership`/`vehicles` elsewhere.

**New client component** `src/components/site/homepage/vehicle-inquiry-button.tsx`, replacing the current `<Button render={<a href={whatsappHref}>Consultar</a>}>` in `vehicle-card.tsx`:
- Same visual button, but a `Dialog` trigger instead of a bare link.
- Modal form: Name + WhatsApp Number only.
- On submit: `createLeadAction({ dealershipId, source: "vehicle_inquiry", name, contact: phone, message: \`Interesado en ${make} ${model} ${year}\` })`.
- On success: close the dialog, `window.location.href = whatsappHref` — same pre-filled dealership WhatsApp message as today, now gated behind lead capture.
- On failure: inline error, same try/catch/finally pattern as the Add New Car modal (so it can't hang on a thrown Server Action).

`vehicle-card.tsx` swaps its button/link for `<VehicleInquiryButton vehicle={vehicle} dealership={dealership} />`; `VehicleCard` itself stays server-renderable — only this one interactive piece is a client component.

## Wiring the existing forms

**`TradeIn`** (`trade-in.tsx`): add `dealershipId: string` prop. `handleSubmit` becomes `async`; after validation, replace the placeholder comment with a call to `createLeadAction({ dealershipId, source: "trade_in", name: form.name, contact: form.email, message: \`${form.year} ${form.make} ${form.model}, ${form.mileage} km\` })`, checking `result.success` before calling `setSubmitted(true)` (show a generic Spanish error otherwise).

**`LeadFooter`** (`lead-footer.tsx`): same pattern, add `dealershipId: string` prop, `handleSubmit` becomes `async`, calls `createLeadAction({ dealershipId, source: "general_inquiry", name: form.name, contact: form.phone, message: form.message || "Consulta general" })`.

**Wrapper components** (`trade-in-section.tsx`, `lead-testimonials.tsx`): accept and pass through `dealershipId: string`, sourced from `page.tsx`'s existing `dealership.id`.

## Dashboard Leads page

**`src/app/(dashboard)/dashboard/leads/page.tsx`**: replace `<ComingSoon>` with a Server Component mirroring the Inventory list page's shape — `verifySession()` for `dealershipId`, `getLeads(session.dealershipId)`, a plain HTML table (Name | Contact | Source | Message | Date, with `source` mapped to a human-readable Spanish label), empty state "No leads yet." No permission gating beyond the existing dashboard layout guard (all roles can view leads — no restriction was requested).

## Verification (manual — no automated test runner exists in this repo)

1. `npx tsc --noEmit` after each task.
2. Submit the Trade-In form on the homepage — confirm the success message, confirm a new lead appears in the dashboard Leads page with `source: "trade_in"` and the expected `message` summary.
3. Submit the "¿Buscás un Auto?" form — same check, `source: "general_inquiry"`.
4. Click "Consultar" on a vehicle card, fill in name + WhatsApp number, submit — confirm it navigates to WhatsApp with the existing pre-filled message, and confirm a new lead appears with `source: "vehicle_inquiry"` and a message naming the correct vehicle.

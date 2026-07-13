# Dashboard Overview — Phase 1 — Design

## Context

The dashboard home page (`/dashboard`) is currently just a "Welcome, {name}" placeholder. This is Phase 1 of a larger "Dashboard Design" spec the user pasted, decomposed because several pieces depend on subsystems that don't exist yet in this app: salesperson assignment (the Salespeople page is a "Coming Soon" placeholder), a "sold" event with a timestamp (only a `status` field exists today, with no record of when it changed), an activity log, and a charting library.

- **Phase 1 (this spec)**: 4 KPI cards (with month-over-month and year-over-year comparisons), "Vehicles Listed the Longest" and "Leads Waiting the Longest" attention tables, and Quick Actions.
- **Phase 2 (future)**: salesperson assignment system, which unlocks the "Assigned Salesperson" columns this phase deliberately omits.
- **Phase 3 (future)**: Recent Activity feed (needs a new activity-log system).
- **Phase 4 (future)**: Sales Performance chart (needs a charting library).

## Explicitly out of scope (this phase)

- Assigned Salesperson columns (Phase 2 dependency).
- Stock Number column (not modeled anywhere in this app).
- Recent Activity feed.
- Sales Performance chart.
- "Add Lead" / "Register Sale" / "Upload Photos" as distinct Quick Action buttons — none are real distinct flows today (leads only originate from the public site; "registering a sale" is just editing a vehicle's status to `vendido`; photo upload is bundled into Add/Edit Vehicle). Quick Actions link to existing pages instead.

## Data model changes

**`Vehicle`** (`src/types/vehicle.ts`) gains:
- `createdAt: string` and `updatedAt: string` (ISO strings), exposed from `getVehicles` the same way `Lead` already exposes them — currently `Vehicle` has neither timestamp available at all. Needed for "Days Online" and every trend calculation.
- `soldAt?: string` (ISO string, optional). `createVehicleAction`/`updateVehicleAction` auto-manage this: whenever an edit changes `status` to `"vendido"` (and it wasn't already), `soldAt` is set to the current time; if `status` is ever changed away from `"vendido"`, `soldAt` is cleared back to unset. This is the only reliable signal for "vehicles sold this month" — `updatedAt` alone can't distinguish "just got marked sold" from "unrelated edit to an already-sold listing."

**Dealership config** gains `staleListingDays: number` (default `60`), stored and edited the same way `leadStageThresholds` already is — a new "Inventario" section on the Settings page, alongside the existing "Leads" and "Marcas" sections.

## KPI cards

Four cards in a responsive row, each showing a large primary number/label plus two smaller secondary lines beneath it: "vs last month" and "vs last year" (both as a signed percentage change, or "—" when the prior period's count was zero).

1. **Total Vehicles Published**: count of vehicles with `status === "disponible"` right now. Trend basis: vehicles *added* this month vs. added last month / added in the same month last year (an acquisition-pace proxy, not a true historical total — there's no snapshot system to reconstruct "total inventory level a month ago").
2. **Vehicles Sold**: count of vehicles with `soldAt` in the current calendar month. Trend: this month's count vs. last month's vs. the same month last year — accurate, since `soldAt` is a real event timestamp.
3. **Leads Received**: count of leads with `createdAt` in the current calendar month, plus a smaller "today: N" figure. Trend vs. last month / same month last year.
4. **Leads Converted**: count of leads with `stage === "ganado"` and `updatedAt` in the current calendar month (proxy for "won this month" — same approximation this app already uses elsewhere for stage-change timing), plus a conversion percentage (converted ÷ leads received this month × 100). Trend vs. last month / same month last year.

## Vehicles Listed the Longest

A table of vehicles with `status !== "vendido"`, sorted oldest-`createdAt`-first, top 10.

Columns: Photo (first `imageUrls` entry, thumbnail), Vehicle (year/make/model), Published Date, Days Online (computed from `createdAt`), Price, Status (reusing the badge styling already established on the vehicle detail page). Rows where Days Online exceeds the configurable `staleListingDays` threshold get a visual highlight (background tint or badge color shift — consistent with how Pipeline already color-codes stale leads).

Action: "View Vehicle" — links to the public detail page (`/inventory/{id}`).

## Leads Waiting the Longest

A table of leads with `stage` not in `("ganado", "perdido")`, sorted worst-staleness-first (reusing the existing `getLeadStaleness` red/yellow/green logic from the Pipeline feature — same thresholds, same color scale), top 10.

Columns: Customer Name, Vehicle of Interest (the lead's free-text `message` field, truncated — there's no structured lead→vehicle reference in this app, so this is the closest available signal, not a real foreign key), Lead Source (translated label), Date Received, Days Waiting, Current Status (stage label plus the same staleness color dot Pipeline already renders).

Action: "Open Lead" — reuses the existing `LeadDetailModal` component from the Pipeline feature directly on this page (no new modal needed), so the exact same stage-change UI staff already know works.

## Quick Actions

Three shortcut buttons: "Add Vehicle" → `/dashboard/inventory`, "Manage Inventory" → `/dashboard/inventory`, "View Leads" → `/dashboard/pipeline`.

## Verification approach

Matches this codebase's established convention — no automated test runner exists:

1. `npx tsc --noEmit` after each task.
2. Throwaway `scripts/manual-verify-*.ts` round-trips against real Firestore for the `soldAt` auto-management logic (confirm it sets on transition to vendido, clears on transition away, and legacy vehicles without it don't break `getVehicles`).
3. A local `npm run build` before merge — this codebase has a documented blind spot where `tsc` alone doesn't catch every production build failure.
4. Manual browser walkthrough: confirm KPI numbers match a manual count of real dashboard data, confirm both attention tables sort/highlight correctly, confirm "Open Lead" opens the same modal Pipeline uses and a stage change there is reflected back on this page, confirm the Settings page's new "Inventario" threshold actually changes which listings get highlighted.

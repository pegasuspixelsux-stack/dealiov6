# Lead Pipeline (Kanban) — Design

## Context

The user's original request was a full CRM lead-management spec covering configurable pipeline stages, a drag-and-drop Kanban board, rich lead records (company, budget, priority, assigned salesperson), notes/activity timeline/tasks, lead scoring, assignment/notifications, a KPI dashboard, a filterable list view, and permission changes — at least 7-8 independent subsystems, each on the scale of the features already built this session (Firebase login, Inventory, Photo Upload, Leads v1 were each ~5 tasks).

This spec is the scoped first phase, confirmed through clarification: a Kanban "Pipeline" dashboard page with 6 stages, a lead-detail modal for viewing info and changing stage (no drag-and-drop), and a red/yellow/green staleness indicator with **configurable** time thresholds (set from a new "Leads" section on the dashboard Settings page). Everything else from the original spec (notes, tasks, scoring, assignment, notifications, KPIs, list-view filters, permission rework, admin-configurable stage names) is out of scope for this phase — each would be its own follow-up.

This builds on the already-merged Leads v1 feature (`Lead` type, `getLeads`/`createLead`, `createLeadAction`, the dashboard Leads list page) — none of that is removed or replaced, only extended.

## Explicitly out of scope

- Drag-and-drop between Kanban columns (modal-only stage changes, confirmed).
- Admin-configurable stage *names or list* — the 6 stages (Recibido, Contactado, Seguimiento, Negociación, Ganado, Perdido) are hardcoded this pass; only the staleness *thresholds* are configurable.
- Notes, activity timeline, tasks, communication log, documents, status history on the lead detail modal — it shows the lead's existing fields only.
- Lead scoring, assignment/ownership, reassignment history, notifications.
- KPI dashboard, list-view filters/sorting/search/pagination/bulk actions.
- Permissions rework (e.g. "salesperson sees only their own leads") — all dashboard roles see all leads and can change any lead's stage, matching the existing Leads list page's behavior.
- Future integrations (WhatsApp API, email, SMS, calendar, webhooks) — noted in the original spec as forward-looking architecture guidance, not built now.

## Data model changes

**`src/types/lead.ts`** — add stage support:
```ts
export type LeadStage =
  | "recibido"
  | "contactado"
  | "seguimiento"
  | "negociacion"
  | "ganado"
  | "perdido";

export const LEAD_STAGES: LeadStage[] = [
  "recibido", "contactado", "seguimiento", "negociacion", "ganado", "perdido",
];

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  recibido: "Recibido",
  contactado: "Contactado",
  seguimiento: "Seguimiento",
  negociacion: "Negociación",
  ganado: "Ganado",
  perdido: "Perdido",
};

export const leadStageSchema = z.enum(LEAD_STAGES as [LeadStage, ...LeadStage[]]);
```
`Lead` gains `stage: LeadStage` and `updatedAt: string` fields. `stage` is **not** part of `leadSchema` (the public creation-input schema) — visitors never submit a stage; `createLead` assigns `"recibido"` by default, the same way it already assigns `id`/`dealershipId`/timestamps.

**`src/lib/leads/leads.ts`**: `createLead` sets `stage: "recibido"` on write. `getLeads` exposes `updatedAt` (same `.toDate().toISOString()` pattern already used for `createdAt`) and `stage` (falling back to `"recibido"` via `safeParse` defaults if an older doc somehow lacks it — defensive, not expected to matter since only test data exists). New function `updateLeadStage(dealershipId: string, leadId: string, stage: LeadStage): Promise<void>` — writes `{ stage, updatedAt: new Date() }` via `.update()`.

## Configurable staleness thresholds

**New file** `src/types/lead-stage-thresholds.ts`:
```ts
import { z } from "zod";

export interface LeadStageThresholds {
  fastStageYellowMinutes: number; // Recibido, Contactado, Negociación
  fastStageRedMinutes: number;
  followUpYellowDays: number;     // Seguimiento
  followUpRedDays: number;
}

export const DEFAULT_LEAD_STAGE_THRESHOLDS: LeadStageThresholds = {
  fastStageYellowMinutes: 15,
  fastStageRedMinutes: 60,
  followUpYellowDays: 3,
  followUpRedDays: 7,
};

export const leadStageThresholdsSchema = z.object({
  fastStageYellowMinutes: z.number().positive(),
  fastStageRedMinutes: z.number().positive(),
  followUpYellowDays: z.number().positive(),
  followUpRedDays: z.number().positive(),
});
```

Two groups (fast-stage minutes, follow-up days) rather than fully generic per-stage config — matches how the thresholds were actually described, avoids over-building a config UI more general than what's needed.

**Storage**: `dealerships/{dealershipId}` document itself, field `leadStageThresholds`. This is the first thing to write directly to that document — today it only exists implicitly as the parent path of the `vehicles`/`leads` subcollections, so the write must use `.set({ leadStageThresholds: ... }, { merge: true })` to avoid clobbering anything (there's nothing else there yet, but `merge: true` is the safe default for a doc used as a subcollection parent).

**New file** `src/lib/leads/lead-config.ts`: `getLeadStageThresholds(dealershipId): Promise<LeadStageThresholds>` (falls back to `DEFAULT_LEAD_STAGE_THRESHOLDS` if the field is unset or Firestore is unconfigured) and `updateLeadStageThresholds(dealershipId, input): Promise<void>`.

## Staleness calculation

**New file** `src/lib/leads/staleness.ts` — pure function, no Firestore access, takes thresholds as a parameter (stays independently testable):
```ts
import type { LeadStage, LeadStageThresholds } from "@/types";

export type Staleness = "green" | "yellow" | "red";

export function getLeadStaleness(
  stage: LeadStage,
  updatedAt: string,
  thresholds: LeadStageThresholds
): Staleness | null {
  if (stage === "ganado" || stage === "perdido") return null;

  const minutesSinceUpdate = (Date.now() - new Date(updatedAt).getTime()) / 60_000;

  if (stage === "seguimiento") {
    const daysSinceUpdate = minutesSinceUpdate / (60 * 24);
    if (daysSinceUpdate <= thresholds.followUpYellowDays) return "green";
    if (daysSinceUpdate <= thresholds.followUpRedDays) return "yellow";
    return "red";
  }

  if (minutesSinceUpdate <= thresholds.fastStageYellowMinutes) return "green";
  if (minutesSinceUpdate <= thresholds.fastStageRedMinutes) return "yellow";
  return "red";
}
```
Returns `null` for Ganado/Perdido — no indicator on closed leads.

## Server Actions

**`updateLeadStageAction`** (added to the existing `src/app/actions/leads.ts`) — requires a dashboard session (unlike the public `createLeadAction`), since only staff move leads through the pipeline. No specific permission check beyond "signed in" — any dashboard role can change any lead's stage, matching the existing Leads list page's lack of role restriction.

**`updateLeadStageThresholdsAction`** (new file, `src/app/actions/lead-config.ts`) — requires a dashboard session **and** `can(session.role, "canAccessConfig")`, matching the Settings page's existing gate.

## Settings page

**`src/app/(dashboard)/dashboard/settings/page.tsx`**: replaces `<ComingSoon>` with a "Leads" configuration section — a form with the 4 number inputs (labeled in their natural units: minutes for the two fast-stage fields, days for the two follow-up fields), pre-filled from `getLeadStageThresholds`, saved via `updateLeadStageThresholdsAction`. This is the first real content on this page; the existing `canAccessConfig` gate (currently showing `<Forbidden />` for salespeople) stays as-is.

## Pipeline Kanban page

**New file** `src/app/(dashboard)/dashboard/pipeline/page.tsx` (Server Component): `verifySession()`, fetches `getLeads` + `getLeadStageThresholds` in parallel, groups leads by `stage` in `LEAD_STAGES` order, renders `<PipelineBoard leads={leads} thresholds={thresholds} />`.

**New file** `src/app/(dashboard)/dashboard/pipeline/pipeline-board.tsx` (client component): 6 columns side by side (horizontally scrollable on narrow screens) labeled via `LEAD_STAGE_LABELS`, each showing its leads as cards (name, source label, staleness dot computed client-side via `getLeadStaleness` against `Date.now()`, truncated message). Clicking a card opens the detail modal (`useState<Lead | null>`).

**New file** `src/app/(dashboard)/dashboard/pipeline/lead-detail-modal.tsx` (client component): shows all lead fields (name, contact, source, message, stage, created/updated dates), a `<select>` to change stage calling `updateLeadStageAction` (try/catch/finally, matching this app's established defensive pattern for Server Action calls from modals), closes and refreshes on success.

**Sidebar nav**: add a "Pipeline" item to `NAV_ITEMS` in `sidebar.tsx`, visible to all roles, alongside the existing unchanged "Leads" item.

## Verification (manual — no automated test runner exists in this repo)

1. `npx tsc --noEmit` after each task.
2. Visit `/dashboard/settings`, confirm the Leads threshold form shows the defaults (15/60/3/7), change a value, save, reload — confirm it persisted.
3. Visit `/dashboard/pipeline`, confirm all 6 columns render with existing leads correctly bucketed by stage.
4. Click a card, confirm the modal shows correct info, change its stage, save — confirm it moves to the new column.
5. Confirm the staleness dot logic against the configured thresholds (backdating a test lead's `updatedAt` in Firestore, or waiting past a short threshold, to see yellow/red actually appear).

# Lead Pipeline (Kanban) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 6-stage Kanban "Pipeline" dashboard page with a lead-detail modal (view info, change stage — no drag-and-drop), and a red/yellow/green staleness indicator whose time thresholds are configurable from a new Leads section on the dashboard Settings page.

**Architecture:** Extends the existing `Lead` model with a `stage` field. A separate, narrowly-scoped `LeadStageThresholds` config (stored directly on the `dealerships/{dealershipId}` document) drives a pure `getLeadStaleness` calculation. Two new Server Actions: `updateLeadStageAction` (dashboard-session-gated, any role) and `updateLeadStageThresholdsAction` (dashboard-session + `canAccessConfig`-gated, owner only).

**Tech Stack:** Next.js 16 App Router, TypeScript, zod, firebase-admin (Firestore), Server Actions, the already-installed shadcn `dialog` component.

## Global Constraints

- 6 hardcoded stages: `recibido, contactado, seguimiento, negociacion, ganado, perdido` — not admin-configurable this pass (only the staleness *thresholds* are).
- No drag-and-drop — stage changes happen only via the lead-detail modal's `<select>`.
- Staleness thresholds are two groups, not per-stage: `fastStage{Yellow,Red}Minutes` (applies to recibido/contactado/negociacion) and `followUp{Yellow,Red}Days` (applies to seguimiento). Ganado/Perdido never show a staleness indicator.
- `updateLeadStageAction` requires a signed-in dashboard session but no specific permission (any role can move any lead) — matches the existing Leads list page's lack of role restriction.
- `updateLeadStageThresholdsAction` requires a signed-in session **and** `can(session.role, "canAccessConfig")` — per the existing `permissions.ts`, only `owner` has this permission (not manager, not salesperson).
- No automated test runner exists in this repo — every task's verification is a manual, reproducible step.
- Out of scope (do not implement): notes, activity timeline, tasks, lead scoring, assignment/ownership, notifications, KPI dashboard, list-view filters/search/pagination/bulk actions, permissions rework, admin-configurable stage names/list.

---

### Task 1: Add `stage` to the Lead model

**Files:**
- Modify: `src/types/lead.ts`
- Modify: `src/lib/leads/leads.ts`

**Interfaces:**
- Produces: `LeadStage` type, `LEAD_STAGES` array, `LEAD_STAGE_LABELS` record, `leadStageSchema` (zod enum) — all exported from `@/types`. `Lead` gains `stage: LeadStage` and `updatedAt: string`. `updateLeadStage(dealershipId: string, leadId: string, stage: LeadStage): Promise<void>` — new export from `@/lib/leads/leads`, used by Task 3's Server Action.

- [ ] **Step 1: Update the types file**

Replace the full contents of `src/types/lead.ts` with:
```ts
import { z } from "zod";

export type LeadSource = "vehicle_inquiry" | "trade_in" | "general_inquiry";

export type LeadStage =
  | "recibido"
  | "contactado"
  | "seguimiento"
  | "negociacion"
  | "ganado"
  | "perdido";

export const LEAD_STAGES: LeadStage[] = [
  "recibido",
  "contactado",
  "seguimiento",
  "negociacion",
  "ganado",
  "perdido",
];

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  recibido: "Recibido",
  contactado: "Contactado",
  seguimiento: "Seguimiento",
  negociacion: "Negociación",
  ganado: "Ganado",
  perdido: "Perdido",
};

export const leadStageSchema = z.enum([
  "recibido",
  "contactado",
  "seguimiento",
  "negociacion",
  "ganado",
  "perdido",
]);

export interface Lead {
  id: string;
  dealershipId: string;
  source: LeadSource;
  name: string;
  contact: string;
  message: string;
  stage: LeadStage;
  createdAt: string;
  updatedAt: string;
}

export const leadSchema = z.object({
  source: z.enum(["vehicle_inquiry", "trade_in", "general_inquiry"]),
  name: z.string().min(1),
  contact: z.string().min(1),
  message: z.string().min(1),
});
```

- [ ] **Step 2: Update the Firestore access layer**

Replace the full contents of `src/lib/leads/leads.ts` with:
```ts
import "server-only";
import { adminFirestore } from "@/lib/firebase/admin";
import { leadSchema, leadStageSchema, type Lead, type LeadStage } from "@/types";
import type { z } from "zod";

export async function getLeads(dealershipId: string): Promise<Lead[]> {
  if (!adminFirestore) return [];

  const snapshot = await adminFirestore
    .collection("dealerships")
    .doc(dealershipId)
    .collection("leads")
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.flatMap((doc) => {
    const data = doc.data();
    const parsed = leadSchema.safeParse(data);
    if (!parsed.success) return [];

    const stageParsed = leadStageSchema.safeParse(data.stage);
    const stage: LeadStage = stageParsed.success ? stageParsed.data : "recibido";

    const createdAt: Date =
      typeof data.createdAt?.toDate === "function"
        ? data.createdAt.toDate()
        : new Date();
    const updatedAt: Date =
      typeof data.updatedAt?.toDate === "function"
        ? data.updatedAt.toDate()
        : createdAt;

    return [
      {
        id: doc.id,
        dealershipId,
        ...parsed.data,
        stage,
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
      },
    ];
  });
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

  await ref.set({
    ...input,
    id: ref.id,
    dealershipId,
    stage: "recibido",
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateLeadStage(
  dealershipId: string,
  leadId: string,
  stage: LeadStage
): Promise<void> {
  if (!adminFirestore) {
    throw new Error("Firestore is not configured.");
  }

  await adminFirestore
    .collection("dealerships")
    .doc(dealershipId)
    .collection("leads")
    .doc(leadId)
    .update({ stage, updatedAt: new Date() });
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: errors in files that construct/consume a `Lead`-shaped object without a `stage` field, if any exist outside these two files (there shouldn't be any — `Lead` objects are only ever constructed inside `leads.ts`, never as a literal elsewhere). Paste the actual raw output; if you see unexpected errors outside these two files, stop and report BLOCKED rather than guessing a fix.

- [ ] **Step 4: Verify against real Firestore with a throwaway script**

`scripts/manual-verify-lead-stage.ts`:
```ts
import { createLead, getLeads, updateLeadStage } from "../src/lib/leads/leads";

async function main() {
  const dealershipId = "manual-verify-dealership";
  await createLead(dealershipId, {
    source: "general_inquiry",
    name: "Stage Test",
    contact: "+1 555 0100",
    message: "Testing stage field.",
  });

  const [lead] = await getLeads(dealershipId);
  console.log("Created with stage:", lead.stage); // expect "recibido"

  await updateLeadStage(dealershipId, lead.id, "contactado");
  const [updated] = await getLeads(dealershipId);
  console.log("After update:", updated.stage, updated.updatedAt);

  // cleanup
  const { adminFirestore } = await import("../src/lib/firebase/admin");
  await adminFirestore!
    .collection("dealerships")
    .doc(dealershipId)
    .collection("leads")
    .doc(lead.id)
    .delete();
  console.log("cleaned up");
}

main();
```

- [ ] **Step 5: Run it**

Run: `npx tsx --conditions=react-server --env-file=.env.local scripts/manual-verify-lead-stage.ts`
Expected: `Created with stage: recibido`, then `After update: contactado <an ISO timestamp>`, then `cleaned up`.

- [ ] **Step 6: Delete the throwaway script**

```bash
rm scripts/manual-verify-lead-stage.ts
```

- [ ] **Step 7: Commit**

```bash
git add src/types/lead.ts src/lib/leads/leads.ts
git commit -m "feat: add stage field to Lead model"
```

---

### Task 2: Add configurable staleness thresholds

**Files:**
- Create: `src/types/lead-stage-thresholds.ts`
- Modify: `src/types/index.ts`
- Create: `src/lib/leads/lead-config.ts`

**Interfaces:**
- Produces: `LeadStageThresholds` interface, `DEFAULT_LEAD_STAGE_THRESHOLDS`, `leadStageThresholdsSchema` — exported from `@/types`. `getLeadStageThresholds(dealershipId: string): Promise<LeadStageThresholds>` and `updateLeadStageThresholds(dealershipId: string, input: LeadStageThresholds): Promise<void>` — exported from `@/lib/leads/lead-config`, used by Task 3's Server Action and Task 4/5's pages.

- [ ] **Step 1: Create the thresholds type**

`src/types/lead-stage-thresholds.ts`:
```ts
import { z } from "zod";

export interface LeadStageThresholds {
  fastStageYellowMinutes: number;
  fastStageRedMinutes: number;
  followUpYellowDays: number;
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

- [ ] **Step 2: Re-export it from the types barrel**

Modify `src/types/index.ts` — add one line (alphabetical order):
```ts
export * from "./auth";
export * from "./dealership";
export * from "./firestore";
export * from "./lead";
export * from "./lead-stage-thresholds";
export * from "./user";
export * from "./vehicle";
```

- [ ] **Step 3: Create the Firestore access layer**

`src/lib/leads/lead-config.ts`:
```ts
import "server-only";
import { adminFirestore } from "@/lib/firebase/admin";
import {
  leadStageThresholdsSchema,
  DEFAULT_LEAD_STAGE_THRESHOLDS,
  type LeadStageThresholds,
} from "@/types";

export async function getLeadStageThresholds(
  dealershipId: string
): Promise<LeadStageThresholds> {
  if (!adminFirestore) return DEFAULT_LEAD_STAGE_THRESHOLDS;

  const doc = await adminFirestore.collection("dealerships").doc(dealershipId).get();
  const parsed = leadStageThresholdsSchema.safeParse(doc.data()?.leadStageThresholds);
  return parsed.success ? parsed.data : DEFAULT_LEAD_STAGE_THRESHOLDS;
}

export async function updateLeadStageThresholds(
  dealershipId: string,
  input: LeadStageThresholds
): Promise<void> {
  if (!adminFirestore) {
    throw new Error("Firestore is not configured.");
  }

  await adminFirestore
    .collection("dealerships")
    .doc(dealershipId)
    .set({ leadStageThresholds: input }, { merge: true });
}
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Verify against real Firestore with a throwaway script**

`scripts/manual-verify-thresholds.ts`:
```ts
import { getLeadStageThresholds, updateLeadStageThresholds } from "../src/lib/leads/lead-config";

async function main() {
  const dealershipId = "manual-verify-dealership";

  const before = await getLeadStageThresholds(dealershipId);
  console.log("Before (should be defaults):", before);

  await updateLeadStageThresholds(dealershipId, {
    fastStageYellowMinutes: 10,
    fastStageRedMinutes: 30,
    followUpYellowDays: 2,
    followUpRedDays: 5,
  });

  const after = await getLeadStageThresholds(dealershipId);
  console.log("After update:", after);

  // cleanup: remove the field so this dealership doc goes back to not existing meaningfully
  const { adminFirestore } = await import("../src/lib/firebase/admin");
  await adminFirestore!
    .collection("dealerships")
    .doc(dealershipId)
    .set({ leadStageThresholds: null }, { merge: true });
  console.log("cleaned up");
}

main();
```

- [ ] **Step 6: Run it**

Run: `npx tsx --conditions=react-server --env-file=.env.local scripts/manual-verify-thresholds.ts`
Expected: "Before" prints the default values (15/60/3/7), "After update" prints the custom values (10/30/2/5).

- [ ] **Step 7: Delete the throwaway script**

```bash
rm scripts/manual-verify-thresholds.ts
```

- [ ] **Step 8: Commit**

```bash
git add src/types/lead-stage-thresholds.ts src/types/index.ts src/lib/leads/lead-config.ts
git commit -m "feat: add configurable lead stage staleness thresholds"
```

---

### Task 3: Staleness calculation + Server Actions

**Files:**
- Create: `src/lib/leads/staleness.ts`
- Modify: `src/app/actions/leads.ts`
- Create: `src/app/actions/lead-config.ts`

**Interfaces:**
- Consumes: `LeadStage`, `LeadStageThresholds` from `@/types` (Tasks 1-2); `updateLeadStage` from `@/lib/leads/leads` (Task 1); `updateLeadStageThresholds` from `@/lib/leads/lead-config` (Task 2); `verifySession` from `@/lib/auth/dal`; `can` from `@/lib/auth/permissions`.
- Produces: `getLeadStaleness(stage, updatedAt, thresholds): "green"|"yellow"|"red"|null` from `@/lib/leads/staleness` — used by Task 5. `updateLeadStageAction(leadId, stage)` added to `@/app/actions/leads` — used by Task 5. `updateLeadStageThresholdsAction(input)` from `@/app/actions/lead-config` — used by Task 4.

- [ ] **Step 1: Create the staleness helper**

`src/lib/leads/staleness.ts`:
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

- [ ] **Step 2: Add `updateLeadStageAction` to the existing leads actions file**

Replace the full contents of `src/app/actions/leads.ts` with:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { createLead, updateLeadStage } from "@/lib/leads/leads";
import { leadSchema, leadStageSchema } from "@/types";

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

export async function updateLeadStageAction(
  leadId: string,
  stage: string
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await verifySession();
  if (!session) {
    return { success: false, error: "Not signed in." };
  }

  const parsed = leadStageSchema.safeParse(stage);
  if (!parsed.success) {
    return { success: false, error: "Invalid stage." };
  }

  await updateLeadStage(session.dealershipId, leadId, parsed.data);
  revalidatePath("/dashboard/pipeline");
  return { success: true };
}
```

Note: `createLeadAction` is unchanged — only the new `updateLeadStageAction` and the `updateLeadStage`/`leadStageSchema` imports are added.

- [ ] **Step 3: Create the thresholds Server Action**

`src/app/actions/lead-config.ts`:
```ts
"use server";

import { verifySession } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { updateLeadStageThresholds } from "@/lib/leads/lead-config";
import { leadStageThresholdsSchema } from "@/types";

export async function updateLeadStageThresholdsAction(input: {
  fastStageYellowMinutes: number;
  fastStageRedMinutes: number;
  followUpYellowDays: number;
  followUpRedDays: number;
}): Promise<{ success: true } | { success: false; error: string }> {
  const session = await verifySession();
  if (!session) {
    return { success: false, error: "Not signed in." };
  }
  if (!can(session.role, "canAccessConfig")) {
    return { success: false, error: "You don't have permission to change settings." };
  }

  const parsed = leadStageThresholdsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Please check the values and try again." };
  }

  await updateLeadStageThresholds(session.dealershipId, parsed.data);
  return { success: true };
}
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/leads/staleness.ts "src/app/actions/leads.ts" "src/app/actions/lead-config.ts"
git commit -m "feat: add staleness calculation and stage/threshold Server Actions"
```

---

### Task 4: Settings page (Leads thresholds form) + sidebar nav

**Files:**
- Modify: `src/app/(dashboard)/dashboard/settings/page.tsx`
- Create: `src/app/(dashboard)/dashboard/settings/lead-thresholds-form.tsx`
- Modify: `src/components/dashboard/sidebar.tsx`

**Interfaces:**
- Consumes: `getLeadStageThresholds` from `@/lib/leads/lead-config` (Task 2); `updateLeadStageThresholdsAction` from `@/app/actions/lead-config` (Task 3).

- [ ] **Step 1: Replace the Settings placeholder**

`src/app/(dashboard)/dashboard/settings/page.tsx`:
```tsx
import { verifySession } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { Forbidden } from "@/components/dashboard/coming-soon";
import { getLeadStageThresholds } from "@/lib/leads/lead-config";
import { LeadThresholdsForm } from "./lead-thresholds-form";

export default async function SettingsPage() {
  const session = await verifySession();
  if (!session || !can(session.role, "canAccessConfig")) {
    return <Forbidden />;
  }

  const thresholds = await getLeadStageThresholds(session.dealershipId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Leads</h2>
        <LeadThresholdsForm initial={thresholds} />
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Create the thresholds form**

`src/app/(dashboard)/dashboard/settings/lead-thresholds-form.tsx`:
```tsx
"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateLeadStageThresholdsAction } from "@/app/actions/lead-config";
import type { LeadStageThresholds } from "@/types";

export function LeadThresholdsForm({ initial }: { initial: LeadStageThresholds }) {
  const [values, setValues] = useState<LeadStageThresholds>(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleChange(field: keyof LeadStageThresholds) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: Number(event.target.value) }));
      setSaved(false);
    };
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);

    try {
      const result = await updateLeadStageThresholdsAction(values);
      if (result.success) {
        setSaved(true);
      } else {
        setError(result.error);
      }
    } catch {
      setError("Algo salió mal. Por favor intentá de nuevo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="lt-fast-yellow">
          Recibido/Contactado/Negociación — amarillo después de (minutos)
        </Label>
        <Input
          id="lt-fast-yellow"
          type="number"
          value={values.fastStageYellowMinutes}
          onChange={handleChange("fastStageYellowMinutes")}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="lt-fast-red">
          Recibido/Contactado/Negociación — rojo después de (minutos)
        </Label>
        <Input
          id="lt-fast-red"
          type="number"
          value={values.fastStageRedMinutes}
          onChange={handleChange("fastStageRedMinutes")}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="lt-followup-yellow">
          Seguimiento — amarillo después de (días)
        </Label>
        <Input
          id="lt-followup-yellow"
          type="number"
          value={values.followUpYellowDays}
          onChange={handleChange("followUpYellowDays")}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="lt-followup-red">
          Seguimiento — rojo después de (días)
        </Label>
        <Input
          id="lt-followup-red"
          type="number"
          value={values.followUpRedDays}
          onChange={handleChange("followUpRedDays")}
          required
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-600">Guardado.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Add "Pipeline" to the sidebar nav**

Modify `src/components/dashboard/sidebar.tsx` — add `Kanban` to the lucide-react import:
```ts
import {
  LayoutDashboard,
  Car,
  Users,
  BarChart3,
  UserCog,
  Settings,
  LogOut,
  Menu,
  Kanban,
} from "lucide-react";
```
Add one entry to `NAV_ITEMS`, right after the "Leads" entry:
```ts
  { href: "/dashboard/leads", label: "Leads", icon: Users, visible: () => true },
  { href: "/dashboard/pipeline", label: "Pipeline", icon: Kanban, visible: () => true },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3, visible: () => true },
```
(Only these two changes to this file — the import list and one new array entry.)

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/dashboard/settings/page.tsx" "src/app/(dashboard)/dashboard/settings/lead-thresholds-form.tsx" src/components/dashboard/sidebar.tsx
git commit -m "feat: build Leads thresholds settings form, add Pipeline to sidebar nav"
```

---

### Task 5: Pipeline Kanban page + lead detail modal + full E2E verification

**Files:**
- Create: `src/app/(dashboard)/dashboard/pipeline/page.tsx`
- Create: `src/app/(dashboard)/dashboard/pipeline/pipeline-board.tsx`
- Create: `src/app/(dashboard)/dashboard/pipeline/lead-detail-modal.tsx`

**Interfaces:**
- Consumes: `getLeads` from `@/lib/leads/leads`; `getLeadStageThresholds` from `@/lib/leads/lead-config`; `getLeadStaleness` from `@/lib/leads/staleness`; `updateLeadStageAction` from `@/app/actions/leads`; `LEAD_STAGES`, `LEAD_STAGE_LABELS`, `Lead`, `LeadSource`, `LeadStageThresholds` from `@/types`; `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle` from `@/components/ui/dialog`.

- [ ] **Step 1: Create the page**

`src/app/(dashboard)/dashboard/pipeline/page.tsx`:
```tsx
import { verifySession } from "@/lib/auth/dal";
import { getLeads } from "@/lib/leads/leads";
import { getLeadStageThresholds } from "@/lib/leads/lead-config";
import { PipelineBoard } from "./pipeline-board";

export default async function PipelinePage() {
  const session = await verifySession();
  if (!session) return null;

  const [leads, thresholds] = await Promise.all([
    getLeads(session.dealershipId),
    getLeadStageThresholds(session.dealershipId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Pipeline</h1>
      <PipelineBoard leads={leads} thresholds={thresholds} />
    </div>
  );
}
```

- [ ] **Step 2: Create the board**

`src/app/(dashboard)/dashboard/pipeline/pipeline-board.tsx`:
```tsx
"use client";

import { useState } from "react";
import { LEAD_STAGES, LEAD_STAGE_LABELS } from "@/types";
import type { Lead, LeadStageThresholds } from "@/types";
import { getLeadStaleness } from "@/lib/leads/staleness";
import { LeadDetailModal } from "./lead-detail-modal";

const STALENESS_COLORS: Record<string, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
};

export function PipelineBoard({
  leads,
  thresholds,
}: {
  leads: Lead[];
  thresholds: LeadStageThresholds;
}) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {LEAD_STAGES.map((stage) => {
          const stageLeads = leads.filter((lead) => lead.stage === stage);
          return (
            <div key={stage} className="flex w-64 shrink-0 flex-col gap-3">
              <h2 className="text-sm font-semibold text-muted-foreground">
                {LEAD_STAGE_LABELS[stage]} ({stageLeads.length})
              </h2>
              <div className="flex flex-col gap-2">
                {stageLeads.map((lead) => {
                  const staleness = getLeadStaleness(lead.stage, lead.updatedAt, thresholds);
                  return (
                    <button
                      key={lead.id}
                      type="button"
                      onClick={() => setSelectedLead(lead)}
                      className="flex flex-col gap-1 rounded-md border p-3 text-left text-sm hover:bg-accent"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{lead.name}</span>
                        {staleness && (
                          <span
                            className={`size-2 shrink-0 rounded-full ${STALENESS_COLORS[staleness]}`}
                          />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {lead.message}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 3: Create the detail modal**

`src/app/(dashboard)/dashboard/pipeline/lead-detail-modal.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updateLeadStageAction } from "@/app/actions/leads";
import { LEAD_STAGES, LEAD_STAGE_LABELS } from "@/types";
import type { Lead, LeadSource, LeadStage } from "@/types";

const SOURCE_LABELS: Record<LeadSource, string> = {
  vehicle_inquiry: "Interés en vehículo",
  trade_in: "Canje",
  general_inquiry: "Consulta general",
};

export function LeadDetailModal({
  lead,
  onClose,
}: {
  lead: Lead;
  onClose: () => void;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<LeadStage>(lead.stage);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setPending(true);
    setError(null);
    try {
      const result = await updateLeadStageAction(lead.id, stage);
      if (result.success) {
        router.refresh();
        onClose();
      } else {
        setError(result.error);
      }
    } catch {
      setError("Algo salió mal. Por favor intentá de nuevo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{lead.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Contacto</p>
            <p>{lead.contact}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Origen</p>
            <p>{SOURCE_LABELS[lead.source]}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Mensaje</p>
            <p>{lead.message}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Creado</p>
            <p>{new Date(lead.createdAt).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Última actualización</p>
            <p>{new Date(lead.updatedAt).toLocaleString()}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ld-stage">Etapa</Label>
            <select
              id="ld-stage"
              value={stage}
              onChange={(event) => setStage(event.target.value as LeadStage)}
              className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
            >
              {LEAD_STAGES.map((s) => (
                <option key={s} value={s}>
                  {LEAD_STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={handleSave} disabled={pending}>
            {pending ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

Note: this `Dialog` is used without a `DialogTrigger` — it opens purely from `PipelineBoard`'s `selectedLead` state (conditionally rendered), not from a trigger button of its own. Before writing this file, Read the actual installed `src/components/ui/dialog.tsx` to confirm `Dialog`'s `open`/`onOpenChange` props work standalone without a `DialogTrigger` present (this exact controlled-`open` pattern is already used in `add-vehicle-modal.tsx`, but that file also renders a `DialogTrigger` — confirm the `Trigger` is genuinely optional in the underlying Base UI primitive before assuming this works identically without one).

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/dashboard/pipeline/page.tsx" "src/app/(dashboard)/dashboard/pipeline/pipeline-board.tsx" "src/app/(dashboard)/dashboard/pipeline/lead-detail-modal.tsx"
git commit -m "feat: build Pipeline Kanban board and lead detail modal"
```

- [ ] **Step 6: Full end-to-end verification (requires a real browser + the real seeded owner account — controller/human step, not a subagent)**

1. Sign in as the seeded owner, visit `/dashboard/settings` — confirm the Leads thresholds form shows the defaults (15/60/3/7). Change a value, save, reload the page — confirm the change persisted.
2. Visit `/dashboard/pipeline` — confirm all 6 columns render (Recibido, Contactado, Seguimiento, Negociación, Ganado, Perdido), with any existing leads bucketed correctly (everything captured via the public forms so far should show up under "Recibido").
3. Click a lead card — confirm the modal shows all its fields correctly (name, contact, source label, message, created/updated timestamps).
4. Change the stage in the modal's dropdown and save — confirm the modal closes and the lead now appears in the new column, no longer in the old one.
5. Confirm the staleness dot: a freshly-created or freshly-updated lead in Recibido/Contactado/Negociación should show green; after waiting past the configured "amarillo" (yellow) minutes threshold (or lowering the threshold via Settings to something very short, like 1 minute, to test faster), the dot should turn yellow, then red past the "rojo" threshold. Confirm Ganado/Perdido cards show no dot at all.

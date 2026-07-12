# Brand Logos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make brands a real, Firestore-backed, dealership-configurable entity (name + single logo image, added one at a time from a new "Marcas" section on the dashboard Settings page), replacing the homepage Brand Scroller's hardcoded monogram-badge list with real uploaded logos.

**Architecture:** Mirrors the Inventory feature's reserve-then-write pattern (a brand id must exist before its logo can be uploaded to a path keyed by that id). A new Server Action (`createBrandAction`, owner-only via `canAccessConfig`) orchestrates reserve → upload → write, same shape as `createVehicleAction`.

**Tech Stack:** Next.js 16 App Router, TypeScript, zod, firebase-admin (Firestore + Storage), Server Actions.

## Global Constraints

- Firestore path: `dealerships/{dealershipId}/brands/{brandId}` — a subcollection.
- Exactly one logo image per brand (not an array).
- `createBrandAction` requires a signed-in session **and** `can(session.role, "canAccessConfig")` — owner-only, matching the rest of the Settings page.
- No automated test runner exists in this repo — every task's verification is a manual, reproducible step.
- Out of scope (do not implement): editing/deleting brands, reordering, multiple logos per brand, a multi-row "add several at once" form.

---

### Task 1: Add `Brand` type + `brandSchema`

**Files:**
- Create: `src/types/brand.ts`
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces: `Brand` interface, `brandSchema` zod object — exported from `@/types`, consumed by every later task.

- [ ] **Step 1: Create the schema file**

`src/types/brand.ts`:
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

- [ ] **Step 2: Re-export it from the types barrel**

Modify `src/types/index.ts` — add one line (alphabetical order, before `auth`):
```ts
export * from "./auth";
export * from "./brand";
export * from "./dealership";
export * from "./firestore";
export * from "./lead";
export * from "./lead-stage-thresholds";
export * from "./user";
export * from "./vehicle";
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/brand.ts src/types/index.ts
git commit -m "feat: add Brand type and schema"
```

---

### Task 2: Add Firestore access layer for brands

**Files:**
- Create: `src/lib/brands/brands.ts`

**Interfaces:**
- Consumes: `adminFirestore` from `@/lib/firebase/admin`; `brandSchema`, `type Brand` from `@/types` (Task 1).
- Produces: `getBrands(dealershipId: string): Promise<Brand[]>`, `reserveBrandId(dealershipId: string): string`, `createBrand(dealershipId: string, brandId: string, input: { name: string; logoUrl: string }): Promise<void>` — used by Task 3's Server Action and Task 5's homepage.

- [ ] **Step 1: Create the module**

`src/lib/brands/brands.ts`:
```ts
import "server-only";
import { adminFirestore } from "@/lib/firebase/admin";
import { brandSchema, type Brand } from "@/types";

export async function getBrands(dealershipId: string): Promise<Brand[]> {
  if (!adminFirestore) return [];

  const snapshot = await adminFirestore
    .collection("dealerships")
    .doc(dealershipId)
    .collection("brands")
    .orderBy("createdAt", "asc")
    .get();

  return snapshot.docs.flatMap((doc) => {
    const data = doc.data();
    const parsed = brandSchema.safeParse(data);
    if (!parsed.success) return [];
    if (typeof data.logoUrl !== "string") return [];

    return [
      {
        id: doc.id,
        dealershipId,
        ...parsed.data,
        logoUrl: data.logoUrl,
      },
    ];
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
  input: { name: string; logoUrl: string }
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
    .set({
      ...input,
      id: brandId,
      dealershipId,
      createdAt: now,
      updatedAt: now,
    });
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Verify against real Firestore with a throwaway script**

`scripts/manual-verify-brands.ts`:
```ts
import { createBrand, getBrands, reserveBrandId } from "../src/lib/brands/brands";

async function main() {
  const dealershipId = "manual-verify-dealership";
  const brandId = reserveBrandId(dealershipId);

  await createBrand(dealershipId, brandId, {
    name: "Test Brand",
    logoUrl: "https://example.com/logo.png",
  });

  const brands = await getBrands(dealershipId);
  console.log(JSON.stringify(brands, null, 2));

  // cleanup
  const { adminFirestore } = await import("../src/lib/firebase/admin");
  await adminFirestore!
    .collection("dealerships")
    .doc(dealershipId)
    .collection("brands")
    .doc(brandId)
    .delete();
  console.log("cleaned up");
}

main();
```

- [ ] **Step 4: Run it**

Run: `npx tsx --conditions=react-server --env-file=.env.local scripts/manual-verify-brands.ts`
Expected: prints an array with one brand matching the input (name, logoUrl, id, dealershipId), then `cleaned up`.

- [ ] **Step 5: Delete the throwaway script**

```bash
rm scripts/manual-verify-brands.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/brands/brands.ts
git commit -m "feat: add Firestore access layer for brands"
```

---

### Task 3: Logo upload module + Server Action

**Files:**
- Create: `src/lib/brands/upload-logo.ts`
- Create: `src/app/actions/brands.ts`

**Interfaces:**
- Consumes: `adminStorage` from `@/lib/firebase/admin`; `reserveBrandId`, `createBrand` from `@/lib/brands/brands` (Task 2); `brandSchema` from `@/types` (Task 1); `verifySession` from `@/lib/auth/dal`; `can` from `@/lib/auth/permissions`.
- Produces: `uploadBrandLogo(dealershipId, brandId, file): Promise<string>` from `@/lib/brands/upload-logo`. `createBrandAction(formData): Promise<{success:true}|{success:false,error:string}>` from `@/app/actions/brands` — used by Task 4's form.

- [ ] **Step 1: Create the upload module**

`src/lib/brands/upload-logo.ts`:
```ts
import "server-only";
import { adminStorage } from "@/lib/firebase/admin";

export async function uploadBrandLogo(
  dealershipId: string,
  brandId: string,
  file: File
): Promise<string> {
  if (!adminStorage) {
    throw new Error("Firebase Storage is not configured.");
  }

  const bucket = adminStorage.bucket();
  const path = `dealerships/${dealershipId}/brands/${brandId}/logo-${file.name}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const storageFile = bucket.file(path);
  await storageFile.save(buffer, { contentType: file.type });
  await storageFile.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${path}`;
}
```

- [ ] **Step 2: Create the Server Action**

`src/app/actions/brands.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { reserveBrandId, createBrand } from "@/lib/brands/brands";
import { uploadBrandLogo } from "@/lib/brands/upload-logo";
import { brandSchema } from "@/types";

export async function createBrandAction(
  formData: FormData
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await verifySession();
  if (!session) {
    return { success: false, error: "Not signed in." };
  }
  if (!can(session.role, "canAccessConfig")) {
    return { success: false, error: "You don't have permission to manage brands." };
  }

  const logo = formData.get("logo");
  if (!(logo instanceof File) || logo.size === 0) {
    return { success: false, error: "A logo image is required." };
  }

  const parsed = brandSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { success: false, error: "Please enter a brand name." };
  }

  const brandId = reserveBrandId(session.dealershipId);
  const logoUrl = await uploadBrandLogo(session.dealershipId, brandId, logo);
  await createBrand(session.dealershipId, brandId, {
    name: parsed.data.name,
    logoUrl,
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Verify the upload module against real Firebase Storage with a throwaway script**

`scripts/manual-verify-logo-upload.ts`:
```ts
import { uploadBrandLogo } from "../src/lib/brands/upload-logo";

async function main() {
  const pngBytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64"
  );
  const file = new File([pngBytes], "test-logo.png", { type: "image/png" });

  const url = await uploadBrandLogo("manual-verify-dealership", "manual-verify-brand", file);
  console.log("Uploaded:", url);
}

main();
```

- [ ] **Step 5: Run it, then verify the URL is publicly readable**

Run: `npx tsx --conditions=react-server --env-file=.env.local scripts/manual-verify-logo-upload.ts`
Expected: prints a URL like `https://storage.googleapis.com/{bucket}/dealerships/manual-verify-dealership/brands/manual-verify-brand/logo-test-logo.png`.

Then: `curl -s -o /dev/null -w "%{http_code} %{content_type}\n" "<the-printed-url>"`
Expected: `200 image/png`.

- [ ] **Step 6: Clean up the test object and the throwaway script**

Delete the uploaded object from the Firebase Storage console (path `dealerships/manual-verify-dealership/brands/manual-verify-brand/logo-test-logo.png`), then:

```bash
rm scripts/manual-verify-logo-upload.ts
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/brands/upload-logo.ts "src/app/actions/brands.ts"
git commit -m "feat: add brand logo upload module and createBrandAction"
```

---

### Task 4: Settings page "Marcas" section

**Files:**
- Modify: `src/app/(dashboard)/dashboard/settings/page.tsx`
- Create: `src/app/(dashboard)/dashboard/settings/add-brand-form.tsx`

**Interfaces:**
- Consumes: `getBrands` from `@/lib/brands/brands` (Task 2); `createBrandAction` from `@/app/actions/brands` (Task 3).

- [ ] **Step 1: Update the Settings page**

Replace the full contents of `src/app/(dashboard)/dashboard/settings/page.tsx`:
```tsx
import Image from "next/image";
import { verifySession } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { Forbidden } from "@/components/dashboard/coming-soon";
import { getLeadStageThresholds } from "@/lib/leads/lead-config";
import { getBrands } from "@/lib/brands/brands";
import { LeadThresholdsForm } from "./lead-thresholds-form";
import { AddBrandForm } from "./add-brand-form";

export default async function SettingsPage() {
  const session = await verifySession();
  if (!session || !can(session.role, "canAccessConfig")) {
    return <Forbidden />;
  }

  const [thresholds, brands] = await Promise.all([
    getLeadStageThresholds(session.dealershipId),
    getBrands(session.dealershipId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Leads</h2>
        <LeadThresholdsForm initial={thresholds} />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Marcas</h2>
        {brands.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay marcas todavía.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {brands.map((brand) => (
              <li key={brand.id} className="flex items-center gap-3">
                <div className="relative size-10 shrink-0">
                  <Image
                    src={brand.logoUrl}
                    alt={brand.name}
                    fill
                    className="rounded-md object-contain"
                  />
                </div>
                <span className="text-sm">{brand.name}</span>
              </li>
            ))}
          </ul>
        )}
        <AddBrandForm />
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Create the add-brand form**

`src/app/(dashboard)/dashboard/settings/add-brand-form.tsx`:
```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrandAction } from "@/app/actions/brands";

export function AddBrandForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const result = await createBrandAction(formData);
      if (result.success) {
        form.reset();
        router.refresh();
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
        <Label htmlFor="brand-name">Nombre de la marca</Label>
        <Input id="brand-name" name="name" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="brand-logo">Logo</Label>
        <input
          id="brand-logo"
          name="logo"
          type="file"
          accept="image/*"
          required
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Agregando..." : "+ Agregar Marca"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/dashboard/settings/page.tsx" "src/app/(dashboard)/dashboard/settings/add-brand-form.tsx"
git commit -m "feat: add Marcas section to Settings page"
```

---

### Task 5: Homepage wiring + full E2E verification

**Files:**
- Modify: `src/app/(site)/page.tsx`
- Modify: `src/components/site/homepage/brand-scroller.tsx`

**Interfaces:**
- Consumes: `getBrands` from `@/lib/brands/brands` (Task 2); `type Brand` from `@/types` (Task 1).

- [ ] **Step 1: Fetch brands on the homepage**

Modify `src/app/(site)/page.tsx` — add the import:
```ts
import { getBrands } from "@/lib/brands/brands";
```
Add this line alongside the existing `const vehicles = await getVehicles(dealership.id);`:
```ts
const brands = await getBrands(dealership.id);
```
Change the `<BrandScroller />` call site to:
```tsx
<BrandScroller brands={brands} />
```

- [ ] **Step 2: Rewrite the Brand Scroller**

Replace the full contents of `src/components/site/homepage/brand-scroller.tsx`:
```tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Section } from "./section";
import type { Brand } from "@/types";

export function BrandScroller({ brands }: { brands: Brand[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    const node = scrollerRef.current;
    if (!node) return;
    const amount = node.clientWidth * 0.8;
    node.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  if (brands.length === 0) return null;

  return (
    <Section tone="light">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-heading text-2xl tracking-tight">
          Comprá por Marca
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => scroll("left")}
            aria-label="Marcas anteriores"
            className="flex size-9 items-center justify-center rounded-full border border-[#0d0d0d]/10 text-[#0d0d0d] transition-colors hover:bg-[var(--ultima-surface-container)]"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            aria-label="Siguientes marcas"
            className="flex size-9 items-center justify-center rounded-full border border-[#0d0d0d]/10 text-[#0d0d0d] transition-colors hover:bg-[var(--ultima-surface-container)]"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div
        ref={scrollerRef}
        className="scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto"
      >
        {brands.map((brand) => (
          <Link
            key={brand.id}
            href={`/inventory?make=${encodeURIComponent(brand.name)}`}
            className="group flex h-40 w-48 shrink-0 snap-start flex-col items-center justify-center gap-3 bg-white p-4 text-center transition-colors hover:bg-[var(--ultima-surface-container)]"
          >
            <div className="relative size-14">
              <Image
                src={brand.logoUrl}
                alt={brand.name}
                fill
                className="object-contain"
              />
            </div>
            <span className="font-heading text-sm tracking-wide text-[#0d0d0d]">
              {brand.name}
            </span>
          </Link>
        ))}
      </div>
    </Section>
  );
}
```

Note: this removes the `ArrowUpRight`/monogram-badge code path entirely — there is no fallback rendering for a brand without a logo, since `logoUrl` is always set by the time a brand exists (the Server Action uploads the logo before creating the Firestore doc).

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(site)/page.tsx" src/components/site/homepage/brand-scroller.tsx
git commit -m "feat: wire Brand Scroller to real Firestore brands"
```

- [ ] **Step 5: Full end-to-end verification (requires a real browser + the real seeded owner account — controller/human step, not a subagent)**

1. Visit the homepage first, before adding any brands — confirm the "Comprá por Marca" section doesn't render at all (assuming no brands exist yet in `ultima-cars`).
2. Sign in as the seeded owner, visit `/dashboard/settings`, scroll to "Marcas" — confirm it shows "No hay marcas todavía."
3. Fill in the Add Brand form (a name + a real image file), submit — confirm it appears in the list immediately (no manual page reload) with its logo thumbnail.
4. Visit the homepage — confirm the "Comprá por Marca" section now renders with the new brand's real logo image (not a monogram).
5. Add a second brand — confirm both appear in Settings and both appear in the homepage scroller.

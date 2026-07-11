# Ultima Design System Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the existing Ultima.cars homepage and global site navigation to the authoritative `design.md` token export — corrected colors, a two-tier radius system (sharp containers, pill interactive elements), Inter body copy, rebuilt Vehicle/Category cards, glassmorphic navigation, and lowercase headings.

**Architecture:** Extend the existing per-tenant `DealershipConfig`/CSS-variable injection pattern with one new token (`radiusInteractive`); add a small set of Ultima-specific CSS custom properties for values that aren't generic per-tenant knobs; restyle the shared `Button`/`Input` primitives (global, affects every consumer) and rebuild 4 components whose visual structure changes materially (`VehicleCard`, `CategoriesScroller`, `Header`, `Testimonials`).

**Tech Stack:** Next.js 16 App Router, Tailwind v4 CSS-variable theming, shadcn/ui on Base UI (`render` prop, not `asChild`), `next/font/google`, zod.

## Global Constraints

- No test runner is configured in this repo. Every task's verification step is `npx tsc --noEmit` plus, where noted, a manual dev-server/curl check — matches every prior pass in this codebase.
- This codebase's shadcn/ui is Base UI-based (`@base-ui/react`), not Radix. Any composed trigger/button-as-link must use `render={<Element .../>}`, never `asChild`.
- Ultima brand values (exact, from `design.md`): Primary `#0d0d0d`, Secondary `#D8D6D3`, Tertiary accent `#A6A3A0`, sharp container radius `0px`, pill interactive radius `9999px`, input radius `8px`, input border `#D8D6D3`.
- No real images anywhere (vehicles, testimonials) — placeholders stay placeholders.
- No new pages, no new routes, no changes to form validation/submission behavior (only visual styling changes where forms are touched).
- `ArrowUpRight` confirmed exported from `lucide-react`; `Inter` confirmed exported from `next/font/google` (`node_modules/next/dist/compiled/@next/font/dist/google/index.d.ts:6888`, weight optional/variable).

---

### Task 1: Add `radiusInteractive` to the dealership schema and Ultima's config

**Files:**
- Modify: `src/types/dealership.ts`
- Modify: `src/lib/dealership/mock-data.ts`

**Interfaces:**
- Consumes: existing `dealershipConfigSchema`, existing `ULTIMA_DEALERSHIP_CONFIG`.
- Produces: `DealershipConfig.radiusInteractive: string` (new field, defaults to `"9999px"` when omitted from raw data — same default the pill look uses everywhere, including for tenants/pages that don't set it explicitly).

- [ ] **Step 1: Add the field to the schema**

In `src/types/dealership.ts`, find:

```ts
  secondaryColor: z.string(),
  radius: z.string().default("0.625rem"),
  phone: z.string(),
```

Replace with:

```ts
  secondaryColor: z.string(),
  radius: z.string().default("0.625rem"),
  radiusInteractive: z.string().default("9999px"),
  phone: z.string(),
```

- [ ] **Step 2: Set Ultima's values**

In `src/lib/dealership/mock-data.ts`, find:

```ts
  secondaryColor: "#f9f9f9",
  radius: "0px",
```

Replace with:

```ts
  secondaryColor: "#D8D6D3",
  radius: "0px",
  radiusInteractive: "9999px",
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/dealership.ts src/lib/dealership/mock-data.ts
git commit -m "feat: add radiusInteractive token and correct Ultima secondary color"
```

---

### Task 2: Wire radius-interactive, Ultima accent tokens, and Inter body font

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `DealershipConfig.radiusInteractive` (Task 1).
- Produces: `--brand-radius-interactive` / `--radius-interactive` CSS variables (consumed by Task 3), `--ultima-tertiary` (consumed by Task 8) / `--ultima-surface-container` (consumed by Task 6) CSS variables, Inter as the body font.

- [ ] **Step 1: Swap the Geist Sans loader for Inter and inject the new radius token**

In `src/app/layout.tsx`, find:

```ts
import { Geist, Geist_Mono, Archivo_Black } from "next/font/google";
```

Replace with:

```ts
import { Inter, Geist_Mono, Archivo_Black } from "next/font/google";
```

Find:

```ts
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
```

Replace with:

```ts
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});
```

Find every remaining reference to `geistSans` in the file:

```tsx
      className={`${geistSans.variable} ${geistMono.variable} ${archivoBlack.variable} h-full antialiased`}
      style={
        {
          "--brand-primary": dealership.primaryColor,
          "--brand-secondary": dealership.secondaryColor,
          "--brand-radius": dealership.radius,
        } as React.CSSProperties
      }
    >
```

Replace with:

```tsx
      className={`${inter.variable} ${geistMono.variable} ${archivoBlack.variable} h-full antialiased`}
      style={
        {
          "--brand-primary": dealership.primaryColor,
          "--brand-secondary": dealership.secondaryColor,
          "--brand-radius": dealership.radius,
          "--brand-radius-interactive": dealership.radiusInteractive,
        } as React.CSSProperties
      }
    >
```

- [ ] **Step 2: Fix the `lang` attribute to match the now-Spanish site content**

In the same file, find `lang="en"` on the `<html>` element (in the block just edited above) and change it to `lang="es"`. This is a small, directly-adjacent correctness fix — the site's public copy was translated to Spanish in a prior pass, and `lang="en"` is now incorrect for accessibility/SEO.

- [ ] **Step 3: Point `--font-sans` at Inter**

In `src/app/globals.css`, find (inside the `@theme inline` block):

```css
  --font-sans: var(--font-geist-sans);
```

Replace with:

```css
  --font-sans: var(--font-inter);
```

- [ ] **Step 4: Add the new CSS custom properties**

In `src/app/globals.css`, find:

```css
  --brand-primary: oklch(0.205 0 0);
  --brand-secondary: oklch(0.97 0 0);
  --brand-radius: 0.625rem;

  --primary: var(--brand-primary);
```

Replace with:

```css
  --brand-primary: oklch(0.205 0 0);
  --brand-secondary: oklch(0.97 0 0);
  --brand-radius: 0.625rem;
  --brand-radius-interactive: 9999px;

  /*
   * Ultima-specific accent tokens. These are this design's implementation
   * detail (not generic per-tenant knobs like --brand-primary), so they're
   * plain CSS custom properties rather than DealershipConfig fields.
   */
  --ultima-tertiary: #a6a3a0;
  --ultima-surface-container: #eeeeee;

  --primary: var(--brand-primary);
```

Find:

```css
  --radius: var(--brand-radius);
  --sidebar: oklch(0.985 0 0);
```

Replace with:

```css
  --radius: var(--brand-radius);
  --radius-interactive: var(--brand-radius-interactive);
  --sidebar: oklch(0.985 0 0);
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual verification**

```bash
(npx next dev -p 4230 > /tmp/task2-dev.log 2>&1 &) && sleep 5
curl -s http://localhost:4230/ | grep -o 'style="[^"]*--brand-radius-interactive[^"]*"'
curl -s http://localhost:4230/ | grep -o 'lang="es"'
```

Expected: first command's output contains `--brand-radius-interactive:9999px`; second command finds a match.

Stop the dev server: find the process listening on port 4230 and terminate it (Windows: `netstat -ano | grep :4230` then `taskkill //PID <pid> //F`).

- [ ] **Step 7: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat: wire radius-interactive/Ultima accent tokens, switch body font to Inter, fix html lang"
```

---

### Task 3: Make buttons pill-shaped via the new radius token

**Files:**
- Modify: `src/components/ui/button.tsx`

**Interfaces:**
- Consumes: `--radius-interactive` (Task 2).
- Produces: every `Button` consumer site-wide now renders pill-shaped for any tenant using the default/Ultima radius values (see Global Constraints — this is an intentional, broad side effect of changing the shared primitive, not a regression).

- [ ] **Step 1: Update the base class and every size-variant radius override**

`src/components/ui/button.tsx` has 5 separate places where a `rounded-*` class is set: the base class (`rounded-lg`), and 4 size variants (`xs`, `sm`, `icon-xs`, `icon-sm`) that each override it with `rounded-[min(var(--radius-md),Npx)]`. All 5 need to change so every button size is uniformly pill-shaped, not just the sizes that fall through to the base class.

Find:

```ts
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
```

Replace with:

```ts
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[var(--radius-interactive)] border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
```

Find:

```ts
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
```

Replace with:

```ts
        xs: "h-6 gap-1 rounded-[var(--radius-interactive)] px-2 text-xs in-data-[slot=button-group]:rounded-[var(--radius-interactive)] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[var(--radius-interactive)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-[var(--radius-interactive)] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[var(--radius-interactive)] in-data-[slot=button-group]:rounded-[var(--radius-interactive)] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[var(--radius-interactive)] in-data-[slot=button-group]:rounded-[var(--radius-interactive)]",
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/button.tsx
git commit -m "feat: make all button sizes pill-shaped via --radius-interactive"
```

---

### Task 4: Update Input border color and radius

**Files:**
- Modify: `src/components/ui/input.tsx`

**Interfaces:**
- Consumes: nothing new (fixed literal values per `design.md`, not tokenized — spec calls out `8px` as distinct from the button's pill radius).
- Produces: every `Input` consumer (Finance Calculator, Trade-In, Lead Footer) picks up the new border/radius.

- [ ] **Step 1: Update the base class**

Find:

```ts
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
```

Replace with:

```ts
        "h-8 w-full min-w-0 rounded-[8px] border border-[#D8D6D3] bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/input.tsx
git commit -m "feat: apply Ultima border color and 8px radius to Input"
```

---

### Task 5: Rebuild VehicleCard as a Trend Card (image overlay + white action bar)

**Files:**
- Modify: `src/components/site/homepage/vehicle-card.tsx`

**Interfaces:**
- Consumes: nothing new. Same props as before: `{ vehicle: Vehicle; dealership: DealershipConfig; className?: string }`.
- Produces: same export `VehicleCard`, same WhatsApp-link behavior — `TrendVehicles` and `InventoryGrid` (which both render it) need no changes.

- [ ] **Step 1: Replace the component body**

Replace the entire contents of `src/components/site/homepage/vehicle-card.tsx` with:

```tsx
import { Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DealershipConfig, Vehicle } from "@/types";

export function VehicleCard({
  vehicle,
  dealership,
  className,
}: {
  vehicle: Vehicle;
  dealership: DealershipConfig;
  className?: string;
}) {
  const message = encodeURIComponent(
    `Hola, me interesa el ${vehicle.make} ${vehicle.model} ${vehicle.year}.`
  );
  const whatsappHref = `https://wa.me/${dealership.whatsapp.replace(/[^\d]/g, "")}?text=${message}`;

  return (
    <div
      className={cn(
        "group overflow-hidden border border-white/10 transition-transform hover:-translate-y-1",
        className
      )}
    >
      {/* Placeholder imagery until real photography (vehicle.imageUrl) is wired in */}
      <div className="relative flex aspect-[4/5] w-full items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-950">
        <Car className="size-12 text-white/20" strokeWidth={1} />
        <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-4">
          <h3 className="font-heading text-lg lowercase tracking-wide text-white">
            {vehicle.make} {vehicle.model} {vehicle.year}
          </h3>
          <p className="text-sm text-white/70">
            {vehicle.mileage.toLocaleString()} km ·{" "}
            {vehicle.category === "new" ? "Nuevo" : "Usado"}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 bg-white p-4 text-[#0d0d0d]">
        <p className="text-xl font-semibold">
          ${vehicle.price.toLocaleString()}
        </p>
        <Button
          size="sm"
          className="bg-[#0d0d0d] text-white hover:bg-[#0d0d0d]/80"
          render={<a href={whatsappHref}>Consultar</a>}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/site/homepage/vehicle-card.tsx
git commit -m "feat: rebuild VehicleCard as a Trend Card (image overlay, white action bar)"
```

---

### Task 6: Rebuild Category Cards (white bg, car silhouette, corner arrow)

**Files:**
- Modify: `src/components/site/homepage/categories-scroller.tsx`

**Interfaces:**
- Consumes: `--ultima-surface-container` (Task 2), `ArrowUpRight`/`Car` from `lucide-react`.
- Produces: same export `CategoriesScroller`, no props, no change to its usage in `(site)/page.tsx`.

- [ ] **Step 1: Replace the component body**

Replace the entire contents of `src/components/site/homepage/categories-scroller.tsx` with:

```tsx
import Link from "next/link";
import { ArrowUpRight, Car } from "lucide-react";
import { Section } from "./section";

const CATEGORIES = [
  { label: "Vehículos Nuevos" },
  { label: "Vehículos Usados" },
  { label: "Camionetas" },
  { label: "Sedanes" },
  { label: "Coupés" },
  { label: "Descapotables" },
];

export function CategoriesScroller() {
  return (
    <Section tone="light">
      <h2 className="font-heading mb-6 text-2xl lowercase tracking-tight">
        Explorá por categoría
      </h2>
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4">
        {CATEGORIES.map((category) => (
          <Link
            key={category.label}
            href="/inventory"
            className="group relative flex h-40 w-48 shrink-0 snap-start flex-col items-center justify-center gap-2 border border-[#0d0d0d]/10 bg-white p-4 text-center transition-colors hover:bg-[var(--ultima-surface-container)]"
          >
            <ArrowUpRight className="absolute top-3 right-3 size-4 text-[#0d0d0d]/40 transition-colors group-hover:text-[#0d0d0d]" />
            <Car className="size-10 text-[#0d0d0d]/30" strokeWidth={1} />
            <span className="font-heading text-sm lowercase tracking-wide text-[#0d0d0d]">
              {category.label}
            </span>
          </Link>
        ))}
      </div>
    </Section>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/site/homepage/categories-scroller.tsx
git commit -m "feat: rebuild Category Cards (white bg, car silhouette, corner arrow)"
```

---

### Task 7: Glassmorphic navigation (Header + Logo)

**Files:**
- Modify: `src/components/shared/logo.tsx`
- Modify: `src/components/site/header.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `Logo` gains an optional `className?: string` prop (backward-compatible — omitted callers get the unchanged default look). `Header`'s export/props are unchanged.

- [ ] **Step 1: Add an optional className prop to Logo**

The header's background is becoming a dark, semi-transparent glass bar. `Logo`'s dealership-name text currently has no explicit color (inherits the page's default near-black `text-foreground`), which would be unreadable on the new dark bar. Add a `className` prop so `Header` can pass a text color without hardcoding one into the shared `Logo` component.

Replace the entire contents of `src/components/shared/logo.tsx` with:

```tsx
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { DealershipConfig } from "@/types";

export function Logo({
  dealership,
  className,
}: {
  dealership: DealershipConfig;
  className?: string;
}) {
  return (
    <Link
      href="/"
      className={cn("flex items-center gap-2 font-semibold", className)}
    >
      {dealership.logoUrl ? (
        <Image
          src={dealership.logoUrl}
          alt={dealership.name}
          width={32}
          height={32}
          className="rounded"
        />
      ) : (
        <span
          className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground text-sm font-bold"
          aria-hidden
        >
          {dealership.name.charAt(0)}
        </span>
      )}
      <span>{dealership.name}</span>
    </Link>
  );
}
```

- [ ] **Step 2: Restyle the Header**

Replace the entire contents of `src/components/site/header.tsx` with:

```tsx
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Logo } from "@/components/shared/logo";
import type { DealershipConfig } from "@/types";

const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/inventory", label: "Inventario" },
  { href: "/contact", label: "Contacto" },
];

export function Header({ dealership }: { dealership: DealershipConfig }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0d0d0d]/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo dealership={dealership} className="text-white" />

        <nav className="hidden gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-white/70 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Button
          className="hidden bg-white text-black hover:bg-white/80 md:inline-flex"
          render={<Link href="/login">Iniciar sesión</Link>}
        />

        <Sheet>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10 md:hidden"
              >
                <Menu className="size-5" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            }
          />
          <SheetContent
            side="right"
            className="border-white/10 bg-[#0d0d0d]/90 text-white backdrop-blur-2xl data-[side=right]:w-full data-[side=right]:sm:max-w-full"
          >
            <SheetHeader>
              <SheetTitle>
                <Logo dealership={dealership} className="text-white" />
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-4 px-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-white/80 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/login"
                className="text-sm font-medium text-white/80 hover:text-white"
              >
                Iniciar sesión
              </Link>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

```bash
(npx next dev -p 4230 > /tmp/task7-dev.log 2>&1 &) && sleep 5
curl -s http://localhost:4230/ | grep -o 'backdrop-blur-lg'
```

Expected: match found.

Stop the dev server (find PID on port 4230, `taskkill //PID <pid> //F`).

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/logo.tsx src/components/site/header.tsx
git commit -m "feat: glassmorphic navigation with dark backdrop-blur header"
```

---

### Task 8: Testimonials — overlapping avatars and tertiary star color

**Files:**
- Modify: `src/components/site/homepage/testimonials.tsx`

**Interfaces:**
- Consumes: `--ultima-tertiary` (Task 2).
- Produces: same export `Testimonials`, no props.

- [ ] **Step 1: Update the star color and avatar markup**

Find:

```tsx
            <div className="mb-3 flex gap-1">
              {Array.from({ length: testimonial.rating }).map((_, index) => (
                <Star key={index} className="size-4 fill-white text-white" />
              ))}
            </div>
            <p className="text-white/80">&ldquo;{testimonial.quote}&rdquo;</p>
            <div className="mt-4 flex items-center gap-3">
              <Avatar>
                <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{testimonial.name}</span>
            </div>
```

Replace with:

```tsx
            <div className="mb-3 flex gap-1">
              {Array.from({ length: testimonial.rating }).map((_, index) => (
                <Star
                  key={index}
                  className="size-4 fill-[var(--ultima-tertiary)] text-[var(--ultima-tertiary)]"
                />
              ))}
            </div>
            <p className="text-white/80">&ldquo;{testimonial.quote}&rdquo;</p>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex items-center">
                <Avatar>
                  <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <Avatar className="-ml-4 border-2 border-[#0d0d0d]">
                  <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </div>
              <span className="text-sm font-medium">{testimonial.name}</span>
            </div>
```

- [ ] **Step 2: Switch the section heading from uppercase to lowercase**

Find:

```tsx
      <h2 className="font-heading mb-8 text-2xl uppercase tracking-tight">
        Lo Que Dicen Nuestros Clientes
      </h2>
```

Replace with:

```tsx
      <h2 className="font-heading mb-8 text-2xl lowercase tracking-tight">
        Lo Que Dicen Nuestros Clientes
      </h2>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/site/homepage/testimonials.tsx
git commit -m "feat: overlapping avatars and tertiary-accent stars in Testimonials"
```

---

### Task 9: Heading casing sweep (remaining uppercase → lowercase)

**Files:**
- Modify: `src/components/site/homepage/hero.tsx`
- Modify: `src/components/site/homepage/about.tsx`
- Modify: `src/components/site/homepage/finance-calculator.tsx`
- Modify: `src/components/site/homepage/inventory-grid.tsx`
- Modify: `src/components/site/homepage/lead-footer.tsx`
- Modify: `src/components/site/homepage/trade-in.tsx`
- Modify: `src/components/site/homepage/trend-vehicles.tsx`

**Interfaces:** none — purely a `className` edit (`uppercase` → `lowercase`) on existing `font-heading` elements. No other changes. (`vehicle-card.tsx`, `categories-scroller.tsx`, and `testimonials.tsx`'s headings were already switched in Tasks 5, 6, and 8.)

Per the spec: every element combining `font-heading` + `uppercase` switches to `lowercase`. Finance Calculator's "Estimated Monthly Payment" caption (`text-sm uppercase`, no `font-heading`) is body-font microcopy and must NOT change — only touch lines that have both `font-heading` and `uppercase` together.

- [ ] **Step 1: hero.tsx**

Find:

```tsx
        <h1 className="font-heading text-5xl uppercase tracking-tight sm:text-6xl">
```

Replace with:

```tsx
        <h1 className="font-heading text-5xl lowercase tracking-tight sm:text-6xl">
```

- [ ] **Step 2: about.tsx**

Find:

```tsx
        <h2 className="font-heading text-3xl uppercase tracking-tight sm:text-4xl">
```

Replace with:

```tsx
        <h2 className="font-heading text-3xl lowercase tracking-tight sm:text-4xl">
```

- [ ] **Step 3: finance-calculator.tsx**

Find:

```tsx
      <h2 className="font-heading mb-6 text-2xl uppercase tracking-tight">
        Calculadora de Financiación
      </h2>
```

Replace with:

```tsx
      <h2 className="font-heading mb-6 text-2xl lowercase tracking-tight">
        Calculadora de Financiación
      </h2>
```

Do NOT touch the other `uppercase` in this file (`text-sm uppercase tracking-wide text-[#0d0d0d]/60` on the "Cuota Mensual Estimada" caption) — it has no `font-heading` class and must stay uppercase per the spec.

- [ ] **Step 4: inventory-grid.tsx**

Find:

```tsx
      <h2 className="font-heading mb-6 text-2xl uppercase tracking-tight">
        Inventario Completo
      </h2>
```

Replace with:

```tsx
      <h2 className="font-heading mb-6 text-2xl lowercase tracking-tight">
        Inventario Completo
      </h2>
```

- [ ] **Step 5: lead-footer.tsx**

Find:

```tsx
        <h2 className="font-heading mb-2 text-2xl uppercase tracking-tight">
          ¿Buscás un Auto?
        </h2>
```

Replace with:

```tsx
        <h2 className="font-heading mb-2 text-2xl lowercase tracking-tight">
          ¿Buscás un Auto?
        </h2>
```

- [ ] **Step 6: trade-in.tsx (both headings)**

Find:

```tsx
          <h2 className="font-heading text-2xl uppercase tracking-tight">
            ¡Gracias! Nos pondremos en contacto.
          </h2>
```

Replace with:

```tsx
          <h2 className="font-heading text-2xl lowercase tracking-tight">
            ¡Gracias! Nos pondremos en contacto.
          </h2>
```

Find:

```tsx
        <h2 className="font-heading mb-2 text-2xl uppercase tracking-tight">
          Conocé el Valor de tu Vehículo
        </h2>
```

Replace with:

```tsx
        <h2 className="font-heading mb-2 text-2xl lowercase tracking-tight">
          Conocé el Valor de tu Vehículo
        </h2>
```

- [ ] **Step 7: trend-vehicles.tsx**

Find:

```tsx
        <h2 className="font-heading text-2xl uppercase tracking-tight">
          Vehículos Destacados
        </h2>
```

Replace with:

```tsx
        <h2 className="font-heading text-2xl lowercase tracking-tight">
          Vehículos Destacados
        </h2>
```

- [ ] **Step 8: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Verify no single line combines `font-heading` and `uppercase`**

A file-level check (`grep -l` twice) would false-positive on `finance-calculator.tsx`, which legitimately keeps one `uppercase` (its non-heading caption) in the same file as a now-lowercase `font-heading` element. Check same-line co-occurrence instead:

```bash
grep -rn "font-heading.*uppercase\|uppercase.*font-heading" src/components/site/
```

Expected: no output (empty — confirms no element combines both classes on one line; the Finance Calculator caption's standalone `uppercase` has no `font-heading` on its line, so it correctly won't match).

- [ ] **Step 10: Commit**

```bash
git add src/components/site/homepage/hero.tsx src/components/site/homepage/about.tsx src/components/site/homepage/finance-calculator.tsx src/components/site/homepage/inventory-grid.tsx src/components/site/homepage/lead-footer.tsx src/components/site/homepage/trade-in.tsx src/components/site/homepage/trend-vehicles.tsx
git commit -m "feat: switch remaining homepage headings from uppercase to lowercase"
```

---

### Task 10: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Type-check, lint, build**

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Expected: all three succeed with zero errors.

- [ ] **Step 2: Start the dev server**

```bash
(npx next dev -p 4230 > /tmp/task10-dev.log 2>&1 &) && sleep 5
cat /tmp/task10-dev.log
```

Expected: `✓ Ready in <N>ms`, no errors.

- [ ] **Step 3: Structural verification on the homepage**

```bash
curl -s http://localhost:4230/ -o /tmp/design-check.html
grep -o -- '--brand-radius-interactive:9999px' /tmp/design-check.html
grep -o -- '--brand-secondary:#D8D6D3' /tmp/design-check.html
grep -o 'lang="es"' /tmp/design-check.html
grep -o 'aspect-\[4/5\]' /tmp/design-check.html
grep -o 'backdrop-blur-lg' /tmp/design-check.html
grep -o 'backdrop-blur-2xl' /tmp/design-check.html
grep -o 'lucide-arrow-up-right' /tmp/design-check.html
```

Expected: every grep finds at least one match.

- [ ] **Step 4: Confirm no stray `font-heading` + `uppercase` combination**

```bash
grep -rn "font-heading.*uppercase\|uppercase.*font-heading" src/components/site/
```

Expected: no output (same-line check — a file-level check would false-positive on `finance-calculator.tsx`'s legitimately-uppercase non-heading caption).

- [ ] **Step 5: Confirm `/login` (auth route group) still renders — global Header change shouldn't affect it, since `(auth)` doesn't use `Header`**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4230/login
```

Expected: `200`.

- [ ] **Step 6: Stop the dev server**

Find the process on port 4230 and terminate it (`netstat -ano | grep :4230`, then `taskkill //PID <pid> //F`).

- [ ] **Step 7: Manual visual pass (cannot be grepped — describe exactly what to eyeball)**

Open `/` in a browser and confirm:
- Trend Vehicles / Inventory Grid cards show the vehicle name overlaid on the top of the image, and price + "Consultar" button in a white bar at the bottom.
- Category cards (Categories Scroller) are white with a centered car icon, a small arrow icon in the top-right corner, and the category name at the bottom, all in lowercase.
- The header is visibly translucent/blurred when content scrolls underneath it, with light-on-dark text.
- Every button (WhatsApp CTAs, form submits, nav "Iniciar sesión") is visibly pill-shaped; cards and containers remain sharp-cornered.
- Testimonials show two overlapping circular avatars per card, and star ratings in a muted gray-brown tone (not white).
- All homepage section headings render in lowercase (Archivo Black).

- [ ] **Step 8: Final commit**

If Step 7 surfaces a visual issue requiring a fix, make the fix and commit it. If everything looks correct, this step is a no-op — the plan is complete as of Task 9's commit.

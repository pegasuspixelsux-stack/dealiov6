# Firebase Real Login (Users Lookup) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the real-Firebase login path so a Firebase Auth user can sign in and reach the dashboard with the correct role/dealership, by resolving their `uid` against a new Firestore `users/{uid}` collection.

**Architecture:** Firebase project is already connected (env vars live in `.env.local`). We add a small server-only Firestore read module (`getUserRecord`), wire it into the existing `api/auth/session` route to replace its current 501 stub, and add a one-off seed script to create the first owner user's Firestore record.

**Tech Stack:** Next.js 16 App Router, TypeScript, zod, firebase-admin (Firestore + Auth), `jose` session cookies (already built, untouched), `tsx` (new devDependency, for running standalone TS scripts).

## Global Constraints

- Firestore document type: `users/{uid}` is a **top-level** collection (not nested under `dealerships/{id}/`) — verbatim from spec `docs/superpowers/specs/2026-07-11-firebase-real-login-design.md`.
- Only fields actually consumed by the login flow are validated: `uid`, `email`, `name`, `role`, `dealershipId`. (`createdAt`/`updatedAt` may exist in Firestore for record-keeping but are not part of the validated/consumed shape — YAGNI.)
- `role` must be exactly `"owner" | "manager" | "salesperson"` (matches `Role` in `src/types/auth.ts`).
- No automated test runner exists in this repo — every task's verification is a manual, reproducible step (typecheck + real Firebase/Firestore check), not a unit test suite.
- Do not touch `session.ts`, `dal.ts`, `permissions.ts`, the dashboard layout guard, or `login-form.tsx` — all already correct per the spec.
- Out of scope (do not implement): signup UI, password reset, Firestore-backed dealership config, Inventory/Leads CRUD, Firestore security rules, multi-tenant support, custom claims.

---

### Task 1: Add `tsx` for running standalone scripts

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: `npx tsx <file>.ts` becomes available for all later tasks' manual verification scripts and the seed script.

- [ ] **Step 1: Install tsx as a dev dependency**

Run: `npm install --save-dev tsx`

- [ ] **Step 2: Verify it installed**

Run: `npx tsx --version`
Expected: prints a version number (e.g. `4.x.x`), no error.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add tsx for running standalone TypeScript scripts"
```

---

### Task 2: Add `UserRecord` type + schema

**Files:**
- Create: `src/types/user.ts`
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces: `userRecordSchema` (zod object), `UserRecord` type — both exported from `@/types`. Shape: `{ uid: string; email: string; name: string; role: "owner" | "manager" | "salesperson"; dealershipId: string }`.

- [ ] **Step 1: Create the schema file**

`src/types/user.ts`:
```ts
import { z } from "zod";

export const userRecordSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(["owner", "manager", "salesperson"]),
  dealershipId: z.string(),
});

export type UserRecord = z.infer<typeof userRecordSchema>;
```

- [ ] **Step 2: Re-export it from the types barrel**

Modify `src/types/index.ts` — add one line:
```ts
export * from "./auth";
export * from "./dealership";
export * from "./firestore";
export * from "./user";
export * from "./vehicle";
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/user.ts src/types/index.ts
git commit -m "feat: add UserRecord type and schema"
```

---

### Task 3: Add `getUserRecord` Firestore lookup

**Files:**
- Create: `src/lib/users/get-user-record.ts`

**Interfaces:**
- Consumes: `adminFirestore` from `@/lib/firebase/admin` (already exists, `Firestore | null`); `userRecordSchema` from `@/types` (Task 2).
- Produces: `getUserRecord(uid: string): Promise<UserRecord | null>` — used by Task 5's login route.

- [ ] **Step 1: Create the module**

`src/lib/users/get-user-record.ts`:
```ts
import "server-only";
import { adminFirestore } from "@/lib/firebase/admin";
import { userRecordSchema, type UserRecord } from "@/types";

export async function getUserRecord(uid: string): Promise<UserRecord | null> {
  if (!adminFirestore) return null;

  const snapshot = await adminFirestore.collection("users").doc(uid).get();
  if (!snapshot.exists) return null;

  const parsed = userRecordSchema.safeParse({ uid, ...snapshot.data() });
  return parsed.success ? parsed.data : null;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Create a manually-entered Firestore test document**

In the Firebase console → Firestore Database → Start collection:
- Collection ID: `users`
- Document ID: `manual-test-uid`
- Fields (all type "string"): `uid` = `manual-test-uid`, `email` = `test@example.com`, `name` = `Test User`, `role` = `owner`, `dealershipId` = `ultima-cars`

- [ ] **Step 4: Write a throwaway verification script**

`scripts/manual-verify-user-record.ts`:
```ts
import { getUserRecord } from "../src/lib/users/get-user-record";

async function main() {
  const record = await getUserRecord("manual-test-uid");
  console.log(record);
}

main();
```

- [ ] **Step 5: Run it**

Run: `npx tsx scripts/manual-verify-user-record.ts`
Expected output:
```
{
  uid: 'manual-test-uid',
  email: 'test@example.com',
  name: 'Test User',
  role: 'owner',
  dealershipId: 'ultima-cars'
}
```

- [ ] **Step 6: Delete the throwaway script**

Run: `rm scripts/manual-verify-user-record.ts`

(It was never committed — it only existed to prove step 5's output. Do not commit it.)

- [ ] **Step 7: Commit**

```bash
git add src/lib/users/get-user-record.ts
git commit -m "feat: add getUserRecord Firestore lookup"
```

---

### Task 4: Seed script for the first owner user

**Files:**
- Create: `scripts/seed-owner.ts`
- Modify: `package.json` (add `seed:owner` script)

**Interfaces:**
- Consumes: `FIREBASE_SERVICE_ACCOUNT_KEY` env var (already set in `.env.local`); `NEXT_PUBLIC_DEFAULT_DEALERSHIP_ID` env var (optional, defaults to `"ultima-cars"`, matching `DEFAULT_DEALERSHIP_ID` in `src/lib/dealership/config.ts`).
- Produces: a `users/{uid}` Firestore document with `role: "owner"`, usable by Task 5's E2E verification.

- [ ] **Step 1: Create the script**

`scripts/seed-owner.ts`:
```ts
import { readFileSync } from "node:fs";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function loadEnvLocal() {
  try {
    const content = readFileSync(".env.local", "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // .env.local not found; rely on already-set environment variables.
  }
}

function readServiceAccount() {
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!encoded) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add it to .env.local first."
    );
  }
  return JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"));
}

async function main() {
  loadEnvLocal();

  const [uid, email, name] = process.argv.slice(2);
  if (!uid || !email || !name) {
    console.error('Usage: npm run seed:owner -- <uid> <email> "<name>"');
    process.exit(1);
  }

  const serviceAccount = readServiceAccount();
  const app = getApps().length
    ? getApps()[0]
    : initializeApp({ credential: cert(serviceAccount) });
  const firestore = getFirestore(app);

  const dealershipId = process.env.NEXT_PUBLIC_DEFAULT_DEALERSHIP_ID ?? "ultima-cars";

  await firestore.collection("users").doc(uid).set({
    uid,
    email,
    name,
    role: "owner",
    dealershipId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`Seeded users/${uid} as owner of dealership "${dealershipId}".`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 2: Add the npm script**

Modify `package.json` `scripts` block:
```json
"seed:owner": "tsx scripts/seed-owner.ts"
```

- [ ] **Step 3: Manually create a real Firebase Auth user to seed**

Firebase console → Authentication → **Users** tab → "Add user" → enter an email + password you'll remember (this becomes your real dashboard login) → after creation, copy the generated **User UID** from the users list.

- [ ] **Step 4: Run the seed script with that UID**

Run: `npm run seed:owner -- <uid-you-copied> <the-email-you-used> "Your Name"`
Expected output: `Seeded users/<uid> as owner of dealership "ultima-cars".`

- [ ] **Step 5: Confirm in the Firebase console**

Firestore Database → `users` collection → the document with your UID should show `role: "owner"`, `dealershipId: "ultima-cars"`, matching email/name.

- [ ] **Step 6: Commit**

```bash
git add scripts/seed-owner.ts package.json
git commit -m "feat: add seed-owner script for provisioning the first user"
```

---

### Task 5: Complete the real-login route and verify end-to-end

**Files:**
- Modify: `src/app/api/auth/session/route.ts`

**Interfaces:**
- Consumes: `getUserRecord` from `@/lib/users/get-user-record` (Task 3); existing `createSession` from `@/lib/auth/session`; existing `adminAuth` from `@/lib/firebase/admin`.
- Produces: working `POST /api/auth/session` with a real `idToken` body — no more 501.

- [ ] **Step 1: Replace the 501 stub block**

In `src/app/api/auth/session/route.ts`, add the import:
```ts
import { getUserRecord } from "@/lib/users/get-user-record";
```

Replace this existing block:
```ts
  if (body?.idToken) {
    if (!adminAuth) {
      return NextResponse.json(
        { error: "Firebase Admin is not configured." },
        { status: 500 }
      );
    }
    // Verifies the token, but there is no Users module/Firestore user record
    // yet to resolve a role/dealershipId from — that lands with the Users
    // feature plan. Until then, real Firebase sign-in verifies but cannot
    // complete.
    await adminAuth.verifyIdToken(body.idToken).catch(() => null);
    return NextResponse.json(
      { error: "Real Firebase sign-in isn't wired to a user record yet." },
      { status: 501 }
    );
  }
```

with:
```ts
  if (body?.idToken) {
    if (!adminAuth) {
      return NextResponse.json(
        { error: "Firebase Admin is not configured." },
        { status: 500 }
      );
    }

    const decoded = await adminAuth.verifyIdToken(body.idToken).catch(() => null);
    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid or expired sign-in." },
        { status: 401 }
      );
    }

    const record = await getUserRecord(decoded.uid);
    if (!record) {
      return NextResponse.json(
        { error: "No account found for this user. Contact your administrator." },
        { status: 403 }
      );
    }

    await createSession({
      uid: record.uid,
      role: record.role,
      name: record.name,
      dealershipId: record.dealershipId,
    });
    return NextResponse.json({ ok: true });
  }
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Start the dev server**

Run: `npm run dev`

- [ ] **Step 4: Verify the happy path**

Visit `http://localhost:3000/login` in a browser. Since Firebase is now configured, you should see the real email/password form (not the dev stub buttons). Sign in with the email/password you created in Task 4, Step 3.

Expected: redirected to `/dashboard`, page shows your seeded name and role "Owner".

- [ ] **Step 5: Verify the "no account" path**

Firebase console → Authentication → Users → "Add user" → create a **second** test user (different email) — do **not** run the seed script for this one.

Sign out of the dashboard (or open an incognito window), go to `/login`, sign in with this second user's email/password.

Expected: sign-in form shows the error "No account found for this user. Contact your administrator." — not a crash, not a silent failure, not the old 501 message.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/auth/session/route.ts
git commit -m "feat: complete real Firebase login via Firestore users lookup"
```

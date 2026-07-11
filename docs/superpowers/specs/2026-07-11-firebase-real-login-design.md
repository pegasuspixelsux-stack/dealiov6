# Firebase Project + Real Login (Users Lookup) — Design

## Context

The dashboard already has a working session mechanism:

- `src/lib/auth/session.ts` — signed JWT session cookie (`jose`, HS256, 7-day expiry, httpOnly).
- `src/lib/auth/dal.ts` — `verifySession()` reads/decrypts that cookie.
- `src/lib/auth/permissions.ts` — real RBAC permission map for `owner` / `manager` / `salesperson`.
- `src/app/(dashboard)/layout.tsx` — redirects to `/login` if `verifySession()` returns null. Real, not mocked.
- `src/app/(auth)/login/login-form.tsx` — dual-mode: shows dev "Sign in as Owner/Manager/Salesperson" stub buttons when Firebase isn't configured, or a real email/password form (`signInWithEmailAndPassword`) when it is.
- `src/app/api/auth/session/route.ts` — the real-Firebase path calls `adminAuth.verifyIdToken(idToken)` but then **hard-returns a 501**, because there's no Firestore lookup yet to resolve the verified `uid` into a `role`/`dealershipId`/`name`.
- `src/lib/firebase/{client,admin,config}.ts` — both client and admin SDKs check for configuration and fall back to a documented "stub mode" (`app`/`auth`/`firestore` all `null`) when env vars are empty. Currently **all** `NEXT_PUBLIC_FIREBASE_*` vars and `FIREBASE_SERVICE_ACCOUNT_KEY` are empty — no real Firebase project is connected.
- `src/lib/dealership/config.ts` — `getDealershipConfig()` / `resolveDealershipId()` are hardcoded to a mock fixture, with comments stating a real implementation should read Firestore later. Not touched by this spec.
- `src/types/firestore.ts` — documents the intended convention: dealership-scoped data lives under `dealerships/{dealershipId}/...` subcollections, each document still carrying an explicit `dealershipId` field.

**The goal of this spec:** connect a real Firebase project, and complete the real-login code path so an actual Firebase Auth user can sign in and reach the dashboard with the correct role/dealership — replacing the current 501.

## Explicitly out of scope

Each of these is its own future spec; do not implement them here:

- Signup UI / self-registration, password reset flows.
- Firestore-backed dealership config (stays hardcoded `ULTIMA_DEALERSHIP_CONFIG` for now).
- Inventory/Leads CRUD (dashboard pages stay `<ComingSoon />`; homepage keeps reading `src/lib/vehicles/mock-data`).
- Firestore security rules for client-side access — not needed yet, since every Firestore read in this spec goes through the Admin SDK (server-side, bypasses rules) and no client-side Firestore reads exist anywhere in the app yet.
- Multiple dealership tenants — only the single "Ultima" tenant (`DEFAULT_DEALERSHIP_ID`) needs to exist/work.
- Firebase custom claims — considered and rejected (see Decision below).

## Decision: Firestore lookup, not custom claims

Two ways existed to resolve `uid → {role, dealershipId, name}` after `verifyIdToken`:

- **Chosen: Firestore `users/{uid}` document**, read once via the Admin SDK at sign-in time. Cheap — the app's session cookie is independent of Firebase after login (7-day JWT), so this read happens only at sign-in, never on every request. Easy to inspect/edit via the Firestore console.
- **Rejected: Firebase custom claims.** Would avoid the Firestore read, but claims can only be set via the Admin SDK (no console UI), are capped at 1000 bytes, and don't propagate to an already-issued ID token for up to an hour without a forced refresh. Since the session is already decoupled from Firebase post-login, this buys nothing here.

## Prerequisites (manual, done before implementation)

1. Create a Firebase project in the Firebase console.
2. Authentication → Sign-in method → enable **Email/Password**.
3. Project settings → add a Web App → copy its config values into `.env.local` as `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_APP_ID` (matches `src/lib/firebase/config.ts` exactly — no code changes needed here).
4. Project settings → Service accounts → generate a new private key (JSON) → base64-encode the whole file → set `FIREBASE_SERVICE_ACCOUNT_KEY` in `.env.local` (matches the decoding `src/lib/firebase/admin.ts` already does: `JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"))`).
5. Firestore → create database. Default (locked) rules are fine — nothing in this spec reads Firestore from the client.

## Data model

New top-level collection `users/{uid}` (top-level, not nested under `dealerships/{id}/`, because at login only the `uid` is known — `dealershipId` is exactly what's being looked up):

```
users/{uid}: {
  uid: string
  email: string
  name: string
  role: "owner" | "manager" | "salesperson"
  dealershipId: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

Add a `userRecordSchema` (zod) + `UserRecord` type to `src/types`, following the same pattern as the existing `dealershipConfigSchema`.

## Code changes

**New file** `src/lib/users/get-user-record.ts`:
- `getUserRecord(uid: string): Promise<UserRecord | null>` — reads `users/{uid}` via `adminFirestore`, parses through `userRecordSchema`, returns `null` if the doc doesn't exist (or Firestore isn't configured).

**Edit** `src/app/api/auth/session/route.ts` — replace the current 501 block in the `idToken` branch:

```ts
const decoded = await adminAuth.verifyIdToken(body.idToken).catch(() => null);
if (!decoded) {
  return NextResponse.json({ error: "Invalid or expired sign-in." }, { status: 401 });
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
```

This mirrors exactly what the existing stub path already does — same `createSession` call, just sourced from Firestore instead of the hardcoded `STUB_ROLES` map.

**No changes needed** to `session.ts`, `dal.ts`, `permissions.ts`, the dashboard layout guard, or `login-form.tsx` — all already correct and Firebase-shaped.

**New file** `scripts/seed-owner.ts` (add `tsx` as a devDependency to run it, plus an npm script `"seed:owner": "tsx scripts/seed-owner.ts"`):
- Usage: `npx tsx scripts/seed-owner.ts <uid> <email> <name>`.
- Writes `users/{uid}` via the Admin SDK with `role: "owner"` and `dealershipId: DEFAULT_DEALERSHIP_ID`.
- You create the Firebase Auth user by hand in the console first (Authentication → Add user, email/password), copy its UID, then run this script to create the matching Firestore record.

## Verification (manual — no automated test runner exists in this repo yet)

1. Create a real Firebase Auth user, run the seed script, sign in via the real email/password form → dashboard shows the correct name/role sourced from `SessionPayload`.
2. Sign in with a Firebase Auth user that has **no** seeded `users/{uid}` doc → confirm the 403 "No account found..." message, not a silent failure or the old 501.
3. Confirm dev stub buttons still work when Firebase env vars are unset (unchanged — already gated by `isFirebaseConfigured` client-side and `NODE_ENV === "production"` server-side).

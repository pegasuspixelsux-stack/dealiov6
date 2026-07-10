import { NextRequest, NextResponse } from "next/server";
import { createSession, deleteSession } from "@/lib/auth/session";
import { adminAuth } from "@/lib/firebase/admin";
import { DEFAULT_DEALERSHIP_ID } from "@/lib/dealership/config";
import type { Role } from "@/types";

const STUB_ROLES: Record<Role, { uid: string; name: string }> = {
  owner: { uid: "stub-owner", name: "Owner (Dev)" },
  manager: { uid: "stub-manager", name: "Manager (Dev)" },
  salesperson: { uid: "stub-salesperson", name: "Salesperson (Dev)" },
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (body?.stubRole) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Stub login is disabled in production." },
        { status: 404 }
      );
    }
    const stub = STUB_ROLES[body.stubRole as Role];
    if (!stub) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }
    await createSession({
      uid: stub.uid,
      role: body.stubRole as Role,
      name: stub.name,
      dealershipId: DEFAULT_DEALERSHIP_ID,
    });
    return NextResponse.json({ ok: true });
  }

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

  return NextResponse.json(
    { error: "Missing stubRole or idToken." },
    { status: 400 }
  );
}

export async function DELETE() {
  await deleteSession();
  return NextResponse.json({ ok: true });
}

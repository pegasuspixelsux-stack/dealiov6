import "server-only";
import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function readServiceAccount() {
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!encoded) return null;
  try {
    return JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"));
  } catch {
    return null;
  }
}

const serviceAccount = readServiceAccount();

let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let adminFirestore: Firestore | null = null;

if (serviceAccount) {
  adminApp = getApps().length ? getApps()[0] : initializeApp({ credential: cert(serviceAccount) });
  adminAuth = getAuth(adminApp);
  adminFirestore = getFirestore(adminApp);
} else if (process.env.NODE_ENV !== "production") {
  console.warn(
    "[firebase-admin] Not configured — running in stub mode. Set FIREBASE_SERVICE_ACCOUNT_KEY to enable."
  );
}

export { adminApp, adminAuth, adminFirestore };

export function verifyIdTokenStub(): never {
  throw new Error(
    "Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_KEY before calling verifyIdToken."
  );
}

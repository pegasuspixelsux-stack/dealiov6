import "server-only";
import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

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
let adminStorage: Storage | null = null;

if (serviceAccount) {
  adminApp = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert(serviceAccount),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
  adminAuth = getAuth(adminApp);
  adminFirestore = getFirestore(adminApp);
  try {
    adminFirestore.settings({ ignoreUndefinedProperties: true });
  } catch {
    // Next.js re-evaluates this module per route bundle, but the
    // underlying Firestore singleton (keyed off the shared Firebase app
    // registry) persists across those evaluations within the same
    // process, so settings() can already be applied — safe to ignore.
  }
  adminStorage = getStorage(adminApp);
} else if (process.env.NODE_ENV !== "production") {
  console.warn(
    "[firebase-admin] Not configured — running in stub mode. Set FIREBASE_SERVICE_ACCOUNT_KEY to enable."
  );
}

export { adminApp, adminAuth, adminFirestore, adminStorage };

export function verifyIdTokenStub(): never {
  throw new Error(
    "Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_KEY before calling verifyIdToken."
  );
}

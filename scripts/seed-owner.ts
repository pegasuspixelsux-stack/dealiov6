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

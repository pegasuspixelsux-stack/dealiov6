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

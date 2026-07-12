import "server-only";
import { adminFirestore } from "@/lib/firebase/admin";
import { leadSchema, type Lead } from "@/types";
import type { z } from "zod";

export async function getLeads(dealershipId: string): Promise<Lead[]> {
  if (!adminFirestore) return [];

  const snapshot = await adminFirestore
    .collection("dealerships")
    .doc(dealershipId)
    .collection("leads")
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Lead);
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
    createdAt: now,
    updatedAt: now,
  });
}

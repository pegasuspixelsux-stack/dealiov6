import "server-only";
import { adminFirestore } from "@/lib/firebase/admin";
import { leadSchema, leadStageSchema, type Lead, type LeadStage } from "@/types";
import type { z } from "zod";

export async function getLeads(dealershipId: string): Promise<Lead[]> {
  if (!adminFirestore) return [];

  const snapshot = await adminFirestore
    .collection("dealerships")
    .doc(dealershipId)
    .collection("leads")
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.flatMap((doc) => {
    const data = doc.data();
    const parsed = leadSchema.safeParse(data);
    if (!parsed.success) return [];

    const stageParsed = leadStageSchema.safeParse(data.stage);
    const stage: LeadStage = stageParsed.success ? stageParsed.data : "recibido";

    const createdAt: Date =
      typeof data.createdAt?.toDate === "function"
        ? data.createdAt.toDate()
        : new Date();
    const updatedAt: Date =
      typeof data.updatedAt?.toDate === "function"
        ? data.updatedAt.toDate()
        : createdAt;

    return [
      {
        id: doc.id,
        dealershipId,
        ...parsed.data,
        stage,
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
      },
    ];
  });
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
    stage: "recibido",
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateLeadStage(
  dealershipId: string,
  leadId: string,
  stage: LeadStage
): Promise<void> {
  if (!adminFirestore) {
    throw new Error("Firestore is not configured.");
  }

  await adminFirestore
    .collection("dealerships")
    .doc(dealershipId)
    .collection("leads")
    .doc(leadId)
    .update({ stage, updatedAt: new Date() });
}

import "server-only";
import { adminFirestore } from "@/lib/firebase/admin";
import {
  leadStageThresholdsSchema,
  DEFAULT_LEAD_STAGE_THRESHOLDS,
  type LeadStageThresholds,
} from "@/types";

export async function getLeadStageThresholds(
  dealershipId: string
): Promise<LeadStageThresholds> {
  if (!adminFirestore) return DEFAULT_LEAD_STAGE_THRESHOLDS;

  const doc = await adminFirestore.collection("dealerships").doc(dealershipId).get();
  const parsed = leadStageThresholdsSchema.safeParse(doc.data()?.leadStageThresholds);
  return parsed.success ? parsed.data : DEFAULT_LEAD_STAGE_THRESHOLDS;
}

export async function updateLeadStageThresholds(
  dealershipId: string,
  input: LeadStageThresholds
): Promise<void> {
  if (!adminFirestore) {
    throw new Error("Firestore is not configured.");
  }

  await adminFirestore
    .collection("dealerships")
    .doc(dealershipId)
    .set({ leadStageThresholds: input }, { merge: true });
}

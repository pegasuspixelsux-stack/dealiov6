"use server";

import { verifySession } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { updateLeadStageThresholds } from "@/lib/leads/lead-config";
import { leadStageThresholdsSchema } from "@/types";

export async function updateLeadStageThresholdsAction(input: {
  fastStageYellowMinutes: number;
  fastStageRedMinutes: number;
  followUpYellowDays: number;
  followUpRedDays: number;
}): Promise<{ success: true } | { success: false; error: string }> {
  const session = await verifySession();
  if (!session) {
    return { success: false, error: "Not signed in." };
  }
  if (!can(session.role, "canAccessConfig")) {
    return { success: false, error: "You don't have permission to change settings." };
  }

  const parsed = leadStageThresholdsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Please check the values and try again." };
  }

  await updateLeadStageThresholds(session.dealershipId, parsed.data);
  return { success: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { createLead, updateLeadStage } from "@/lib/leads/leads";
import { leadSchema, leadStageSchema } from "@/types";

export async function createLeadAction(input: {
  dealershipId: string;
  source: string;
  name: string;
  contact: string;
  message: string;
  email?: string;
  preferredContact?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Please check the form and try again." };
  }

  await createLead(input.dealershipId, parsed.data);
  return { success: true };
}

export async function updateLeadStageAction(
  leadId: string,
  stage: string
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await verifySession();
  if (!session) {
    return { success: false, error: "Not signed in." };
  }

  const parsed = leadStageSchema.safeParse(stage);
  if (!parsed.success) {
    return { success: false, error: "Invalid stage." };
  }

  await updateLeadStage(session.dealershipId, leadId, parsed.data);
  revalidatePath("/dashboard/pipeline");
  return { success: true };
}

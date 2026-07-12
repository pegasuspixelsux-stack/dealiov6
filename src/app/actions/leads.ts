"use server";

import { createLead } from "@/lib/leads/leads";
import { leadSchema } from "@/types";

export async function createLeadAction(input: {
  dealershipId: string;
  source: string;
  name: string;
  contact: string;
  message: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Please check the form and try again." };
  }

  await createLead(input.dealershipId, parsed.data);
  return { success: true };
}

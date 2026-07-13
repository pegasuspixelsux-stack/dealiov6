"use server";

import { verifySession } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { updateInventorySettings } from "@/lib/vehicles/inventory-config";
import { inventorySettingsSchema } from "@/types";

export async function updateInventorySettingsAction(input: {
  staleListingDays: number;
}): Promise<{ success: true } | { success: false; error: string }> {
  const session = await verifySession();
  if (!session) {
    return { success: false, error: "Not signed in." };
  }
  if (!can(session.role, "canAccessConfig")) {
    return { success: false, error: "You don't have permission to change settings." };
  }

  const parsed = inventorySettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Please check the values and try again." };
  }

  await updateInventorySettings(session.dealershipId, parsed.data);
  return { success: true };
}

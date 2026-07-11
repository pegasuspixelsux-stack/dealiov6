"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { createVehicle } from "@/lib/vehicles/vehicles";
import { vehicleSchema } from "@/types";

export async function createVehicleAction(
  formData: FormData
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await verifySession();
  if (!session) {
    return { success: false, error: "Not signed in." };
  }
  if (!can(session.role, "canManageVehicles")) {
    return { success: false, error: "You don't have permission to add vehicles." };
  }

  const parsed = vehicleSchema.safeParse({
    make: formData.get("make"),
    model: formData.get("model"),
    year: Number(formData.get("year")),
    price: Number(formData.get("price")),
    mileage: Number(formData.get("mileage")),
    imageUrl: formData.get("imageUrl"),
    category: formData.get("category"),
    featured: formData.get("featured") === "on",
  });

  if (!parsed.success) {
    return { success: false, error: "Please check the form fields and try again." };
  }

  await createVehicle(session.dealershipId, parsed.data);
  revalidatePath("/dashboard/inventory");
  return { success: true };
}

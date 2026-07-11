"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { reserveVehicleId, createVehicle } from "@/lib/vehicles/vehicles";
import { uploadVehiclePhotos } from "@/lib/vehicles/upload-photos";
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

  const photos = formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (photos.length === 0) {
    return { success: false, error: "At least one photo is required." };
  }
  if (photos.length > 8) {
    return { success: false, error: "Maximum 8 photos." };
  }

  const fieldsParsed = vehicleSchema
    .omit({ imageUrls: true })
    .safeParse({
      make: formData.get("make"),
      model: formData.get("model"),
      year: Number(formData.get("year")),
      price: Number(formData.get("price")),
      mileage: Number(formData.get("mileage")),
      category: formData.get("category"),
      featured: formData.get("featured") === "on",
    });

  if (!fieldsParsed.success) {
    return { success: false, error: "Please check the form fields and try again." };
  }

  const vehicleId = reserveVehicleId(session.dealershipId);
  const imageUrls = await uploadVehiclePhotos(session.dealershipId, vehicleId, photos);
  await createVehicle(session.dealershipId, vehicleId, {
    ...fieldsParsed.data,
    imageUrls,
  });

  revalidatePath("/dashboard/inventory");
  return { success: true };
}

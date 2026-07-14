"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { updateDealershipProfile } from "@/lib/dealership/config";
import { uploadDealershipLogo } from "@/lib/dealership/upload-logo";
import { dealershipProfileSchema } from "@/types";

export async function updateDealershipProfileAction(
  formData: FormData
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await verifySession();
  if (!session) {
    return { success: false, error: "Not signed in." };
  }
  if (!can(session.role, "canAccessConfig")) {
    return { success: false, error: "You don't have permission to change settings." };
  }

  const parsed = dealershipProfileSchema.safeParse({
    name: formData.get("name"),
    logoText: formData.get("logoText") || undefined,
    address: formData.get("address"),
    whatsapp: formData.get("whatsapp"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    hours: {
      monday: formData.get("hours.monday"),
      tuesday: formData.get("hours.tuesday"),
      wednesday: formData.get("hours.wednesday"),
      thursday: formData.get("hours.thursday"),
      friday: formData.get("hours.friday"),
      saturday: formData.get("hours.saturday"),
      sunday: formData.get("hours.sunday"),
    },
  });
  if (!parsed.success) {
    return { success: false, error: "Please check the values and try again." };
  }

  const logo = formData.get("logo");
  const logoUrl =
    logo instanceof File && logo.size > 0
      ? await uploadDealershipLogo(session.dealershipId, logo)
      : undefined;

  await updateDealershipProfile(session.dealershipId, {
    ...parsed.data,
    ...(logoUrl ? { logoUrl } : {}),
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/");
  revalidatePath("/inventory");
  return { success: true };
}

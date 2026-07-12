"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { reserveBrandId, createBrand } from "@/lib/brands/brands";
import { uploadBrandLogo } from "@/lib/brands/upload-logo";
import { brandSchema } from "@/types";

export async function createBrandAction(
  formData: FormData
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await verifySession();
  if (!session) {
    return { success: false, error: "Not signed in." };
  }
  if (!can(session.role, "canAccessConfig")) {
    return { success: false, error: "You don't have permission to manage brands." };
  }

  const logo = formData.get("logo");
  if (!(logo instanceof File) || logo.size === 0) {
    return { success: false, error: "A logo image is required." };
  }

  const parsed = brandSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { success: false, error: "Please enter a brand name." };
  }

  const brandId = reserveBrandId(session.dealershipId);
  const logoUrl = await uploadBrandLogo(session.dealershipId, brandId, logo);
  await createBrand(session.dealershipId, brandId, {
    name: parsed.data.name,
    logoUrl,
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}

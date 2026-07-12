import "server-only";
import { adminFirestore } from "@/lib/firebase/admin";
import { brandSchema, type Brand } from "@/types";

export async function getBrands(dealershipId: string): Promise<Brand[]> {
  if (!adminFirestore) return [];

  const snapshot = await adminFirestore
    .collection("dealerships")
    .doc(dealershipId)
    .collection("brands")
    .orderBy("createdAt", "asc")
    .get();

  return snapshot.docs.flatMap((doc) => {
    const data = doc.data();
    const parsed = brandSchema.safeParse(data);
    if (!parsed.success) return [];
    if (typeof data.logoUrl !== "string") return [];

    return [
      {
        id: doc.id,
        dealershipId,
        ...parsed.data,
        logoUrl: data.logoUrl,
      },
    ];
  });
}

export function reserveBrandId(dealershipId: string): string {
  if (!adminFirestore) {
    throw new Error("Firestore is not configured.");
  }

  return adminFirestore
    .collection("dealerships")
    .doc(dealershipId)
    .collection("brands")
    .doc().id;
}

export async function createBrand(
  dealershipId: string,
  brandId: string,
  input: { name: string; logoUrl: string }
): Promise<void> {
  if (!adminFirestore) {
    throw new Error("Firestore is not configured.");
  }

  const now = new Date();

  await adminFirestore
    .collection("dealerships")
    .doc(dealershipId)
    .collection("brands")
    .doc(brandId)
    .set({
      ...input,
      id: brandId,
      dealershipId,
      createdAt: now,
      updatedAt: now,
    });
}

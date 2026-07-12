import "server-only";
import { adminFirestore } from "@/lib/firebase/admin";
import { vehicleSchema, type Vehicle } from "@/types";
import type { z } from "zod";

export async function getVehicles(dealershipId: string): Promise<Vehicle[]> {
  if (!adminFirestore) return [];

  const snapshot = await adminFirestore
    .collection("dealerships")
    .doc(dealershipId)
    .collection("vehicles")
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.flatMap((doc) => {
    const parsed = vehicleSchema.safeParse(doc.data());
    if (!parsed.success) return [];
    return [{ id: doc.id, dealershipId, ...parsed.data }];
  });
}

export function reserveVehicleId(dealershipId: string): string {
  if (!adminFirestore) {
    throw new Error("Firestore is not configured.");
  }

  return adminFirestore
    .collection("dealerships")
    .doc(dealershipId)
    .collection("vehicles")
    .doc().id;
}

export async function createVehicle(
  dealershipId: string,
  vehicleId: string,
  input: z.infer<typeof vehicleSchema>
): Promise<void> {
  if (!adminFirestore) {
    throw new Error("Firestore is not configured.");
  }

  const now = new Date();

  await adminFirestore
    .collection("dealerships")
    .doc(dealershipId)
    .collection("vehicles")
    .doc(vehicleId)
    .set({
      ...input,
      id: vehicleId,
      dealershipId,
      createdAt: now,
      updatedAt: now,
    });
}

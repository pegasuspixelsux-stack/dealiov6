import "server-only";
import { adminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
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
    const data = doc.data();
    const parsed = vehicleSchema.safeParse(data);
    if (!parsed.success) return [];

    const createdAt: Date =
      typeof data.createdAt?.toDate === "function"
        ? data.createdAt.toDate()
        : new Date();
    const updatedAt: Date =
      typeof data.updatedAt?.toDate === "function"
        ? data.updatedAt.toDate()
        : createdAt;
    const soldAt: string | undefined =
      typeof data.soldAt?.toDate === "function"
        ? data.soldAt.toDate().toISOString()
        : undefined;

    return [
      {
        id: doc.id,
        dealershipId,
        ...parsed.data,
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
        soldAt,
      },
    ];
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
      ...(input.status === "vendido" ? { soldAt: now } : {}),
    });
}

export async function updateVehicle(
  dealershipId: string,
  vehicleId: string,
  input: z.infer<typeof vehicleSchema>
): Promise<void> {
  if (!adminFirestore) {
    throw new Error("Firestore is not configured.");
  }

  const ref = adminFirestore
    .collection("dealerships")
    .doc(dealershipId)
    .collection("vehicles")
    .doc(vehicleId);

  const existing = await ref.get();
  const existingData = existing.data();
  const wasAlreadySold =
    existingData?.status === "vendido" && Boolean(existingData?.soldAt);

  const soldAtUpdate =
    input.status === "vendido"
      ? { soldAt: wasAlreadySold ? existingData!.soldAt : new Date() }
      : { soldAt: FieldValue.delete() };

  await ref.set(
    {
      ...input,
      id: vehicleId,
      dealershipId,
      updatedAt: new Date(),
      ...soldAtUpdate,
    },
    { merge: true }
  );
}

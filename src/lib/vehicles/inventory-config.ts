import "server-only";
import { adminFirestore } from "@/lib/firebase/admin";
import {
  inventorySettingsSchema,
  DEFAULT_INVENTORY_SETTINGS,
  type InventorySettings,
} from "@/types";

export async function getInventorySettings(
  dealershipId: string
): Promise<InventorySettings> {
  if (!adminFirestore) return DEFAULT_INVENTORY_SETTINGS;

  const doc = await adminFirestore.collection("dealerships").doc(dealershipId).get();
  const parsed = inventorySettingsSchema.safeParse(doc.data()?.inventorySettings);
  return parsed.success ? parsed.data : DEFAULT_INVENTORY_SETTINGS;
}

export async function updateInventorySettings(
  dealershipId: string,
  input: InventorySettings
): Promise<void> {
  if (!adminFirestore) {
    throw new Error("Firestore is not configured.");
  }

  await adminFirestore
    .collection("dealerships")
    .doc(dealershipId)
    .set({ inventorySettings: input }, { merge: true });
}

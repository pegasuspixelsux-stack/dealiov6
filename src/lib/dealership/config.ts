import "server-only";
import { adminFirestore } from "@/lib/firebase/admin";
import {
  dealershipConfigSchema,
  type DealershipConfig,
  type DealershipProfile,
} from "@/types";
import { ULTIMA_DEALERSHIP_CONFIG } from "./mock-data";

export const DEFAULT_DEALERSHIP_ID =
  process.env.NEXT_PUBLIC_DEFAULT_DEALERSHIP_ID ?? "ultima-cars";

/**
 * Resolves which dealership a request belongs to. Today this always returns
 * the default tenant; `host` is threaded through now so a real
 * subdomain/custom-domain -> dealershipId lookup (Firestore) can replace the
 * body later without changing any call sites.
 */
export function resolveDealershipId(host: string | null): string {
  void host;
  return DEFAULT_DEALERSHIP_ID;
}

/**
 * Returns the resolved dealership's config, reading `dealerships/{dealershipId}`
 * from Firestore and merging it over the static fixture so tenants that
 * haven't customized every field still get sensible defaults.
 */
export async function getDealershipConfig(
  dealershipId: string = DEFAULT_DEALERSHIP_ID
): Promise<DealershipConfig> {
  if (!adminFirestore) {
    return dealershipConfigSchema.parse(ULTIMA_DEALERSHIP_CONFIG);
  }

  const doc = await adminFirestore
    .collection("dealerships")
    .doc(dealershipId)
    .get();

  const merged = {
    ...ULTIMA_DEALERSHIP_CONFIG,
    ...doc.data(),
    id: dealershipId,
  };
  const parsed = dealershipConfigSchema.safeParse(merged);
  return parsed.success
    ? parsed.data
    : dealershipConfigSchema.parse(ULTIMA_DEALERSHIP_CONFIG);
}

/**
 * Updates the editable profile fields (name, logo, contact info, hours) on
 * a dealership's Firestore doc, leaving every other config field untouched.
 */
export async function updateDealershipProfile(
  dealershipId: string,
  profile: DealershipProfile & { logoUrl?: string }
): Promise<void> {
  if (!adminFirestore) {
    throw new Error("Firestore is not configured.");
  }

  await adminFirestore
    .collection("dealerships")
    .doc(dealershipId)
    .set(profile, { merge: true });
}

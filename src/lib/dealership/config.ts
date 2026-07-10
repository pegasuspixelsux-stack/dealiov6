import { dealershipConfigSchema, type DealershipConfig } from "@/types";
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
 * Returns the resolved dealership's config. Backed by a hardcoded fixture
 * today; a real implementation fetches `dealerships/{dealershipId}` from
 * Firestore and parses it through the same schema.
 */
export function getDealershipConfig(
  dealershipId: string = DEFAULT_DEALERSHIP_ID
): DealershipConfig {
  void dealershipId;
  return dealershipConfigSchema.parse(ULTIMA_DEALERSHIP_CONFIG);
}

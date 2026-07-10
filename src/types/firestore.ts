/**
 * Convention for feature-level Firestore documents (vehicles, leads, etc.):
 * store them as subcollections scoped to a dealership —
 * `dealerships/{dealershipId}/vehicles/{vehicleId}`, `dealerships/{dealershipId}/leads/{leadId}`.
 * Every document still carries an explicit `dealershipId` field so flat/cross-tenant
 * queries (e.g. a future super-admin view) remain possible without restructuring.
 */
export interface TenantScopedDocument {
  id: string;
  dealershipId: string;
  createdAt: unknown;
  updatedAt: unknown;
}

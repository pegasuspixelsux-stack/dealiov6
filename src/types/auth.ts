export type Role = "owner" | "manager" | "salesperson";

export interface SessionPayload {
  uid: string;
  role: Role;
  dealershipId: string;
  name: string;
  /** Unix seconds expiry, mirrors JWT `exp` claim. */
  exp: number;
}

export type AuthenticatedUser = Omit<SessionPayload, "exp">;

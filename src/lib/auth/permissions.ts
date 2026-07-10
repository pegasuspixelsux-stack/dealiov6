import type { Role } from "@/types";

export type Permission =
  | "canManageVehicles"
  | "canDeleteVehicles"
  | "canManageAllLeads"
  | "canAssignLeads"
  | "canManageSalespeople"
  | "canManageUsers"
  | "canViewReports"
  | "canAccessConfig"
  | "canManageBilling"
  | "canDeleteDealership";

const ALL_PERMISSIONS: Permission[] = [
  "canManageVehicles",
  "canDeleteVehicles",
  "canManageAllLeads",
  "canAssignLeads",
  "canManageSalespeople",
  "canManageUsers",
  "canViewReports",
  "canAccessConfig",
  "canManageBilling",
  "canDeleteDealership",
];

export const PERMISSIONS: Record<Role, Permission[]> = {
  owner: ALL_PERMISSIONS,
  manager: [
    "canManageVehicles",
    "canDeleteVehicles",
    "canManageAllLeads",
    "canAssignLeads",
    "canManageSalespeople",
    "canViewReports",
  ],
  salesperson: [],
};

export function can(role: Role, permission: Permission): boolean {
  return PERMISSIONS[role].includes(permission);
}

export function hasAnyRole(role: Role, allowed: Role[]): boolean {
  return allowed.includes(role);
}

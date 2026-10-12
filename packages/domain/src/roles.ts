/** Roles enforced by the API's RBAC. One user can hold several (e.g. customer + partner). */
export const ROLES = [
  'customer',
  'partner',
  'vendor_staff',
  'field_agent',
  'ops',
  'verification',
  'support',
  'finance',
  'super_admin',
] as const;

export type Role = (typeof ROLES)[number];

export const STAFF_ROLES: readonly Role[] = [
  'ops',
  'verification',
  'support',
  'finance',
  'super_admin',
];

export function isStaff(roles: readonly Role[]): boolean {
  return roles.some((r) => STAFF_ROLES.includes(r));
}

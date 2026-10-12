/**
 * Requirements, material enquiries, equipment enquiries and consults are one table
 * (`requirements`) distinguished by `type`; `details` is validated per type in @setu/schemas.
 */
export const REQUIREMENT_TYPES = [
  'service', // Home Services quick booking / Find a Professional brief
  'renovation', // Build & Renovate
  'material_rfq', // Buy Materials
  'equipment', // Rent Equipment
  'consult', // free site visit / expert consult
] as const;

export type RequirementType = (typeof REQUIREMENT_TYPES)[number];

/**
 * Pre-hire half of the lifecycle (doc steps 1–4). At `hired` a row is created in
 * `jobs` and the job machine takes over.
 */
export const REQUIREMENT_STATUSES = [
  'requested',
  'matched',
  'quoted',
  'hired',
  'cancelled',
  'expired',
] as const;

export type RequirementStatus = (typeof REQUIREMENT_STATUSES)[number];

import { z } from 'zod';

/** Record a payout made outside Setu (bank transfer, UPI) against what a partner is owed. */
export const recordPayoutSchema = z.object({
  partnerId: z.uuid(),
  amountPaise: z.number().int().positive(),
  reference: z.string().trim().min(3, 'Add the bank or UPI reference').max(120),
});

// ---------- catalogue, users and audit (admin portal) ----------

const slug = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens');

export const adminServiceInputSchema = z.object({
  categoryId: z.uuid(),
  slug,
  nameEn: z.string().trim().min(2).max(120),
  nameHi: z.string().trim().min(1).max(120),
  groupEn: z.string().trim().max(60).nullable().optional(),
  groupHi: z.string().trim().max(60).nullable().optional(),
  description: z.string().trim().max(300).nullable().optional(),
  unit: z.string().trim().min(1).max(30),
  durationMinutes: z
    .number()
    .int()
    .min(5)
    .max(24 * 60)
    .nullable()
    .optional(),
  /** Rupees 1 to 5,00,000, in paise. */
  pricePaise: z.number().int().min(100).max(50_000_000),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
  isActive: z.boolean().optional(),
});
export type AdminServiceInput = z.infer<typeof adminServiceInputSchema>;

export const adminServiceUpdateSchema = adminServiceInputSchema
  .omit({ categoryId: true, slug: true })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to change');
export type AdminServiceUpdate = z.infer<typeof adminServiceUpdateSchema>;

export const adminUsersQuerySchema = z.object({
  q: z.string().trim().max(60).optional(),
});

export const adminUserActionSchema = z.object({
  reason: z.string().trim().min(3, 'Give a reason (3+ characters)').max(300),
});

export const adminAuditQuerySchema = z.object({
  entityType: z.string().trim().max(40).optional(),
  entityId: z.string().trim().max(80).optional(),
});

// ---------- operations ----------

export const REPORT_REASONS = [
  'no_show',
  'rude_or_unsafe',
  'asked_cash_outside_app',
  'poor_work',
  'fake_profile',
  'other',
] as const;
export const REPORT_STATUSES = ['open', 'actioned', 'dismissed'] as const;

export const createReportSchema = z.object({
  partnerId: z.uuid(),
  jobId: z.uuid().optional(),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(1000).optional(),
});
export const resolveReportSchema = z.object({
  status: z.enum(['actioned', 'dismissed']),
  note: z.string().trim().min(3).max(500),
});

export const SECTOR_STATUSES = ['live', 'waitlist'] as const;
export const upsertSectorSchema = z.object({
  name: z.string().trim().min(2).max(60),
  status: z.enum(SECTOR_STATUSES),
});

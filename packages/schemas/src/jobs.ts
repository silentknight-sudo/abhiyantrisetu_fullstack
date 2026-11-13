import { z } from 'zod';

export const scheduleJobSchema = z.object({
  slotStart: z.iso.datetime({ offset: true }).transform((s) => new Date(s)),
});

export const startJobSchema = z.object({
  startCode: z.string().regex(/^\d{4}$/, 'Enter the 4-digit start code'),
});

export const reasonSchema = z.object({
  reason: z.string().trim().min(3).max(1000),
});

export const resolveDisputeSchema = z.object({
  outcome: z.enum(['release', 'refund']),
  note: z.string().trim().min(3).max(2000),
});

// ---------- extras and site photos ----------

export const addJobExtraSchema = z.object({
  description: z.string().trim().min(3, 'Describe the part or work').max(120),
  /** ₹1 to ₹1,00,000. */
  amountPaise: z.number().int().min(100).max(10_000_000),
});
export type AddJobExtraInput = z.infer<typeof addJobExtraSchema>;

export const addJobPhotosSchema = z.object({
  kind: z.enum(['before', 'after']),
  fileKeys: z.array(z.string().min(1).max(300)).min(1).max(6),
});
export type AddJobPhotosInput = z.infer<typeof addJobPhotosSchema>;

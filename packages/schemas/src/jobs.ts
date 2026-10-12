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

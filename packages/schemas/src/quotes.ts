import { GST_RATES, type GstRate } from '@setu/domain';
import { z } from 'zod';
import { paiseSchema } from './common';

export const quoteItemSchema = z.object({
  description: z.string().trim().min(2).max(200),
  quantity: z.number().positive().max(100_000),
  unit: z.string().trim().max(20).optional(),
  unitPricePaise: paiseSchema,
});

export const quoteMilestoneSchema = z.object({
  title: z.string().trim().min(2).max(80),
  percent: z.number().int().min(1).max(100),
});

const quoteBody = {
  items: z.array(quoteItemSchema).min(1, 'Add at least one line item').max(100),
  /** null when the partner is not GST-registered. */
  gst: z
    .object({
      rate: z
        .number()
        .refine(
          (r): r is GstRate => (GST_RATES as readonly number[]).includes(r),
          'Choose a GST slab',
        )
        .transform((r) => r as GstRate),
      interState: z.boolean().default(false),
    })
    .nullable()
    .default(null),
  milestones: z.array(quoteMilestoneSchema).max(10).optional(),
  notes: z.string().trim().max(1000).optional(),
  validDays: z.number().int().min(1).max(60).default(7),
};

const milestonesAddUp = (q: { milestones?: { percent: number }[] }) =>
  !q.milestones?.length || q.milestones.reduce((s, m) => s + m.percent, 0) === 100;

export const createQuoteSchema = z
  .object(quoteBody)
  .refine(milestonesAddUp, { message: 'Milestones must add up to 100%', path: ['milestones'] });
export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;

export const reviseQuoteSchema = z
  .object({ ...quoteBody, message: z.string().trim().max(500).optional() })
  .refine(milestonesAddUp, { message: 'Milestones must add up to 100%', path: ['milestones'] });
export type ReviseQuoteInput = z.infer<typeof reviseQuoteSchema>;

export const negotiateQuoteSchema = z.object({
  message: z.string().trim().min(3, 'Write a short message').max(500),
  targetTotalPaise: paiseSchema.optional(),
});
